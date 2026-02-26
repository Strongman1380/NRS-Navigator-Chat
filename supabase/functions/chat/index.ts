import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  conversationId: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      }
    );

    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { messages, conversationId }: ChatRequest = await req.json();

    // Fetch admin-managed resources
    const { data: resources } = await supabaseClient
      .from("resources")
      .select("*")
      .eq("is_active", true);

    // Extract search terms from the user's last message for knowledge base lookup
    const lastUserMessage = messages
      .filter((m) => m.role === "user")
      .pop()?.content?.toLowerCase() ?? "";

    // Extract city names from the conversation for location filtering
    const allUserText = messages
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join(" ");
    const cityPattern =
      /\b(omaha|lincoln|bellevue|grand island|kearney|hastings|north platte|fremont|norfolk|columbus|papillion|la vista|ralston|gretna|scottsbluff|south sioux city|beatrice|lexington|york|seward|plattsmouth|nebraska city|wayne|chadron|sidney|alliance|mccook|broken bow|valentine|ogallala|holdrege|central city)\b/gi;
    const detectedCities = [
      ...new Set(
        (allUserText.match(cityPattern) || []).map(
          (c: string) => c.charAt(0).toUpperCase() + c.slice(1).toLowerCase()
        )
      ),
    ];

    // Build knowledge base query — use full-text search if we have keywords
    let knowledgeResults: any[] = [];
    const searchTerms = lastUserMessage
      .replace(/[^\w\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 3)
      .slice(0, 8);

    if (searchTerms.length > 0 || detectedCities.length > 0) {
      // Try full-text search first
      if (searchTerms.length > 0) {
        const tsQuery = searchTerms.join(" | ");
        const { data: ftsResults } = await supabaseClient
          .from("knowledge_base")
          .select("title, content, category, city, phone, website")
          .eq("is_active", true)
          .textSearch("fts", tsQuery)
          .limit(20);
        if (ftsResults) knowledgeResults.push(...ftsResults);
      }

      // Also search by detected city
      if (detectedCities.length > 0) {
        const { data: cityResults } = await supabaseClient
          .from("knowledge_base")
          .select("title, content, category, city, phone, website")
          .eq("is_active", true)
          .in("city", detectedCities)
          .limit(20);
        if (cityResults) {
          // Deduplicate
          const existingTitles = new Set(knowledgeResults.map((r: any) => r.title));
          for (const r of cityResults) {
            if (!existingTitles.has(r.title)) knowledgeResults.push(r);
          }
        }
      }

      // If asking about AA/meetings/recovery, also pull meeting data
      if (/\b(aa|meeting|recovery|sober|12.?step|alcoholic)\b/i.test(lastUserMessage)) {
        const { data: meetingResults } = await supabaseClient
          .from("knowledge_base")
          .select("title, content, category, city, phone, website")
          .eq("is_active", true)
          .eq("category", "aa_meeting")
          .limit(15);
        if (meetingResults) {
          const existingTitles = new Set(knowledgeResults.map((r: any) => r.title));
          for (const r of meetingResults) {
            if (!existingTitles.has(r.title)) knowledgeResults.push(r);
          }
        }
      }
    }

    // Format knowledge base results for the prompt
    const knowledgeSection =
      knowledgeResults.length > 0
        ? `\n\nExtended Knowledge Base (treatment facilities, AA meetings, prescribers):\n${knowledgeResults
            .map((r: any) => r.content)
            .join("\n---\n")}`
        : "";

    const systemPrompt = `You are a compassionate Crisis Navigator AI assistant helping individuals in need find resources and support in Nebraska. You have access to a database of resources including shelters, treatment centers, crisis support, food banks, medical clinics, legal aid, AA meetings, and buprenorphine prescribers.

Your role:
1. Listen empathetically and provide emotional support
2. Assess the person's immediate needs
3. Recommend relevant resources from the database — always include phone numbers and addresses when available
4. Provide crisis support contact information when needed
5. If someone asks for a human, requests to speak with someone, or says they need human help, respond with: "I understand you'd like to speak with a human. Let me connect you with our crisis support team." and include the phrase "ESCALATE_TO_HUMAN" in your response.
6. When recommending treatment centers or AA meetings, provide specific names, addresses, phone numbers, and hours
7. If the user mentions a city, prioritize resources in or near that city

Available Resources (admin-managed):
${JSON.stringify(resources, null, 2)}${knowledgeSection}

Crisis Contacts:
- National Suicide & Crisis Lifeline: 988 (call or text, 24/7)
- Emergency Services: 911
- National Domestic Violence Hotline: 1-800-799-7233 (or text START to 88788)
- 211 Helpline: Call 211 for local services (free, confidential, 24/7)

Be warm, non-judgmental, and solution-focused. Always provide specific contact information (phone numbers, addresses) when recommending resources. If you don't have information for a specific area, be honest and suggest calling 211 or visiting findtreatment.gov.`;

    const openaiMessages = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("OPENAI_API_KEY")}`,
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: openaiMessages,
          temperature: 0.7,
          max_tokens: 1000,
        }),
      }
    );

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.statusText}`);
    }

    const openaiData = await openaiResponse.json();
    const assistantMessage = openaiData.choices[0].message.content;

    const needsHumanEscalation = assistantMessage.includes("ESCALATE_TO_HUMAN");

    await supabaseClient.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "user",
      content: messages[messages.length - 1].content,
      user_id: user.id,
    });

    await supabaseClient.from("messages").insert({
      conversation_id: conversationId,
      sender_type: "ai",
      content: assistantMessage.replace("ESCALATE_TO_HUMAN", "").trim(),
      user_id: user.id,
    });

    // Detect crisis keywords in the user's message
    const userMsg = messages[messages.length - 1].content.toLowerCase();
    const isCrisis = /\b(suicid|kill myself|hurt myself|end it|want to die|self.?harm)\b/i.test(userMsg);

    if (needsHumanEscalation || isCrisis) {
      await supabaseClient
        .from("conversations")
        .update({
          status: "escalated",
          needs_human_response: true,
          ...(isCrisis ? { priority: "urgent" } : {}),
        })
        .eq("id", conversationId);

      // Get the first user message as preview
      const firstUserMsg = messages.filter((m) => m.role === "user")[0]?.content || userMsg;

      // Fetch visitor name if available
      const { data: convoData } = await supabaseClient
        .from("conversations")
        .select("visitor_name, priority")
        .eq("id", conversationId)
        .single();

      // Fire notification to admin (email + SMS)
      // For crisis events, await the notification and persist a flag on failure so a worker can retry.
      // For non-crisis events, fire-and-forget to avoid blocking the response.
      const notifyUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/notify-admin`;
      const notifyPayload = {
        conversationId,
        reason: isCrisis ? "crisis_detected" : "human_requested",
        preview: firstUserMsg.slice(0, 200),
        priority: isCrisis ? "urgent" : convoData?.priority || "high",
        visitorName: convoData?.visitor_name || null,
      };
      const notifyOptions = {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
        },
        body: JSON.stringify(notifyPayload),
      };

      if (isCrisis) {
        try {
          const notifyRes = await fetch(notifyUrl, notifyOptions);
          if (!notifyRes.ok) {
            throw new Error(`Notify-admin returned ${notifyRes.status}`);
          }
        } catch (e) {
          console.error("Crisis notify-admin call failed, setting pending flag:", e);
          await supabaseClient
            .from("conversations")
            .update({ pending_notification: true })
            .eq("id", conversationId);
        }
      } else {
        fetch(notifyUrl, notifyOptions).catch((e) =>
          console.error("Notify-admin call failed:", e)
        );
      }
    }

    return new Response(
      JSON.stringify({
        message: assistantMessage.replace("ESCALATE_TO_HUMAN", "").trim(),
        needsHumanEscalation,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
