import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

/**
 * send-web-push Edge Function
 *
 * Sends Web Push notifications (RFC 8291 aes128gcm) to all stored subscriptions.
 *
 * Required secrets:
 *   VAPID_PUBLIC_KEY       - Base64url-encoded VAPID public key (uncompressed P-256)
 *   VAPID_PRIVATE_KEY_JWK  - JSON string of the VAPID private key in JWK format
 *   VAPID_SUBJECT          - Contact URI, e.g. "mailto:admin@yourapp.com"
 *   SUPABASE_URL           - Auto-provided in Supabase edge functions
 *   SUPABASE_SERVICE_ROLE_KEY - Auto-provided in Supabase edge functions
 *
 * Generate VAPID keys (run once in Node.js):
 *   const crypto = require('crypto');
 *   const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'P-256' });
 *   const pub = publicKey.export({ type: 'spki', format: 'der' });
 *   const priv = privateKey.export({ type: 'pkcs8', format: 'der' });
 *   // Or use the web-push npm package: web-push generate-vapid-keys
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

// ─── Crypto helpers ───────────────────────────────────────────────────────────

function base64url(data: Uint8Array): string {
  return btoa(String.fromCharCode(...data))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "");
}

async function fromBase64url(str: string): Promise<Uint8Array> {
  const b64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padded = b64.padEnd(b64.length + (4 - (b64.length % 4)) % 4, "=");
  return Uint8Array.from(atob(padded), (c) => c.charCodeAt(0));
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(await crypto.subtle.sign("HMAC", k, data));
}

// RFC 5869 HKDF-Extract: PRK = HMAC-SHA-256(salt, IKM)
async function hkdfExtract(salt: Uint8Array, ikm: Uint8Array): Promise<Uint8Array> {
  return hmacSha256(salt, ikm);
}

// RFC 5869 HKDF-Expand (single block, length ≤ 32)
async function hkdfExpand(prk: Uint8Array, info: Uint8Array, length: number): Promise<Uint8Array> {
  const t = await hmacSha256(prk, new Uint8Array([...info, 0x01]));
  return t.slice(0, length);
}

// ─── RFC 8291 payload encryption ─────────────────────────────────────────────

async function encryptPayload(
  plaintext: string,
  p256dhBase64url: string,
  authBase64url: string,
): Promise<{ salt: Uint8Array; serverPublicKey: Uint8Array; ciphertext: Uint8Array }> {
  const p256dh = await fromBase64url(p256dhBase64url);
  const auth = await fromBase64url(authBase64url);

  // Ephemeral server key pair
  const serverKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"],
  );
  const serverPublicKeyBuffer = await crypto.subtle.exportKey("raw", serverKeyPair.publicKey);
  const serverPublicKey = new Uint8Array(serverPublicKeyBuffer);

  // ECDH shared secret
  const receiverKey = await crypto.subtle.importKey(
    "raw",
    p256dh,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const sharedSecretBits = await crypto.subtle.deriveBits(
    { name: "ECDH", public: receiverKey },
    serverKeyPair.privateKey,
    256,
  );
  const sharedSecret = new Uint8Array(sharedSecretBits);

  // PRK_key = HKDF-Extract(auth, sharedSecret)
  const prkKey = await hkdfExtract(auth, sharedSecret);

  // key_info = "WebPush: info\0" || p256dh || serverPublicKey
  const label = new TextEncoder().encode("WebPush: info\0");
  const keyInfo = new Uint8Array(label.length + p256dh.length + serverPublicKey.length);
  keyInfo.set(label, 0);
  keyInfo.set(p256dh, label.length);
  keyInfo.set(serverPublicKey, label.length + p256dh.length);

  // IKM = HKDF-Expand(prkKey, keyInfo, 32)
  const ikm = await hkdfExpand(prkKey, keyInfo, 32);

  // Random salt (16 bytes)
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // PRK = HKDF-Extract(salt, ikm)
  const prk = await hkdfExtract(salt, ikm);

  // CEK = HKDF-Expand(PRK, "Content-Encoding: aes128gcm\0", 16)
  const cek = await hkdfExpand(
    prk,
    new TextEncoder().encode("Content-Encoding: aes128gcm\0"),
    16,
  );

  // Nonce = HKDF-Expand(PRK, "Content-Encoding: nonce\0", 12)
  const nonce = await hkdfExpand(
    prk,
    new TextEncoder().encode("Content-Encoding: nonce\0"),
    12,
  );

  // RFC 8188: single record — content || 0x02 (last-record delimiter)
  const plaintextBytes = new TextEncoder().encode(plaintext);
  const content = new Uint8Array(plaintextBytes.length + 1);
  content.set(plaintextBytes);
  content[plaintextBytes.length] = 0x02;

  const cekKey = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: "AES-GCM", iv: nonce }, cekKey, content),
  );

  return { salt, serverPublicKey, ciphertext };
}

// ─── VAPID JWT ────────────────────────────────────────────────────────────────

async function createVapidJWT(
  privateKeyJwk: JsonWebKey,
  audience: string,
  subject: string,
): Promise<string> {
  const headerBytes = new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" }));
  const payloadBytes = new TextEncoder().encode(
    JSON.stringify({
      aud: audience,
      exp: Math.floor(Date.now() / 1000) + 43200, // 12 hours
      sub: subject,
    }),
  );

  const toSign = `${base64url(headerBytes)}.${base64url(payloadBytes)}`;

  const privateKey = await crypto.subtle.importKey(
    "jwk",
    privateKeyJwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const signature = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      privateKey,
      new TextEncoder().encode(toSign),
    ),
  );

  return `${toSign}.${base64url(signature)}`;
}

// ─── Send to single endpoint ──────────────────────────────────────────────────

async function sendToEndpoint(
  endpoint: string,
  p256dh: string,
  auth: string,
  payload: string,
  vapidPrivateKeyJwk: JsonWebKey,
  vapidPublicKey: string,
  vapidSubject: string,
): Promise<{ success: boolean; status?: number; error?: string }> {
  try {
    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJWT(vapidPrivateKeyJwk, audience, vapidSubject);

    const { salt, serverPublicKey, ciphertext } = await encryptPayload(payload, p256dh, auth);

    // aes128gcm content-encoding header: salt(16) || rs(4, BE) || idlen(1) || server_pub(65)
    const header = new Uint8Array(16 + 4 + 1 + serverPublicKey.length);
    header.set(salt, 0);
    new DataView(header.buffer).setUint32(16, 4096, false);
    header[20] = serverPublicKey.length; // 65
    header.set(serverPublicKey, 21);

    const body = new Uint8Array(header.length + ciphertext.length);
    body.set(header, 0);
    body.set(ciphertext, header.length);

    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${jwt},k=${vapidPublicKey}`,
        "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream",
        "Content-Length": String(body.length),
        TTL: "86400",
      },
      body,
    });

    if (res.ok || res.status === 201) {
      return { success: true, status: res.status };
    }
    const text = await res.text().catch(() => "");
    return { success: false, status: res.status, error: text };
  } catch (e: unknown) {
    return { success: false, error: (e as Error).message };
  }
}

// ─── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const { title, body, url, urgent } = await req.json();

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const vapidPrivateKeyJwkStr = Deno.env.get("VAPID_PRIVATE_KEY_JWK");
    const vapidPublicKey = Deno.env.get("VAPID_PUBLIC_KEY");
    const vapidSubject = Deno.env.get("VAPID_SUBJECT") || "mailto:admin@nrs-resources.com";

    if (!vapidPrivateKeyJwkStr || !vapidPublicKey) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const vapidPrivateKeyJwk: JsonWebKey = JSON.parse(vapidPrivateKeyJwkStr);

    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: subscriptions, error } = await supabase
      .from("web_push_subscriptions")
      .select("endpoint, p256dh, auth");

    if (error) throw error;

    if (!subscriptions?.length) {
      return new Response(
        JSON.stringify({ success: true, sent: 0, message: "No subscriptions registered" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const payload = JSON.stringify({ title, body, url: url || "/admin", urgent: !!urgent });

    const results = await Promise.all(
      subscriptions.map((sub) =>
        sendToEndpoint(
          sub.endpoint,
          sub.p256dh,
          sub.auth,
          payload,
          vapidPrivateKeyJwk,
          vapidPublicKey,
          vapidSubject,
        )
      ),
    );

    // Prune expired subscriptions (push service returns 410 Gone)
    const expiredEndpoints = subscriptions
      .filter((_, i) => results[i].status === 410)
      .map((s) => s.endpoint);
    if (expiredEndpoints.length) {
      await supabase
        .from("web_push_subscriptions")
        .delete()
        .in("endpoint", expiredEndpoints);
    }

    const sent = results.filter((r) => r.success).length;
    console.log(`Web push: ${sent}/${subscriptions.length} delivered`);

    return new Response(
      JSON.stringify({ success: true, sent, total: subscriptions.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (error: unknown) {
    console.error("send-web-push error:", error);
    return new Response(
      JSON.stringify({ error: (error as Error).message || "Internal error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
