import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY') as string;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const { price, title, orderId } = await req.json();

        // Use standard fetch to call Stripe API directly to avoid Deno Node incompatibility issues with stripe-node
        const response = await fetch('https://api.stripe.com/v1/checkout/sessions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${stripeSecretKey}`,
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: new URLSearchParams({
                'payment_method_types[0]': 'card',
                'line_items[0][price_data][currency]': 'eur',
                'line_items[0][price_data][product_data][name]': title || 'Gift Item',
                'line_items[0][price_data][unit_amount]': Math.round(Number(price) * 100).toString(),
                'line_items[0][quantity]': '1',
                'mode': 'payment',
                'success_url': `${req.headers.get('origin') || 'http://localhost:5173'}/checkout-success`,
                'cancel_url': `${req.headers.get('origin') || 'http://localhost:5173'}/checkout-cancel`,
                'client_reference_id': orderId,
            }).toString(),
        });

        const session = await response.json();

        if (!response.ok) {
            throw new Error(session.error?.message || 'Failed to create stripe session');
        }

        return new Response(JSON.stringify({ url: session.url }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });

    } catch (error: any) {
        return new Response(JSON.stringify({ error: error.message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
