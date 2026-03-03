-- Add advanced AI profiling fields to contacts table
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS weekend_activity TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS favorite_vibe TEXT DEFAULT NULL,
ADD COLUMN IF NOT EXISTS dislikes TEXT DEFAULT NULL;
