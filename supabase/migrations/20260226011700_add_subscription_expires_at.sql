-- Add column for subscription plan expiration
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMP WITH TIME ZONE;
