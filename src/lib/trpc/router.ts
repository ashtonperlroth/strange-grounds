import { router } from "./init";
import { tripsRouter } from "./routers/trips";
import { briefingsRouter } from "./routers/briefings";
import { routesRouter } from "./routers/routes";
import { popularRoutesRouter } from "./routers/popular-routes";
import { segmentsRouter } from "./routers/segments";
import { alertsRouter } from "./routers/alerts";

export const appRouter = router({
  trips: tripsRouter,
  briefings: briefingsRouter,
  routes: routesRouter,
  popularRoutes: popularRoutesRouter,
  segments: segmentsRouter,
  alerts: alertsRouter,
});

export type AppRouter = typeof appRouter;
