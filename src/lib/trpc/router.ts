import { router } from "./init";
import { tripsRouter } from "./routers/trips";
import { briefingsRouter } from "./routers/briefings";
import { routesRouter } from "./routers/routes";
import { popularRoutesRouter } from "./routers/popular-routes";

export const appRouter = router({
  trips: tripsRouter,
  briefings: briefingsRouter,
  routes: routesRouter,
  popularRoutes: popularRoutesRouter,
});

export type AppRouter = typeof appRouter;
