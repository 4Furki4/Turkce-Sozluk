import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { createServerSideHelpers } from "@trpc/react-query/server";
import { headers } from "next/headers";
import { cache } from "react";
import SuperJSON from "superjson";

import { appRouter, createCaller, type AppRouter } from "../server/api/root";
import { createTRPCContext } from "../server/api/trpc";
import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");

  return createTRPCContext({
    headers: heads,
  });
});

export const getServerSession = async () => (await createContext()).session;

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

/** Fetch once for SSR and hydrate the same result for browser queries. */
export const getServerQueryHelpers = cache(async () => createServerSideHelpers({
  router: appRouter,
  ctx: await createContext(),
  queryClient: getQueryClient(),
  transformer: SuperJSON,
}));

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient
);
