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

    // Fetch user profile for their plan and wallet balance
    const { data: profile } = await supabaseClient
      .from("users")
      .select("subscription_plan, wallet_balance")
      .eq("id", user.id)
      .single();

    const plan = profile?.subscription_plan || "FREE";
    const walletBalance = profile?.wallet_balance || 0;

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

    // Fetch dynamic platform settings to know which AI model to use
    const { data: settingsData } = await supabaseClient
      .from("platform_settings")
      .select("setting_key, setting_value");

    const settings: Record<string, string> = {};
    if (settingsData) {
      settingsData.forEach((s: any) =>
        settings[s.setting_key] = s.setting_value
      );
    }

    const modelKey = `MODEL_AI_${plan}`;
    const chosenModel = settings[modelKey] || "llama";

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

    const budgetPreferenceStr = contact.budget_preference
      ? `Their preferred individual budget is €${contact.budget_preference}. `
      : "";
    const ageGroupStr = contact.age_group
      ? `They are in the '${contact.age_group}' age group. `
      : "";
    const interestsStr = contact.interests
      ? `Interests include: ${contact.interests}. `
      : "";
    const personalityStr = contact.personality
      ? `Personality trait: ${contact.personality}. `
      : "";
    const styleStr = contact.style
      ? `Style preference: ${contact.style}. `
      : "";
    const colorStr = contact.favorite_color
      ? `Favorite color: ${contact.favorite_color}. `
      : "";

    // Concierge Wallet Awareness
    const walletRules = walletBalance > 0
      ? `\nCRITICAL BUDGET RULE: The user currently has a wallet balance of €${walletBalance}. Prioritize gifts that can be fully purchased strictly using this balance (under €${walletBalance}).`
      : `\nCRITICAL BUDGET RULE: The user currently has €0 in their wallet. They will pay out of pocket, so prioritize the contact's preferred budget over everything.`;

    const dynamicContext =
      `Suggest gifts for a person named ${contact.name}. Relationship: ${contact.relationship}. ${ageGroupStr}${budgetPreferenceStr}${interestsStr}${personalityStr}${styleStr}${colorStr}`;

    const systemPrompt =
      `You are an expert AI gift concierge. Based on the user's contact profile, suggest 3 different categories of gifts (e.g., 'Tech Gadgets', 'Experiences', 'Home Decor'), and provide exactly 2 specific gift ideas for each category. ${walletRules}

CRITICAL RULES:
1. Prices MUST be in EUR (e.g., "€100 - €150").
2. Suggest CONCRETE products, brands, or models (e.g., "Sony WH-1000XM5 Headphones" instead of "Headphones").
3. Your ENTIRE response MUST be a valid JSON array of category objects. 
Each category object must have:
- "category_name": string
- "suggestions": an array of exactly 2 objects, each containing:
   - "title": string
   - "description": string
   - "price_range": string
   - "image_keyword": a SINGLE visually descriptive English word for photo search (e.g. "headphones", "perfume", "watch")

Do NOT wrap the JSON in markdown blocks like \`\`\`json. Return ONLY the raw array.`;

    let suggestions: any[] = [];

    if (chosenModel === "openai") {
      const openAiKey = Deno.env.get("OPENAI_API_KEY");
      if (openAiKey) {
        const response = await fetch(
          "https://api.openai.com/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${openAiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "gpt-4o-mini",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: dynamicContext },
              ],
            }),
          },
        );

        const rawText = await response.text();
        if (rawText) {
          const aiData = JSON.parse(rawText);
          if (aiData.choices && aiData.choices[0]) {
            let content = aiData.choices[0].message.content;
            if (content.startsWith("```json")) {
              content = content.replace(/^```json/, "").replace(/```$/, "")
                .trim();
            }
            suggestions = JSON.parse(content);
          }
        }
      } else {
        console.error("OpenAI requested but no API key configured");
      }
    } else if (chosenModel === "gemini") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiKey}`,
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              system_instruction: {
                parts: [{ text: systemPrompt }],
              },
              contents: [{
                parts: [{ text: dynamicContext }],
              }],
              generationConfig: {
                responseMimeType: "application/json",
              },
            }),
          },
        );

        const aiData = await response.json();
        if (aiData.candidates && aiData.candidates[0]) {
          let content = aiData.candidates[0].content.parts[0].text;
          if (content.startsWith("```json")) {
            content = content.replace(/^```json/, "").replace(/```$/, "")
              .trim();
          }
          suggestions = JSON.parse(content);
        }
      } else {
        console.error("Gemini requested but no API key configured");
      }
    } else {
      // Fallback to Groq (Llama)
      const groqKey = Deno.env.get("GROQ_API_KEY");
      if (groqKey) {
        const response = await fetch(
          "https://api.groq.com/openai/v1/chat/completions",
          {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${groqKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              model: "llama-3.3-70b-versatile",
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: dynamicContext },
              ],
            }),
          },
        );

        const rawText = await response.text();
        if (rawText) {
          const aiData = JSON.parse(rawText);
          if (aiData.choices && aiData.choices[0]) {
            let content = aiData.choices[0].message.content;
            if (content.startsWith("```json")) {
              content = content.replace(/^```json/, "").replace(/```$/, "")
                .trim();
            }
            suggestions = JSON.parse(content);
          }
        }
      }
    }

    // Save back to the event
    await supabaseClient
      .from("events")
      .update({ ai_recommendations: suggestions })
      .eq("id", event_id);

    return new Response(
      JSON.stringify({ recommendations: suggestions }),
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
