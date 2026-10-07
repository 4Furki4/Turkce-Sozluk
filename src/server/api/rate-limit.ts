import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { env } from "@/src/env.mjs";
import { getRateLimitIdentifier } from "./rate-limit-utils";

const RATE_LIMIT_POINTS = 60;
const RATE_LIMIT_DURATION_SECONDS = 10;
const RATE_LIMIT_BACKEND_TIMEOUT_MS = 1_000;

const redis = new Redis(env.VALKEY_URL, {
  connectTimeout: RATE_LIMIT_BACKEND_TIMEOUT_MS,
  commandTimeout: RATE_LIMIT_BACKEND_TIMEOUT_MS,
  socketTimeout: RATE_LIMIT_BACKEND_TIMEOUT_MS,
  lazyConnect: true,
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

let redisReadyPromise: Promise<void> | undefined;

function waitForRedisReady(): Promise<void> {
  if (redis.status === "ready") {
    return Promise.resolve();
  }

  // Share one bounded readiness wait across concurrent startup requests.
  if (!redisReadyPromise) {
    redisReadyPromise = new Promise<void>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout);
        redis.off("ready", onReady);
        redis.off("error", onError);
      };
      const onReady = () => {
        cleanup();
        resolve();
      };
      const onError = (error: Error) => {
        cleanup();
        reject(error);
      };
      const timeout = setTimeout(
        () => onError(new RateLimitUnavailableError()),
        RATE_LIMIT_BACKEND_TIMEOUT_MS,
      );

      redis.once("ready", onReady);
      redis.once("error", onError);
      if (redis.status === "wait") {
        void redis.connect().catch(onError);
      }
    }).finally(() => {
      redisReadyPromise = undefined;
    });
  }

  return redisReadyPromise;
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
    await waitForRedisReady();
    await trpcRateLimiter.consume(getRateLimitIdentifier(headers, userId));
  } catch (error) {
    if (isRateLimitResult(error)) {
      throw new RateLimitExceededError(error.msBeforeNext);
    }

    throw new RateLimitUnavailableError();
  }
}
