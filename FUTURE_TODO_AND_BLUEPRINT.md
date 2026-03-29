# 🔮 FUTURE TODO & Project Replication Blueprint

Този файл служи едновременно като **План за бъдещо развитие (Future TODO)** на Podaryavai, и като **Архитектурен Наръчник (Blueprint)** за повторното изграждане на подобен мащабен SaaS PWA проект.

---

## Част 1: FUTURE TODO (Какво следва за Podaryavai)

*Тези задачи са логичната следваща стъпка след пускането на MVP (Minimum Viable Product) версията в продукция.*

### 🎨 Frontend & UX Усъвършенствания
- [ ] **Onboarding Flow:** Създаване на начален туториал (3-4 екрана с `framer-motion` swipe), който обяснява на новия потребител какво представлява Кармата, Giftinder и Консиержът.
- [x] **Push Notifications UI Опции:** Редактиране на настройки за имейл известия от Профила на потребителя.
- [x] **Dark Mode:** Пълна имплементация на тъмна тема.
- [x] **Landing Page:** Визуално зашеметяваща входна страница с "glassmorphic" елементи.
- [ ] **PWA Offline Support:** Кеширане на събитията и контактите чрез Service Workers, така че приложението да зарежда `Home` екрана дори при липса на интернет.

### 🤖 AI & Данни
- [ ] **Continuous Learning:** Когато потребител запази (Swipe Right) даден подарък, бекендът да записва предпочитанията му и следващия път промптът към Gemini да бъде: *"Потребителят обикновено харесва технологични джаджи, генерирай..."*.
- [ ] **AI Анализ на Бюджет за Concierge:** AI-ът да съобразява предложените подаръци с оставащата сума в Stripe Wallet.
- [x] **Smart Calendar Inference:** AI автоматично определя пола на контакта за таргетирани празнични събития (напр. 8-ми Март).

### 💳 Stripe & Бизнес Логика
- [ ] **Physical Delivery API:** Връзка с куриерска фирма (Speedy/Econt API) за автоматизирано пускане на товарителница, когато потребителят поръча през Concierge.
- [ ] **Gifting Wallet:** Виртуален портфейл, в който близките могат да превеждат пари по публичния Wishlist линк.
- [x] **Stripe Subscriptions & Webhooks:** Пълна интеграция за Edge Functions абонаментни плащания.

*(Забележка: Stripe Webhooks, Subscription Tiers, Karma Points Override Logic, Inline AI Calendar Recommendations, Dark Mode, Calendar .ics Sync и Многоезичност (i18n) вече са успешно имплементирани и преместени към изпълнения списък! 🎉)*

---

## Част 2: Project Blueprint (За повторно изграждане)

*Ако някога трябва да копирате тази архитектура или да създадете подобен проект (PWA + Supabase + React + AI + Stripe SaaS), следвайте този точен ред.*

### Фаза 1: Фундамент (The Base)
1. **Инициализиране:** `npm create vite@latest . -- --template react-ts`
2. **CSS framework:** Инсталирайте Tailwind CSS.
3. **PWA плъгин:** Инсталирайте `vite-plugin-pwa`. Влезте във `vite.config.ts` и го конфигурирайте.
4. **UI Библиотеки:** `npm install framer-motion lucide-react react-router-dom stripe react-i18next`.
5. **Дизайн Система:** Създайте файл `DESIGN_GUIDELINES.md` с цветната палитра и марджините.

### Фаза 2: База Данни & Сигурност (Supabase)
1. **Създаване на проект:** В Supabase създайте нов проект. Вземете `URL` и `ANON_KEY` и ги сложете във фронтенд `.env` файла.
2. **SQL Схема:** Начертайте таблиците в SQL: `users`, `contacts`, `events`, `subscription_plans`, `karma_rewards`, `user_karma_history`.
3. **Сигурност (RLS):** Включете Row Level Security на всяка таблица. 

### Фаза 3: Аутентикация и Глобално Състояние (State)
1. **Auth Context:** Създайте `src/lib/AuthContext.tsx`. Използвайте `supabase.auth.onAuthStateChange`. Включете Google OAuth интеграция.
2. **Subscription Virtual Override:** В `AuthContext` проверявайте не само реалния `subscription_plan_id` от базата, но и таблицата `user_active_rewards`.
3. **Protected Routes:** Създайте компоненти `<ProtectedRoute>` и `<AdminRoute>`.

### Фаза 4: Фронтенд Архитектура (Mobile-First)
1. **Mobile Layout:** Създайте `<MobileLayout>` обвивка. За десктоп създайте `<Sidebar>`.
2. **Навигация:** Създайте фискирана долна навигация за телефони.
3. **Swipe Механики & Календар:** Framer Motion за карти и native `.ics` Blob генератори за експорт на събития към външни календари.

### Фаза 5: Облачни Функции (Edge Functions & Webhooks)
1. **Инициализация:** `npx supabase init`.
2. **Създаване на функция:** `npx supabase functions new ИмеНаФункцията`.
3. **Свързване на външни услуги (AI/Payments):** Stripe API, Google Gemini API, Resend. Задължително ги пазете в облака като Secrets.
4. **Stripe Webhook Защита:** Задължително валидирайте `Stripe-Signature` хедъра в Deno Webhook функцията.

### Фаза 6: Автоматизация и Логистика (The Final Polish)
1. **CRON Jobs:** `pg_cron` в базата данни за ежедневни Edge Функции (като `daily_notifications`).
2. **Admin Dashboard:** Защитен рут (`/admin`), който агрегира данни и управлява потребители и карма история през отделни специализирани табове.
3. **Логинг:** За всяко автоматично действие (имейли) и транзакция с карма, вписвайте трупаща таблица (напр. `user_karma_history`, `notification_logs`).
