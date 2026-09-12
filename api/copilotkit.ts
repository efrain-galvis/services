import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";
import { isIP } from "node:net";
import {
  limitVisitor,
  type VisitorRateLimiter,
  type VisitorRateLimitResult,
} from "./visitor-rate-limit";

const RUNTIME_BASE_PATH = "/api/copilotkit";
const DEFAULT_SITE_AGENT_URL =
  "https://site-agent-production.up.railway.app";
const DEFAULT_AGENT_ID = "lyra";

type RuntimeHandler = ReturnType<typeof createCopilotRuntimeHandler>;

type AgentFetch = (url: string, init: RequestInit) => Promise<Response>;

type EndpointOptions = {
  agentFetch?: AgentFetch;
  environment?: NodeJS.ProcessEnv;
  visitorRateLimiter?: VisitorRateLimiter;
};

function readAgentEndpoint(environment: NodeJS.ProcessEnv): URL {
  const configured =
    environment.SITE_AGENT_URL?.trim() || DEFAULT_SITE_AGENT_URL;
  let siteAgentUrl: URL;

  try {
    siteAgentUrl = new URL(configured);
  } catch {
    throw new Error("SITE_AGENT_URL must be an absolute HTTP(S) URL.");
  }

  const isLocalHttp =
    siteAgentUrl.protocol === "http:" &&
    ["localhost", "127.0.0.1", "::1"].includes(siteAgentUrl.hostname);
  if (siteAgentUrl.protocol !== "https:" && !isLocalHttp) {
    throw new Error("SITE_AGENT_URL must use HTTPS (HTTP is allowed only locally).");
  }
  if (siteAgentUrl.username || siteAgentUrl.password) {
    throw new Error("SITE_AGENT_URL must not contain credentials.");
  }
  if (siteAgentUrl.search || siteAgentUrl.hash) {
    throw new Error("SITE_AGENT_URL must not contain a query string or fragment.");
  }

  siteAgentUrl.pathname = `${siteAgentUrl.pathname.replace(/\/+$/, "")}/v1/agui`;
  return siteAgentUrl;
}

function readAgentId(environment: NodeJS.ProcessEnv): string {
  const agentId =
    environment.COPILOTKIT_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(agentId)) {
    throw new Error(
      "COPILOTKIT_AGENT_ID must contain only letters, numbers, underscores, or hyphens.",
    );
  }
  return agentId;
}

function trustedVisitorIp(request: Request): string | null {
  const value = request.headers.get("x-vercel-forwarded-for")?.trim();
  if (!value || value.includes(",") || isIP(value) === 0) return null;
  return value;
}

function createRuntimeHandler(
  environment: NodeJS.ProcessEnv,
  agentFetch?: AgentFetch,
): RuntimeHandler {
  const agentId = readAgentId(environment);
  const siteToken = environment.SITE_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (siteToken) headers["X-Site-Token"] = siteToken;

  const runtime = new CopilotRuntime({
    agents: {
      [agentId]: new HttpAgent({
        agentId,
        url: readAgentEndpoint(environment).toString(),
        headers,
        ...(agentFetch ? { fetch: agentFetch } : {}),
      }),
    },
    // Never pass browser-supplied authorization or speed-bump headers upstream.
    // The optional SITE_TOKEN above is read only from this server environment.
    forwardHeaders: {
      allow: ["x-lyra-no-forward"],
      deny: ["x-lyra-no-forward"],
    },
  });

  return createCopilotRuntimeHandler({
    runtime,
    basePath: RUNTIME_BASE_PATH,
    mode: "multi-route",
  });
}

function runtimeRequest(request: Request): Request {
  const incomingUrl = new URL(request.url);
  const rewrittenPath = incomingUrl.searchParams.get("_copilotkit_path");

  if (rewrittenPath === null) return request;
  if (
    rewrittenPath.length > 512 ||
    rewrittenPath.split("/").some((segment) => segment === "..")
  ) {
    throw new Error("Invalid CopilotKit runtime path.");
  }

  incomingUrl.pathname = `${RUNTIME_BASE_PATH}${
    rewrittenPath ? `/${rewrittenPath.replace(/^\/+/, "")}` : ""
  }`;
  incomingUrl.searchParams.delete("_copilotkit_path");
  return new Request(incomingUrl, request);
}

function isAgentRun(request: Request): boolean {
  return (
    request.method === "POST" &&
    /^\/api\/copilotkit\/agent\/[^/]+\/run$/.test(new URL(request.url).pathname)
  );
}

function rateLimitResponse(result: VisitorRateLimitResult): Response {
  const retryAfter = Math.max(1, Math.ceil((result.reset - Date.now()) / 1000));
  return Response.json(
    { error: "LYRA's visitor message limit has been reached. Try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfter),
        "X-RateLimit-Limit": String(result.limit),
        "X-RateLimit-Remaining": String(result.remaining),
        "X-RateLimit-Reset": String(result.reset),
      },
    },
  );
}

export function createCopilotKitEndpoint(options: EndpointOptions = {}) {
  const environment = options.environment || process.env;
  const visitorRateLimiter = options.visitorRateLimiter || limitVisitor;
  let runtimeHandler: RuntimeHandler | undefined;

  return {
    async fetch(request: Request): Promise<Response> {
      try {
        const normalizedRequest = runtimeRequest(request);

        if (isAgentRun(normalizedRequest)) {
          const visitorIp = trustedVisitorIp(request);
          if (!visitorIp) {
            return Response.json(
              { error: "A trusted Vercel visitor IP is required." },
              { status: 403 },
            );
          }

          let rateLimit: VisitorRateLimitResult;
          try {
            rateLimit = await visitorRateLimiter(visitorIp);
          } catch (error) {
            console.error(
              "CopilotKit visitor rate limiter failed:",
              error instanceof Error ? error.message : "Unknown rate limiter error.",
            );
            return Response.json(
              { error: "LYRA's visitor rate limiter is unavailable." },
              { status: 503 },
            );
          }
          if (!rateLimit.allowed) return rateLimitResponse(rateLimit);
        }

        runtimeHandler ||= createRuntimeHandler(
          environment,
          options.agentFetch,
        );
        return await runtimeHandler(normalizedRequest);
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unknown runtime configuration error.";
        console.error("CopilotKit runtime request failed:", message);
        return Response.json(
          { error: "CopilotKit runtime is unavailable.", detail: message },
          { status: 500 },
        );
      }
    },
  };
}

export default createCopilotKitEndpoint();
