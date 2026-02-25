import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
const stripeSecretKey = Deno.env.get("STRIPE_SECRET_KEY");
const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }
  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header");
    const token = authHeader.replace("Bearer ", "");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: {
            Authorization: authHeader,
          },
        },
      },
    );

    // Verify the user making the request explicitly with token
    const { data: { user }, error: userError } = await supabase.auth.getUser(
      token,
    );
    if (userError || !user) {
      console.error("Auth Error:", userError);
      throw new Error(
        `Unauthorized: ${userError?.message || "User not found"}`,
      );
    }
    const { planId, interval = "monthly" } = await req.json();
    // Fetch the corresponding Stripe Price ID from our database
    const { data: plan, error: planError } = await supabase.from(
      "subscription_plans",
    ).select("stripe_price_id, stripe_price_id_annual, plan_key, name").eq(
      "id",
      planId,
    ).single();

    const targetPriceId = interval === "annual"
      ? plan?.stripe_price_id_annual
      : plan?.stripe_price_id;

    if (planError || !targetPriceId) {
      throw new Error(
        `Invalid plan selected or missing Stripe configuration for ${interval} interval.`,
      );
    }
    // Generate the Stripe Checkout Session
    const origin = req.headers.get("origin") || "http://localhost:5173";
    const bodyParams = new URLSearchParams({
      "payment_method_types[0]": "card",
      "line_items[0][price]": targetPriceId,
      "line_items[0][quantity]": "1",
      "mode": "subscription",
      "success_url":
        `${origin}/checkout-success?session_id={CHECKOUT_SESSION_ID}`,
      "cancel_url": `${origin}/checkout-cancel`,
      "client_reference_id": user.id,
      "customer_email": user.email || "",
    });
    // Pass metadata to the session so the webhook knows exact the plan_key
    bodyParams.append("subscription_data[metadata][plan_key]", plan.plan_key);
    bodyParams.append("metadata[user_id]", user.id);
    bodyParams.append("metadata[plan_key]", plan.plan_key);
    const response = await fetch(
      "https://api.stripe.com/v1/checkout/sessions",
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${stripeSecretKey}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: bodyParams.toString(),
      },
    );
    const session = await response.json();
    if (!response.ok) {
      console.error("Stripe Session Error:", session);
      throw new Error(
        session.error?.message || "Failed to create stripe session",
      );
    }
    return new Response(
      JSON.stringify({
        url: session.url,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  } catch (error: any) {
    console.error("Subscription Error:", error);
    return new Response(
      JSON.stringify({
        error: error.message,
        fullError: error,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
        status: 400,
      },
    );
  }
});
