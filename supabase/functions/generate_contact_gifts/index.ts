// deno-lint-ignore-file no-import-prefix no-unused-vars no-explicit-any
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
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header in request");

    const jwt = authHeader.replace("Bearer ", "");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    // Verify user authentication
    const { data: { user }, error: authError } = await supabaseClient.auth
      .getUser(jwt);
    if (authError || !user) {
      throw new Error(
        `Unauthorized (Invalid JWT): ${
          authError?.message || "No User Object Found"
        } (Token Length: ${jwt.length})`,
      );
    }

    const { contact_id, event_id, force_regenerate } = await req.json();

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

    const enabledKey = `CONTACT_GIFTS_ENABLED_${plan}`;
    const isContactGiftsEnabled = settings[enabledKey] === "true"; // Defaults to false if missing, but we will add them to DB

    // If there is no specific setting yet, we'll allow PRO, ULTRA, BUSINESS to use it by default to avoid breaking it during deployment
    if (settings[enabledKey] === "false") {
      throw new Error(
        `Calendar Gift generation is disabled for the ${plan} plan.`,
      );
    }

    const modelKey = `CONTACT_GIFTS_MODEL_${plan}`;
    const chosenModel = settings[modelKey] || "gemini";

    // Check if recommendations already exist and fetch event context
    const { data: existingEvent, error: eventError } = await supabaseClient
      .from("events")
      .select("ai_recommendations, event_type, title")
      .eq("id", event_id)
      .eq("user_id", user.id)
      .single();

    // If it already has valid recommendations, just return them
    if (
      !force_regenerate &&
      existingEvent?.ai_recommendations &&
      Array.isArray(existingEvent.ai_recommendations) &&
      existingEvent.ai_recommendations.length > 0
    ) {
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
    const vibeStr = contact.favorite_vibe
      ? `Favorite Vibe/Aesthetic: ${contact.favorite_vibe}. `
      : "";
    const weekendStr = contact.weekend_activity
      ? `Typical Weekend Activity: ${contact.weekend_activity}. `
      : "";
    const dislikesStr = contact.dislikes
      ? `ABSOLUTELY AVOID THESE (Dislikes): ${contact.dislikes}. `
      : "";

    // Concierge Wallet Awareness
    const walletRules = walletBalance > 0
      ? `\nCRITICAL BUDGET RULE: The user currently has a wallet balance of €${walletBalance}. Prioritize gifts that can be fully purchased strictly using this balance (under €${walletBalance}).`
      : `\nCRITICAL BUDGET RULE: The user currently has €0 in their wallet. They will pay out of pocket, so prioritize the contact's preferred budget over everything.`;

    const dynamicContext = `EVENT TYPE: ${
      existingEvent?.event_type || "Special Occasion"
    } (${
      existingEvent?.title || "Gift Event"
    })\nSuggest exactly 10 distinct gifts for a person named ${contact.name}. Relationship: ${contact.relationship}. ${ageGroupStr}${budgetPreferenceStr}${interestsStr}${personalityStr}${styleStr}${colorStr}${vibeStr}${weekendStr}${dislikesStr}`;

    const systemPrompt =
      `You are an expert AI gift concierge. Based on the user's highly detailed contact profile, suggest EXACTLY 10 highly specific, real-world gift ideas. You MUST heavily weigh their personality, interests, aesthetic vibe, weekend activities, and the specific occasion (e.g. Birthday, Christmas, Wedding) when selecting gifts. Make sure the gifts feel profoundly personal to them. ${walletRules}

CRITICAL RULES:
1. Prices MUST be in EUR (e.g., "€100 - €150").
2. You MUST suggest EXACT, REAL-WORLD products and specific brands (e.g., "Apple Watch Series 9", "Paco Rabanne One Million", "Sony WH-1000XM5 Headphones", "Dyson Airwrap"). 
3. DO NOT SUGGEST VAGUE CATEGORIES (e.g. NEVER output "A leather wallet", "A smartwatch", or "A perfume"). YOU MUST GIVE THE EXACT MAKER AND MODEL.
4. Your ENTIRE response MUST be a valid JSON array containing exactly 10 objects. Do not use categories.

Each object must have:
- "name": string (The exact product name and brand)
- "reason": string (Why it fits their highly specific profile perfectly, max 80 chars)
- "price": string (e.g. "€250 - €300")
- "image_keyword": a highly specific search term to find the exact product image on Google Images (e.g. "Sony WH-1000XM5 silver", "Dyson Airwrap Multistyler").

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
            try {
              suggestions = JSON.parse(content);
            } catch {
              const clean = content.replace(/```json/gi, "").replace(/```/g, "")
                .trim();
              suggestions = JSON.parse(clean);
            }
          } else if (aiData.error) {
            throw new Error(`OpenAI API Error: ${aiData.error.message}`);
          }
        }
      } else {
        throw new Error(
          "OpenAI requested but no API key configured in Edge Function Secrets",
        );
      }
    } else if (chosenModel === "gemini") {
      const geminiKey = Deno.env.get("GEMINI_API_KEY");
      if (geminiKey) {
        const response = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiKey}`,
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
          const content = aiData.candidates[0].content.parts[0].text;
          try {
            suggestions = JSON.parse(content);
          } catch {
            const clean = content.replace(/```json/gi, "").replace(/```/g, "")
              .trim();
            suggestions = JSON.parse(clean);
          }
        } else if (aiData.error) {
          throw new Error(`Gemini API Error: ${aiData.error.message}`);
        }
      } else {
        throw new Error(
          "Gemini requested but no API key configured in Edge Function Secrets",
        );
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
            try {
              suggestions = JSON.parse(content);
            } catch {
              const clean = content.replace(/```json/gi, "").replace(/```/g, "")
                .trim();
              suggestions = JSON.parse(clean);
            }
          }
        }
      }
    }

    // --- SECOND PASS: Fetch Real Images via Serper.dev ---
    const serperKey = Deno.env.get("SERPER_API_KEY");
    if (serperKey && suggestions.length > 0) {
      console.log(`Fetching Serper images for ${suggestions.length} items...`);

      const fetchImage = async (query: string): Promise<string> => {
        try {
          const res = await fetch("https://google.serper.dev/images", {
            method: "POST",
            headers: {
              "X-API-KEY": serperKey,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              q: query + " product",
              num: 1,
            }),
          });
          const data = await res.json();
          if (data && data.images && data.images.length > 0) {
            return data.images[0].imageUrl;
          }
        } catch (err) {
          console.error(`Serper fetch failed for ${query}:`, err);
        }
        return "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=800&auto=format&fit=crop"; // fallback
      };

      const enrichedSuggestions = await Promise.all(
        suggestions.map(async (gift: any) => {
          const imageUrl = await fetchImage(gift.image_keyword || gift.name);
          return {
            ...gift,
            image_url: imageUrl,
          };
        }),
      );
      suggestions = enrichedSuggestions;
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
    return new Response(
      JSON.stringify({
        _error: true,
        message: error.message,
        stack: error.stack,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  }
});
