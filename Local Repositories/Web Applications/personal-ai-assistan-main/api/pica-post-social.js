const PICA_API_BASE = "https://api.picaos.com/v1";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { platform, message, imageUrl, connectionId } = req.body;

  if (!platform || !message) {
    return res.status(400).json({ error: "platform and message are required" });
  }

  try {
    // Build the passthrough request based on platform
    let endpoint = "";
    let body = {};

    switch (platform.toLowerCase()) {
      case "facebook":
        endpoint = `/passthrough/${connectionId}/me/feed`;
        body = { message };
        if (imageUrl) {
          endpoint = `/passthrough/${connectionId}/me/photos`;
          body = { message, url: imageUrl };
        }
        break;

      case "instagram":
        // Instagram requires a two-step process via Facebook Graph API
        endpoint = `/passthrough/${connectionId}/me/media`;
        body = { caption: message };
        if (imageUrl) {
          body.image_url = imageUrl;
        }
        break;

      case "linkedin":
        endpoint = `/passthrough/${connectionId}/posts`;
        body = {
          author: "urn:li:person:me",
          lifecycleState: "PUBLISHED",
          specificContent: {
            "com.linkedin.ugc.ShareContent": {
              shareCommentary: { text: message },
              shareMediaCategory: imageUrl ? "IMAGE" : "NONE",
            },
          },
          visibility: {
            "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC",
          },
        };
        break;

      default:
        return res.status(400).json({ error: `Unsupported platform: ${platform}` });
    }

    const response = await fetch(`${PICA_API_BASE}${endpoint}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.PICA_SECRET_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("Pica social post error:", response.status, data);
      return res.status(response.status).json({
        success: false,
        error: data.message || "Failed to post",
      });
    }

    return res.status(200).json({ success: true, result: data });
  } catch (error) {
    console.error("Error posting to social:", error);
    return res.status(500).json({ success: false, error: "Failed to post to social media" });
  }
}
