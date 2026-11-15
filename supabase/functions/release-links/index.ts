// Supabase Edge Function — release-links
// Liste les dernières sorties de l'artiste sur YouTube (Shorts), Spotify et YouTube Music,
// pour le bouton « Buscar links » de l'admin. Elle ne choisit rien : c'est l'admin
// (src/lib/releaseLinks.js) qui rapproche titre et date, et l'utilisateur qui valide.
// Apple Music n'en a pas besoin (l'API iTunes est appelée directement depuis le navigateur).
//
// Auth : JWT d'un user présent dans public.admins (même règle que generate-subtitle).
//
// Variables d'env :
//   - SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY (auto)
//   - SPOTIFY_CLIENT_ID + SPOTIFY_CLIENT_SECRET (optionnel → liens Spotify)
//   - YOUTUBE_API_KEY (optionnel → liens YouTube Music)
//   - ALLOWED_ORIGIN (optionnel, default *)

import { createClient } from "npm:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? Deno.env.get("SERVICE_ROLE_KEY") ?? "";
const SPOTIFY_CLIENT_ID = Deno.env.get("SPOTIFY_CLIENT_ID") ?? "";
const SPOTIFY_CLIENT_SECRET = Deno.env.get("SPOTIFY_CLIENT_SECRET") ?? "";
const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") ?? "";
const ALLOWED_ORIGIN = Deno.env.get("ALLOWED_ORIGIN") ?? "*";

// Comptes de l'artiste (scripts/seo.config.json).
const YOUTUBE_CHANNEL_ID = "UCrkmgvYXtZznqvZNtIKZdaQ"; // chaîne principale (Shorts)
const YOUTUBE_TOPIC_CHANNEL_ID = "UC2eZCjnyUZyvJyySxdncYrA"; // « A Música da Segunda - Topic » (YouTube Music)
const SPOTIFY_ARTIST_ID = "3l1aPSEZ25VwuqJGKYRZbQ";
const FETCH_TIMEOUT_MS = 8000;

type Item = { title: string; url: string; date: string | null };

function corsHeaders(extra: Record<string, string> = {}): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": ALLOWED_ORIGIN,
    "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "X-Content-Type-Options": "nosniff",
    ...extra,
  };
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders({ "Content-Type": "application/json" }) });
}

async function verifyAdmin(authHeader: string | null): Promise<boolean> {
  if (!authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7).trim();
  if (!token || !SUPABASE_SERVICE_ROLE_KEY) return false;
  const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await userClient.auth.getUser();
  if (error || !data?.user) return false;
  const adminClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
  const { data: row, error: adminError } = await adminClient
    .from("admins").select("user_id").eq("user_id", data.user.id).maybeSingle();
  return !adminError && Boolean(row);
}

async function fetchWithTimeout(url: string, init: RequestInit = {}): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&amp;/g, "&");
}

// Flux public de la chaîne (15 dernières vidéos) : on ne garde que les Shorts.
async function fetchShorts(): Promise<Item[]> {
  const res = await fetchWithTimeout(`https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`);
  if (!res.ok) throw new Error(`youtube_rss_${res.status}`);
  const xml = await res.text();
  const items: Item[] = [];
  for (const entry of xml.split("<entry>").slice(1)) {
    const url = entry.match(/<link rel="alternate" href="([^"]+)"/)?.[1] ?? "";
    if (!url.includes("/shorts/")) continue;
    items.push({
      title: decodeXml(entry.match(/<title>([^<]*)<\/title>/)?.[1] ?? ""),
      url,
      date: entry.match(/<published>([^<]*)<\/published>/)?.[1] ?? null,
    });
  }
  return items;
}

// Singles et albums récents → un lien par piste.
async function fetchSpotify(): Promise<Item[]> {
  const tokenRes = await fetchWithTimeout("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${SPOTIFY_CLIENT_ID}:${SPOTIFY_CLIENT_SECRET}`)}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!tokenRes.ok) throw new Error(`spotify_token_${tokenRes.status}`);
  const { access_token: token } = await tokenRes.json();
  const headers = { Authorization: `Bearer ${token}` };

  const albumsRes = await fetchWithTimeout(
    `https://api.spotify.com/v1/artists/${SPOTIFY_ARTIST_ID}/albums?include_groups=single,album&market=BR&limit=10`,
    { headers },
  );
  if (!albumsRes.ok) throw new Error(`spotify_albums_${albumsRes.status}`);
  const albums = (await albumsRes.json())?.items ?? [];
  const ids = albums.map((a: { id: string }) => a.id).slice(0, 10);
  if (ids.length === 0) return [];

  const fullRes = await fetchWithTimeout(`https://api.spotify.com/v1/albums?ids=${ids.join(",")}&market=BR`, { headers });
  if (!fullRes.ok) throw new Error(`spotify_album_tracks_${fullRes.status}`);
  const items: Item[] = [];
  for (const album of (await fullRes.json())?.albums ?? []) {
    for (const track of album?.tracks?.items ?? []) {
      if (track?.external_urls?.spotify) {
        items.push({ title: track.name, url: track.external_urls.spotify, date: album.release_date ?? null });
      }
    }
  }
  return items;
}

// Vidéos « Topic » générées par le distributeur = pistes YouTube Music.
// deno-lint-ignore no-explicit-any
type YtItem = any;
async function fetchYoutubeMusic(): Promise<Item[]> {
  const uploads = `UU${YOUTUBE_TOPIC_CHANNEL_ID.slice(2)}`;
  const res = await fetchWithTimeout(
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=15&playlistId=${uploads}&key=${YOUTUBE_API_KEY}`,
  );
  let entries: Array<{ id: string; title: string; date: string | null }> = [];
  if (res.ok) {
    entries = ((await res.json())?.items ?? []).map((it: YtItem) => ({
      id: it?.snippet?.resourceId?.videoId, title: it?.snippet?.title ?? "", date: it?.snippet?.publishedAt ?? null,
    }));
  } else {
    // Certaines chaînes « Topic » n'exposent pas leur playlist d'uploads : recherche par chaîne.
    const search = await fetchWithTimeout(
      `https://www.googleapis.com/youtube/v3/search?part=snippet&type=video&order=date&maxResults=15&channelId=${YOUTUBE_TOPIC_CHANNEL_ID}&key=${YOUTUBE_API_KEY}`,
    );
    if (!search.ok) throw new Error(`youtube_api_${search.status}`);
    entries = ((await search.json())?.items ?? []).map((it: YtItem) => ({
      id: it?.id?.videoId, title: decodeXml(it?.snippet?.title ?? ""), date: it?.snippet?.publishedAt ?? null,
    }));
  }
  return entries
    .filter((e) => e.id)
    .map((e) => ({ title: e.title, url: `https://music.youtube.com/watch?v=${e.id}`, date: e.date }));
}

async function settle(enabled: boolean, run: () => Promise<Item[]>) {
  if (!enabled) return { status: "not_configured", items: [] as Item[] };
  try {
    return { status: "ok", items: await run() };
  } catch (error) {
    console.error("release-links:", error instanceof Error ? error.message : error);
    return { status: "error", items: [] as Item[] };
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: corsHeaders() });
  if (req.method !== "POST") return jsonResponse({ error: "method_not_allowed" }, 405);
  if (!(await verifyAdmin(req.headers.get("authorization")))) return jsonResponse({ error: "unauthorized" }, 401);

  const [shorts, spotify, youtubeMusic] = await Promise.all([
    settle(true, fetchShorts),
    settle(Boolean(SPOTIFY_CLIENT_ID && SPOTIFY_CLIENT_SECRET), fetchSpotify),
    settle(Boolean(YOUTUBE_API_KEY), fetchYoutubeMusic),
  ]);
  return jsonResponse({ shorts, spotify, youtubeMusic });
});
