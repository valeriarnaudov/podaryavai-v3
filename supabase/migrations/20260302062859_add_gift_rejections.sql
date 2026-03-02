-- Add `is_rejected` column to track cards that shouldn't be suggested again
ALTER TABLE public.gift_ideas ADD COLUMN IF NOT EXISTS is_rejected BOOLEAN DEFAULT false;
