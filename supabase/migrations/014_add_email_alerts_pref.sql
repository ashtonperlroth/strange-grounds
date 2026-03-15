-- Add email notification preference to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email_alerts_enabled BOOLEAN NOT NULL DEFAULT true;
