-- Add AI profiling fields to contacts
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS age_group VARCHAR(50),
ADD COLUMN IF NOT EXISTS interests TEXT,
ADD COLUMN IF NOT EXISTS budget_preference VARCHAR(100);

-- Add AI recommendations caching to events
ALTER TABLE public.events 
ADD COLUMN IF NOT EXISTS ai_recommendations JSONB DEFAULT NULL;
