import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL") as string;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") as string;

// Initialize Supabase with service role to bypass RLS and read all events
const supabase = createClient(supabaseUrl, supabaseServiceKey);

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log("Starting Daily Notifications Job via CRON...");

    const { data: templates, error: templatesError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    if (templatesError) throw templatesError;

    // If no templates are active, we can skip processing
    if (!templates || templates.length === 0) {
      console.log("No active email templates found. Exiting early.");
      return new Response(
        JSON.stringify({ success: true, message: "No active templates." }),
        { headers: corsHeaders },
      );
    }

    const { data, error: eventsError } = await supabase
      .from("events")
      .select(`
        id, event_date, event_type, title, user_id, contact_id,
        users!inner(id, email, full_name, notify_email_events),
        contacts!inner(id, first_name, last_name)
      `)
      .eq("users.notify_email_events", true);

    if (eventsError) throw eventsError;

    // Supabase TS infers one-to-many as arrays, but these are foreign keys (one-to-one mapping per event)
    type JoinedEvent = {
      id: string;
      event_date: string;
      event_type: string;
      title: string;
      user_id: string;
      contact_id: string;
      users: { id: string; email: string; full_name: string };
      contacts: { id: string; first_name: string; last_name: string };
    };

    const events = data as unknown as JoinedEvent[];

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let notificationsSent = 0;

    for (const event of (events || [])) {
      if (!event.event_date) continue;

      const eventDate = new Date(event.event_date);
      // Ensure we are comparing dates in the current year
      eventDate.setFullYear(today.getFullYear());

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      // Find if there's an active template matching the exact days offset
      const matchedTemplate = templates.find((t) =>
        t.trigger_days === diffDays
      );

      if (matchedTemplate) {
        const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("event_id", event.id)
          .eq("user_id", event.user_id)
          .eq("trigger_days", diffDays)
          .gte("sent_at", startOfYear)
          .limit(1)
          .maybeSingle();

        if (existingLog) continue;

        // Dynamic Variable Replacement
        const userName = event.users.full_name || "Приятел";
        const contactName = `${event.contacts.first_name || ''} ${event.contacts.last_name || ''}`.trim();
        const eventTitle = event.title;

        const processTemplate = (text: string) => {
          return text
            .replace(/{{userName}}/g, userName)
            .replace(/{{contactName}}/g, contactName)
            .replace(/{{eventTitle}}/g, eventTitle)
            .replace(/{{daysLeft}}/g, diffDays.toString());
        };

        const finalSubject = processTemplate(matchedTemplate.subject);
        const finalHtml = processTemplate(matchedTemplate.body_html);

        console.log(
          `Sending Email to: ${event.users.email} | Subject: ${finalSubject}`,
        );

        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "Podaryavai <notifications@podaryavai.com>",
              to: event.users.email,
              subject: finalSubject,
              html: finalHtml,
            }),
          });

          if (!resendResponse.ok) {
            const errBody = await resendResponse.text();
            console.error("Resend API dropped the request:", errBody);
            continue; // Skip inserting the log if the email strictly failed
          }

          const { error: insertError } = await supabase.from(
            "notification_logs",
          ).insert({
            user_id: event.user_id,
            event_id: event.id,
            contact_id: event.contact_id,
            notification_type: "EMAIL",
            trigger_days: diffDays,
            status: "SENT",
          });

          if (!insertError) {
            notificationsSent++;
          } else {
            console.error("Failed to insert log:", insertError);
          }
        } catch (mailErr) {
          console.error("Network error calling Resend API:", mailErr);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          `CRON executed successfully. Sent ${notificationsSent} notifications.`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err: unknown) {
    console.error("CRON Error:", err);
    return new Response(
      JSON.stringify({
        error: err instanceof Error ? err.message : String(err),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});
