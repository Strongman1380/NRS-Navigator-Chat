const PICA_API_BASE = "https://api.picaos.com/v1";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const response = await fetch(`${PICA_API_BASE}/connections`, {
      headers: {
        Authorization: `Bearer ${process.env.PICA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Pica API error:", response.status, errorText);
      return res.status(response.status).json({ error: "Failed to fetch integrations" });
    }

    const data = await response.json();
    return res.status(200).json({ integrations: data.rows || data.connections || data || [] });
  } catch (error) {
    console.error("Error fetching integrations:", error);
    return res.status(500).json({ error: "Failed to fetch integrations" });
  }
}
