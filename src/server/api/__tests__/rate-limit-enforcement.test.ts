jest.mock("@/src/env.mjs", () => ({
  env: { NODE_ENV: "production", VALKEY_URL: "redis://127.0.0.1:6379" },
}));
jest.mock("ioredis", () => {
  const { EventEmitter } = jest.requireActual("node:events");
  return {
    __esModule: true,
    default: jest.fn(() => Object.assign(new EventEmitter(), {
      status: "wait",
      connect: jest.fn().mockResolvedValue(undefined),
    })),
  };
});
jest.mock("rate-limiter-flexible", () => ({
  RateLimiterRedis: jest.fn(() => ({ consume: jest.fn().mockResolvedValue(undefined) })),
}));

import Redis from "ioredis";
import { RateLimiterRedis } from "rate-limiter-flexible";
import { env } from "@/src/env.mjs";
import {
  enforceTrpcRateLimit,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "../rate-limit";

const redis = (Redis as jest.MockedClass<typeof Redis>).mock.results[0]!.value;
const consume = (RateLimiterRedis as jest.MockedClass<typeof RateLimiterRedis>)
  .mock.results[0]!.value.consume as jest.Mock;
const runtimeEnv = env as { NODE_ENV: string };
const headers = new Headers({ "cf-connecting-ip": "203.0.113.5" });

beforeEach(() => {
  jest.useFakeTimers();
  runtimeEnv.NODE_ENV = "production";
  redis.status = "wait";
  redis.connect.mockClear();
  consume.mockReset().mockResolvedValue(undefined);
  jest.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  expect(redis.listenerCount("ready")).toBe(0);
  expect(redis.listenerCount("error")).toBe(1);
  jest.useRealTimers();
  jest.restoreAllMocks();
});

describe("enforceTrpcRateLimit", () => {
  it("waits for one shared connection before consuming concurrent startup requests", async () => {
    const first = enforceTrpcRateLimit(headers, "first-user");
    const second = enforceTrpcRateLimit(headers, "second-user");

    expect(redis.connect).toHaveBeenCalledTimes(1);
    expect(consume).not.toHaveBeenCalled();
    redis.status = "ready";
    redis.emit("ready");
    await Promise.all([first, second]);

    expect(consume.mock.calls).toEqual([["user:first-user"], ["user:second-user"]]);
  });

  it("fails closed when the initial connection never becomes ready", async () => {
    const result = expect(enforceTrpcRateLimit(headers))
      .rejects.toBeInstanceOf(RateLimitUnavailableError);

    await jest.advanceTimersByTimeAsync(1_000);
    await result;
    expect(consume).not.toHaveBeenCalled();
  });

  it("fails closed on connection errors and permits a recovered connection", async () => {
    const rejected = expect(enforceTrpcRateLimit(headers))
      .rejects.toBeInstanceOf(RateLimitUnavailableError);
    redis.emit("error", new Error("connection refused"));
    await rejected;
    expect(consume).not.toHaveBeenCalled();

    redis.status = "reconnecting";
    const recovered = enforceTrpcRateLimit(headers);
    redis.status = "ready";
    redis.emit("ready");
    await recovered;
    expect(consume).toHaveBeenCalledWith("ip:203.0.113.5");
  });

  it("fails closed when an established backend rejects a command", async () => {
    redis.status = "ready";
    consume.mockRejectedValue(new Error("command timed out"));

    await expect(enforceTrpcRateLimit(headers)).rejects.toBeInstanceOf(RateLimitUnavailableError);
  });

  it("preserves quota exhaustion and rounds retry timing up", async () => {
    redis.status = "ready";
    consume.mockRejectedValue({ msBeforeNext: 1_201 });

    await expect(enforceTrpcRateLimit(headers)).rejects.toMatchObject({
      name: "RateLimitExceededError",
      retryAfterSeconds: 2,
    });
    expect(new RateLimitExceededError(0).retryAfterSeconds).toBe(1);
  });

  it("does not connect or consume outside production", async () => {
    runtimeEnv.NODE_ENV = "development";
    await enforceTrpcRateLimit(headers);

    expect(redis.connect).not.toHaveBeenCalled();
    expect(consume).not.toHaveBeenCalled();
  });
});
