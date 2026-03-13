import { v4 as uuid } from "uuid";
import type { SessionStatus, RunResult, CheckpointResponse } from "./types.js";

interface SessionRecord {
  id: string;
  status: SessionStatus;
  createdAt: string;
  checkpoints: Map<string, { id: string; label: string; createdAt: string }>;
}

/**
 * In-memory session store. This will be replaced by a persistent store
 * (e.g. backed by the Rust kernel) in production.
 */
export class SessionStore {
  private sessions = new Map<string, SessionRecord>();

  create(): SessionRecord {
    const id = uuid();
    const session: SessionRecord = {
      id,
      status: "running",
      createdAt: new Date().toISOString(),
      checkpoints: new Map(),
    };
    this.sessions.set(id, session);
    return session;
  }

  get(id: string): SessionRecord | undefined {
    return this.sessions.get(id);
  }

  run(
    id: string,
    task: string
  ): RunResult {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    if (session.status === "closed") throw new SessionClosedError(id);

    const start = Date.now();

    return {
      sessionId: id,
      task,
      status: "completed",
      output: `Executed: ${task}`,
      durationMs: Date.now() - start,
    };
  }

  checkpoint(id: string, label: string): CheckpointResponse {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    if (session.status === "closed") throw new SessionClosedError(id);

    const checkpointId = uuid();
    session.checkpoints.set(checkpointId, {
      id: checkpointId,
      label,
      createdAt: new Date().toISOString(),
    });

    return { checkpoint_id: checkpointId };
  }

  restore(id: string, checkpointId: string): void {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    if (session.status === "closed") throw new SessionClosedError(id);

    const cp = session.checkpoints.get(checkpointId);
    if (!cp) {
      throw new CheckpointNotFoundError(id, checkpointId);
    }

    session.status = "running";
  }

  close(id: string): void {
    const session = this.sessions.get(id);
    if (!session) throw new SessionNotFoundError(id);
    session.status = "closed";
  }
}

export class SessionNotFoundError extends Error {
  constructor(id: string) {
    super(`Session not found: ${id}`);
    this.name = "SessionNotFoundError";
  }
}

export class SessionClosedError extends Error {
  constructor(id: string) {
    super(`Session is closed: ${id}`);
    this.name = "SessionClosedError";
  }
}

export class CheckpointNotFoundError extends Error {
  constructor(sessionId: string, checkpointId: string) {
    super(
      `Checkpoint ${checkpointId} not found in session ${sessionId}`
    );
    this.name = "CheckpointNotFoundError";
  }
}
