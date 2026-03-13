import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { logger } from "hono/logger";
import { initTelemetry } from "./lib/telemetry.js";
import { authMiddleware } from "./middleware/auth.js";
import { tracingMiddleware } from "./middleware/tracing.js";
import { sessions } from "./routes/sessions.js";

const sdk = initTelemetry();

const app = new Hono();

app.use("*", logger());
app.use("*", tracingMiddleware);
app.use("/sessions/*", authMiddleware);
app.use("/sessions", authMiddleware);

app.get("/health", (c) => c.json({ status: "ok" }));
app.route("/sessions", sessions);

app.notFound((c) =>
  c.json({ error: "Not found", message: `No route for ${c.req.method} ${c.req.path}` }, 404)
);

app.onError((err, c) => {
  if ("status" in err && typeof err.status === "number") {
    return c.json(
      { error: err.message ?? "Request error" },
      err.status as 400
    );
  }
  console.error("Unhandled error:", err);
  return c.json({ error: "Internal server error" }, 500);
});

const port = Number(process.env["PORT"] ?? 8787);

serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Cradle API listening on http://localhost:${info.port}`);
});

process.on("SIGTERM", async () => {
  console.log("Shutting down...");
  await sdk.shutdown();
  process.exit(0);
});

export { app };
