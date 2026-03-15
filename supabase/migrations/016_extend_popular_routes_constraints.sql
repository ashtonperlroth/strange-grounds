-- Extend popular_routes constraints to support day_hike activity and multi-state routes
-- Required for spring/summer route seed (STR-105)

-- Drop and recreate activity check to include day_hike
ALTER TABLE popular_routes
  DROP CONSTRAINT IF EXISTS popular_routes_activity_check;

ALTER TABLE popular_routes
  ADD CONSTRAINT popular_routes_activity_check
    CHECK (activity IN ('backpacking', 'ski_touring', 'mountaineering', 'trail_running', 'day_hike'));

-- Drop and recreate state check to allow multi-state values like "CA/NV"
ALTER TABLE popular_routes
  DROP CONSTRAINT IF EXISTS popular_routes_state_check;

ALTER TABLE popular_routes
  ADD CONSTRAINT popular_routes_state_check
    CHECK (char_length(state) >= 2);
