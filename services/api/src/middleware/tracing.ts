import { trace, SpanStatusCode, type Span } from "@opentelemetry/api";
import type { Context, Next } from "hono";

const tracer = trace.getTracer("cradle-api");

export async function tracingMiddleware(
  c: Context,
  next: Next
): Promise<void> {
  const method = c.req.method;
  const path = c.req.path;

  await tracer.startActiveSpan(`${method} ${path}`, async (span: Span) => {
    span.setAttribute("http.method", method);
    span.setAttribute("http.url", c.req.url);
    span.setAttribute("http.route", path);

    try {
      await next();

      span.setAttribute("http.status_code", c.res.status);
      if (c.res.status >= 400) {
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: `HTTP ${c.res.status}`,
        });
      } else {
        span.setStatus({ code: SpanStatusCode.OK });
      }
    } catch (err) {
      span.setStatus({
        code: SpanStatusCode.ERROR,
        message: err instanceof Error ? err.message : "Unknown error",
      });
      span.recordException(
        err instanceof Error ? err : new Error(String(err))
      );
      throw err;
    } finally {
      span.end();
    }
  });
}
