export function json(res, status, body) {
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.status(status).json(body);
}

export function methodNotAllowed(res) {
  res.status(405).json({ error: "Method not allowed" });
}

export function noStore(res) {
  res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, private, max-age=0");
  res.setHeader("Pragma", "no-cache");
  res.setHeader("Expires", "0");
}

function normalizeOrigin(value) {
  if (!value || typeof value !== "string") return "";
  try {
    return new URL(value).origin;
  } catch {
    return "";
  }
}

function isLocalHost(host) {
  return /^(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(String(host || "").trim());
}

function expectedOrigin(req) {
  const host = req.headers["x-forwarded-host"] || req.headers.host || "";
  if (!host) return "";
  const forwardedProto = String(req.headers["x-forwarded-proto"] || "")
    .split(",")[0]
    .trim();
  const proto = forwardedProto || (isLocalHost(host) ? "http" : "https");
  return `${proto}://${host}`;
}

export function isTrustedOrigin(req) {
  const origin = normalizeOrigin(req.headers.origin);
  const refererOrigin = normalizeOrigin(req.headers.referer);
  const expected = expectedOrigin(req);
  if (!expected) return true;
  if (origin) {
    if (origin === expected) return true;
    try {
      const originUrl = new URL(origin);
      const expectedUrl = new URL(expected);
      if (isLocalHost(originUrl.host) && isLocalHost(expectedUrl.host) && originUrl.host === expectedUrl.host) {
        return true;
      }
    } catch {
      return false;
    }
    return false;
  }
  if (refererOrigin) return refererOrigin === expected;
  return true;
}

export function requireTrustedOrigin(req, res) {
  const method = String(req.method || "").toUpperCase();
  if (method === "GET" || method === "HEAD" || method === "OPTIONS") return true;
  if (isTrustedOrigin(req)) return true;
  json(res, 403, { error: "Forbidden - invalid request origin" });
  return false;
}

export function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (typeof forwarded === "string" && forwarded.length) {
    return forwarded.split(",")[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length) {
    return String(forwarded[0]).split(",")[0].trim();
  }
  return req.headers["x-real-ip"] || req.socket?.remoteAddress || "unknown";
}

export function getUserAgent(req) {
  return req.headers["user-agent"] || "unknown";
}

export function readCookie(req, name) {
  const raw = req.headers.cookie;
  if (!raw) return "";
  const parts = raw.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) return decodeURIComponent(rest.join("="));
  }
  return "";
}

export async function parseJsonBody(req, options = {}) {
  const maxBytes = Number(options.maxBytes || 262_144);

  if (req.body && typeof req.body === "object") return req.body;
  if (typeof req.body === "string" && req.body.trim()) {
    if (Buffer.byteLength(req.body, "utf8") > maxBytes) {
      return { __parseError: "body_too_large" };
    }
    try {
      return JSON.parse(req.body);
    } catch {
      return {};
    }
  }

  const chunks = [];
  let totalBytes = 0;
  let tooLarge = false;
  await new Promise((resolve) => {
    req.on("data", (chunk) => {
      totalBytes += chunk.length;
      if (tooLarge) return;
      if (totalBytes > maxBytes) {
        tooLarge = true;
        return;
      }
      chunks.push(chunk);
    });
    req.on("end", resolve);
  });
  if (tooLarge) return { __parseError: "body_too_large" };
  if (!chunks.length) return {};

  const raw = Buffer.concat(chunks).toString("utf8").trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}
