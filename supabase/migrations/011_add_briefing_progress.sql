-- Add progress JSONB column to briefings for progressive/streaming UX.
-- The pipeline writes intermediate results here as each step completes,
-- allowing the client to render partial data before the full briefing is ready.
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS progress JSONB DEFAULT '{}';
