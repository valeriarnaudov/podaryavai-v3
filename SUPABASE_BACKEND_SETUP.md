# 🏗️ Supabase Backend Setup Guide

Това ръководство съдържа пълните стъпки за изграждане на бекенда (Supabase) за Podaryavai V3, включително всички SQL команди, тайни (Secrets) и Edge функции (Cloud Functions).

---

## 1. Създаване на Проекта
1. Създайте нов проект в [Supabase](https://supabase.com).
2. Запишете си `Project URL` и `anon key` (намират се в **Project Settings -> API**).
3. Добавете ги във вашия локален `.env` файл:
   ```env
   VITE_SUPABASE_URL="https://Вашият-Сайт.supabase.co"
   VITE_SUPABASE_ANON_KEY="Вашият-Anon-Ключ"
   ```

---

## 2. База Данни (SQL Миграции)
За да изградите таблиците, изпълнете всички SQL файлове намиращи се в папката `supabase/migrations/` в SQL Editor-а на Supabase. Най-добре е да се използва CLI:

```bash
npx supabase login
npx supabase link --project-ref <ваш-project-id>
npx supabase db push
```

Това ще създаде всички нужни таблици: `users`, `contacts`, `events`, `gift_ideas`, `subscription_plans`, `karma_rewards`, `user_karma_history` (супер важна за Admin Logs екрана) и други, заедно с всички RLS (Row Level Security) политики и тригери (като `handle_new_user`).

---

## 3. Настройване на Тайни (Secrets) за Edge Функциите
Отворете терминала в главната папка на проекта и изпълнете следните команди:

### 🧠 Google Gemini AI (За Stripe Calendar & Swipe Recommendations)
```bash
npx supabase secrets set GEMINI_API_KEY="AIzaSyD*****"
```

### 💳 Stripe (За абонаменти и консиерж плащания)
```bash
npx supabase secrets set STRIPE_SECRET_KEY="sk_test_..." 
npx supabase secrets set STRIPE_WEBHOOK_SECRET="whsec_..."
```

### 🛎️ Нотификации и CRON (Resend API и Supabase Role Key)
```bash
npx supabase secrets set RESEND_API_KEY="re_..."
npx supabase secrets set SUPABASE_URL="https://Вашият-Сайт.supabase.co"
npx supabase secrets set SUPABASE_SERVICE_ROLE_KEY="Вашият-Service-Role-Ключ"
```

---

## 4. Деплойване на Edge Функциите (Cloud Backend)
След като сте въвели всички тайни (Secrets), трябва да качите (deploy) логиката в облака.

### 🎁 AI Функции (Задвижвани от Gemini)
```bash
# Функцията за Swipe Giftinder AI генериране
npx supabase functions deploy create_gift_ideas

# Функцията за Inline Календар AI препоръки (Пълно профилиране)
npx supabase functions deploy generate_contact_gifts
```

### 🛒 Плащания и Webhooks (Stripe)
```bash
# Генерира URL за пренасочване към Stripe Checkout
npx supabase functions deploy create_checkout_session

# Слуша за успешни плащания и обновява абонаментите на потребителите
npx supabase functions deploy stripe_webhook
```

### ⏰ Автоматични Нотификации (CRON)
```bash
# Изпраща ежедневни имейлове за предстоящи събития
npx supabase functions deploy daily_notifications
```

---

## 5. Активиране на CRON Job за Нотификации
За да може `daily_notifications` да работи всеки ден в 08:00 сутринта:
1. Отидете във вашия Supabase Dashboard -> **Database -> Extensions**.
2. Активирайте разширението **`pg_cron`**.
3. Отворете SQL Editor-а в Supabase и изпълнете следната заявка (заменете с вашите данни):
```sql
SELECT cron.schedule('daily-event-notifications', '0 8 * * *', $$
  select net.http_post(
      url:='https://Вашият-Сайт.supabase.co/functions/v1/daily_notifications',
      headers:='{"Content-Type": "application/json", "Authorization": "Bearer Вашият-Anon-Ключ"}'::jsonb,
      body:='{}'::jsonb
  ) as request_id;
$$);
```

---

## 6. Authentication (Вход чрез Google)
1. В Supabase Dashboard -> **Authentication -> Providers** включете **Email** и **Google**.
2. Вземете *Client ID* и *Client Secret* от Google Cloud Console и ги въведете в Supabase.
3. Добавете Callback URL-то на Supabase (напр. `https://xxx.supabase.co/auth/v1/callback`) в Google Cloud.
4. В **Authentication -> URL Configuration** на Supabase, задължително задайте `Site URL` на вашия реален домейн и добавете съответните редиректи за OAuth (`http://localhost:5173/**`), за да избегнете проблеми с Route пренасочването по време на вход.

### 🎉 Готово! Вашият бекенд е напълно настроен и функционален.
