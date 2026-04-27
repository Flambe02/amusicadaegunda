// Supabase Edge Function — generate-subtitle
// Génère un subtitle SEO court (40-80 chars, format "{sujet} em paródia musical")
// à partir du title + description d'une chanson, via OpenAI.
//
// Auth: requiert un JWT valide d'un user présent dans public.admins
// (évite que la clé OpenAI soit utilisée par n'importe qui).
//
// Variables d'env:
//   - SUPABASE_URL
//   - SUPABASE_ANON_KEY (pour valider le JWT user)
//   - SUPABASE_SERVICE_ROLE_KEY (pour vérifier la table admins en bypass RLS)
//   - OPENAI_API_KEY
//   - OPENAI_MODEL (optionnel, default: gpt-4o-mini)
//   - ALLOWED_ORIGIN (optionnel, default: *)

import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY") ?? "";
const OPENAI_MODEL = Deno.env.get("OPENAI_MODEL") ?? "gpt-4o-mini";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

// Rate limiting: 10 req/min/IP (génération assez lente, on évite l'abus)
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 10;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const bucket = rateLimitMap.get(ip);
  if (!bucket || now > bucket.resetAt) {
    rateLimitMap.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }
  if (bucket.count >= RATE_LIMIT_MAX) {
    return { allowed: false, retryAfter: bucket.resetAt - now };
  }
  bucket.count++;
  return { allowed: true };
}

function extractIP(req: Request): string {
  const forwarded = req.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0].trim();
    if (first) return first;
  }
  return req.headers.get("cf-connecting-ip") ?? "unknown";
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "strict-origin-when-cross-origin",
};

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    ...SECURITY_HEADERS,
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders({ "Content-Type": "application/json" }),
  });
}

// Vérifie que l'utilisateur est connecté ET admin.
// Retourne le user_id si OK, null sinon.
async function verifyAdmin(authHeader: string | null): Promise<string | null> {
  if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
  const token = authHeader.slice(7).trim();
  if (!token) return null;

  // 1. Valider le JWT via le client anon (pas de bypass RLS)
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data: userData, error: userError } = await userClient.auth.getUser();
  if (userError || !userData?.user) return null;
  const userId = userData.user.id;

  // 2. Vérifier que l'utilisateur est dans la table admins (service role pour bypass RLS)
  if (!SUPABASE_SERVICE_ROLE_KEY) return null;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false },
  });
  const { data: adminRow, error: adminError } = await adminClient
    .from("admins")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle();
  if (adminError || !adminRow) return null;

  return userId;
}

// Few-shot prompt construit à partir des subtitles existants en DB.
// Format observé: "{sujet/événement} em paródia musical" (40-80 chars).
const SYSTEM_PROMPT = `Você é um redator SEO especializado em paródias musicais brasileiras para o site "A Música da Segunda".

Sua tarefa: gerar um SUBTÍTULO curto (entre 40 e 80 caracteres) a partir do título e descrição de uma paródia musical.

REGRAS ABSOLUTAS:
- Idioma: português brasileiro
- Formato: "{tema/evento principal} em paródia musical" (ou variantes: "em sátira musical", "— paródia musical")
- Comprimento: 40 a 80 caracteres MÁXIMO
- Captura o tema/personagem/evento principal da chanson
- NÃO usa aspas, ponto final, hashtags ou emojis
- NÃO repete o título da música
- Tom: jornalístico, neutro, descritivo

EXEMPLOS:
- "A crise no Estreito de Ormuz em paródia musical"
- "O escândalo Vorcarô em paródia musical"
- "Trump quer comprar a Groenlândia — paródia musical"
- "A saída de William Bonner do Jornal Nacional em paródia"
- "Demissões por home office no Itaú — paródia musical"
- "A liquidação extrajudicial do Banco Master em paródia"
- "O sorteio da Copa do Mundo em paródia musical"

Responde APENAS com o subtítulo, sem aspas, sem prefixo, sem explicação.`;

async function callOpenAI(title: string, description: string): Promise<string> {
  const userPrompt = `Título: ${title}\n\nDescrição: ${description}\n\nGere o subtítulo:`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${OPENAI_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.6,
      max_tokens: 60,
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`OpenAI API ${response.status}: ${errorBody.slice(0, 200)}`);
  }

  const data = await response.json();
  const raw = data?.choices?.[0]?.message?.content?.trim() ?? "";
  // Nettoyage: retirer guillemets et ponctuation finale parasites
  return raw.replace(/^["'«»]+|["'«»\.]+$/g, "").trim();
}

Deno.serve(async (req: Request) => {
  // Preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders() });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "method_not_allowed" }, 405);
  }

  // Rate limit
  const ip = extractIP(req);
  const rate = checkRateLimit(ip);
  if (!rate.allowed) {
    return jsonResponse(
      { error: "rate_limited", retry_after: Math.ceil((rate.retryAfter ?? 0) / 1000) },
      429,
    );
  }

  // Auth
  const userId = await verifyAdmin(req.headers.get("authorization"));
  if (!userId) {
    return jsonResponse({ error: "unauthorized" }, 401);
  }

  // Config check
  if (!OPENAI_API_KEY) {
    console.error("generate-subtitle: OPENAI_API_KEY missing");
    return jsonResponse({ error: "openai_not_configured" }, 503);
  }

  // Payload
  let title = "";
  let description = "";
  try {
    const body = await req.json();
    title = String(body?.title ?? "").trim();
    description = String(body?.description ?? "").trim();
  } catch {
    return jsonResponse({ error: "invalid_json" }, 400);
  }

  if (!title && !description) {
    return jsonResponse({ error: "missing_input", message: "title or description required" }, 400);
  }

  // Tronquer la description pour limiter les tokens (la 1ère partie suffit largement)
  const trimmedDescription = description.slice(0, 1500);

  try {
    const subtitle = await callOpenAI(title, trimmedDescription);
    if (!subtitle) {
      return jsonResponse({ error: "empty_response" }, 502);
    }
    console.log(JSON.stringify({
      at: new Date().toISOString(),
      fn: "generate-subtitle",
      user: userId,
      title_len: title.length,
      desc_len: trimmedDescription.length,
      subtitle_len: subtitle.length,
    }));
    return jsonResponse({ subtitle });
  } catch (e) {
    console.error(JSON.stringify({
      at: new Date().toISOString(),
      fn: "generate-subtitle",
      error: String((e as Error)?.message ?? e),
    }));
    return jsonResponse({ error: "generation_failed", message: String((e as Error)?.message ?? e) }, 502);
  }
});
