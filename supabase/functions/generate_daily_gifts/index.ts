import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan to Gift Count mapping
const PLAN_LIMITS: Record<string, number> = {
  'FREE': 3,
  'STANDARD': 5,
  'PRO': 7,
  'ULTRA': 10,
  'BUSINESS': 15
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    // Get the user making the request
    const { data: { user }, error: userError } = await supabaseClient.auth.getUser();
    if (userError || !user) throw new Error('Unauthorized');

    // 1. Fetch user profile for their plan
    const { data: profile } = await supabaseClient
      .from('users')
      .select('subscription_plan, last_giftinder_generation')
      .eq('id', user.id)
      .single();

    const plan = profile?.subscription_plan || 'FREE';
    const amountToGenerate = PLAN_LIMITS[plan] || 3;

    // Optional: Protect against spamming the function
    const lastGen = profile?.last_giftinder_generation ? new Date(profile.last_giftinder_generation) : null;
    const today = new Date();
    if (lastGen && lastGen.toDateString() === today.toDateString()) {
       // Already generated today.
       return new Response(JSON.stringify({ message: "Already generated today", generated: 0 }), {
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       });
    }

    // 2. Fetch past likes to understand taste (last 5 manually liked items)
    const { data: pastLikes } = await supabaseClient
      .from('gift_ideas')
      .select('title, description')
      .eq('user_id', user.id)
      .eq('is_saved', true)
      .order('created_at', { ascending: false })
      .limit(5);

    let tasteContext = "General trendy and premium gifts.";
    if (pastLikes && pastLikes.length > 0) {
       const likesStr = pastLikes.map(l => `${l.title} (${l.description})`).join(', ');
       tasteContext = `The user likes these types of items: ${likesStr}. Suggest gifts matching this vibe or complementing them.`;
    }

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    // 3. Call OpenAI API if key is present
    let suggestions: any[] = [];
    
    if (openAiKey) {
      try {
        const response = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openAiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: 'gpt-4o',
            messages: [
              { 
                  role: 'system', 
                  content: `You are a premium AI gift concierge. Generate exactly ${amountToGenerate} highly specific, trendy, premium gift ideas based on the user's taste. Return ONLY a valid JSON array of objects, where each object has "title", "description", "price_range", and "image_url" (provide a realistic Unsplash image URL). Do not include markdown formatting like \`\`\`json.` 
              },
              { role: 'user', content: `Generate ${amountToGenerate} personalized gift ideas. Context of what they like: ${tasteContext}. Keep descriptions engaging and under 100 characters.` }
            ],
          }),
        });

        const rawText = await response.text();
        if (rawText) {
          const aiData = JSON.parse(rawText);
          if (aiData.choices && aiData.choices[0]) {
             try {
                suggestions = JSON.parse(aiData.choices[0].message.content);
             } catch {
                const clean = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '');
                suggestions = JSON.parse(clean);
             }
          }
        }
      } catch (err) {
        console.error("OpenAI Fetch Error:", err.message);
        // Will seamlessly fallback to placeholders below
      }
    }

    // 3.b Fallback if OpenAI failed or no key
    if (!suggestions || suggestions.length === 0) {
        suggestions = Array.from({ length: amountToGenerate }).map((_, i) => ({
            title: `Trendy Gift Idea ${i + 1}`,
            description: "A personalized gift idea placeholder. The AI engine is currently resting!",
            price_range: "$50 - $150",
            image_url: 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop'
        }));
    }

    // 4. Insert generated ideas into gift_ideas with is_saved = false
    const insertData = suggestions.map((gift: any) => ({
        user_id: user.id,
        title: gift.title,
        description: gift.description,
        price_range: gift.price_range,
        image_url: gift.image_url || 'https://images.unsplash.com/photo-1549465220-1a8b9238cd48?q=80&w=400&auto=format&fit=crop',
        is_saved: false,
        is_manual: false
    }));

    const { error: insertError } = await supabaseClient
      .from('gift_ideas')
      .insert(insertData);

    if (insertError) throw insertError;

    // 5. Update last_giftinder_generation
    await supabaseClient
      .from('users')
      .update({ last_giftinder_generation: new Date().toISOString() })
      .eq('id', user.id);

    return new Response(JSON.stringify({ 
        message: "Generated successfully", 
        generated: suggestions.length 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
