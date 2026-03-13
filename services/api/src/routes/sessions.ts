import { Hono } from "hono";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import {
  RunTaskBody,
  CheckpointBody,
  RestoreBody,
  type SessionResponse,
  type RunResult,
  type CheckpointResponse,
  type CloseResponse,
} from "../lib/types.js";
import {
  SessionStore,
  SessionNotFoundError,
  SessionClosedError,
  CheckpointNotFoundError,
} from "../lib/session-store.js";

const sessions = new Hono();
const store = new SessionStore();

function parseBody<T extends z.ZodTypeAny>(
  schema: T,
  data: unknown
): z.infer<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    const formatted = result.error.issues
      .map((i) => `${i.path.join(".")}: ${i.message}`)
      .join("; ");
    throw new HTTPException(400, { message: `Validation error: ${formatted}` });
  }
  return result.data;
}

function handleDomainError(err: unknown): never {
  if (err instanceof SessionNotFoundError) {
    throw new HTTPException(404, { message: err.message });
  }
  if (err instanceof SessionClosedError) {
    throw new HTTPException(409, { message: err.message });
  }
  if (err instanceof CheckpointNotFoundError) {
    throw new HTTPException(404, { message: err.message });
  }
  throw err;
}

/** POST /sessions — spawn a new session */
sessions.post("/", (c) => {
  const session = store.create();
  const body: SessionResponse = {
    id: session.id,
    status: session.status,
    createdAt: session.createdAt,
  };
  return c.json(body, 201);
});

/** GET /sessions/:id — return session status */
sessions.get("/:id", (c) => {
  const id = c.req.param("id");
  try {
    const session = store.get(id);
    if (!session) throw new SessionNotFoundError(id);
    const body: SessionResponse = {
      id: session.id,
      status: session.status,
      createdAt: session.createdAt,
    };
    return c.json(body);
  } catch (err) {
    handleDomainError(err);
  }
});

/** POST /sessions/:id/run — execute a task */
sessions.post("/:id/run", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json();
  const { task } = parseBody(RunTaskBody, raw);
  try {
    const result: RunResult = store.run(id, task);
    return c.json(result);
  } catch (err) {
    handleDomainError(err);
  }
});

/** POST /sessions/:id/checkpoint — create a checkpoint */
sessions.post("/:id/checkpoint", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json();
  const { label } = parseBody(CheckpointBody, raw);
  try {
    const result: CheckpointResponse = store.checkpoint(id, label);
    return c.json(result, 201);
  } catch (err) {
    handleDomainError(err);
  }
});

/** POST /sessions/:id/restore — restore from checkpoint */
sessions.post("/:id/restore", async (c) => {
  const id = c.req.param("id");
  const raw = await c.req.json();
  const { checkpoint_id } = parseBody(RestoreBody, raw);
  try {
    store.restore(id, checkpoint_id);
    return c.json({ restored: true });
  } catch (err) {
    handleDomainError(err);
  }
});

/** DELETE /sessions/:id — close session */
sessions.delete("/:id", (c) => {
  const id = c.req.param("id");
  try {
    store.close(id);
    const body: CloseResponse = { closed: true };
    return c.json(body);
  } catch (err) {
    handleDomainError(err);
  }
});

export { sessions };
