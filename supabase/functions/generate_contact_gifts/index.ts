import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser();
    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    const { contact_id, event_id } = await req.json();

    if (!contact_id || !event_id) {
      throw new Error("Missing contact_id or event_id");
    }

    // Fetch user plan to ensure they are PRO, ULTRA, or BUSINESS
    const { data: userData } = await supabaseClient
      .from("users")
      .select("subscription_plan, subscription_expires_at")
      .eq("id", user.id)
      .single();

    let plan = userData?.subscription_plan || "FREE";
    if (
      userData?.subscription_expires_at &&
      new Date(userData.subscription_expires_at) < new Date()
    ) {
      plan = "FREE";
    }

    if (["FREE", "STANDARD"].includes(plan)) {
      throw new Error(
        `Plan ${plan} does not support automatic AI gift recommendations.`,
      );
    }

    // Fetch contact details
    const { data: contact, error: contactError } = await supabaseClient
      .from("contacts")
      .select("*")
      .eq("id", contact_id)
      .eq("user_id", user.id)
      .single();

    if (contactError || !contact) {
      throw new Error("Contact not found");
    }

    // Check if recommendations already exist
    const { data: existingEvent, error: eventError } = await supabaseClient
      .from("events")
      .select("ai_recommendations")
      .eq("id", event_id)
      .eq("user_id", user.id)
      .single();

    // If it already has recommendations, just return them
    if (existingEvent?.ai_recommendations) {
      return new Response(
        JSON.stringify({ recommendations: existingEvent.ai_recommendations }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // Prepare prompt for OpenAI
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey) throw new Error("OpenAI API key missing");

    const ageInfo = contact.age_group ? `Age group: ${contact.age_group}.` : "";
    const interestInfo = contact.interests
      ? `Interests/Hobbies: ${contact.interests}.`
      : "";
    const budgetInfo = contact.budget_preference
      ? `Budget preference: ${contact.budget_preference}.`
      : "";
    const relInfo = contact.relationship
      ? `Relationship to me: ${contact.relationship}.`
      : "";

    const systemPrompt = `You are an expert gift advisor. 
Generate a JSON output providing exact gift ideas for a person going by the name "${
      contact.first_name || "them"
    }".
${ageInfo} ${interestInfo} ${budgetInfo} ${relInfo}

Create exactly 3 categories of gifts that fit their profile. 
For each category, provide exactly 2 specific gift options. 
One of the 3 categories should ideally be related to "Experiences/Vacations" (e.g., a weekend getaway, a spa day, a concert) if it fits their profile.

Output MUST be in Bulgarian.
Output MUST be raw JSON in the following format (no markdown blocks, no extra text):
[
  {
    "category": "Име на категорията",
    "gifts": [
      {
        "name": "Име на конкретен подарък",
        "reason": "Кратко обяснение защо е подходящо"
      },
      ...
    ]
  },
  ...
]`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: "Generate the 3 gift categories." },
        ],
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`OpenAI Error: ${response.status} ${errBody}`);
    }

    const data = await response.json();
    let content = data.choices[0].message.content.trim();

    // Strip markdown if strictly present
    if (content.startsWith("```json")) {
      content = content.replace(/^```json/, "").replace(/```$/, "").trim();
    }

    const parsedRecommendations = JSON.parse(content);

    // Save back to the event
    // Use supabaseServiceRole if the user doesn't have direct write access to this column,
    // but user_id matches so standard RLS should allow update.
    await supabaseClient
      .from("events")
      .update({ ai_recommendations: parsedRecommendations })
      .eq("id", event_id);

    return new Response(
      JSON.stringify({ recommendations: parsedRecommendations }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
