import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

type NeedType = "food" | "shelter" | "treatment" | "medical" | "legal" | "other";

interface SearchRequest {
  need: NeedType;
  city?: string | null;
  queryText?: string;
  limit?: number;
}

interface NormalizedSuggestion {
  title: string;
  phone?: string;
  address?: string;
  city?: string;
  website?: string;
  source: "local" | "web";
}

const CATEGORY_MAP: Record<NeedType, string[]> = {
  food: ["food"],
  shelter: ["shelter"],
  treatment: ["treatment_facility", "aa_meeting", "buprenorphine_prescriber", "counseling"],
  medical: ["medical", "counseling"],
  legal: ["legal"],
  other: ["other", "employment", "government", "youth", "crisis"],
};

const OVERPASS_TAG_MAP: Record<NeedType, string> = {
  food: "food_bank|soup_kitchen|social_facility|community_centre|place_of_worship",
  shelter: "shelter|social_facility|community_centre",
  treatment: "clinic|hospital|doctors|social_facility|community_centre",
  medical: "clinic|hospital|doctors|dentist|pharmacy",
  legal: "courthouse|townhall|social_facility|community_centre",
  other: "social_facility|community_centre|place_of_worship",
};

function normalizeAddressFromTags(tags: Record<string, string | undefined>): string | undefined {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:city"],
    tags["addr:state"],
    tags["addr:postcode"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(" ") : undefined;
}

function cleanSearchTerms(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2)
    .slice(0, 10)
    .join(" ");
}

async function geocodeCity(city: string): Promise<{ lat: number; lon: number } | null> {
  const url = `https://nominatim.openstreetmap.org/search?format=jsonv2&limit=1&q=${encodeURIComponent(
    `${city}, Nebraska`,
  )}`;
  const response = await fetch(url, {
    headers: { "User-Agent": "NRS-Navigator/1.0 (resource-search)" },
  });
  if (!response.ok) return null;

  const data = await response.json() as Array<{ lat: string; lon: string }>;
  if (!data[0]) return null;
  return { lat: Number(data[0].lat), lon: Number(data[0].lon) };
}

async function fetchOverpassSuggestions(
  need: NeedType,
  city: string | null,
  limit: number,
): Promise<NormalizedSuggestion[]> {
  const coords = city ? await geocodeCity(city) : null;
  if (!coords) return [];

  const radius = 22000;
  const amenityRegex = OVERPASS_TAG_MAP[need];
  const overpassQuery = `
[out:json][timeout:20];
(
  node(around:${radius},${coords.lat},${coords.lon})["amenity"~"${amenityRegex}"];
  way(around:${radius},${coords.lat},${coords.lon})["amenity"~"${amenityRegex}"];
  relation(around:${radius},${coords.lat},${coords.lon})["amenity"~"${amenityRegex}"];
);
out center tags ${Math.max(limit * 3, 10)};
  `.trim();

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "text/plain" },
    body: overpassQuery,
  });
  if (!response.ok) return [];

  const data = await response.json() as {
    elements?: Array<{
      lat?: number;
      lon?: number;
      center?: { lat: number; lon: number };
      tags?: Record<string, string>;
    }>;
  };

  const elements = data.elements ?? [];
  const seen = new Set<string>();
  const suggestions: NormalizedSuggestion[] = [];

  for (const element of elements) {
    const tags = element.tags ?? {};
    const title = tags.name || tags.operator || tags.brand;
    if (!title) continue;

    const address = normalizeAddressFromTags(tags) || tags["addr:full"];
    const key = `${title.toLowerCase()}|${(address || "").toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);

    suggestions.push({
      title,
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      address,
      city: tags["addr:city"] || city || undefined,
      source: "web",
    });

    if (suggestions.length >= limit) break;
  }

  return suggestions;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? "",
      {
        global: {
          headers: { Authorization: req.headers.get("Authorization")! },
        },
      },
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

    const body = await req.json() as SearchRequest;
    const need = body.need || "other";
    const city = body.city?.trim() || null;
    const limit = Math.min(Math.max(body.limit ?? 5, 1), 10);
    const searchTerms = cleanSearchTerms(body.queryText ?? "");

    const suggestions: NormalizedSuggestion[] = [];

    const { data: resourceRows } = await supabaseClient
      .from("resources")
      .select("name, phone, address, city, website")
      .eq("is_active", true)
      .eq("type", need === "other" ? "other" : need)
      .ilike("city", city ? `%${city}%` : "%")
      .limit(limit);

    for (const row of resourceRows ?? []) {
      suggestions.push({
        title: row.name,
        phone: row.phone ?? undefined,
        address: row.address ?? undefined,
        city: row.city ?? undefined,
        website: row.website ?? undefined,
        source: "local",
      });
    }

    let kbQuery = supabaseClient
      .from("knowledge_base")
      .select("title, city, phone, website, content")
      .eq("is_active", true)
      .in("category", CATEGORY_MAP[need])
      .limit(limit * 2);

    if (city) {
      kbQuery = kbQuery.ilike("city", `%${city}%`);
    }
    if (searchTerms.length >= 3) {
      kbQuery = kbQuery.textSearch("fts", searchTerms, { type: "websearch" });
    }

    const { data: kbRows } = await kbQuery;
    for (const row of kbRows ?? []) {
      if (suggestions.some((s) => s.title.toLowerCase() === row.title.toLowerCase())) continue;
      suggestions.push({
        title: row.title,
        phone: row.phone ?? undefined,
        city: row.city ?? undefined,
        website: row.website ?? undefined,
        address: row.content?.slice(0, 140) ?? undefined,
        source: "local",
      });
      if (suggestions.length >= limit) break;
    }

    if (suggestions.length < Math.min(3, limit)) {
      const webSuggestions = await fetchOverpassSuggestions(need, city, limit - suggestions.length);
      for (const suggestion of webSuggestions) {
        if (suggestions.some((s) => s.title.toLowerCase() === suggestion.title.toLowerCase())) continue;
        suggestions.push(suggestion);
        if (suggestions.length >= limit) break;
      }
    }

    return new Response(
      JSON.stringify({
        suggestions,
        sourceSummary: {
          localCount: suggestions.filter((s) => s.source === "local").length,
          webCount: suggestions.filter((s) => s.source === "web").length,
        },
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("resource-search error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
