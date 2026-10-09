import type { inferRouterInputs } from "@trpc/server";
import type { AppRouter } from "@/src/server/api/root";

export const savedWordsInitialInput = {
  search: "",
  sortAlphabet: "az",
  sortDate: "dateDesc",
  sortBy: "date",
  take: 6,
  skip: 0,
} as const satisfies inferRouterInputs<AppRouter>["user"]["getSavedWords"];
