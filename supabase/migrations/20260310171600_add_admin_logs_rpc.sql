-- Create a secure RPC for admins to view notification logs with all related data
create or replace function get_admin_notification_logs()
returns table (
    id uuid,
    notification_type text,
    trigger_days integer,
    status text,
    sent_at timestamptz,
    user_full_name text,
    user_email text,
    contact_name text,
    event_title text
)
language plpgsql
security definer
as $$
begin
    -- Ensure the user is an admin
    if not exists (
        select 1 from public.users
        where users.id = auth.uid() and users.is_admin = true
    ) then
        raise exception 'Unauthorized';
    end if;

    return query
    select 
        nl.id,
        nl.notification_type,
        nl.trigger_days,
        nl.status,
        nl.sent_at,
        u.full_name as user_full_name,
        au.email::text as user_email,
        (c.first_name || ' ' || coalesce(c.last_name, ''))::text as contact_name,
        e.title as event_title
    from public.notification_logs nl
    left join public.users u on nl.user_id = u.id
    left join auth.users au on nl.user_id = au.id
    left join public.contacts c on nl.contact_id = c.id
    left join public.events e on nl.event_id = e.id
    order by nl.sent_at desc
    limit 50;
end;
$$;
