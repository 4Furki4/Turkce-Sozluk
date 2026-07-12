import { createTRPCRouter, publicProcedure } from "../trpc";
import { getWordGraphNeighborhood, graphInputSchema } from "./word-graph-utils";

export const wordGraphRouter = createTRPCRouter({
  getNeighborhood: publicProcedure.input(graphInputSchema).query(async ({ input, ctx: { db } }) => {
    return getWordGraphNeighborhood(db, input);
  }),
});
