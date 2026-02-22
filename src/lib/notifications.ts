import { supabase } from './supabase';

/**
 * Notification Service Wrapper
 * Handles both Push Notifications (via Firebase) and Emails (via Resend)
 */
export const NotificationService = {
    // Push Notification (Firebase placeholder)
    async sendPushNotification(userId: string, title: string, body: string) {
        console.log(`[Push Notification] to user ${userId}: ${title} - ${body}`);
        // Real implementation would use Firebase Cloud Messaging (FCM) API
        // fetch('https://fcm.googleapis.com/fcm/send', { ... })
    },

    // Email Notification (Resend placeholder)
    async sendEmailNotification(email: string, subject: string, _htmlContent: string) {
        console.log(`[Email Notification] to ${email}: ${subject}`);
        // Real implementation would invoke a Supabase Edge Function that uses Resend API
        // supabase.functions.invoke('send_email', { body: { to: email, subject, htmlContent } })
    },

    // High-level business logic
    async notifyUpcomingEvent(userId: string, eventName: string, daysLeft: number) {
        // 1. Fetch user data (e.g. email, push token)
        const { data: user } = await supabase.from('users').select('*').eq('id', userId).single();
        if (!user) return;

        const title = `Upcoming Event: ${eventName}`;
        const body = `You have ${daysLeft} days left to buy a gift! Tap to find suggestions.`;

        // 2. Send Push
        await this.sendPushNotification(userId, title, body);

        // 3. Send Email
        if (user.email) {
            await this.sendEmailNotification(user.email, title, body);
        }
    }
};
