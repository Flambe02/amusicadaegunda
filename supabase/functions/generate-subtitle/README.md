# generate-subtitle Edge Function

Génère un subtitle SEO court (40–80 chars, format `{sujet} em paródia musical`)
à partir du title + description d'une chanson, via OpenAI.

Utilisé par le panneau admin pour pré-remplir le champ `subtitle` de `songs`.

## Auth

Requiert un JWT valide d'un user présent dans `public.admins`. Empêche
l'utilisation de la clé OpenAI par un visiteur quelconque.

## Variables d'env (à setter via `supabase secrets set …`)

| Variable | Requis | Description |
|---|---|---|
| `OPENAI_API_KEY` | ✅ | Clé OpenAI (sk-…) |
| `OPENAI_MODEL` | optionnel | Modèle OpenAI (default `gpt-4o-mini`) |
| `SUPABASE_URL` | auto | Fourni automatiquement par Supabase |
| `SUPABASE_ANON_KEY` | auto | Fourni automatiquement par Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | auto | Fourni automatiquement par Supabase |
| `ALLOWED_ORIGIN` | optionnel | Default `*` |

## Déploiement

```bash
# 1. Setter le secret OpenAI
supabase secrets set OPENAI_API_KEY=sk-...

# 2. Déployer la fonction
supabase functions deploy generate-subtitle
```

## Endpoint

`POST /functions/v1/generate-subtitle`

Headers :
- `Authorization: Bearer <jwt-user>`
- `Content-Type: application/json`

Body :
```json
{ "title": "BBB26 Ana Paula Renault", "description": "Ana Paula Renault voltou ao BBB..." }
```

Réponse :
```json
{ "subtitle": "A vitória de Ana Paula Renault no BBB26 em paródia musical" }
```

## Codes d'erreur

| Code | Cause |
|---|---|
| 400 | JSON invalide ou title/description manquants |
| 401 | JWT manquant/invalide ou user pas admin |
| 405 | Méthode ≠ POST |
| 429 | Rate limit (10 req/min/IP) |
| 502 | Erreur OpenAI |
| 503 | `OPENAI_API_KEY` non configurée |

## Fallback côté client

Si la fonction est down ou retourne une erreur, `src/lib/subtitleGenerator.js`
applique un fallback local rule-based (1ère phrase de description tronquée +
suffixe "em paródia musical"). Le workflow admin n'est jamais bloqué.
