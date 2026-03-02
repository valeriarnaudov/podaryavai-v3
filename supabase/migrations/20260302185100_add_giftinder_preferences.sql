-- Add giftinder_preferences to users table to store AI context
ALTER TABLE users ADD COLUMN IF NOT EXISTS giftinder_preferences JSONB DEFAULT '{}'::jsonb;
