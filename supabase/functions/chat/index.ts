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

    const { data: resources } = await supabaseClient
      .from("resources")
      .select("*")
      .eq("is_active", true);

    const systemPrompt = `You are a compassionate Crisis Navigator AI assistant helping individuals in need find resources and support. You have access to a database of resources including shelters, treatment centers, crisis support, food banks, medical clinics, and legal aid.

Your role:
1. Listen empathetically and provide emotional support
2. Assess the person's immediate needs
3. Recommend relevant resources from the database
4. Provide crisis support contact information when needed
5. If someone asks for a human, requests to speak with someone, or says they need human help, respond with: "I understand you'd like to speak with a human. Let me connect you with our crisis support team." and include the phrase "ESCALATE_TO_HUMAN" in your response.

Available Resources:
${JSON.stringify(resources, null, 2)}

Crisis Contacts:
- National Suicide & Crisis Lifeline: 988 (24/7)
- Emergency Services: 911

Be warm, non-judgmental, and solution-focused. If you don't have information, be honest and suggest alternative ways to help.`;

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

    if (needsHumanEscalation) {
      await supabaseClient
        .from("conversations")
        .update({
          status: "escalated",
          needs_human_response: true,
        })
        .eq("id", conversationId);
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
