-- Adding new specific profiling questions to contacts table
ALTER TABLE public.contacts 
ADD COLUMN IF NOT EXISTS personality VARCHAR(100),
ADD COLUMN IF NOT EXISTS style VARCHAR(100),
ADD COLUMN IF NOT EXISTS favorite_color VARCHAR(50);
