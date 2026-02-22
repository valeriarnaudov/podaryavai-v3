import { serve } from "https://deno.land/std@0.168.0/http/server.ts"\;
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'\;

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { contactId, name, relationship } = await req.json();

    const openAiKey = Deno.env.get('OPENAI_API_KEY');
    
    // Call OpenAI API
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o',
        messages: [
          { role: 'system', content: 'You are a professional gift concierge. Suggest 3 highly specific, trendy, premium gift ideas based on the profile provided. Return ONLY a valid JSON array of objects, where each object has "title", "description", and "price_range". Do not include markdown formatting like ```json.' },
          { role: 'user', content: `Suggest gifts for a person named ${name}. Relationship: ${relationship}. Keep descriptions short and engaging.` }
        ],
      }),
    });

    const aiData = await response.json();
    let suggestions = [];
    
    try {
      suggestions = JSON.parse(aiData.choices[0].message.content);
    } catch {
       // fallback if parser fails due to markdown wrappers
       const clean = aiData.choices[0].message.content.replace(/```json/g, '').replace(/```/g, '');
       suggestions = JSON.parse(clean);
    }

    return new Response(JSON.stringify(suggestions), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    });
  }
});
