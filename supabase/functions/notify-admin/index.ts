import "jsr:@supabase/functions-js/edge-runtime.d.ts";

/**
 * notify-admin Edge Function
 *
 * Sends email (Resend), SMS (Twilio), Telegram message, and Web Push
 * to the admin when a conversation is escalated or a user requests
 * human assistance. All channels are optional — at least one must be
 * configured.
 *
 * Required secrets (set via `supabase secrets set`):
 *   ADMIN_EMAIL          - Email to receive alerts
 *   ADMIN_PHONE          - Phone number for SMS (e.g. +14025551234)
 *   RESEND_API_KEY       - API key from resend.com
 *   TWILIO_ACCOUNT_SID   - Twilio Account SID
 *   TWILIO_AUTH_TOKEN    - Twilio Auth Token
 *   TWILIO_FROM_NUMBER   - Twilio phone number to send from
 *   TELEGRAM_BOT_TOKEN   - Token from @BotFather (optional)
 *   TELEGRAM_CHAT_ID     - Your Telegram chat/user ID (optional)
 *   VAPID_PUBLIC_KEY     - VAPID public key for web push (optional)
 *   SUPABASE_SERVICE_ROLE_KEY - For calling send-web-push function
 */

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface NotifyRequest {
  conversationId: string;
  reason: string; // e.g. "human_requested", "crisis_detected", "urgent_escalation"
  preview?: string; // First message or summary
  priority?: string;
  visitorName?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { conversationId, reason, preview, priority, visitorName } = body as NotifyRequest;

    // Validate required fields
    if (!conversationId || typeof conversationId !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid conversationId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    if (!reason || typeof reason !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid reason" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const adminEmail = Deno.env.get("ADMIN_EMAIL");
    const adminPhone = Deno.env.get("ADMIN_PHONE");
    const resendKey = Deno.env.get("RESEND_API_KEY");
    const twilioSid = Deno.env.get("TWILIO_ACCOUNT_SID");
    const twilioToken = Deno.env.get("TWILIO_AUTH_TOKEN");
    const twilioFrom = Deno.env.get("TWILIO_FROM_NUMBER");
    const telegramToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const telegramChatId = Deno.env.get("TELEGRAM_CHAT_ID");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");

    // If no notification channels are configured, return early
    const hasEmail = adminEmail && resendKey;
    const hasSms = adminPhone && twilioSid && twilioToken && twilioFrom;
    const hasTelegram = telegramToken && telegramChatId;
    if (!hasEmail && !hasSms && !hasTelegram) {
      return new Response(
        JSON.stringify({ error: "No notification channels configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const shortId = conversationId.slice(0, 8);
    const timestamp = new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });

    // Build the alert message
    let reasonLabel = "Needs Attention";
    if (reason === "human_requested") reasonLabel = "Human Assistance Requested";
    else if (reason === "crisis_detected") reasonLabel = "CRISIS DETECTED";
    else if (reason === "urgent_escalation") reasonLabel = "Urgent Escalation";

    const smsBody = [
      `NRS Alert: ${reasonLabel}`,
      `Conv #${shortId}${visitorName ? ` (${visitorName})` : ""}`,
      priority ? `Priority: ${priority.toUpperCase()}` : "",
      preview ? `"${preview.slice(0, 100)}${preview.length > 100 ? "..." : ""}"` : "",
      `Time: ${timestamp} CT`,
      `Open dashboard to respond.`,
    ]
      .filter(Boolean)
      .join("\n");

    const results: { email?: string; sms?: string; telegram?: string; webPush?: string } = {};

    // ─── Send Email via Resend ─────────────────────────────────
    if (adminEmail && resendKey) {
      try {
        const escapedVisitorName = escapeHtml(visitorName || "");
        const escapedPreview = escapeHtml(preview || "");
        const escapedPriority = escapeHtml(priority || "");

        const emailHtml = `
          <div style="font-family: -apple-system, sans-serif; max-width: 500px;">
            <div style="background: ${reason === "crisis_detected" ? "#DC2626" : "#2563EB"}; color: white; padding: 16px 20px; border-radius: 12px 12px 0 0;">
              <h2 style="margin: 0; font-size: 18px;">${reasonLabel}</h2>
            </div>
            <div style="background: #F8FAFC; padding: 20px; border: 1px solid #E2E8F0; border-top: none; border-radius: 0 0 12px 12px;">
              <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Conversation</td>
                  <td style="padding: 6px 0; font-weight: 600;">#${shortId}</td>
                </tr>
                ${visitorName ? `<tr><td style="padding: 6px 0; color: #64748B;">Visitor</td><td style="padding: 6px 0;">${escapedVisitorName}</td></tr>` : ""}
                ${priority ? `<tr><td style="padding: 6px 0; color: #64748B;">Priority</td><td style="padding: 6px 0; font-weight: 600; color: ${priority === "urgent" ? "#DC2626" : "#F59E0B"};">${escapedPriority.toUpperCase()}</td></tr>` : ""}
                <tr>
                  <td style="padding: 6px 0; color: #64748B;">Time</td>
                  <td style="padding: 6px 0;">${timestamp} CT</td>
                </tr>
              </table>
              ${preview ? `<div style="margin-top: 12px; padding: 12px; background: white; border: 1px solid #E2E8F0; border-radius: 8px; font-size: 14px; color: #334155;"><strong>Message preview:</strong><br/>"${escapedPreview.slice(0, 200)}${escapedPreview.length > 200 ? "..." : ""}"</div>` : ""}
              <p style="margin-top: 16px; font-size: 13px; color: #64748B;">Open your admin dashboard to respond to this conversation.</p>
            </div>
          </div>
        `;

        const emailRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${resendKey}`,
          },
          body: JSON.stringify({
            from: "NRS Navigator <onboarding@resend.dev>",
            to: [adminEmail],
            subject: `${reason === "crisis_detected" ? "URGENT: " : ""}${reasonLabel} — #${shortId}`,
            html: emailHtml,
          }),
        });

        if (emailRes.ok) {
          results.email = "sent";
        } else {
          const err = await emailRes.text();
          console.error("Resend error:", err);
          results.email = `error: ${err}`;
        }
      } catch (e) {
        console.error("Email send failed:", e);
        results.email = `error: ${e.message}`;
      }
    } else {
      results.email = "skipped (no ADMIN_EMAIL or RESEND_API_KEY)";
    }

    // ─── Send SMS via Twilio ───────────────────────────────────
    if (adminPhone && twilioSid && twilioToken && twilioFrom) {
      try {
        const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
        const authHeader = btoa(`${twilioSid}:${twilioToken}`);

        const smsRes = await fetch(twilioUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${authHeader}`,
          },
          body: new URLSearchParams({
            To: adminPhone,
            From: twilioFrom,
            Body: smsBody,
          }),
        });

        if (smsRes.ok) {
          results.sms = "sent";
        } else {
          const err = await smsRes.text();
          console.error("Twilio error:", err);
          results.sms = `error: ${err}`;
        }
      } catch (e) {
        console.error("SMS send failed:", e);
        results.sms = `error: ${e.message}`;
      }
    } else {
      results.sms = "skipped (missing Twilio credentials)";
    }

    // ─── Send Telegram message ─────────────────────────────────
    if (hasTelegram) {
      try {
        const isCrisisEmoji = reason === "crisis_detected" ? "🚨" : reason === "urgent_escalation" ? "⚠️" : "💬";
        const telegramText = [
          `${isCrisisEmoji} <b>${reasonLabel}</b>`,
          `Conv: #${shortId}${visitorName ? ` (${visitorName})` : ""}`,
          priority ? `Priority: ${priority.toUpperCase()}` : "",
          preview ? `\n"${preview.slice(0, 200)}${preview.length > 200 ? "..." : ""}"` : "",
          `\nTime: ${timestamp} CT`,
          `Open dashboard to respond.`,
        ]
          .filter(Boolean)
          .join("\n");

        const tgRes = await fetch(
          `https://api.telegram.org/bot${telegramToken}/sendMessage`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              chat_id: telegramChatId,
              text: telegramText,
              parse_mode: "HTML",
            }),
          }
        );
        results.telegram = tgRes.ok ? "sent" : `error: ${await tgRes.text()}`;
      } catch (e: unknown) {
        console.error("Telegram send failed:", e);
        results.telegram = `error: ${(e as Error).message}`;
      }
    } else {
      results.telegram = "skipped (no TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID)";
    }

    // ─── Trigger Web Push (fire-and-forget) ───────────────────
    if (vapidPublicKey) {
      const supabaseUrl = Deno.env.get("SUPABASE_URL");
      const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
      if (supabaseUrl && serviceRoleKey) {
        fetch(`${supabaseUrl}/functions/v1/send-web-push`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${serviceRoleKey}`,
          },
          body: JSON.stringify({
            title: reasonLabel,
            body: preview
              ? `"${preview.slice(0, 100)}${preview.length > 100 ? "..." : ""}"`
              : "Open dashboard to respond.",
            url: "/admin",
            urgent: reason === "crisis_detected" || reason === "urgent_escalation",
          }),
        }).catch((e: unknown) => console.error("Web push fire failed:", e));
        results.webPush = "triggered";
      }
    } else {
      results.webPush = "skipped (no VAPID_PUBLIC_KEY)";
    }

    console.log(
      `Notification for #${shortId}: email=${results.email}, sms=${results.sms}, telegram=${results.telegram}, webPush=${results.webPush}`
    );

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Notify error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
