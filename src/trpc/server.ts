import "server-only";

import { createHydrationHelpers } from "@trpc/react-query/rsc";
import { io } from "next/cache";
import { headers } from "next/headers";
import { cache, createElement, type ComponentProps } from "react";

import { createCaller, type AppRouter } from "../server/api/root";
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

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

const {
  trpc: api,
  HydrateClient: BaseHydrateClient,
} = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient
);

export { api };

export async function HydrateClient(
  props: ComponentProps<typeof BaseHydrateClient>,
) {
  await io();
  return createElement(BaseHydrateClient, props);
}
