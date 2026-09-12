import { describe, expect, it, vi } from "vitest";
import {
  createCopilotKitEndpoint,
} from "./copilotkit";
import type {
  VisitorRateLimiter,
  VisitorRateLimitResult,
} from "./visitor-rate-limit";

process.env.COPILOTKIT_TELEMETRY_DISABLED = "true";

const TEST_ENV = {
  SITE_AGENT_URL: "https://railway.example",
  SITE_TOKEN: "server-secret",
  COPILOTKIT_AGENT_ID: "lyra",
} satisfies NodeJS.ProcessEnv;

function requestFor(
  path: string,
  init: RequestInit = {},
  visitorIp = "203.0.113.10",
) {
  const headers = new Headers(init.headers);
  headers.set("x-vercel-forwarded-for", visitorIp);
  return new Request(
    `https://preview.example/api/copilotkit?_copilotkit_path=${encodeURIComponent(path)}`,
    { ...init, headers },
  );
}

function runInput(id: string) {
  return {
    threadId: `thread-${id}`,
    runId: `run-${id}`,
    state: {},
    messages: [],
    tools: [],
    context: [],
    forwardedProps: {},
  };
}

function sseResponse(input: ReturnType<typeof runInput>) {
  return new Response(
    [
      `data: ${JSON.stringify({
        type: "RUN_STARTED",
        threadId: input.threadId,
        runId: input.runId,
      })}`,
      `data: ${JSON.stringify({
        type: "RUN_FINISHED",
        threadId: input.threadId,
        runId: input.runId,
      })}`,
      "",
    ].join("\n\n"),
    { headers: { "Content-Type": "text/event-stream" } },
  );
}

function allowed(visitorIp: string): Promise<VisitorRateLimitResult> {
  void visitorIp;
  return Promise.resolve({
    allowed: true,
    limit: 40,
    remaining: 39,
    reset: Date.now() + 3_600_000,
  });
}

describe("CopilotKit Vercel endpoint", () => {
  it("serves runtime info with the configured agent", async () => {
    const visitorRateLimiter = vi.fn(allowed);
    const endpoint = createCopilotKitEndpoint({
      environment: TEST_ENV,
      visitorRateLimiter,
    });

    const response = await endpoint.fetch(requestFor("info"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.agents).toHaveProperty("lyra");
    expect(visitorRateLimiter).not.toHaveBeenCalled();
  });

  it("streams agent runs with only the server credential upstream", async () => {
    const agentFetch = vi.fn(async (_url: string, init: RequestInit) => {
      const input = JSON.parse(String(init.body)) as ReturnType<typeof runInput>;
      return sseResponse(input);
    });
    const endpoint = createCopilotKitEndpoint({
      agentFetch,
      environment: TEST_ENV,
      visitorRateLimiter: allowed,
    });
    const input = runInput("stream");

    const response = await endpoint.fetch(
      requestFor("agent/lyra/run", {
        method: "POST",
        headers: {
          Authorization: "Bearer browser-controlled",
          "Content-Type": "application/json",
          "X-Site-Token": "browser-controlled",
          "X-Real-IP": "198.51.100.99",
          "X-Forwarded-For": "198.51.100.99",
        },
        body: JSON.stringify(input),
      }),
    );
    const stream = await response.text();
    const [upstreamUrl, upstreamInit] = agentFetch.mock.calls[0];
    const upstreamHeaders = new Headers(upstreamInit.headers);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/event-stream");
    expect(stream).toContain("RUN_STARTED");
    expect(stream).toContain("RUN_FINISHED");
    expect(upstreamUrl).toBe("https://railway.example/v1/agui");
    expect(upstreamHeaders.get("accept")).toBe("text/event-stream");
    expect(upstreamHeaders.get("x-site-token")).toBe("server-secret");
    expect(upstreamHeaders.get("authorization")).toBeNull();
    expect(upstreamHeaders.get("x-real-ip")).toBeNull();
    expect(upstreamHeaders.get("x-forwarded-for")).toBeNull();
  });

  it("keeps separate durable rate-limit buckets per trusted visitor IP", async () => {
    const buckets = new Map<string, number>();
    const visitorRateLimiter: VisitorRateLimiter = vi.fn(async (visitorIp) => {
      const used = (buckets.get(visitorIp) || 0) + 1;
      buckets.set(visitorIp, used);
      return {
        allowed: used <= 1,
        limit: 1,
        remaining: Math.max(0, 1 - used),
        reset: Date.now() + 3_600_000,
      };
    });
    const agentFetch = vi.fn(async (_url: string, init: RequestInit) => {
      return sseResponse(
        JSON.parse(String(init.body)) as ReturnType<typeof runInput>,
      );
    });
    const endpoint = createCopilotKitEndpoint({
      agentFetch,
      environment: TEST_ENV,
      visitorRateLimiter,
    });

    const run = (id: string, ip: string) =>
      endpoint.fetch(
        requestFor(
          "agent/lyra/run",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(runInput(id)),
          },
          ip,
        ),
      );

    expect((await run("a-1", "203.0.113.1")).status).toBe(200);
    expect((await run("a-2", "203.0.113.1")).status).toBe(429);
    expect((await run("b-1", "203.0.113.2")).status).toBe(200);
    expect(agentFetch).toHaveBeenCalledTimes(2);
    expect(buckets).toEqual(
      new Map([
        ["203.0.113.1", 2],
        ["203.0.113.2", 1],
      ]),
    );
  });

  it("rejects a run without Vercel's trusted visitor IP", async () => {
    const agentFetch = vi.fn();
    const visitorRateLimiter = vi.fn(allowed);
    const endpoint = createCopilotKitEndpoint({
      agentFetch,
      environment: TEST_ENV,
      visitorRateLimiter,
    });
    const request = new Request(
      "https://preview.example/api/copilotkit?_copilotkit_path=agent%2Flyra%2Frun",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Forwarded-For": "198.51.100.99",
          "X-Real-IP": "198.51.100.99",
        },
        body: JSON.stringify(runInput("untrusted")),
      },
    );

    const response = await endpoint.fetch(request);

    expect(response.status).toBe(403);
    expect(visitorRateLimiter).not.toHaveBeenCalled();
    expect(agentFetch).not.toHaveBeenCalled();
  });

  it("fails closed when the durable rate-limit store is unavailable", async () => {
    const agentFetch = vi.fn();
    const endpoint = createCopilotKitEndpoint({
      agentFetch,
      environment: TEST_ENV,
      visitorRateLimiter: async () => {
        throw new Error("Redis unavailable");
      },
    });

    const response = await endpoint.fetch(
      requestFor("agent/lyra/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(runInput("redis-down")),
      }),
    );

    expect(response.status).toBe(503);
    expect(agentFetch).not.toHaveBeenCalled();
  });
});
