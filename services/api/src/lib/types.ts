import { z } from "zod";

export const SessionStatus = z.enum([
  "starting",
  "running",
  "paused",
  "closed",
  "error",
]);
export type SessionStatus = z.infer<typeof SessionStatus>;

export const SessionResponse = z.object({
  id: z.string().uuid(),
  status: SessionStatus,
  createdAt: z.string().datetime(),
});
export type SessionResponse = z.infer<typeof SessionResponse>;

export const RunTaskBody = z.object({
  task: z.string().min(1, "task is required"),
});
export type RunTaskBody = z.infer<typeof RunTaskBody>;

export const RunResult = z.object({
  sessionId: z.string().uuid(),
  task: z.string(),
  status: z.enum(["completed", "failed", "timeout"]),
  output: z.string().nullable(),
  durationMs: z.number().nonnegative(),
});
export type RunResult = z.infer<typeof RunResult>;

export const CheckpointBody = z.object({
  label: z.string().min(1, "label is required"),
});
export type CheckpointBody = z.infer<typeof CheckpointBody>;

export const CheckpointResponse = z.object({
  checkpoint_id: z.string().uuid(),
});
export type CheckpointResponse = z.infer<typeof CheckpointResponse>;

export const RestoreBody = z.object({
  checkpoint_id: z.string().uuid("checkpoint_id must be a valid UUID"),
});
export type RestoreBody = z.infer<typeof RestoreBody>;

export const CloseResponse = z.object({
  closed: z.literal(true),
});
export type CloseResponse = z.infer<typeof CloseResponse>;

export const ErrorResponse = z.object({
  error: z.string(),
  message: z.string().optional(),
});
export type ErrorResponse = z.infer<typeof ErrorResponse>;
