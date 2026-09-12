import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

export const VISITOR_RATE_LIMIT = 40;

export type VisitorRateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  reset: number;
};

export type VisitorRateLimiter = (
  visitorIp: string,
) => Promise<VisitorRateLimitResult>;

let rateLimiter: Ratelimit | undefined;

function readRedisCredentials() {
  const url =
    process.env.UPSTASH_REDIS_REST_URL?.trim() ||
    process.env.KV_REST_API_URL?.trim();
  const token =
    process.env.UPSTASH_REDIS_REST_TOKEN?.trim() ||
    process.env.KV_REST_API_TOKEN?.trim();

  if (!url || !token) {
    throw new Error(
      "Durable visitor rate limiting is not configured. Set the Upstash Redis REST URL and token.",
    );
  }
  return { url, token };
}

function getRateLimiter(): Ratelimit {
  if (rateLimiter) return rateLimiter;

  rateLimiter = new Ratelimit({
    redis: new Redis(readRedisCredentials()),
    limiter: Ratelimit.slidingWindow(VISITOR_RATE_LIMIT, "1 h"),
    prefix: "lyra:copilotkit:visitor",
    analytics: false,
  });
  return rateLimiter;
}

export const limitVisitor: VisitorRateLimiter = async (visitorIp) => {
  const result = await getRateLimiter().limit(visitorIp);
  return {
    allowed: result.success,
    limit: result.limit,
    remaining: result.remaining,
    reset: result.reset,
  };
};
