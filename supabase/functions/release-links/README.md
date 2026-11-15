# release-links Edge Function

Lists the artist's latest releases for the **« Buscar links »** button in *Editar música*:

- the latest YouTube Shorts, from the channel's public feed (no key needed);
- Spotify tracks (optional, needs `SPOTIFY_CLIENT_ID` and `SPOTIFY_CLIENT_SECRET`);
- YouTube Music tracks from the « Topic » channel (optional, needs `YOUTUBE_API_KEY`).

Apple Music does not go through this function: the admin calls the iTunes API directly.
The function picks nothing. The admin (`src/lib/releaseLinks.js`) matches title and date, and the user reviews the result before Salvar.

Auth: valid JWT of a user listed in `public.admins` (same rule as `generate-subtitle`).

## Deployment from the dashboard (no CLI)

1. Supabase → *Edge Functions* → *Deploy a new function* → *Via Editor*.
2. Name: `release-links`. Paste the contents of `index.ts`, then *Deploy*.

With the CLI: `supabase functions deploy release-links`.

## Optional secrets

*Edge Functions* → *Secrets* (or `supabase secrets set NAME=value`):

| Variable | Gives |
|---|---|
| `SPOTIFY_CLIENT_ID`, `SPOTIFY_CLIENT_SECRET` | Spotify links (app created at developer.spotify.com) |
| `YOUTUBE_API_KEY` | YouTube Music links (Google Cloud key, *YouTube Data API v3* enabled) |

Without them, the admin shows « ainda não configurado » for those platforms. Everything else keeps working.
