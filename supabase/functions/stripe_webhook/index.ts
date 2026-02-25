import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';
import Stripe from 'https://esm.sh/stripe@14.16.0?target=deno';

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') as string;
const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET') as string;
const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string; // Must use service role to act on behalf of webhook

const stripe = new Stripe(stripeSecretKey, {
    apiVersion: '2023-10-16',
    httpClient: Stripe.createFetchHttpClient(),
});

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req: Request) => {
    const signature = req.headers.get('stripe-signature');

    if (!signature || !stripeWebhookSecret) {
        return new Response('Webhook Secret or Signature missing', { status: 400 });
    }

    try {
        const bodyText = await req.text();
        const event = await stripe.webhooks.constructEventAsync(bodyText, signature, stripeWebhookSecret);

        // Process the event
        console.log(`Processing Stripe Event: ${event.type}`);

        if (event.type === 'checkout.session.completed') {
            const session = event.data.object as Stripe.Checkout.Session;
            
            // Check if this was a subscription checkout
            if (session.mode === 'subscription') {
                const userId = session.metadata?.user_id;
                const planKey = session.metadata?.plan_key;

                if (userId && planKey) {
                    // Update user's subscription plan instantly
                    const { error } = await supabaseAdmin
                        .from('users')
                        .update({ subscription_plan: planKey })
                        .eq('id', userId);

                    if (error) {
                        console.error('Failed to update user subscription_plan:', error);
                    } else {
                        console.log(`Successfully upgraded user ${userId} to plan ${planKey}`);
                    }
                }
            } else if (session.mode === 'payment') {
                // Future handling for one-off payments (Concierge orders)
                const orderId = session.client_reference_id;
                if (orderId) {
                    console.log(`One-off payment completed for order ${orderId}`);
                    // e.g. await supabaseAdmin.from('concierge_orders').update({status: 'PAID'}).eq('id', orderId);
                }
            }
        } 
        
        // Handle when a subscription terminates
        if (event.type === 'customer.subscription.deleted') {
            const subscription = event.data.object as Stripe.Subscription;
            
            // Find user from Stripe Customer ID if metadata isn't passed down consistently
            // This is a simplified fallback handling. A robust system stores Stripe customer IDs
            console.log("Subscription deleted:", subscription.id);
            // Revert them to 'FREE'
        }

        return new Response(JSON.stringify({ received: true }), { status: 200 });
    } catch (err: any) {
        console.error(`Webhook Error: ${err.message}`);
        return new Response(`Webhook Error: ${err.message}`, { status: 400 });
    }
});
