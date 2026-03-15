-- Extend alerts table with monitoring-specific columns
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS previous_value TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS current_value TEXT;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS segment_order INTEGER;
ALTER TABLE alerts ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ;

-- Index for efficient trip alert lookups
CREATE INDEX IF NOT EXISTS alerts_trip_created_idx ON alerts (trip_id, created_at DESC);
CREATE INDEX IF NOT EXISTS alerts_user_unread_idx ON alerts (user_id, is_read) WHERE is_read = false;
