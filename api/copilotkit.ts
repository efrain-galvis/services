import { HttpAgent } from "@ag-ui/client";
import {
  CopilotRuntime,
  createCopilotRuntimeHandler,
} from "@copilotkit/runtime/v2";

const RUNTIME_BASE_PATH = "/api/copilotkit";
const DEFAULT_SITE_AGENT_URL =
  "https://site-agent-production.up.railway.app";
const DEFAULT_AGENT_ID = "lyra";

type RuntimeHandler = ReturnType<typeof createCopilotRuntimeHandler>;

let runtimeHandler: RuntimeHandler | undefined;

function readAgentEndpoint(): URL {
  const configured = process.env.SITE_AGENT_URL?.trim() || DEFAULT_SITE_AGENT_URL;
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

function readAgentId(): string {
  const agentId =
    process.env.COPILOTKIT_AGENT_ID?.trim() || DEFAULT_AGENT_ID;
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(agentId)) {
    throw new Error(
      "COPILOTKIT_AGENT_ID must contain only letters, numbers, underscores, or hyphens.",
    );
  }
  return agentId;
}

function getRuntimeHandler(): RuntimeHandler {
  if (runtimeHandler) return runtimeHandler;

  const agentId = readAgentId();
  const siteToken = process.env.SITE_TOKEN?.trim();
  const headers: Record<string, string> = {
    Accept: "text/event-stream",
  };
  if (siteToken) headers["X-Site-Token"] = siteToken;

  const runtime = new CopilotRuntime({
    agents: {
      [agentId]: new HttpAgent({
        agentId,
        url: readAgentEndpoint().toString(),
        headers,
      }),
    },
    // Never pass browser-supplied authorization or speed-bump headers upstream.
    // The optional SITE_TOKEN above is read only from this server environment.
    forwardHeaders: {
      allow: ["x-lyra-no-forward"],
      deny: ["x-lyra-no-forward"],
    },
  });

  runtimeHandler = createCopilotRuntimeHandler({
    runtime,
    basePath: RUNTIME_BASE_PATH,
    mode: "multi-route",
  });
  return runtimeHandler;
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

async function handleRequest(request: Request): Promise<Response> {
  try {
    return await getRuntimeHandler()(runtimeRequest(request));
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown runtime configuration error.";
    console.error("CopilotKit runtime request failed:", message);
    return Response.json(
      { error: "CopilotKit runtime is unavailable.", detail: message },
      { status: 500 },
    );
  }
}

export default {
  fetch: handleRequest,
};
