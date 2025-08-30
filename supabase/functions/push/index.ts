// Supabase Edge Function - Web Push backend
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
// import webpush from "https://esm.sh/web-push@3.6.7"; // Temporarily disabled

// Environment variables with fallbacks
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? Deno.env.get("SUPABASE_DB_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SERVICE_ROLE_KEY") ?? Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const VAPID_PUBLIC_KEY = Deno.env.get("VAPID_PUBLIC_KEY") ?? "";
const VAPID_PRIVATE_KEY = Deno.env.get("VAPID_PRIVATE_KEY") ?? "";
const PUSH_DEFAULT_LOCALE = Deno.env.get("PUSH_DEFAULT_LOCALE") ?? "pt-BR";

// Initialize Supabase client only if we have the required credentials
let supabase: any = null;
if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
  try {
    supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    console.log("✅ Supabase client initialized successfully");
  } catch (e) {
    console.error("❌ Failed to initialize Supabase client:", e);
  }
} else {
  console.warn("⚠️ Missing Supabase credentials");
}

// CORS (read from env, fallback "*")
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";
function cors(extra: Record<string,string> = {}) {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "content-type",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    ...extra,
  };
}

// Initialize webpush only if we have VAPID keys
// Temporarily disabled due to compatibility issues
/*
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  try {
    webpush.setVapidDetails("mailto:admin@amusicadasegunda.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
    console.log("✅ Webpush initialized successfully");
  } catch (e) {
    console.error("❌ Failed to initialize webpush:", e);
  }
} else {
  console.warn("⚠️ Missing VAPID keys");
}
*/

// Localized messages
const MESSAGES: Record<string, { title: string; body: string }> = {
  "pt-BR": { title: "Música da Segunda", body: "Nova música no ar 🎶" },
  "fr":    { title: "Música da Segunda", body: "Nouvelle chanson en ligne 🎶" },
  "en":    { title: "Música da Segunda", body: "New song is live 🎶" },
};

// Database functions
async function upsertSub({ endpoint, p256dh, auth, topics = ["new-song"], locale, vapid_key_version = "v1" }: any) {
  if (!supabase) {
    throw new Error("Supabase client not initialized");
  }
  const { error } = await supabase.from("push_subscriptions").upsert(
    { endpoint, p256dh, auth, topics, locale, vapid_key_version, last_seen_at: new Date().toISOString() },
    { onConflict: "endpoint" }
  );
  if (error) throw error;
}

async function listByTopic(topic = "new-song") {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return [];
  }
  try {
    const { data, error } = await supabase
      .from("push_subscriptions")
      .select("endpoint,p256dh,auth")
      .contains("topics", [topic]);
    if (error) {
      console.error("Database error:", error);
      return [];
    }
    return data ?? [];
  } catch (e) {
    console.error("Database connection error:", e);
    return [];
  }
}

async function removeByEndpoint(endpoint: string) {
  if (!supabase) {
    console.error("Supabase client not initialized");
    return;
  }
  await supabase.from("push_subscriptions").delete().eq("endpoint", endpoint);
}

Deno.serve(async (req: Request) => {
  const { pathname } = new URL(req.url);
  
  // CORS headers
  const headers = cors({ "Content-Type": "application/json" });

  // Handle preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers });
  }

  // Simple test endpoint
  if (pathname.endsWith("/test")) {
    return new Response(JSON.stringify({ 
      message: "Function is working!",
      timestamp: new Date().toISOString(),
      method: req.method,
      path: pathname,
      supabase: !!supabase,
      hasCredentials: !!(SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY)
    }), { headers });
  }

  // Health check
  if (pathname.endsWith("/health")) {
    return new Response(JSON.stringify({ 
      status: "ok",
      timestamp: new Date().toISOString(),
      supabase: !!supabase,
      database: "ready"
    }), { headers });
  }

  // Database test endpoint
  if (pathname.endsWith("/db-test")) {
    try {
      const subs = await listByTopic("new-song");
      return new Response(JSON.stringify({ 
        message: "Database connection test",
        subscriptions: subs.length,
        timestamp: new Date().toISOString()
      }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Database test failed",
        message: String(e),
        timestamp: new Date().toISOString()
      }), { status: 500, headers });
    }
  }

  // Web Push endpoints (without web-push library for now)
  
  // POST /push/subscribe
  if (pathname.endsWith("/subscribe") && req.method === "POST") {
    try {
      const { subscription, topic = "new-song", locale, vapidKeyVersion = "v1" } = await req.json();
      if (!subscription?.endpoint || !subscription?.keys?.p256dh || !subscription?.keys?.auth) {
        return new Response(JSON.stringify({ error: "bad subscription" }), { 
          status: 400, 
          headers 
        });
      }
      
      await upsertSub({
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        topics: [topic],
        locale,
        vapid_key_version: vapidKeyVersion,
      });
      
      return new Response(JSON.stringify({ ok: true }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
        status: 400, 
        headers 
      });
    }
  }

  // DELETE /push/unsubscribe
  if (pathname.endsWith("/unsubscribe") && req.method === "DELETE") {
    try {
      const { endpoint } = await req.json();
      if (!endpoint) {
        return new Response(JSON.stringify({ error: "missing endpoint" }), { 
          status: 400, 
          headers 
        });
      }
      
      await removeByEndpoint(endpoint);
      return new Response(JSON.stringify({ ok: true }), { headers });
    } catch (e) {
      return new Response(JSON.stringify({ error: "Invalid JSON" }), { 
        status: 400, 
        headers 
      });
    }
  }

  // POST|GET /push/send → no-op here; delivery is done by Node sender
  if (pathname.endsWith("/send") && (req.method === "POST" || req.method === "GET")) {
    try {
      const params = req.method === "GET" ? {} : await req.json();
      return new Response(JSON.stringify({ 
        ok: true, 
        note: "sender-node handles delivery", 
        params 
      }), { 
        headers: cors({ "Content-Type": "application/json" }) 
      });
    } catch (e) {
      return new Response(JSON.stringify({ 
        error: "Invalid JSON", 
        message: String(e) 
      }), { 
        status: 400, 
        headers: cors({ "Content-Type": "application/json" }) 
      });
    }
  }

  // Default response
  return new Response(JSON.stringify({ 
    message: "Supabase Edge Function is running",
    endpoints: ["/test", "/health", "/db-test", "/subscribe", "/unsubscribe", "/send"],
    timestamp: new Date().toISOString(),
    status: "webpush-disabled"
  }), { headers });
});
