import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

// This function is triggered by a Supabase database webhook
// when a new message is inserted into the messages table.
// It sends a push notification to all admin users via FCM.

Deno.serve(async (req: Request) => {
  try {
    const payload = await req.json();
    const { record } = payload;

    // Only notify for visitor messages (not admin or AI messages)
    if (!record || record.sender_type !== "visitor") {
      return new Response(JSON.stringify({ skipped: true }), { status: 200 });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all admin push tokens
    const { data: adminProfiles } = await supabaseAdmin
      .from("profiles")
      .select("id")
      .eq("role", "admin");

    if (!adminProfiles || adminProfiles.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no admins" }), { status: 200 });
    }

    const adminIds = adminProfiles.map((p: { id: string }) => p.id);

    const { data: tokens } = await supabaseAdmin
      .from("push_tokens")
      .select("token")
      .in("user_id", adminIds);

    if (!tokens || tokens.length === 0) {
      return new Response(JSON.stringify({ skipped: true, reason: "no tokens" }), { status: 200 });
    }

    // Get conversation details for context
    const { data: conversation } = await supabaseAdmin
      .from("conversations")
      .select("id, status, priority")
      .eq("id", record.conversation_id)
      .single();

    const title = conversation?.priority === "urgent"
      ? "URGENT: New Message"
      : "New Message Received";

    const body = record.content.length > 100
      ? record.content.substring(0, 100) + "..."
      : record.content;

    // Send FCM notification to each token
    const fcmKey = Deno.env.get("FCM_SERVER_KEY");
    if (!fcmKey) {
      console.error("FCM_SERVER_KEY not set");
      return new Response(JSON.stringify({ error: "FCM not configured" }), { status: 500 });
    }

    const notifications = tokens.map((t: { token: string }) =>
      fetch("https://fcm.googleapis.com/fcm/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `key=${fcmKey}`,
        },
        body: JSON.stringify({
          to: t.token,
          notification: {
            title,
            body,
            sound: "default",
            channel_id: "nrs_messages",
            priority: "high",
            click_action: "FLUTTER_NOTIFICATION_CLICK",
          },
          data: {
            conversation_id: record.conversation_id,
            message_id: record.id,
            type: "new_message",
          },
          android: {
            priority: "high",
            notification: {
              sound: "default",
              channel_id: "nrs_messages",
              notification_priority: "PRIORITY_HIGH",
              default_sound: true,
              default_vibrate_timings: true,
            },
          },
        }),
      })
    );

    const results = await Promise.allSettled(notifications);
    const sent = results.filter((r) => r.status === "fulfilled").length;

    return new Response(
      JSON.stringify({ sent, total: tokens.length }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Push notification error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500 }
    );
  }
});
