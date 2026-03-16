import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Web Push encryption helpers
function base64UrlDecode(str: string): Uint8Array {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  const binary = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return new Uint8Array([...binary].map((c) => c.charCodeAt(0)));
}

function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function createVapidAuthHeader(
  endpoint: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<{ authorization: string; cryptoKey: string }> {
  const url = new URL(endpoint);
  const audience = `${url.protocol}//${url.host}`;

  // Import private key
  const privateKeyBytes = base64UrlDecode(vapidPrivateKey);
  const publicKeyBytes = base64UrlDecode(vapidPublicKey);

  const jwk = {
    kty: "EC",
    crv: "P-256",
    x: base64UrlEncode(publicKeyBytes.slice(1, 33)),
    y: base64UrlEncode(publicKeyBytes.slice(33, 65)),
    d: vapidPrivateKey,
  };

  const key = await crypto.subtle.importKey(
    "jwk",
    jwk,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"]
  );

  // Create JWT
  const header = { typ: "JWT", alg: "ES256" };
  const now = Math.floor(Date.now() / 1000);
  const payload = {
    aud: audience,
    exp: now + 12 * 60 * 60,
    sub: "mailto:noreply@showyours.lovable.app",
  };

  const encodedHeader = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(header))
  );
  const encodedPayload = base64UrlEncode(
    new TextEncoder().encode(JSON.stringify(payload))
  );
  const unsignedToken = `${encodedHeader}.${encodedPayload}`;

  const signature = await crypto.subtle.sign(
    { name: "ECDSA", hash: "SHA-256" },
    key,
    new TextEncoder().encode(unsignedToken)
  );

  // Convert DER signature to raw r||s format
  const sigBytes = new Uint8Array(signature);
  let r: Uint8Array, s: Uint8Array;

  if (sigBytes.length === 64) {
    r = sigBytes.slice(0, 32);
    s = sigBytes.slice(32, 64);
  } else {
    // DER format
    const rLen = sigBytes[3];
    const rStart = 4;
    const rBytes = sigBytes.slice(rStart, rStart + rLen);
    const sLen = sigBytes[rStart + rLen + 1];
    const sStart = rStart + rLen + 2;
    const sBytes = sigBytes.slice(sStart, sStart + sLen);
    r = rBytes.length > 32 ? rBytes.slice(rBytes.length - 32) : rBytes;
    s = sBytes.length > 32 ? sBytes.slice(sBytes.length - 32) : sBytes;
    // Pad if needed
    if (r.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(r, 32 - r.length);
      r = padded;
    }
    if (s.length < 32) {
      const padded = new Uint8Array(32);
      padded.set(s, 32 - s.length);
      s = padded;
    }
  }

  const rawSig = new Uint8Array(64);
  rawSig.set(r, 0);
  rawSig.set(s, 32);

  const token = `${unsignedToken}.${base64UrlEncode(rawSig)}`;

  return {
    authorization: `vapid t=${token}, k=${vapidPublicKey}`,
    cryptoKey: `p256ecdsa=${vapidPublicKey}`,
  };
}

async function encryptPayload(
  payload: string,
  p256dhKey: string,
  authSecret: string
): Promise<{ encrypted: ArrayBuffer; salt: Uint8Array; localPublicKey: ArrayBuffer }> {
  const clientPublicKey = base64UrlDecode(p256dhKey);
  const clientAuth = base64UrlDecode(authSecret);

  // Generate ephemeral key pair
  const localKeyPair = await crypto.subtle.generateKey(
    { name: "ECDH", namedCurve: "P-256" },
    true,
    ["deriveBits"]
  );

  const localPublicKey = await crypto.subtle.exportKey("raw", localKeyPair.publicKey);

  // Import client's public key
  const clientKey = await crypto.subtle.importKey(
    "raw",
    clientPublicKey,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    []
  );

  // ECDH shared secret
  const sharedSecret = await crypto.subtle.deriveBits(
    { name: "ECDH", public: clientKey },
    localKeyPair.privateKey,
    256
  );

  // HKDF for auth info
  const authInfo = new Uint8Array([
    ...new TextEncoder().encode("WebPush: info\0"),
    ...clientPublicKey,
    ...new Uint8Array(localPublicKey),
  ]);

  const hkdfKey = await crypto.subtle.importKey(
    "raw",
    sharedSecret,
    "HKDF",
    false,
    ["deriveBits"]
  );

  const ikm = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt: clientAuth, info: authInfo },
    hkdfKey,
    256
  );

  const salt = crypto.getRandomValues(new Uint8Array(16));

  const ikmKey = await crypto.subtle.importKey("raw", ikm, "HKDF", false, [
    "deriveBits",
  ]);

  const contentEncryptionKeyInfo = new TextEncoder().encode(
    "Content-Encoding: aes128gcm\0"
  );
  const nonceInfo = new TextEncoder().encode("Content-Encoding: nonce\0");

  const cekBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: contentEncryptionKeyInfo },
    ikmKey,
    128
  );

  const nonceBits = await crypto.subtle.deriveBits(
    { name: "HKDF", hash: "SHA-256", salt, info: nonceInfo },
    ikmKey,
    96
  );

  const cek = await crypto.subtle.importKey(
    "raw",
    cekBits,
    "AES-GCM",
    false,
    ["encrypt"]
  );

  // Add padding
  const payloadBytes = new TextEncoder().encode(payload);
  const paddedPayload = new Uint8Array(payloadBytes.length + 1);
  paddedPayload.set(payloadBytes);
  paddedPayload[payloadBytes.length] = 2; // delimiter

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv: nonceBits },
    cek,
    paddedPayload
  );

  return { encrypted, salt, localPublicKey };
}

function buildAes128gcmPayload(
  encrypted: ArrayBuffer,
  salt: Uint8Array,
  localPublicKey: ArrayBuffer
): Uint8Array {
  const localPubKeyBytes = new Uint8Array(localPublicKey);
  const encryptedBytes = new Uint8Array(encrypted);

  // Header: salt(16) + rs(4) + idlen(1) + keyid(65) + encrypted
  const rs = 4096;
  const header = new Uint8Array(16 + 4 + 1 + localPubKeyBytes.length);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, rs, false);
  header[20] = localPubKeyBytes.length;
  header.set(localPubKeyBytes, 21);

  const result = new Uint8Array(header.length + encryptedBytes.length);
  result.set(header, 0);
  result.set(encryptedBytes, header.length);
  return result;
}

async function sendPushToSubscription(
  subscription: { endpoint: string; p256dh: string; auth: string },
  payload: string,
  vapidPublicKey: string,
  vapidPrivateKey: string
): Promise<boolean> {
  try {
    const vapidHeaders = await createVapidAuthHeader(
      subscription.endpoint,
      vapidPublicKey,
      vapidPrivateKey
    );

    const { encrypted, salt, localPublicKey } = await encryptPayload(
      payload,
      subscription.p256dh,
      subscription.auth
    );

    const body = buildAes128gcmPayload(encrypted, salt, localPublicKey);

    const response = await fetch(subscription.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Encoding": "aes128gcm",
        "Content-Length": body.length.toString(),
        Authorization: vapidHeaders.authorization,
        TTL: "86400",
        Urgency: "normal",
      },
      body,
    });

    if (response.status === 410 || response.status === 404) {
      // Subscription expired - should be cleaned up
      return false;
    }

    return response.ok;
  } catch (e) {
    console.error("Push send error:", e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, title, body, type } = await req.json();

    if (!user_id || !title) {
      return new Response(JSON.stringify({ error: "Missing required fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Get VAPID keys
    const { data: config } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["vapid_public_key", "vapid_private_key"]);

    if (!config || config.length < 2) {
      return new Response(
        JSON.stringify({ error: "VAPID keys not configured. Call get-vapid-key first." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const vapidPublicKey = config.find((r: { key: string; value: string }) => r.key === "vapid_public_key")!.value;
    const vapidPrivateKey = config.find((r: { key: string; value: string }) => r.key === "vapid_private_key")!.value;

    // Get user's push subscriptions
    const { data: subscriptions } = await supabase
      .from("push_subscriptions")
      .select("endpoint, p256dh, auth")
      .eq("user_id", user_id);

    if (!subscriptions || subscriptions.length === 0) {
      return new Response(JSON.stringify({ sent: 0, message: "No subscriptions" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload = JSON.stringify({ title, body: body || "", type: type || "general", url: "/" });

    let sent = 0;
    const expired: string[] = [];

    for (const sub of subscriptions) {
      const success = await sendPushToSubscription(sub, payload, vapidPublicKey, vapidPrivateKey);
      if (success) {
        sent++;
      } else {
        expired.push(sub.endpoint);
      }
    }

    // Clean up expired subscriptions
    if (expired.length > 0) {
      await supabase
        .from("push_subscriptions")
        .delete()
        .eq("user_id", user_id)
        .in("endpoint", expired);
    }

    return new Response(JSON.stringify({ sent, expired: expired.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-push error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
