-- Add pipeline_status to briefings for progressive status updates during generation.
-- Also add geometry_hash to routes for segment cache invalidation.
ALTER TABLE briefings ADD COLUMN IF NOT EXISTS pipeline_status TEXT;

ALTER TABLE routes ADD COLUMN IF NOT EXISTS geometry_hash TEXT;
