import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { getUpcomingEventEmailHtml, getUpcomingEventEmailSubject } from "./templates.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') as string;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') as string;

// Initialize Supabase with service role to bypass RLS and read all events
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    console.log("Starting Daily Notifications Job via CRON...");

    const { data: events, error: eventsError } = await supabase
      .from('events')
      .select(`
        id, event_date, event_type, title, user_id, contact_id,
        users!inner(id, email, full_name),
        contacts!inner(id, name)
      `);

    if (eventsError) throw eventsError;

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    for (const event of (events || [])) {
      if (!event.event_date) continue;
      
      const eventDate = new Date(event.event_date);
      eventDate.setFullYear(today.getFullYear());
      
      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      const targetDays = [10, 7, 3, 0];
      if (targetDays.includes(diffDays)) {
        
        const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
        const { data: existingLog } = await supabase
          .from('notification_logs')
          .select('id')
          .eq('event_id', event.id)
          .eq('user_id', event.user_id)
          .eq('trigger_days', diffDays)
          .gte('sent_at', startOfYear)
          .limit(1)
          .maybeSingle();

        if (existingLog) continue;

        const subject = getUpcomingEventEmailSubject(event.title, event.contacts.name, diffDays);
        const html = getUpcomingEventEmailHtml(
            event.users.full_name || 'Приятел', 
            event.contacts.name, 
            event.title, 
            diffDays
        );

        console.log(`[SIMULATED EMAIL] To: ${event.users.email} | Subject: ${subject}`);
        /* Real API call:
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { 
            'Authorization': \`Bearer \${Deno.env.get('RESEND_API_KEY')}\`, 
            'Content-Type': 'application/json' 
          },
          body: JSON.stringify({
            from: 'Podaryavai <notifications@podaryavai.com>',
            to: event.users.email,
            subject: subject,
            html: html
          })
        });
        */

        const { error: insertError } = await supabase.from('notification_logs').insert({
          user_id: event.user_id,
          event_id: event.id,
          contact_id: event.contact_id,
          notification_type: 'EMAIL',
          trigger_days: diffDays,
          status: 'SENT'
        });

        if (!insertError) {
            notificationsSent++;
        } else {
            console.error("Failed to insert log:", insertError);
        }
      }
    }

    return new Response(JSON.stringify({ 
      success: true, 
      message: `CRON executed successfully. Sent ${notificationsSent} notifications.` 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err: any) {
    console.error("CRON Error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
