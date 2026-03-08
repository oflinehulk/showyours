import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

async function generateVAPIDKeys(): Promise<{
  publicKey: string;
  privateKey: string;
}> {
  const keyPair = await crypto.subtle.generateKey(
    { name: "ECDSA", namedCurve: "P-256" },
    true,
    ["sign", "verify"]
  );

  const publicKeyRaw = await crypto.subtle.exportKey("raw", keyPair.publicKey);
  const privateKeyJwk = await crypto.subtle.exportKey("jwk", keyPair.privateKey);

  const publicKey = btoa(String.fromCharCode(...new Uint8Array(publicKeyRaw)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const privateKey = privateKeyJwk.d!;

  return { publicKey, privateKey };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Check if VAPID keys already exist
    const { data: existing } = await supabase
      .from("app_config")
      .select("key, value")
      .in("key", ["vapid_public_key", "vapid_private_key"]);

    let publicKey: string;

    if (existing && existing.length === 2) {
      publicKey = existing.find((r: { key: string; value: string }) => r.key === "vapid_public_key")!.value;
    } else {
      // Generate new VAPID keys
      const keys = await generateVAPIDKeys();
      publicKey = keys.publicKey;

      await supabase.from("app_config").upsert([
        { key: "vapid_public_key", value: keys.publicKey },
        { key: "vapid_private_key", value: keys.privateKey },
      ]);
    }

    return new Response(JSON.stringify({ publicKey }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
