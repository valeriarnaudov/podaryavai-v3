// deno-lint-ignore-file no-explicit-any no-import-prefix no-unused-vars
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";
import { findNameDay } from "./nameDaysBg.ts";

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
    let reqBody: any = {};
    if (req.headers.get("content-type")?.includes("application/json")) {
      try {
        reqBody = await req.json();
      } catch (e) {
        console.error("No valid JSON body found, proceeding with empty body");
      }
    }
    const forceTest = !!reqBody.force_test;

    console.log("Starting Daily Notifications Job via CRON...", { forceTest });

    const debugLogs: string[] = [];
    let notificationsSent = 0;

    // DOWNGRADE EXPIRED SUBSCRIPTIONS
    const { data: expiredUsers, error: expireError } = await supabase
      .from("users")
      .update({ subscription_plan: "FREE", subscription_expires_at: null })
      .lt("subscription_expires_at", new Date().toISOString())
      .neq("subscription_plan", "FREE")
      .select("id, email");

    if (expireError) {
      console.error("Failed to downgrade expired subscriptions:", expireError);
    } else if (expiredUsers && expiredUsers.length > 0) {
      const msg = `Downgraded ${expiredUsers.length} users to FREE plan.`;
      console.log(msg);
      debugLogs.push(msg);
    }

    // CLEANUP OLD KARMA HISTORY (older than 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const { error: cleanupError, count: cleanupCount } = await supabase
      .from("user_karma_history")
      .delete({ count: "exact" })
      .lt("created_at", thirtyDaysAgo.toISOString());

    if (cleanupError) {
      const msg =
        `Failed to cleanup old karma history: ${cleanupError.message}`;
      console.error(msg);
      debugLogs.push(msg);
    } else {
      const msg = `Cleaned up ${cleanupCount || 0} old karma history records.`;
      console.log(msg);
      debugLogs.push(msg);
    }

    const { data: templates, error: templatesError } = await supabase
      .from("email_templates")
      .select("*")
      .eq("is_active", true);

    if (templatesError) throw templatesError;

    // If no templates are active, we can skip processing
    if (!templates || templates.length === 0) {
      console.log("No active email templates found. Exiting emails early.");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No active templates.",
          debugLogs,
        }),
        { headers: corsHeaders },
      );
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // FETCH ALL OPTED-IN USERS FOR ACCOUNT EVENTS
    const { data: users, error: usersError } = await supabase.rpc(
      "get_users_for_notifications",
    );
    if (usersError) {
      console.error("Failed to fetch users:", usersError);
    } else if (users && users.length > 0) {
      const yearStr = today.getFullYear().toString();
      const startOfYear = new Date(today.getFullYear(), 0, 1).toISOString();

      const sendAccountEmail = async (
        user: any,
        diffDays: number,
        type: "ACCOUNT_BIRTHDAY" | "ACCOUNT_NAME_DAY",
      ) => {
        // 1. Check if we already logged this exact combination
        const { data: existingLog } = await supabase
          .from("notification_logs")
          .select("id")
          .eq("event_id", user.id)
          .eq("user_id", user.id)
          .eq("trigger_days", diffDays)
          .eq("notification_type", type)
          .gte("sent_at", startOfYear)
          .limit(1)
          .maybeSingle();

        if (existingLog && !forceTest) return;

        // 2. Draft email content based on type and diffDays
        let subject = "";
        let title = "";
        let msg = "";
        const userName = user.first_name || user.full_name || "Приятел";

        if (type === "ACCOUNT_BIRTHDAY") {
          if (diffDays === 0) {
            subject = `Честит Рожден Ден, ${userName}! 🥳🎂`;
            title = `Честит Рожден Ден, ${userName}!`;
            msg =
              `Екипът на Podaryavai ти пожелава безброй поводи за усмивки, здраве, късмет и много сбъднати мечти! <br/><br/>
                   Нека тази година ти донесе най-прекрасните изненади и незабравими моменти с любимите хора.`;
          } else if (diffDays === 3) {
            subject = `Твоят Рожден Ден наближава! 🎈`;
            title = `Остават само 3 дни до празника!`;
            msg =
              `Напомняме ти, че след 3 дни имаш рожден ден! Време е да се подготвиш за празненството и да поканиш любимите хора.`;
          }
        } else if (type === "ACCOUNT_NAME_DAY") {
          if (diffDays === 0) {
            subject = `Честит Имен Ден, ${userName}! ✨`;
            title = `Честит Имен Ден, ${userName}!`;
            msg =
              `Екипът на Podaryavai ти пожелава да носиш името си със здраве, чест и гордост! Нека в живота ти има много светлина и сбъднати желания.`;
          } else if (diffDays === 3) {
            subject = `Твоят Имен Ден наближава! 🎊`;
            title = `Остават само 3 дни!`;
            msg =
              `Напомняме ти, че след 3 дни е твоят имен ден! Не пропускай да почерпиш приятелите и любимите хора.`;
          }
        }

        if (!subject) return;

        const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155;">
          <div style="background-color: #f8fafc; padding: 40px 30px; border-radius: 16px; text-align: center; border: 2px solid ${
          type === "ACCOUNT_BIRTHDAY" ? "#fbbf24" : "#60a5fa"
        };">
            <div style="font-size: 48px; margin-bottom: 20px;">${
          type === "ACCOUNT_BIRTHDAY" ? "🎉🎂🎁" : "🎉✨🥂"
        }</div>
            <h1 style="color: #0f172a; margin-bottom: 10px;">${title}</h1>
            <p style="font-size: 18px; line-height: 1.6; color: #475569;">
              ${msg}
            </p>
            <div style="text-align: center; margin-top: 30px;">
              <a href="https://app.podaryavai.com" style="background-color: ${
          type === "ACCOUNT_BIRTHDAY" ? "#fbbf24" : "#60a5fa"
        }; color: ${
          type === "ACCOUNT_BIRTHDAY" ? "#0f172a" : "#fff"
        }; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">Отвори Podaryavai</a>
            </div>
          </div>
          <div style="text-align: center; margin-top: 40px; font-size: 12px; color: #94a3b8;">
            <p>Празнувай смело!</p>
            <p>© 2026 Podaryavai & Social Ecosystem</p>
          </div>
        </div>`;

        console.log(
          `Sending ${type} Greeting to: ${user.email} (diffDays: ${diffDays})`,
        );

        try {
          const resendResponse = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: "onboarding@resend.dev",
              to: user.email,
              subject: subject,
              html: htmlBody,
            }),
          });

          if (!resendResponse.ok) {
            const errBody = await resendResponse.text();
            let errMsg = `Resend API failed for ${type}: ${errBody}`;
            if (errBody.includes("verify a domain")) {
              errMsg +=
                " -> NOTICE: Free Resend accounts can ONLY send to the registered verified email. Verify a domain in Resend to send to others!";
            }
            console.error(errMsg);
            debugLogs.push(errMsg);
            return;
          }

          const { error: insertError } = await supabase.from(
            "notification_logs",
          ).insert({
            user_id: user.id,
            event_id: user.id, // using user's UUID
            notification_type: type,
            trigger_days: diffDays,
            status: "SENT",
          });

          if (!insertError) {
            notificationsSent++;
          }
        } catch (err) {
          console.error(`Email error for ${type}:`, err);
        }
      };

      for (const user of users) {
        // BIRTHDAY Check
        if (user.dob) {
          const parts = user.dob.split("-");
          if (parts.length === 3) {
            const bdayDate = new Date(
              parseInt(parts[0]),
              parseInt(parts[1]) - 1,
              parseInt(parts[2]),
            );
            bdayDate.setHours(0, 0, 0, 0);
            bdayDate.setFullYear(today.getFullYear());

            if (bdayDate.getTime() < today.getTime()) {
              bdayDate.setFullYear(today.getFullYear() + 1);
            }

            const diffTime = bdayDate.getTime() - today.getTime();
            const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
            if (diffDays === 0 || diffDays === 3) {
              await sendAccountEmail(user, diffDays, "ACCOUNT_BIRTHDAY");
            }
          }
        }

        // NAME DAY Check
        if (user.first_name) {
          const nd = findNameDay(user.first_name);
          if (nd) {
            const parts = nd.date.split("-");
            if (parts.length === 2) {
              const ndDate = new Date(
                today.getFullYear(),
                parseInt(parts[0]) - 1,
                parseInt(parts[1]),
              );
              ndDate.setHours(0, 0, 0, 0);

              if (ndDate.getTime() < today.getTime()) {
                ndDate.setFullYear(today.getFullYear() + 1);
              }

              const diffTime = ndDate.getTime() - today.getTime();
              const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));
              if (diffDays === 0 || diffDays === 3) {
                await sendAccountEmail(user, diffDays, "ACCOUNT_NAME_DAY");
              }
            }
          }
        }
      }
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

    for (const event of (events || [])) {
      if (!event.event_date) continue;

      // event_date format is YYYY-MM-DD
      const parts = event.event_date.split("-");
      if (parts.length !== 3) continue;

      const eventDate = new Date(
        parseInt(parts[0]),
        parseInt(parts[1]) - 1,
        parseInt(parts[2]),
      );
      eventDate.setHours(0, 0, 0, 0); // ensure midnight local
      eventDate.setFullYear(today.getFullYear());

      // If the event year already passed this year, push it to next year
      if (eventDate.getTime() < today.getTime()) {
        eventDate.setFullYear(today.getFullYear() + 1);
      }

      const diffTime = eventDate.getTime() - today.getTime();
      const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

      // Find if there's an active template matching the exact days offset
      const matchedTemplate = templates.find((t) =>
        t.trigger_days === diffDays
      );

      const logStr =
        `[Event Check] Event: ${event.title} | EventDate: ${eventDate.toISOString()} | diffTime: ${diffTime} | diffDays: ${diffDays} | MatchedTemplate: ${
          matchedTemplate ? matchedTemplate.name : "None"
        }`;
      console.log(logStr);
      debugLogs.push(logStr);

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

        if (existingLog && !forceTest) continue;

        // Dynamic Variable Replacement
        const userName = event.users.full_name || "Приятел";
        const contactName = `${event.contacts.first_name || ""} ${
          event.contacts.last_name || ""
        }`.trim();
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
              from: "onboarding@resend.dev",
              to: event.users.email,
              subject: finalSubject,
              html: finalHtml,
            }),
          });

          if (!resendResponse.ok) {
            const errBody = await resendResponse.text();
            let errMsg = `Resend API dropped the request: ${errBody}`;
            if (errBody.includes("verify a domain")) {
              errMsg +=
                " -> NOTICE: Free Resend accounts can ONLY send to the registered verified email. Verify a domain in Resend to send to others!";
            }
            console.error(errMsg);
            debugLogs.push(errMsg);
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
            const errMsg = `Failed to insert log: ${
              JSON.stringify(insertError)
            }`;
            console.error(errMsg);
            debugLogs.push(errMsg);
          }
        } catch (mailErr) {
          const errMsg = `Network error calling Resend API: ${String(mailErr)}`;
          console.error(errMsg);
          debugLogs.push(errMsg);
        }
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        message:
          `CRON executed successfully. Sent ${notificationsSent} notifications.`,
        debugLogs,
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
