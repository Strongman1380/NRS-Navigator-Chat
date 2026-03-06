import { AuthKitToken } from "@picahq/authkit-token";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const authKitToken = new AuthKitToken(process.env.PICA_SECRET_KEY);
    const { token } = await authKitToken.create({
      identity: "brandon-hinrichs",
      identity_type: "user",
    });

    return res.status(200).json({ token });
  } catch (error) {
    console.error("Error generating Pica token:", error);
    return res.status(500).json({ error: "Failed to generate token" });
  }
}
