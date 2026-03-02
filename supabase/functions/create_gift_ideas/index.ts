import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { contactId, name, relationship } = await req.json();

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
    );

    // Get the user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth
      .getUser();
    if (userError || !user) throw new Error("Unauthorized");

    // Fetch user profile for their plan
    const { data: profile } = await supabaseClient
      .from("users")
      .select("subscription_plan")
      .eq("id", user.id)
      .single();

    const plan = profile?.subscription_plan || "FREE";

    // Fetch dynamic platform settings
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

    let suggestions = [];

    const systemPrompt =
      'You are a professional gift concierge. Suggest 3 highly specific, trendy, premium gift ideas based on the profile provided. CRITICAL RULE: Suggest specific, named products and brands (e.g., "Sony WH-1000XM5 Headphones" or "Bellroy Hide & Seek Wallet"). DO NOT suggest vague categories like "A leather wallet" or "A smartwatch". Return ONLY a valid JSON array of objects, where each object has "title", "description", and "price_range". Do not include markdown formatting like ```json.';
    const userPrompt =
      `Suggest gifts for a person named ${name}. Relationship: ${relationship}. Keep descriptions short and engaging.`;

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
                { role: "user", content: userPrompt },
              ],
            }),
          },
        );

        const aiData = await response.json();
        if (aiData.choices && aiData.choices[0]) {
          try {
            suggestions = JSON.parse(aiData.choices[0].message.content);
          } catch {
            const clean = aiData.choices[0].message.content.replace(
              /```json/g,
              "",
            ).replace(/```/g, "");
            suggestions = JSON.parse(clean);
          }
        }
      } else {
        console.error("OpenAI chosen but no config key available");
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
                parts: [{ text: userPrompt }],
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
        }
      } else {
        console.error("Gemini chosen but no config key available");
      }
    } else {
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
                { role: "user", content: userPrompt },
              ],
            }),
          },
        );

        const aiData = await response.json();
        if (aiData.choices && aiData.choices[0]) {
          try {
            suggestions = JSON.parse(aiData.choices[0].message.content);
          } catch {
            const clean = aiData.choices[0].message.content.replace(
              /```json/g,
              "",
            ).replace(/```/g, "");
            suggestions = JSON.parse(clean);
          }
        }
      }
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
