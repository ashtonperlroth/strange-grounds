import type { Context, Next } from "hono";
import { HTTPException } from "hono/http-exception";

const CRADLE_API_KEY = process.env["CRADLE_API_KEY"];

export async function authMiddleware(c: Context, next: Next): Promise<void> {
  if (!CRADLE_API_KEY) {
    throw new HTTPException(500, {
      message: "Server misconfiguration: CRADLE_API_KEY not set",
    });
  }

  const header = c.req.header("Authorization");
  if (!header) {
    throw new HTTPException(401, { message: "Missing Authorization header" });
  }

  const match = header.match(/^Bearer\s+(.+)$/i);
  if (!match) {
    throw new HTTPException(401, {
      message: "Invalid Authorization header format. Expected: Bearer <key>",
    });
  }

  const token = match[1];
  if (token !== CRADLE_API_KEY) {
    throw new HTTPException(403, { message: "Invalid API key" });
  }

  await next();
}
