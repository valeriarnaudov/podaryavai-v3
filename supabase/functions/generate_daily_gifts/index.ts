// deno-lint-ignore-file no-import-prefix no-explicit-any
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// We will fetch plan limits dynamically from platform_settings

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization header in request");

    // Let's check exactly what the authHeader looks like
    if (!authHeader.startsWith("Bearer ")) {
      throw new Error(
        `Auth header is malformed! Starts with: ${authHeader.slice(0, 10)}`,
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: authHeader },
        },
      },
    );

    const jwt = authHeader.replace("Bearer ", "");
    const { data: { user }, error: userError } = await supabaseClient.auth
      .getUser(jwt);
    if (userError || !user) {
      throw new Error(
        `Auth Error: ${
          userError?.message || "No user found"
        } (Token Length: ${jwt.length})`,
      );
    }

    // 1. Fetch user profile for their plan and wallet balance
    const { data: profile } = await supabaseClient
      .from("users")
      .select("subscription_plan, last_giftinder_generation, wallet_balance")
      .eq("id", user.id)
      .single();

    const plan = profile?.subscription_plan || "FREE";
    const walletBalance = profile?.wallet_balance || 0;

    // 1.b Fetch dynamic platform settings
    const { data: settingsData } = await supabaseClient
      .from("platform_settings")
      .select("setting_key, setting_value");

    const settings: Record<string, string> = {};
    if (settingsData) {
      settingsData.forEach((s: any) =>
        settings[s.setting_key] = s.setting_value
      );
    }

    const limitKey = `LIMIT_AI_${plan}`;
    const modelKey = `MODEL_AI_${plan}`;

    // Use dynamic limit from admin settings, fallback to 3
    const amountToGenerate = parseInt(settings[limitKey] || "3", 10);
    const chosenModel = settings[modelKey] || "llama";

    // Optional: Protect against spamming the function
    const lastGen = profile?.last_giftinder_generation
      ? new Date(profile.last_giftinder_generation)
      : null;
    const today = new Date();
    if (lastGen && lastGen.toDateString() === today.toDateString()) {
      // Already generated today.
      return new Response(
        JSON.stringify({ message: "Already generated today", generated: 0 }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Fetch past likes to understand taste (last 15 manually liked items) - Continuous Learning
    const { data: pastLikes } = await supabaseClient
      .from("gift_ideas")
      .select("title, description")
      .eq("user_id", user.id)
      .eq("is_saved", true)
      .order("created_at", { ascending: false })
      .limit(15);

    // 2b. Fetch past SEEN items (both liked and rejected) to strictly PREVENT REPEATS
    const { data: pastSeen } = await supabaseClient
      .from("gift_ideas")
      .select("title")
      .eq("user_id", user.id)
      .or("is_saved.eq.true,is_rejected.eq.true")
      .order("created_at", { ascending: false })
      .limit(30);

    let tasteContext = "General trendy and premium gifts.";
    if (pastLikes && pastLikes.length > 0) {
      const likesStr = pastLikes.map((l) => `${l.title} (${l.description})`)
        .join(", ");
      tasteContext =
        `The user typically likes these types of items: ${likesStr}. Analyze the implicit patterns in these gifts and suggest new ones that match this vibe or complement them perfectly.`;
    }

    let noRepeatsContext = "";
    if (pastSeen && pastSeen.length > 0) {
      const seenStr = pastSeen.map((s) => s.title).join(", ");
      noRepeatsContext =
        `CRITICAL RULE: DO NOT SUGGEST ANY OF THESE EXACT ITEMS AGAIN: ${seenStr}. Provide fresh ideas only.`;
    }

    const walletRules = walletBalance > 0
      ? `CRITICAL BUDGET RULE: The user currently has a wallet balance of €${walletBalance}. Prioritize gifts that can be fully purchased strictly using this balance (under €${walletBalance}).`
      : "";

    const safeAmountToGenerate = amountToGenerate > 0 ? amountToGenerate : 3;

    const systemInstructionText =
      `You are a premium AI gift concierge. Generate exactly ${safeAmountToGenerate} highly specific, trendy, premium gift ideas. 
CRITICAL RULE 1: You MUST suggest EXACT, REAL-WORLD products and specific brands (e.g., "Apple Watch Series 9", "Paco Rabanne One Million", "Sony WH-1000XM5 Headphones", "Dyson Airwrap"). 
CRITICAL RULE 2: DO NOT SUGGEST VAGUE CATEGORIES (e.g. NEVER output "A leather wallet", "A smartwatch", or "A perfume"). YOU MUST GIVE THE EXACT MAKER AND MODEL.
Return ONLY a valid JSON array of objects, where each object has "title" (The exact product name), "description" (Why it's great, max 80 chars), "price_range" (e.g. "$250 - $300"), and "image_keyword" (a SINGLE broad English word describing the item for a Pexels stock photo search, e.g. for Apple Watch use "smartwatch", for Paco Rabanne use "perfume"). 
Do not include markdown formatting like \`\`\`json. 
IMPORTANT: Each idea MUST be entirely unique from the others. ${noRepeatsContext} ${walletRules}`;

    let suggestions: any[] = [];
    let lastErrorDetails = "";

    try {
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
                  {
                    role: "system",
                    content: systemInstructionText,
                  },
                  {
                    role: "user",
                    content:
                      `Generate ${safeAmountToGenerate} personalized gift ideas. Context of what they like: ${tasteContext}. Keep descriptions engaging and under 100 characters.`,
                  },
                ],
              }),
            },
          );

          const rawText = await response.text();
          if (rawText) {
            const aiData = JSON.parse(rawText);
            if (aiData.choices && aiData.choices[0]) {
              try {
                suggestions = JSON.parse(aiData.choices[0].message.content);
              } catch {
                const clean = aiData.choices[0].message.content.replace(
                  /```json/gi,
                  "",
                ).replace(/```/g, "");
                suggestions = JSON.parse(clean);
              }
            }
          } else {
            lastErrorDetails = "OpenAI Error: " + rawText;
            console.error(lastErrorDetails);
          }
        } else {
          lastErrorDetails = "OpenAI API Key missing";
          console.error(lastErrorDetails);
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
                  parts: [{
                    text: systemInstructionText,
                  }],
                },
                contents: [{
                  parts: [{
                    text:
                      `Generate ${safeAmountToGenerate} personalized gift ideas. Context of what they like: ${tasteContext}. Keep descriptions engaging and under 100 characters.`,
                  }],
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
          } else {
            lastErrorDetails = "Gemini Missing Candidates Error: " +
              JSON.stringify(aiData);
            console.error(lastErrorDetails);
          }
        } else {
          lastErrorDetails = "Gemini API Key missing";
          console.error(lastErrorDetails);
        }
      } else {
        // Fallback or explicit routing to Groq (Llama)
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
                  {
                    role: "system",
                    content: systemInstructionText,
                  },
                  {
                    role: "user",
                    content:
                      `Generate ${safeAmountToGenerate} personalized gift ideas. Context of what they like: ${tasteContext}. Keep descriptions engaging and under 100 characters.`,
                  },
                ],
              }),
            },
          );

          const rawText = await response.text();
          if (rawText) {
            const aiData = JSON.parse(rawText);
            if (aiData.choices && aiData.choices[0]) {
              try {
                suggestions = JSON.parse(aiData.choices[0].message.content);
              } catch {
                const clean = aiData.choices[0].message.content.replace(
                  /```json/gi,
                  "",
                ).replace(/```/g, "");
                suggestions = JSON.parse(clean);
              }
            } else {
              lastErrorDetails = "Groq Missing Choices Error: " + rawText;
              console.error(lastErrorDetails);
            }
          } else {
            lastErrorDetails = "Groq Error: Empty response";
            console.error(lastErrorDetails);
          }
        } else {
          lastErrorDetails = "Groq API Key missing";
          console.error(lastErrorDetails);
        }
      }
    } catch (err: any) {
      lastErrorDetails = "Fetch Exception: " + err.message;
      console.error(lastErrorDetails);
      // Will seamlessly fallback to placeholders below
    }

    // 3.b Fallback if OpenAI failed or no key
    if (!suggestions || suggestions.length === 0) {
      console.error(
        "AI engines failed to return valid suggestions.",
        lastErrorDetails,
      );
      return new Response(
        JSON.stringify({
          error: "Failed to generate AI ideas. " + lastErrorDetails,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        },
      );
    }

    // Fetch images from Pexels API locally inside the Edge Function!
    const pexelsKey = Deno.env.get("PEXELS_API_KEY");

    const mappedSuggestions = [];
    const seenNewTitles = new Set();

    for (const gift of suggestions) {
      if (!gift.title) continue;

      const normalizedTitle = gift.title.toLowerCase().trim();
      if (seenNewTitles.has(normalizedTitle)) continue;
      seenNewTitles.add(normalizedTitle);

      let finalImageUrl =
        "https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop";

      if (pexelsKey && gift.image_keyword) {
        try {
          const pexRes = await fetch(
            `https://api.pexels.com/v1/search?query=${
              encodeURIComponent(gift.image_keyword)
            }&per_page=1`,
            {
              headers: { Authorization: pexelsKey },
            },
          );
          const pexData = await pexRes.json();
          if (pexData.photos && pexData.photos.length > 0) {
            finalImageUrl = pexData.photos[0].src.portrait ||
              pexData.photos[0].src.large;
          }
        } catch (e) {
          console.error("Failed to fetch from Pexels in Edge", e);
        }
      }

      mappedSuggestions.push({
        user_id: user.id,
        title: gift.title,
        description: gift.description,
        price_range: gift.price_range,
        image_url: finalImageUrl,
        is_saved: false,
        is_rejected: false, // Ensure rejected is false initially
        is_manual: false,
      });
    }

    const { error: insertError } = await supabaseClient
      .from("gift_ideas")
      .insert(mappedSuggestions);

    if (insertError) throw insertError;

    // 5. Update last_giftinder_generation
    await supabaseClient
      .from("users")
      .update({ last_giftinder_generation: new Date().toISOString() })
      .eq("id", user.id);

    return new Response(
      JSON.stringify({
        message: "Generated successfully",
        generated: suggestions.length,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  }
});
