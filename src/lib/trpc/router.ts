import { router } from "./init";
import { tripsRouter } from "./routers/trips";
import { briefingsRouter } from "./routers/briefings";
import { routesRouter } from "./routers/routes";

export const appRouter = router({
  trips: tripsRouter,
  briefings: briefingsRouter,
  routes: routesRouter,
});

export type AppRouter = typeof appRouter;
