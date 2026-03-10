# 🚀 Пълен Списък за Продукция (Deployment Checklist)

Този файл съдържа абсолютно всички стъпки, които сме правили или трябва да се
направят, за да може Podaryavai приложението да заработи на 100% в реална
(продъкшън) среда. Можете да го използвате като TODO лист и да отмятате `[ ]` на
`[x]`, докато напредвате.

---

## 1. 🗄️ База Данни & Supabase (Основата)

- [ ] Създаден е нов проект в [Supabase.com](https://supabase.com).
- [ ] Локално сте се свързали към проекта чрез CLI: `npx supabase login` и
      `npx supabase link --project-ref <ваш-project-id>`.
- [ ] **Изпълнени са всички SQL Миграции:** Всички `.sql` файлове в директорията
      `supabase/migrations/` са пуснати в редовния си ред чрез
      `npx supabase db push`.
- Това създава:
  - Базовите таблици: `users`, `contacts`, `events`, `gift_ideas`,
    `concierge_orders`.
  - Notification таблицата: `notification_logs`.
  - Subscription таблиците: `subscription_plans`.
  - Karma Store таблиците: `karma_rewards`, `user_karma_history`,
    `user_active_rewards`.
  - Разширенията за AI: колони `personality`, `style`, `favorite_color` в
    контакта.
  - Администраторските флагове: `is_admin`, `is_banned` в `users`.
- [ ] Включени са RLS (Row Level Security) политиките върху всички таблици.
- [ ] Активиран е SQL Trigger `handle_new_user`, който дублира регистрацията от
      Auth в Public схемата.

## 2. 🔐 Аутентикация и Вход (Supabase Auth)

- [ ] Отидете в **Authentication -> Providers** във вашия Supabase панел.
- [ ] Уверете се, че **Email** е включен.
- [ ] **Google Вход:** Включете Google Provider-а.
  - [ ] Създайте OAuth credentials в
        [Google Cloud Console](https://console.cloud.google.com/).
  - [ ] Поставете взетите _Client ID_ и _Client Secret_ в Supabase.
  - [ ] Добавете Callback URL-то от Supabase (напр.
        `https://<project-ref>.supabase.co/auth/v1/callback`) в Google Cloud
        Console.
- [ ] **Redirect URLs:** В **Authentication -> URL Configuration**, добавете
      реалния домейн (напр. `https://podaryavai.com`) в _Site URL_ и _Redirect
      URLs_, за да се връщат потребителите правилно.

## 3. 🌐 Environment Variables (.env)

- [ ] В основната папка създайте `.env.local` или `.env` файл (а за хостинга
      като Vercel ги добавете там):
  ```env
  VITE_SUPABASE_URL="https://<ваш-project-ref>.supabase.co"
  VITE_SUPABASE_ANON_KEY="<ваш-anon-key>"
  ```

## 4. 🧠 Изкуствен Интелект (Gemini Edge Functions)

- [ ] Добавете вашия Gemini (Google) API Key като тайна (Secret) в Supabase:
      `npx supabase secrets set GEMINI_API_KEY="AIzaSy-вашият-ключ"`
- [ ] Deploy-нете главните AI функции в облака:
      `npx supabase functions deploy create_gift_ideas`
      `npx supabase functions deploy generate_contact_gifts`

## 5. 💳 SaaS Абонаменти и Консиерж (Stripe Edge Functions)

- [ ] Създайте акаунт в Stripe и вземете Secret Key (започва с `sk_test_` или
      `sk_live_`).
- [ ] Добавете ключа като тайна в Supabase:
      `npx supabase secrets set STRIPE_SECRET_KEY="sk_...вашият-ключ"`
- [ ] Deploy-нете функцията за плащане на абонаменти:
      `npx supabase functions deploy create_checkout_session`
- [ ] Deploy-нете Webhook функцията, която обработва успешните плащания:
      `npx supabase functions deploy stripe_webhook`
- [ ] **Webhook Защита (МНОГО ВАЖНО):**
  - Отидете в Stripe Dashboard -> Developers -> Webhooks.
  - Добавете Endpoint, който сочи към функцията (напр.
    `https://<ref>.supabase.co/functions/v1/stripe_webhook`).
  - Изберете да слуша за event: `checkout.session.completed` и
    `customer.subscription.deleted`.
  - Вземете _Signing Secret_ ключа (почва с `whsec_`) от Stripe.
  - Въведете го в тайните на Supabase:
    `npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."`

## 6. 🔔 Автоматизирани Известия (CRON & Emails)

- [ ] Отидете в Supabase Dashboard -> **Database -> Extensions** и потърсете
      `pg_cron`. Натиснете **Enable**.
- [ ] Ежедневната функция има нужда от Service Role Key (за да може да чете
      данните без RLS). Добавете ги като тайни:
      `npx supabase secrets set SUPABASE_URL="https://<project-ref>.supabase.co"`
      `npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="<вашият-service-role-key>"`
- [ ] Настройте API интеграцията за изпращане на имейли (Resend). Добавете ключа
      им: `npx supabase secrets set RESEND_API_KEY="re_..."`
- [ ] Deploy-нете CRON функцията:
      `npx supabase functions deploy daily_notifications`
- [ ] Отидете в SQL Editor-а на Supabase и изпълнете таймера (той ще я вика
      всеки ден в 08:00):
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
- [ ] Свържете хранилището с платформа за хостинг като **Vercel** или
      **Netlify**.
- [ ] В настройките на избрания хостинг (Environment Variables) задайте вашите
      `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY`.
- [ ] Задайте Build команда: `npm run build` и Output директория: `dist`.
- [ ] Деплойнете проекта! 🎉

---

**Кратки команди за поправка на функциите след промени по файловете:**

```bash
npx supabase functions deploy daily_notifications
npx supabase functions deploy stripe_webhook
npx supabase functions deploy generate_contact_gifts
```
