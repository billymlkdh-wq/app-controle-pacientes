-- Add avatar_url to patients for profile photos
ALTER TABLE patients ADD COLUMN IF NOT EXISTS avatar_url TEXT;
