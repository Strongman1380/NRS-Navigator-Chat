import admin from "./_firebaseAdmin.js";

const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || "bhinrichs1380@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

const ALLOWED_EMAILS = (process.env.ALLOWED_EMAILS || "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export async function requireAuth(req, res) {
  const token = req.headers.authorization?.replace("Bearer ", "");
  if (!token) {
    res.status(401).json({ error: "Unauthorized - no token" });
    return null;
  }

  try {
    const decoded = await admin.auth().verifyIdToken(token);
    const email = (decoded.email || "").toLowerCase();

    // Check if email is authorized
    const isAdmin = ADMIN_EMAILS.includes(email);
    const isAllowed = isAdmin || ALLOWED_EMAILS.includes(email);

    if (!isAllowed && ALLOWED_EMAILS.length > 0) {
      res.status(403).json({ error: "Forbidden - not authorized" });
      return null;
    }

    decoded._isAdmin = isAdmin;
    return decoded;
  } catch (err) {
    res.status(401).json({ error: "Unauthorized - invalid token" });
    return null;
  }
}
