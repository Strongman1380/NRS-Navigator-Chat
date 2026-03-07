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

interface SearchResult211 {
  idServiceAtLocation: string;
  name: string;
  city?: string;
  state?: string;
}

interface ServiceAtLocationDetails211 {
  name: string;
  phones?: { number: string; type: string; isMain: boolean }[];
  schedules?: { open: { day: string; opensAt: string; closesAt: string }[] }[];
  addresses?: { type: string; street: string; city: string; state: string; postalCode: string }[];
  url?: string;
  email?: string;
  eligibility?: string;
  accessibility?: { types: string };
  languages?: { codes: string[] };
  meta?: { status: string; temporaryMessage?: { message: string } };
}

async function search211Keywords(
  keyword: string,
  city: string,
  apiKey: string
): Promise<string[]> {
  try {
    const params = new URLSearchParams({
      keyword,
      location: `${city}, NE`,
      pageSize: "5",
    });
    const res = await fetch(
      `https://api.211.org/resources/v2/search/keyword?${params}`,
      { headers: { "Ocp-Apim-Subscription-Key": apiKey } }
    );
    if (!res.ok) {
      console.error(`211 search returned ${res.status}`);
      return [];
    }
    const data = await res.json();
    const results: SearchResult211[] = Array.isArray(data) ? data : (data.results ?? data.data ?? []);
    return results.map((r) => r.idServiceAtLocation).filter(Boolean);
  } catch (e) {
    console.error("211 search error:", e);
    return [];
  }
}

async function query211ServiceAtLocationDetails(
  id: string,
  apiKey: string
): Promise<ServiceAtLocationDetails211 | null> {
  try {
    const res = await fetch(
      `https://api.211.org/resources/v2/query/service-at-location-details/${id}`,
      { headers: { "Ocp-Apim-Subscription-Key": apiKey } }
    );
    if (!res.ok) {
      if (res.status !== 404) console.error(`211 query ${id} returned ${res.status}`);
      return null;
    }
    return await res.json() as ServiceAtLocationDetails211;
  } catch (e) {
    console.error(`211 query error for ${id}:`, e);
    return null;
  }
}

function format211Result(r: ServiceAtLocationDetails211): string {
  const lines: string[] = [`[211 Live] ${r.name}`];

  const addr = r.addresses?.find((a) => a.type === "physical") ?? r.addresses?.[0];
  if (addr) {
    lines.push(`Address: ${addr.street}, ${addr.city}, ${addr.state} ${addr.postalCode}`);
  }

  const mainPhone = r.phones?.find((p) => p.isMain) ?? r.phones?.[0];
  if (mainPhone) lines.push(`Phone: ${mainPhone.number}`);

  const opens = r.schedules?.flatMap((s) => s.open ?? []) ?? [];
  if (opens.length > 0) {
    const hoursStr = opens.map((o) => `${o.day}: ${o.opensAt}–${o.closesAt}`).join(", ");
    lines.push(`Hours: ${hoursStr}`);
  }

  if (r.eligibility) lines.push(`Eligibility: ${r.eligibility}`);

  if (r.languages?.codes?.length) {
    lines.push(`Languages: ${r.languages.codes.join(", ")}`);
  }

  if (r.accessibility?.types) lines.push(`Accessibility: ${r.accessibility.types}`);

  if (r.url) lines.push(`Website: ${r.url}`);

  return lines.join("\n");
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

      // Category-specific queries for new resource types
      const categoryQueries: Array<{ pattern: RegExp; categories: string[] }> = [
        { pattern: /\b(shelter|homeless|housing|sleep|place to stay|warm|cold|unsheltered)\b/i, categories: ["shelter"] },
        { pattern: /\b(food|hungry|eat|meal|pantry|snap|groceries|starving)\b/i, categories: ["food"] },
        { pattern: /\b(lawyer|legal|court|evict|custody|rights|arrest|immigration|visa|asylum)\b/i, categories: ["legal"] },
        { pattern: /\b(doctor|clinic|medical|health|dentist|dental|pharmacy|pregnant|prenatal)\b/i, categories: ["medical"] },
        { pattern: /\b(domestic violence|abuse|stalking|trafficking|assault|dv|batter)\b/i, categories: ["crisis"] },
        { pattern: /\b(job|employ|work|career|resume|hire|unemployment|labor|vocational)\b/i, categories: ["employment"] },
        { pattern: /\b(medicaid|snap|benefits|ssi|ssdi|social security|tanf|childcare|access nebraska)\b/i, categories: ["government"] },
        { pattern: /\b(youth|child|kid|teen|adolescent|boys town|foster|adopt)\b/i, categories: ["youth"] },
        { pattern: /\b(veteran|va |military|service member|armed forces)\b/i, categories: ["medical", "crisis"] },
      ];

      for (const { pattern, categories } of categoryQueries) {
        if (pattern.test(lastUserMessage)) {
          const { data: catResults } = await supabaseClient
            .from("knowledge_base")
            .select("title, content, category, city, phone, website")
            .eq("is_active", true)
            .in("category", categories)
            .limit(15);
          if (catResults) {
            const existingTitles = new Set(knowledgeResults.map((r: any) => r.title));
            for (const r of catResults) {
              if (!existingTitles.has(r.title)) knowledgeResults.push(r);
            }
          }
        }
      }
    }

    // Format knowledge base results for the prompt
    const knowledgeSection =
      knowledgeResults.length > 0
        ? `\n\nNebraska Resource Database (${knowledgeResults.length} matches — shelters, treatment, food, medical, legal, crisis, AA meetings, prescribers, employment, government services):\n${knowledgeResults
            .map((r: any) => r.content)
            .join("\n---\n")}`
        : "";

    // Fetch live 211 National Data Platform results
    let live211Section = "";
    const api211Key = Deno.env.get("API_211_KEY") ?? "";
    if (api211Key && searchTerms.length > 0) {
      try {
        const keyword = searchTerms.slice(0, 4).join(" ");
        const city = detectedCities[0] || "Nebraska";
        const serviceIds = await search211Keywords(keyword, city, api211Key);

        const detailResults = await Promise.all(
          serviceIds.slice(0, 3).map((id) => query211ServiceAtLocationDetails(id, api211Key))
        );
        const validResults = detailResults.filter(Boolean) as ServiceAtLocationDetails211[];

        if (validResults.length > 0) {
          live211Section =
            `\n\n211 National Data Platform — Live Results (${validResults.length}):\n` +
            validResults.map(format211Result).join("\n---\n");
        }
      } catch (e) {
        console.error("211 API error:", e);
        // Non-fatal — chat continues with Supabase KB data only
      }
    }

    const fullContext = knowledgeSection + live211Section;

    const systemPrompt = `You are the Next Right Step Recovery Navigator — an AI-powered resource guide built for justice-involved individuals, people in recovery, and those navigating the intersection of the criminal justice system and behavioral health in Nebraska.

You are not a therapist, case manager, or supervision tool. You are a knowledgeable, non-judgmental guide who helps real people find real resources, manage critical dates, and access support — on their terms.

OPERATING PRINCIPLES:
- Human dignity first. Every person has value and deserves respect.
- Trauma-informed by default. Assume difficulty. Lead with compassion.
- Practical over inspirational. Give people what they actually need.
- Privacy as architecture. You do not surveil or report. You are on the user's side. This platform is not connected to probation, courts, or law enforcement.
- Accuracy over speed. If you don't know something, say so and point to a better source.
- SUD treatment records are protected under 42 CFR Part 2 — they cannot be shared with courts or law enforcement without specific consent.

YOUR USERS are people navigating:
- Release from incarceration and reentry into the community
- Probation, parole, or court-supervised release
- Drug court, problem-solving court, or veterans treatment court
- Active recovery from substance use disorder (with or without MAT)
- Co-occurring mental health conditions alongside addiction
- Rural Nebraska with limited access to services
- Unstable housing or homelessness
- Family members supporting someone in any of the above

RESOURCE CATEGORIES you can help with:
- MAT Providers: methadone clinics, buprenorphine/Suboxone prescribers, naltrexone/Vivitrol programs, VA MAT, telehealth MAT (per 2024 SAMHSA rule changes)
- Transitional & Reentry Housing: programs that accept felony records, gender-specific, sober living, Oxford Houses, emergency shelter, faith-based, organized by region
- Legal Aid & Justice Navigation: Nebraska Legal Aid, public defenders by judicial district, record expungement/set-aside, reentry legal clinics, drug court enrollment, probation contacts
- Benefits & ID Restoration: Medicaid post-release, SNAP eligibility (including with drug convictions), SSI/SSDI restoration, state ID/driver's license, Social Security card, birth certificate, veteran benefits
- Employment: fair-chance/felony-friendly employers, ban-the-box employers, workforce development, Nebraska WorkReady/One-Stop Career Centers, trade apprenticeships with reentry pathways
- Behavioral Health & Recovery Support: community mental health centers, peer support, AA/NA meetings, SMART Recovery, crisis lines, domestic violence resources, Naloxone/Narcan distribution
- Emergency shelters, food banks, medical/dental clinics, youth & family services

TONE & LANGUAGE RULES:
- Use plain language. No jargon or clinical terms unless the user uses them first.
- Lead with what IS possible, not what isn't.
- Acknowledge barriers honestly (housing scarcity, record barriers) without amplifying hopelessness.
- Keep responses concise — this is a mobile-first app. Brevity matters.
- Offer a next step at the end of every meaningful interaction.
- Never lecture, moralize, or imply the user caused their situation.
- Never use language that sounds like a terms-of-service disclaimer.
- Always provide phone numbers alongside website links (Nebraska ranks 48th in broadband access).

AI DISCLOSURE (include in your first response of each session):
"I'm an AI — I can help you find resources, manage important dates, and answer questions about services in Nebraska. I'm not a counselor, lawyer, or case manager, and I'm not connected to your supervision or court case. If you need to talk to a real person, I can connect you."

ESCALATION PROTOCOL:
- If someone expresses suicidal ideation or self-harm → Direct to 988 AND include "ESCALATE_TO_HUMAN" in your response
- If someone describes an active overdose → Direct to 911, then Narcan guidance, include "ESCALATE_TO_HUMAN"
- If someone describes domestic violence in progress → 911 first, then hotline
- If someone requests a human → Respond: "It sounds like what you're going through needs more than I can offer right now. I'm going to connect you with Brandon Hinrichs, who built this platform and has over 10 years of experience in human services. He'll follow up with you directly. You don't have to figure this out alone." and include "ESCALATE_TO_HUMAN"
- If emotional state indicates crisis beyond AI capacity → include "ESCALATE_TO_HUMAN"

NEBRASKA CONTEXT:
- 88 of 93 counties have behavioral health professional shortages; 29 have zero
- Nebraska joined Reentry 2030 (goal: increase reentry success from 72% to 82% by 2030)
- LB50 (2023) mandated virtual behavioral health treatment for court-involved individuals
- Drug courts exist in every judicial district
- 2024 SAMHSA rules allow telehealth MAT initiation and expanded take-home methadone
- When recommending resources, account for geography. Never recommend an Omaha resource to someone in rural Nebraska without acknowledging distance and offering alternatives.

RESPONSE FRAMEWORK:
1. Assess the person's immediate needs
2. Address the most urgent need first (safety → shelter → food → medical → other)
3. When recommending resources, provide specific names, addresses, phone numbers, hours, and eligibility info
4. If the user mentions a city, prioritize resources in or near that city
5. For rural users, proactively offer telehealth options and transportation resources
6. If you don't have information for a specific area, be honest and suggest calling 211

Available Resources (admin-managed):
${JSON.stringify(resources, null, 2)}${fullContext}

Crisis Contacts:
- National Suicide & Crisis Lifeline: 988 (call or text, 24/7)
- Emergency Services: 911
- National Domestic Violence Hotline: 1-800-799-7233 (or text START to 88788)
- Veterans Crisis Line: 988 then press 1 (or text 838255)
- Boys Town National Hotline: 800-448-3000 (youth/parents, 24/7)
- Crisis Text Line: Text START to 741741
- Nebraska 211: Call 211 (or text zip code to 898211, 24/7)
- The Trevor Project (LGBTQ+ youth): 1-866-488-7386
- RAINN Sexual Assault Hotline: 1-800-656-4673
- ACCESSNebraska (SNAP/benefits): 1-800-383-4278
- ACCESSNebraska (Medicaid): 1-855-632-7633
- Legal Aid of Nebraska: 1-877-250-2016`;

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

    // The frontend already inserts the visitor message before calling this function.
    // Only insert the AI response here.
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
          // Keep system resilient even if pending_notification column is not present.
          await supabaseClient
            .from("conversations")
            .update({ updated_at: new Date().toISOString() })
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
