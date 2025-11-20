// import { wordRouter } from "./routers/word";
// import { authRouter } from "./routers/auth";
// import { userRouter } from "./routers/user";
// import { adminRouter } from "./routers/admin";
// import { createCallerFactory, createTRPCRouter } from "@/src/server/api/trpc";
// /**
//  * This is the primary router for your server.
//  *
//  * All routers added in /api/routers should be manually added here.
//  */


// // export type definition of API


// /**
//  * This is the primary router for your server.
//  *
//  * All routers added in /api/routers should be manually added here.
//  */
// export const appRouter = createTRPCRouter({
//   word: wordRouter,
//   auth: authRouter,
//   user: userRouter,
//   admin: adminRouter,
// });

// // export type definition of API
// export type AppRouter = typeof appRouter;

// /**
//  * Create a server-side caller for the tRPC API.
//  * @example
//  * const trpc = createCaller(createContext);
//  * const res = await trpc.post.all();
//  *       ^? Post[]
//  */
// export const createCaller = createCallerFactory(appRouter);
import { wordRouter } from "./routers/word";
import { userRouter } from "./routers/user";
import { adminRouter } from "./routers/admin";
import { createCallerFactory, createTRPCRouter } from "./trpc";
import { paramsRouter } from "./routers/params";
import { requestRouter } from "./routers/request";
import { announcementsRouter } from "./routers/announcements";
import { profileRouter } from "./routers/profile";
import { feedbackRouter } from "./routers/feedback";
import { voteRouter } from "./routers/vote";
import { searchRouter } from "./routers/search";
import { extrasRouter } from "./routers/extras";
import { badgeRouter } from "./routers/badge";

/**
 * This is the primary router for your server.
 *
 * All routers added in /api/routers should be manually added here.
 */
export const appRouter = createTRPCRouter({
  word: wordRouter,
  user: userRouter,
  admin: adminRouter,
  params: paramsRouter,
  request: requestRouter,
  announcements: announcementsRouter,
  profile: profileRouter,
  feedback: feedbackRouter,
  vote: voteRouter,
  search: searchRouter,
  extras: extrasRouter,
  badge: badgeRouter,
});

// export type definition of API
export type AppRouter = typeof appRouter;

/**
 * Create a server-side caller for the tRPC API.
 * @example
 * const trpc = createCaller(createContext);
 * const res = await trpc.post.all();
 *       ^? Post[]
 */
export const createCaller = createCallerFactory(appRouter);
