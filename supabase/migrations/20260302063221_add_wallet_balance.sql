-- Add `wallet_balance` to users for the Concierge to use for AI generation limits
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS wallet_balance NUMERIC DEFAULT 0.00;
