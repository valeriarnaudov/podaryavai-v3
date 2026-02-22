# 🚀 Пълен Списък за Продукция (Deployment Checklist)

Този файл съдържа абсолютно всички стъпки, които сме правили или трябва да се направят, за да може Podaryavai приложението да заработи на 100% в реална (продъкшън) среда. Можете да го използвате като TODO лист и да отмятате `[ ]` на `[x]`, докато напредвате.

---

## 1. 🗄️ База Данни & Supabase (Основата)
- [ ] Създаден е нов проект в [Supabase.com](https://supabase.com).
- [ ] Локално сте се свързали към проекта чрез CLI: `npx supabase login` и `npx supabase link --project-ref <ваш-project-id>`.
- [ ] Изпълнен е `supabase_schema.sql` кода в SQL Editor-а на Supabase. (Създава таблици: `users`, `contacts`, `events`, `gift_ideas`, `concierge_orders` + RLS политики).
- [ ] Изпълнен е обновленият SQL за поддръжка на първо/фамилно име, аватари и `is_admin` роли.
- [ ] Изпълнен е `supabase_notifications_schema.sql` кода в SQL Editor-а. (Създава `notification_logs` таблицата).
- [ ] Изпълнен е SQL кодът за Karma Rewards и Admin панел: 
  - `ALTER TABLE public.users ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS is_banned BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS has_golden_aura BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS free_deliveries_count INT DEFAULT 0, ADD COLUMN IF NOT EXISTS has_vip_giftinder BOOLEAN DEFAULT false, ADD COLUMN IF NOT EXISTS karma_boost_until TIMESTAMP WITH TIME ZONE, ADD COLUMN IF NOT EXISTS last_giftinder_generation TIMESTAMP WITH TIME ZONE;`
  - `ALTER TABLE public.gift_ideas ADD COLUMN IF NOT EXISTS is_manual BOOLEAN DEFAULT false;`
  - Създаване на `global_gifts` таблица за Giftinder + RLS политики.
  - Създаване на `platform_settings` таблица за админ настройки + RLS политики.

## 2. 🔐 Аутентикация и Вход (Supabase Auth)
- [ ] Отидете в **Authentication -> Providers** във вашия Supabase панел.
- [ ] Уверете се, че **Email** е включен.
- [ ] **Google Вход:** Включете Google Provider-а.
   - [ ] Създайте OAuth credentials в [Google Cloud Console](https://console.cloud.google.com/).
   - [ ] Поставете взетите *Client ID* и *Client Secret* в Supabase.
   - [ ] Добавете Callback URL-то от Supabase (напр. `https://<project-ref>.supabase.co/auth/v1/callback`) в Google Cloud Console.
- [ ] **Redirect URLs:** В **Authentication -> URL Configuration**, добавете реалния домейн (напр. `https://podaryavai.com`) в *Site URL* и *Redirect URLs*, за да се връщат потребителите правилно след вход с Google.
   *(Бележка: Ако тествате локално, не забравяйте да добавите и `http://localhost:5173` и `http://localhost:5173/*` в списъка с Redirect URLs).*

## 3. 🌐 Environment Variables (.env)
- [ ] В основната папка създайте `.env.local` или `.env` файл (а за хостинга като Vercel ги добавете там):
  ```env
  VITE_SUPABASE_URL="https://<ваш-project-ref>.supabase.co"
  VITE_SUPABASE_ANON_KEY="<ваш-anon-key>"
  ```

## 4. 🧠 Изкуствен Интелект (OpenAI Edge Function)
- [ ] Добавете вашия OpenAI API Key като тайна (Secret) в Supabase. Това става през терминала:
  `npx supabase secrets set OPENAI_API_KEY="sk-proj-вашият-ключ"`
- [ ] Deploy-нете функцията в облака: 
  `npx supabase functions deploy create_gift_ideas`

## 5. 💳 Плащания и Консиерж (Stripe Edge Function)
- [ ] Създайте акаунт в Stripe и вземете Secret Key (започва с `sk_test_` или `sk_live_`).
- [ ] Добавете ключа като тайна в Supabase:
  `npx supabase secrets set STRIPE_SECRET_KEY="sk_...вашият-ключ"`
- [ ] Deploy-нете функцията за плащане:
  `npx supabase functions deploy create_checkout_session`
*(Бонус стъпка: В бъдеще ще е добре да се добави и Stripe Webhook, който автоматично да сменя статуса на поръчката в базата на `PAID`, когато плащането мине).*

## 6. 🔔 Автоматизирани Известия (CRON & Emails)
- [ ] Отидете в Supabase Dashboard -> **Database -> Extensions** и потърсете `pg_cron`. Натиснете **Enable**.
- [ ] Важна стъпка: Ежедневната функция има нужда от Service Role Key (за да може да чете данните без RLS рестрикции) и URL на проекта. Добавете ги като тайни:
  `npx supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"`
  `npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<вашият-service-role-key>"`
- [ ] Настройте API интеграцията за изпращане на имейли (напр. Resend). Добавете ключа им:
  `npx supabase secrets set RESEND_API_KEY="re_..."`
  -> *Забележка: Влезте във файла `supabase/functions/daily_notifications/index.ts` и разкоментирайте кода `await fetch('https://api.resend.com/emails'...`, за да заработи реалното изпращане.*
- [ ] Deploy-нете CRON функцията:
  `npx supabase functions deploy daily_notifications`
- [ ] Отидете в SQL Editor-а на Supabase и изпълнете таймера (той ще я вика всеки ден в 08:00):
  ```sql
  SELECT cron.schedule('daily-event-notifications', '0 8 * * *', $$
    select net.http_post(
        url:='https://<project-ref>.supabase.co/functions/v1/daily_notifications',
        headers:='{"Content-Type": "application/json", "Authorization": "Bearer <ваш-anon-или-service-key>"}'::jsonb,
        body:='{}'::jsonb
    ) as request_id;
  $$);
  ```

## 7. 🌍 Деплой на Фронтенда (Хостинг)
- [ ] Качете кода в GitHub хранилище.
- [ ] Свържете хранилището с платформа за хостинг като **Vercel** или **Netlify**.
- [ ] В настройките на избрания хостинг (Environment Variables) задайте вашите `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
- [ ] Задайте Build команда: `npm run build` и Output директория: `dist`.
- [ ] Деплойнете проекта! 🎉

---
**Кратки команди за поправка на функциите след промени по файловете:**
```bash
# Ако редактирате шаблоните (templates.ts) или логиката, трябва да пуснете:
npx supabase functions deploy daily_notifications
```

### Step 5: Deploy Edge Function
Because the AI personalized generation happens securely on the backend, you need to deploy the new Edge Function to your Supabase project.

1. Open a terminal in the project folder.
2. Run: `npx supabase functions deploy generate_daily_gifts --project-ref <YOUR_PROJECT_ID> --no-verify-jwt`
3. Then set the OpenAI Secret Key in your Supabase Dashboard:
   - Go to Project Settings -> Edge Functions -> Secrets
   - Add a new secret: `OPENAI_API_KEY` with your actual OpenAI API key value.
