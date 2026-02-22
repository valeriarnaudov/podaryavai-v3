-- Създаване на таблица за история на известията (Notification Logs)
CREATE TABLE IF NOT EXISTS public.notification_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.users(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    contact_id UUID REFERENCES public.contacts(id) ON DELETE CASCADE,
    notification_type VARCHAR(50) NOT NULL, -- e.g., 'EMAIL', 'PUSH'
    trigger_days INT NOT NULL, -- 10, 7, 3, or 0
    status VARCHAR(50) NOT NULL DEFAULT 'SENT', -- 'SENT', 'FAILED'
    sent_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Политики за сигурност (Admin Panel and Users)
ALTER TABLE public.notification_logs ENABLE ROW LEVEL SECURITY;

-- Потребителите могат да виждат само техните си логове
CREATE POLICY "Users can view own notification logs." ON public.notification_logs
    FOR SELECT USING (auth.uid() = user_id);

-- Специфична политика за Админи (ако добавим role базиран достъп, засега позволяваме четене за admin dashboard)
-- Тук за целите на демонстрацията AdminPanel-а ще чете всичко (в реална среда се проверява дали auth.uid() има 'admin' роля)
CREATE POLICY "Enable read access for all users (temporarily for Admin Dashboard)" ON public.notification_logs
    FOR SELECT USING (true); 

-- Trigger за автоматизирано стартиране на Edge Function всеки ден в 08:00 чрез pg_cron
-- ЗАБЕЛЕЖКА: pg_cron трябва да бъде активиран (Enable Extension "pg_cron" в Supabase Dashboard -> Database -> Extensions)
-- Следващият SQL код създава scheduled job:

-- SELECT cron.schedule(
--   'daily-event-notifications',
--   '0 8 * * *', -- Всеки ден в 08:00 сутринта
--   $$
--     select net.http_post(
--         url:='https://iotweqixckcgdljjcoha.supabase.co/functions/v1/daily_notifications',
--         headers:='{"Content-Type": "application/json", "Authorization": "Bearer YOUR_SERVICE_ROLE_KEY"}'::jsonb,
--         body:='{}'::jsonb
--     ) as request_id;
--   $$
-- );
