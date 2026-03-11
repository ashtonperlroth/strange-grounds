-- Enable Supabase Realtime for the briefings table so clients can subscribe
-- to Postgres change events instead of polling.
ALTER PUBLICATION supabase_realtime ADD TABLE briefings;
