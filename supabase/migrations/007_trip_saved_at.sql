-- Add saved_at column to mark explicitly saved trips
ALTER TABLE trips ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ;

-- Index for efficient queries on saved trips per user
CREATE INDEX IF NOT EXISTS trips_user_saved_idx ON trips (user_id, saved_at)
  WHERE saved_at IS NOT NULL;
