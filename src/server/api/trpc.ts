/**
 * YOU PROBABLY DON'T NEED TO EDIT THIS FILE, UNLESS:
 * 1. You want to modify request context (see Part 1).
 * 2. You want to create a new middleware or type of procedure (see Part 3).
 *
 * TL;DR - This is where all the tRPC server stuff is created and plugged in. The pieces you will
 * need to use are documented accordingly near the end.
 */

import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { ZodError } from "zod";
import { auth } from "@/src/lib/auth";
import { db } from "@/db";
import { and, eq, gt } from "drizzle-orm";
import { oauthAccessTokens } from "@/db/schema/oauth";
import { users } from "@/db/schema/users";
import {
  enforceTrpcRateLimit,
  RateLimitExceededError,
  RateLimitUnavailableError,
} from "./rate-limit";

type AuthSession = NonNullable<Awaited<ReturnType<typeof auth.api.getSession>>>;

function hasApiScope(scopes: string): boolean {
  return scopes.split(" ").includes("api");
}

async function getOAuthSession(requestHeaders: Headers): Promise<AuthSession | null> {
  const authorization = requestHeaders.get("authorization");
  const accessToken = authorization?.match(/^Bearer (.+)$/i)?.[1];

  if (!accessToken) {
    return null;
  }

  const [result] = await db
    .select({ token: oauthAccessTokens, user: users })
    .from(oauthAccessTokens)
    .innerJoin(users, eq(oauthAccessTokens.userId, users.id))
    .where(
      and(
        eq(oauthAccessTokens.accessToken, accessToken),
        gt(oauthAccessTokens.accessTokenExpiresAt, new Date()),
      ),
    )
    .limit(1);

  if (!result || !hasApiScope(result.token.scopes)) {
    return null;
  }

  return {
    session: {
      id: `oauth:${result.token.id}`,
      token: result.token.accessToken,
      userId: result.user.id,
      expiresAt: result.token.accessTokenExpiresAt,
      createdAt: result.token.createdAt,
      updatedAt: result.token.updatedAt,
      ipAddress: null,
      userAgent: null,
    },
    user: result.user,
  } as AuthSession;
}


/**
 * 1. CONTEXT
 *
 * This section defines the "contexts" that are available in the backend API.
 *
 * These allow you to access things when processing a request, like the database, the session, etc.
 *
 * This helper generates the "internals" for a tRPC context. The API handler and RSC clients each
 * wrap this and provides the required context.
 *
 * @see https://trpc.io/docs/server/context
 */
export const createTRPCContext = async (opts: { headers: Headers }) => {
  const cookieSession = await auth.api.getSession({
    headers: opts.headers,
  });
  const session = cookieSession ?? (await getOAuthSession(opts.headers));

  return {
    db,
    session,
    ...opts,
  };
};

/**
 * 2. INITIALIZATION
 *
 * This is where the tRPC API is initialized, connecting the context and transformer. We also parse
 * ZodErrors so that you get typesafety on the frontend if your procedure fails due to validation
 * errors on the backend.
 */
const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
  errorFormatter({ shape, error }) {
    return {
      ...shape,
      data: {
        ...shape.data,
        zodError:
          error.cause instanceof ZodError ? error.cause.flatten() : null,
      },
    };
  },
});

const rateLimitMiddleware = t.middleware(async ({ ctx, next }) => {
  try {
    await enforceTrpcRateLimit(ctx.headers, ctx.session?.user?.id);
  } catch (error) {
    if (error instanceof RateLimitExceededError) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: `Rate limit exceeded. Try again in ${error.retryAfterSeconds} seconds.`,
      });
    }

    if (error instanceof RateLimitUnavailableError) {
      console.error("Valkey rate limiter unavailable; rejecting request");
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Service temporarily unavailable. Please try again shortly.",
      });
    }

    throw error;
  }

  return next();
});

/**
 * Create a server-side caller.
 *
 * @see https://trpc.io/docs/server/server-side-calls
 */
export const createCallerFactory = t.createCallerFactory;

/**
 * 3. ROUTER & PROCEDURE (THE IMPORTANT BIT)
 *
 * These are the pieces you use to build your tRPC API. You should import these a lot in the
 * "/src/server/api/routers" directory.
 */

/**
 * This is how you create new routers and sub-routers in your tRPC API.
 *
 * @see https://trpc.io/docs/router
 */
export const createTRPCRouter = t.router;

/**
 * Middleware for timing procedure execution and adding an artificial delay in development.
 *
 * You can remove this if you don't like it, but it can help catch unwanted waterfalls by simulating
 * network latency that would occur in production but not in local development.
 */
const timingMiddleware = t.middleware(async ({ next, path }) => {
  const start = Date.now();

  if (t._config.isDev) {
    // artificial delay in dev
    const waitMs = Math.floor(Math.random() * 400) + 100;
    await new Promise((resolve) => setTimeout(resolve, waitMs));
  }

  const result = await next();

  const end = Date.now();
  console.log(`[TRPC] ${path} took ${end - start}ms to execute`);

  return result;
});

/**
 * Public (unauthenticated) procedure
 *
 * This is the base piece you use to build new queries and mutations on your tRPC API. It does not
 * guarantee that a user querying is authorized, but you can still access user session data if they
 * are logged in.
 */
export const publicProcedure = t.procedure
  .use(timingMiddleware)
  .use(rateLimitMiddleware);

/**
 * Protected (authenticated) procedure
 *
 * If you want a query or mutation to ONLY be accessible to logged in users, use this. It verifies
 * the session is valid and guarantees `ctx.session.user` is not null.
 *
 * @see https://trpc.io/docs/procedures
 */
export const protectedProcedure = t.procedure
  .use(timingMiddleware)
  .use(rateLimitMiddleware)
  .use(({ ctx, next }) => {
    if (!ctx.session || !ctx.session.user) {
      throw new TRPCError({ code: "UNAUTHORIZED" });
    }
    return next({
      ctx: {
        // infers the `session` as non-nullable
        session: { ...ctx.session, user: ctx.session.user },
      },
    });
  });

const forceAdminMiddleware = t.middleware(async ({ ctx: { session }, next }) => {
  if (session?.user.role !== "admin") {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }
  return next({
    ctx: {
      session: { ...session, user: { ...session.user, role: "admin" } },
    },
  });
})
export const adminProcedure = t.procedure
  .use(rateLimitMiddleware)
  .use(forceAdminMiddleware);
