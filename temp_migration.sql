ALTER TABLE public.subscription_plans 
ADD COLUMN IF NOT EXISTS price_annual NUMERIC(10, 2) DEFAULT 0,
ADD COLUMN IF NOT EXISTS stripe_price_id_annual TEXT;

UPDATE public.subscription_plans 
SET price_annual = price * 10 
WHERE price > 0;
