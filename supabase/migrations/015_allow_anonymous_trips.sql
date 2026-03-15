-- Allow anonymous users to create trips (drop NOT NULL on user_id)
ALTER TABLE trips ALTER COLUMN user_id DROP NOT NULL;

-- Drop existing restrictive policies before recreating them
DROP POLICY IF EXISTS "Users can insert own trips" ON trips;
DROP POLICY IF EXISTS "Users can view own trips" ON trips;
DROP POLICY IF EXISTS "Users can update own trips" ON trips;
DROP POLICY IF EXISTS "Users can delete own trips" ON trips;
DROP POLICY IF EXISTS "Allow anonymous trip insert" ON trips;
DROP POLICY IF EXISTS "Allow trip read by id" ON trips;

-- Allow authenticated users to insert their own trips, or anonymous insert (user_id IS NULL)
CREATE POLICY "Allow trip insert"
  ON trips FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());

-- Allow users to read their own trips; anonymous trips readable by anyone with the ID (UUID = unguessable)
CREATE POLICY "Allow trip select"
  ON trips FOR SELECT
  USING (user_id IS NULL OR user_id = auth.uid());

-- Allow authenticated users to update their own trips
CREATE POLICY "Allow trip update"
  ON trips FOR UPDATE
  USING (user_id = auth.uid());

-- Allow authenticated users to delete their own trips
CREATE POLICY "Allow trip delete"
  ON trips FOR DELETE
  USING (user_id = auth.uid());

-- Briefings: allow anonymous reads/inserts/updates (IDs are random UUIDs)
DROP POLICY IF EXISTS "Allow briefing read by trip" ON briefings;
DROP POLICY IF EXISTS "Allow briefing insert for anonymous" ON briefings;
DROP POLICY IF EXISTS "Allow briefing update for pipeline" ON briefings;
DROP POLICY IF EXISTS "Users can view own briefings" ON briefings;
DROP POLICY IF EXISTS "Users can insert briefings" ON briefings;
DROP POLICY IF EXISTS "Users can update briefings" ON briefings;

CREATE POLICY "Allow briefing select"
  ON briefings FOR SELECT
  USING (true);

CREATE POLICY "Allow briefing insert"
  ON briefings FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow briefing update"
  ON briefings FOR UPDATE
  USING (true);
