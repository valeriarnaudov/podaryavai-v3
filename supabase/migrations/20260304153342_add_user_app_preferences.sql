-- Add application preferences to the users table
ALTER TABLE users
ADD COLUMN app_language TEXT DEFAULT 'bg' NOT NULL, -- Ensure BG is natively first for capturing the BG market
ADD COLUMN app_theme TEXT DEFAULT 'light' NOT NULL,
ADD COLUMN notify_email_events BOOLEAN DEFAULT true NOT NULL;
