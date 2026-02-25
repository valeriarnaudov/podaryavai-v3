-- Create the subscription_plans table
CREATE TABLE IF NOT EXISTS public.subscription_plans (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    plan_key TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    stripe_price_id TEXT,
    features JSONB NOT NULL DEFAULT '[]'::jsonb,
    is_popular BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Enable RLS
ALTER TABLE public.subscription_plans ENABLE ROW LEVEL SECURITY;

-- Allow public read access to plans (needed for logged out users viewing /upgrade)
CREATE POLICY "Enable read access for all users" ON public.subscription_plans
    FOR SELECT USING (true);

-- Allow full access for admins only
CREATE POLICY "Enable write access for admins only" ON public.subscription_plans
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.users
            WHERE users.id = auth.uid() AND users.is_admin = true
        )
    );

-- Seed Initial Default Plans
INSERT INTO public.subscription_plans (plan_key, name, price, stripe_price_id, features, is_popular)
VALUES 
    ('FREE', 'Free Tier', 0, null, '["Up to 3 AI gift ideas daily", "Basic calendar events", "Save up to 10 ideas"]', false),
    ('STANDARD', 'Standard', 4.90, 'price_standard_test', '["Up to 15 AI gift ideas daily", "Standard AI model (Llama)", "Save up to 50 ideas", "Shared wishlists access"]', false),
    ('PRO', 'Pro', 9.90, 'price_pro_test', '["Up to 30 AI gift ideas daily", "Premium AI model (OpenAI GPT-4o)", "Unlimited saved ideas", "Priority email support", "No ads"]', true),
    ('ULTRA', 'Ultra', 14.90, 'price_ultra_test', '["Up to 100 AI gift ideas daily", "Premium AI model (OpenAI GPT-4o)", "1 Free Concierge Delivery / month", "Golden Aura badge", "24/7 Priority support"]', false),
    ('BUSINESS', 'Business', 49.90, 'price_business_test', '["Unlimited AI gift ideas daily", "Premium AI model (OpenAI GPT-4o)", "5 Free Concierge Deliveries / month", "API Access", "Custom branding on wishlists"]', false)
ON CONFLICT (plan_key) DO NOTHING;
