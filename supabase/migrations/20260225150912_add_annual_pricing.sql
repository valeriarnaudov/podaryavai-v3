-- Add Annual Pricing Columns
ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_annual NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id_annual TEXT;

-- Seed dummy data into existing rows (just to avoid nulls for now where prices exist)
UPDATE public.subscription_plans 
SET price_annual = price * 10 
WHERE price > 0;
