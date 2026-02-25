-- Add daily_generations_count to users table
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS daily_generations_count INTEGER DEFAULT 0;

-- Optional: Since last_giftinder_generation is currently the only check, we can safely reset existing counts
-- if we assume past dates don't matter or just let the app handle it via dates.
