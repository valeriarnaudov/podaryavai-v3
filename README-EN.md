# 🎁 Podaryavai V3 - Complete Documentation & Architecture

**Podaryavai** (meaning "Gift It") is a next-generation ecosystem (SaaS PWA) designed to revolutionize the way we plan, discover, and give gifts.
Version 3.0 is the culmination of months of development, integrating **Artificial Intelligence (Google Gemini)**, deep **Gamification (Karma System)**, **Subscription Models (Stripe)**, **Multilingualism (i18n)**, **Multi-theming (Dark Mode)**, extensively detailed **Administrative Control**, and the latest addition: **Smart Calendar Sync (.ics)** with automated holiday events.

This document describes **absolutely every feature** and implementation in the system available to end users and administrators.

---

## ✨ Key Features (For End Users)

### 🌍 1. Personalization: Multilingualism, Themes & Landing Page
The application is fully adapted for international markets while maintaining its original Bulgarian spirit.
- **Two Official Languages (i18n):** Fully integrated translation in English (Primary) and Bulgarian, which can be dynamically switched via the navigation and profile settings.
- **Themes (Dark/Light Mode):** Intelligent theme system supporting Light, Dark, and System modes using Tailwind CSS classes for perfect user comfort day and night.
- **Premium Landing Page:** A visually stunning entry page with "glassmorphic" elements, dynamic gradients, responsive glow effects, and built-in language/theme toggles.

### 👥 2. Intelligent Contact & Event Management
The system is not just a list of names, but a detailed CRM for loved ones.
- **Deep Profiling:** For each contact, the user can input precise data that feeds the AI model: Age Group, Personality Trait, Style Preference, Favorite Color, Specific Interests/Hobbies, and a strict Budget in Euros (€).
- **Smart Calendar:** Events (Birthdays, Name Days, Anniversaries) are automatically calculated as *recurring*.
- **Bulgarian Name Day Dictionary:** A built-in dictionary that automatically spots name days based on the contact's first name.
- **(NEW!) Holiday Events:** Automatic generation of recurring global holidays (Christmas, Women's Day, Valentine's Day) for your contacts. The system intelligently infers the gender and relationship type (e.g., Women's Day is reflected only for female contacts).
- **(NEW!) Calendar Sync (.ics):** A 1-click feature to bulk export and sync all gifting events directly to your Native calendars (Apple Calendar, Google Calendar) via the iCalendar standard.

### 🤖 3. Artificial Intelligence & Gift Generation
The AI capabilities are split into two powerful modules powered by **Gemini 2.5 Flash**:
- **AI Giftinder (For all users):**
  - Tinder-style (Swipe) interface for fast gift browsing.
  - The user swipes right (Like) or left (Pass). The system remembers what is liked and adapts.
- **Inline AI Calendar Recommendations (Premium Exclusive - PRO/ULTRA/BUSINESS):**
  - Instant gift generation *directly from the Calendar*, without breaking the user experience.
  - An exclusive Edge Function takes the contact's detailed profile and returns categories. Ideas are intelligently cached.

### 💎 4. Gamification & Karma Store
The entire app is wrapped in game mechanics for supreme user retention.
- **Earning Points (Karma):** Users earn points by adding contacts, inviting friends, or through daily activity.
- **Karma Store:** Accumulated points can be spent on real perks:
  - `Golden Aura`: An animated golden frame around the profile picture.
  - `Free Delivery`: A voucher for free delivery.
  - `VIP Giftinder`: Unlocks a hidden vault with prestigious gifts.
- **Free Subscription Unlock:** Through the Karma system, users can virtually "buy" PRO or ULTRA status for a certain period.

### 🗂️ 5. Wishlists & Social Sharing
- **Separated Lists:** Clear distinction between "My personal wishes" and "Friends' list".
- **Public Links:** Every Wishlist generates a unique, encrypted public link for easy sharing.

### 💳 6. Subscription Plans & Stripe Integration
- Full-fledged Stripe integration for SaaS automation (featuring Checkout Sessions and Secure Webhooks).
- Support for **Monthly** and **Yearly** plans (`FREE`, `STANDARD`, `PRO`, `ULTRA`, `BUSINESS`).
- Uses *Stripe Webhooks (Edge Functions)* to securely auto-update the user's subscription status in real-time.

### 🔐 7. Seamless Login (Google Auth)
 - Expanded integration and optimization of Google OAuth login, ensuring instant and secure sign-ins using third-party providers without navigation loops.

### 🛎️ 8. Automated Notifications
- Background Cron Jobs scan events every day and send timely Email notifications for upcoming occasions.

---

## 🛡️ Key Features (For Administrators)

A complete internal portal (`/admin`) is available, visible only to accounts with the flag `is_admin = true`.

- **1. Live Dashboard & Finance:** Real-time charts for active users and premium subscriptions.
- **2. User Management (CRM):** Track registered users, their plans, and subscription expiry.
- **3. (NEW!) Karma Purchases Logs:** A dedicated "Admin Logs" tab for a complete history of Karma redemptions, joining data from `user_karma_history` with user profile info for perfect traceability.
- **4. Karma Rewards Controller:** UI interface for creating new reward types in the store.
- **5. Global Gifts & Giftinder Management:** Add and edit manual, humanized gifts.
- **6. Email Templates & Subscription Plans Manager:** Manage reminder templates and plan offerings.

---

## 🛠️ Technology Stack & Implementation

The architecture is built for scalability, security, and speed (Mobile-First SPA/PWA).

**Frontend:**
- **Framework:** React (Vite) with TypeScript.
- **Styling:** Tailwind CSS combined with a "Soft Glassmorphism" design approach, with full support for **Dark Mode**.
- **Multilingualism:** `i18next` for dynamic translation (EN & BG).
- **Animations:** `framer-motion` (handles Tinder swipe cards, smooth accordion openings).
- **Synchronization:** Client-side generation of standard `.ics` files for mobile/desktop calendars.

**Backend & Infrastructure (Supabase):**
- **Database:** PostgreSQL with **Row Level Security (RLS)** fully enabled.
- **Edge Functions:** Serverless functions written in Deno / TypeScript, globally deployed:
  - `generate_contact_gifts`: Connects to Google Gemini (`gemini-2.5-flash`).
  - `create_checkout_session`: Generates URL to Stripe for subscription billing.
  - `stripe_webhook`: Listens for `invoice.payment_succeeded` & `customer.subscription.deleted`, updating plans in real time, protected by `Stripe-Signature` validation.
  - `daily_notifications`: Autonomous CRON function.
- **Authentication:** Supabase Auth (Email + Password + Google Auth). 

*Developed for a flawless experience on both mobile browsers (PWA) and desktop.*
