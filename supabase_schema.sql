-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. Users Table (extends Supabase Auth users)
create table if not exists public.users (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text,
  avatar_url text,
  subscription_plan text default 'FREE' check (subscription_plan in ('FREE', 'STANDARD', 'PRO', 'ULTRA', 'BUSINESS')),
  karma_points integer default 0,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Contacts Table
create table if not exists public.contacts (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  name text not null,
  relationship text, -- e.g., 'Friend', 'Family', 'Colleague'
  avatar_url text,
  notes text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. Events Table
create table if not exists public.events (
  id uuid default uuid_generate_v4() primary key,
  contact_id uuid references public.contacts(id) on delete cascade not null,
  user_id uuid references public.users(id) on delete cascade not null,
  title text not null, -- e.g., 'Birthday', 'Name Day'
  event_date date not null,
  event_type text, -- 'BIRTHDAY', 'NAME_DAY', 'ANNIVERSARY', 'OTHER'
  is_recurring boolean default true,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 4. Gift Ideas Table
create table if not exists public.gift_ideas (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  contact_id uuid references public.contacts(id) on delete set null,
  title text not null,
  description text,
  image_url text,
  price_range text,
  source_url text, -- Original link to product if available
  is_saved boolean default false,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. Concierge Orders Table
create table if not exists public.concierge_orders (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.users(id) on delete cascade not null,
  gift_idea_id uuid references public.gift_ideas(id) on delete set null,
  status text default 'PENDING_OFFER' check (status in ('PENDING_OFFER', 'OFFER_READY', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  delivery_address text,
  recipient_name text,
  recipient_phone text,
  total_price numeric(10, 2), -- Set by admin after checking
  payment_method text check (payment_method in ('CARD', 'CASH_ON_DELIVERY')),
  tracking_number text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Setup Row Level Security (RLS)
alter table public.users enable row level security;
alter table public.contacts enable row level security;
alter table public.events enable row level security;
alter table public.gift_ideas enable row level security;
alter table public.concierge_orders enable row level security;

-- Create Policies

-- Users: can only read and update their own profile
create policy "Users can view own profile." on public.users for select using (auth.uid() = id);
create policy "Users can update own profile." on public.users for update using (auth.uid() = id);

-- Contacts: users can only CRUD their own contacts
create policy "Users can view own contacts." on public.contacts for select using (auth.uid() = user_id);
create policy "Users can insert own contacts." on public.contacts for insert with check (auth.uid() = user_id);
create policy "Users can update own contacts." on public.contacts for update using (auth.uid() = user_id);
create policy "Users can delete own contacts." on public.contacts for delete using (auth.uid() = user_id);

-- Events
create policy "Users can view own events." on public.events for select using (auth.uid() = user_id);
create policy "Users can insert own events." on public.events for insert with check (auth.uid() = user_id);
create policy "Users can update own events." on public.events for update using (auth.uid() = user_id);
create policy "Users can delete own events." on public.events for delete using (auth.uid() = user_id);

-- Gift Ideas
create policy "Users can view own gift ideas." on public.gift_ideas for select using (auth.uid() = user_id);
create policy "Users can insert own gift ideas." on public.gift_ideas for insert with check (auth.uid() = user_id);
create policy "Users can update own gift ideas." on public.gift_ideas for update using (auth.uid() = user_id);
create policy "Users can delete own gift ideas." on public.gift_ideas for delete using (auth.uid() = user_id);

-- Concierge Orders
create policy "Users can view own orders." on public.concierge_orders for select using (auth.uid() = user_id);
create policy "Users can insert own orders." on public.concierge_orders for insert with check (auth.uid() = user_id);
create policy "Users can update own orders." on public.concierge_orders for update using (auth.uid() = user_id);

-- Create a trigger to automatically create a user profile when a new auth user is created
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email);
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ==========================================
-- ADMIN EXPANSION & KARMA REWARDS (V3)
-- ==========================================

-- 1. Add new columns to users for Karma Rewards & Admin
ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_golden_aura BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS free_deliveries_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS has_vip_giftinder BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS karma_boost_until TIMESTAMP WITH TIME ZONE;

-- 2. Create 'global_gifts' table for VIP Giftinder options
CREATE TABLE IF NOT EXISTS public.global_gifts (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    title TEXT NOT NULL,
    price TEXT,
    description TEXT,
    image_url TEXT,
    is_vip BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS and add basic policies
ALTER TABLE public.global_gifts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.global_gifts FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.global_gifts FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- 3. Create 'platform_settings' table for global settings
CREATE TABLE IF NOT EXISTS public.platform_settings (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    setting_key TEXT UNIQUE NOT NULL,
    setting_value TEXT NOT NULL,
    description TEXT
);

-- Enable RLS
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable read access for all users" ON public.platform_settings FOR SELECT USING (true);
CREATE POLICY "Enable all access for admins" ON public.platform_settings FOR ALL USING (
    (SELECT is_admin FROM public.users WHERE id = auth.uid()) = true
);

-- Insert some default platform settings
INSERT INTO public.platform_settings (setting_key, setting_value, description)
VALUES 
    ('referral_bonus_points', '50', 'Karma points awarded when someone registers via referral link'),
    ('add_contact_points', '10', 'Karma points awarded for adding a new contact')
ON CONFLICT (setting_key) DO NOTHING;

-- ==========================================
-- PERSONALIZED AI GIFTINDER (V4)
-- ==========================================
ALTER TABLE public.gift_ideas 
ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;

ALTER TABLE public.users 
ADD COLUMN IF NOT EXISTS last_giftinder_generation TIMESTAMP WITH TIME ZONE;
