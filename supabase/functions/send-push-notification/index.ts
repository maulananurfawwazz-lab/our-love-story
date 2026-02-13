// @ts-nocheck
// ═══════════════════════════════════════════════════════════════
// Edge Function: send-push-notification
// Sends Web Push to the partner of the authenticated user.
// Runs in Deno on Supabase — not checked by local TS.
// ═══════════════════════════════════════════════════════════════

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// ─── Web Push helpers (RFC 8291 / RFC 8188) ─────────────────
// Uses the Web Crypto API available in Deno to do VAPID-signed
// Web Push without any external npm packages.
// ─────────────────────────────────────────────────────────────

const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY")!;
const VAPID_SUBJECT = Deno.env.get("VAPID_SUBJECT") || "mailto:fawwaz@ourjourney.app";

/** base64url encode */
function b64url(buf: ArrayBuffer | Uint8Array): string {
  const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/** base64url decode */
function b64urlDecode(str: string): Uint8Array {
  const base64 = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = "=".repeat((4 - (base64.length % 4)) % 4);
  const binary = atob(base64 + padding);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

/** Concat typed arrays */
function concat(...arrays: Uint8Array[]): Uint8Array {
  const total = arrays.reduce((sum, a) => sum + a.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const a of arrays) {
    result.set(a, offset);
    offset += a.length;
  }
  return result;
}

/** Create VAPID JWT */
async function createVapidJwt(audience: string): Promise<string> {
  const header = b64url(new TextEncoder().encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    new TextEncoder().encode(
      JSON.stringify({
        aud: audience,
        exp: now + 12 * 3600,
        sub: VAPID_SUBJECT,
      })
    )
  );

  const signingInput = new TextEncoder().encode(`${header}.${payload}`);

  // Import VAPID private key
  const rawKey = b64urlDecode(VAPID_PRIVATE_KEY);
  const jwk: JsonWebKey = {
    kty: "EC",
    crv: "P-256",
    d: VAPID_PRIVATE_KEY,
    x: VAPID_PUBLIC_KEY.length > 43
      ? b64url(b64urlDecode(VAPID_PUBLIC_KEY).slice(1, 33))
      : VAPID_PUBLIC_KEY,
    y: VAPID_PUBLIC_KEY.length > 43
      ? b64url(b64urlDecode(VAPID_PUBLIC_KEY).slice(33, 65))
      : undefined,
  };

  // For uncompressed public key (65 bytes starting with 0x04), extract x,y
  const pubBytes = b64urlDecode(VAPID_PUBLIC_KEY);
  if (pubBytes.length === 65 && pubBytes[0] === 0x04) {
    jwk.x = b64url(pubBytes.slice(1, 33));
    jwk.y = b64url(pubBytes.slice(33, 65));
  }

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    signingInput
  );

  // Convert DER signature to raw r||s (64 bytes)
  const sigBytes = new Uint8Array(signature);
  let rawSig: Uint8Array;
  if (sigBytes.length === 64) {
    rawSig = sigBytes;
  } else {
    // Parse DER
    rawSig = derToRaw(sigBytes);
  }

  return `${header}.${payload}.${b64url(rawSig)}`;
}

function derToRaw(der: Uint8Array): Uint8Array {
  // DER: 0x30 len 0x02 rlen r 0x02 slen s
  const raw = new Uint8Array(64);
  let offset = 2; // skip 0x30 and total length
  // r
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const rLen = der[offset++];
  const rStart = rLen > 32 ? offset + (rLen - 32) : offset;
  const rDest = rLen < 32 ? 32 - rLen : 0;
  raw.set(der.slice(rStart, offset + rLen), rDest);
  offset += rLen;
  // s
  if (der[offset] !== 0x02) throw new Error("Invalid DER");
  offset++;
  const sLen = der[offset++];
  const sStart = sLen > 32 ? offset + (sLen - 32) : offset;
  const sDest = sLen < 32 ? 64 - sLen : 32;
  raw.set(der.slice(sStart, offset + sLen), sDest);
  return raw;
}

/** Encrypt payload using AES-128-GCM (RFC 8188) for Web Push */
async function encryptPayload(
  p256dhKey: string,
  authSecret: string,
  payload: Uint8Array
): Promise<{ ciphertext: Uint8Array; salt: Uint8Array; localPublicKey: Uint8Array }> {
  const clientPublicKey = b64urlDecode(p256dhKey);
  const clientAuth = b64urlDecode(authSecret);

  // Generate local ECDH key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKeyRaw = new Uint8Array(
    await crypto.subtle.exportKey("raw", localKeyPair.publicKey)
  );

  // Import client's public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // Derive shared secret
  const sharedSecret = new Uint8Array(
    await crypto.subtle.deriveBits(
      { name: "ECDH", public: clientKey },
      localKeyPair.privateKey,
      256
    )
  );

  // Generate random salt
  const salt = crypto.getRandomValues(new Uint8Array(16));

  // HKDF info parameters
  const encoder = new TextEncoder();
  const keyInfoPrefix = encoder.encode("WebPush: info\0");
  const keyInfo = concat(keyInfoPrefix, clientPublicKey, localPublicKeyRaw);

  // PRK = HKDF-Extract(auth_secret, shared_secret)
  const authKey = await crypto.subtle.importKey("raw", clientAuth, { name: "HKDF" }, false, [
    "deriveBits",
  ]);
  // Actually use the HKDF extract step manually
  const prkKey = await crypto.subtle.importKey(
    "raw",
    clientAuth,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk = new Uint8Array(await crypto.subtle.sign("HMAC", prkKey, sharedSecret));

  // IKM = HKDF-Expand(PRK, "WebPush: info\0" || client_public || server_public, 32)
  const ikm = await hkdfExpand(prk, keyInfo, 32);

  // PRK2 = HKDF-Extract(salt, IKM)
  const saltKey = await crypto.subtle.importKey(
    "raw",
    salt,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const prk2 = new Uint8Array(await crypto.subtle.sign("HMAC", saltKey, ikm));

  // CEK = HKDF-Expand(PRK2, "Content-Encoding: aes128gcm\0", 16)
  const cekInfo = encoder.encode("Content-Encoding: aes128gcm\0");
  const cek = await hkdfExpand(prk2, cekInfo, 16);

  // Nonce = HKDF-Expand(PRK2, "Content-Encoding: nonce\0", 12)
  const nonceInfo = encoder.encode("Content-Encoding: nonce\0");
  const nonce = await hkdfExpand(prk2, nonceInfo, 12);

  // Encrypt with AES-128-GCM
  const aesKey = await crypto.subtle.importKey("raw", cek, { name: "AES-GCM" }, false, [
    "encrypt",
  ]);

  // Add padding delimiter (RFC 8188: payload || 0x02)
  const paddedPayload = concat(payload, new Uint8Array([2]));

  const encrypted = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce, tagLength: 128 },
      aesKey,
      paddedPayload
    )
  );

  // Build aes128gcm content-coding header:
  // salt (16) || rs (4, big-endian uint32) || idlen (1) || keyid (65, server public key)
  const rs = new DataView(new ArrayBuffer(4));
  rs.setUint32(0, paddedPayload.length + 16, false); // record size = payload + tag
  const header = concat(
    salt,
    new Uint8Array(rs.buffer),
    new Uint8Array([65]),
    localPublicKeyRaw
  );

  const ciphertext = concat(header, encrypted);

  return { ciphertext, salt, localPublicKey: localPublicKeyRaw };
}

async function hkdfExpand(
  prk: Uint8Array,
  info: Uint8Array,
  length: number
): Promise<Uint8Array> {
  const hmacKey = await crypto.subtle.importKey(
    "raw",
    prk,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );

  // For length <= 32 (which is our case), we only need one iteration
  const input = concat(info, new Uint8Array([1]));
  const output = new Uint8Array(await crypto.subtle.sign("HMAC", hmacKey, input));
  return output.slice(0, length);
}

/** Send a single push */
async function sendPush(
  endpoint: string,
  p256dh: string,
  auth: string,
  payloadObj: Record<string, unknown>
): Promise<{ success: boolean; status?: number; gone?: boolean }> {
  try {
    const payloadBytes = new TextEncoder().encode(JSON.stringify(payloadObj));
    const { ciphertext } = await encryptPayload(p256dh, auth, payloadBytes);

    const url = new URL(endpoint);
    const audience = `${url.protocol}//${url.host}`;
    const jwt = await createVapidJwt(audience);
    const vapidPubBytes = b64urlDecode(VAPID_PUBLIC_KEY);
    const p65 = b64url(vapidPubBytes);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        Authorization: `vapid t=${jwt}, k=${p65}`,
        TTL: "86400",
        Urgency: "high",
      },
      body: ciphertext,
    });

    if (response.status === 410 || response.status === 404) {
      return { success: false, status: response.status, gone: true };
    }
    if (!response.ok) {
      const text = await response.text().catch(() => "");
      console.error(`[Push] ${endpoint.slice(0, 60)}… → ${response.status}: ${text}`);
      return { success: false, status: response.status };
    }

    return { success: true, status: response.status };
  } catch (err) {
    console.error("[Push] sendPush error:", err);
    return { success: false };
  }
}

// ═══════════════════════════════════════════════════════════════
// Main handler
// ═══════════════════════════════════════════════════════════════

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify the JWT and get the user
    const token = authHeader.replace("Bearer ", "");
    const {
      data: { user },
      error: authError,
    } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Get the sender's profile (to find couple_id)
    const { data: senderProfile } = await supabaseAdmin
      .from("profiles")
      .select("id, couple_id, name")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!senderProfile?.couple_id) {
      return new Response(
        JSON.stringify({ error: "No couple found" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Parse notification payload
    const { type, title, body, url, tag } = await req.json();

    // Find partner's push subscriptions (all devices)
    const { data: subscriptions, error: subError } = await supabaseAdmin
      .from("push_subscriptions")
      .select("*")
      .eq("couple_id", senderProfile.couple_id)
      .neq("user_id", user.id); // Only partner, not the sender

    if (subError) {
      console.error("[Push] DB error fetching subscriptions:", subError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch subscriptions" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(
        JSON.stringify({ sent: 0, message: "No subscriptions found for partner" }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(
      `[Push] Sending "${type}" notification to ${subscriptions.length} device(s)`
    );

    // Send to all partner's devices
    const results = await Promise.allSettled(
      subscriptions.map(async (sub: any) => {
        const result = await sendPush(sub.endpoint, sub.keys_p256dh, sub.keys_auth, {
          title: title || "Our Journey 💕",
          body: body || "",
          url: url || "/",
          tag: tag || type || "general",
          icon: "/icon-192x192.png",
          badge: "/icon-96x96.png",
        });

        // Clean up expired subscriptions
        if (result.gone) {
          console.log(`[Push] Removing expired subscription: ${sub.endpoint.slice(0, 60)}…`);
          await supabaseAdmin
            .from("push_subscriptions")
            .delete()
            .eq("id", sub.id);
        }

        return result;
      })
    );

    const sent = results.filter(
      (r) => r.status === "fulfilled" && r.value.success
    ).length;
    const failed = results.length - sent;

    return new Response(
      JSON.stringify({ sent, failed, total: subscriptions.length }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[Push] Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err) }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
