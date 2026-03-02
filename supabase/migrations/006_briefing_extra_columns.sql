-- Add bottom_line and readiness_rationale to briefings table
-- These columns are set by the generate-briefing Inngest pipeline
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS bottom_line TEXT;
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS readiness_rationale TEXT;
