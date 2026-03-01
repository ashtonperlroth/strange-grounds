import { router } from "./init";
import { tripsRouter } from "./routers/trips";
import { briefingsRouter } from "./routers/briefings";

export const appRouter = router({
  trips: tripsRouter,
  briefings: briefingsRouter,
});

export type AppRouter = typeof appRouter;
