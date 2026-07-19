import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { env } from "@/src/env.mjs";
import { getRateLimitIdentifier } from "./rate-limit-utils";

const RATE_LIMIT_POINTS = 60;
const RATE_LIMIT_DURATION_SECONDS = 10;

const redis = new Redis(env.VALKEY_URL, {
  connectTimeout: 1_000,
  enableOfflineQueue: false,
  maxRetriesPerRequest: 1,
  retryStrategy: (attempt) => Math.min(attempt * 50, 1_000),
});

redis.on("error", (error) => {
  console.error("Valkey rate limiter connection error", {
    code: "code" in error ? error.code : undefined,
    name: error.name,
  });
});

const trpcRateLimiter = new RateLimiterRedis({
  duration: RATE_LIMIT_DURATION_SECONDS,
  keyPrefix: "turkish-dictionary:trpc",
  points: RATE_LIMIT_POINTS,
  storeClient: redis,
});

export class RateLimitExceededError extends Error {
  public readonly retryAfterSeconds: number;

  constructor(msBeforeNext: number) {
    super("Rate limit exceeded");
    this.name = "RateLimitExceededError";
    this.retryAfterSeconds = Math.max(1, Math.ceil(msBeforeNext / 1_000));
  }
}

export class RateLimitUnavailableError extends Error {
  constructor() {
    super("Rate limiting service is unavailable");
    this.name = "RateLimitUnavailableError";
  }
}

function isRateLimitResult(error: unknown): error is { msBeforeNext: number } {
  return (
    typeof error === "object" &&
    error !== null &&
    "msBeforeNext" in error &&
    typeof error.msBeforeNext === "number"
  );
}

export async function enforceTrpcRateLimit(headers: Headers, userId?: string): Promise<void> {
  if (env.NODE_ENV !== "production") {
    return;
  }

  try {
    await trpcRateLimiter.consume(getRateLimitIdentifier(headers, userId));
  } catch (error) {
    if (isRateLimitResult(error)) {
      throw new RateLimitExceededError(error.msBeforeNext);
    }

    throw new RateLimitUnavailableError();
  }
}
