-- Create notification_logs table to prevent duplicate emails
create table public.notification_logs (
    id uuid default gen_random_uuid() primary key,
    created_at timestamp with time zone default timezone('utc'::text, now()) not null,
    user_id uuid references auth.users(id) on delete cascade not null,
    event_id uuid not null, -- Can be an event ID or simply the user ID for Account Birthdays
    contact_id uuid references public.contacts(id) on delete cascade,
    notification_type text not null, -- 'EMAIL', 'ACCOUNT_BIRTHDAY', 'ACCOUNT_NAME_DAY'
    trigger_days integer not null, -- The day offset when it was sent (e.g. 10, 7, 3, 0)
    status text default 'SENT',
    sent_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Indexes for fast duplicate lookups
create index idx_notification_logs_user_event_days 
    on public.notification_logs(user_id, event_id, notification_type, trigger_days);

-- Add Row Level Security (RLS) policies
alter table public.notification_logs enable row level security;

-- Users can read their own logs
create policy "Users can view their own notification logs"
    on public.notification_logs for select
    using ( auth.uid() = user_id );

-- Service role has full access via Edge Functions automatically.
