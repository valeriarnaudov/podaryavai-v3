-- Add Active Toggle for Plans
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
