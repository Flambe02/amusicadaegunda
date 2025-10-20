### Executive Summary (One-Page)

- Admin system fixed and verified: RLS on `songs` enforces public read of published only; admin CRUD confirmed via tests. `/login` route added; `/admin` gated.
- Push subscriptions working (Option A). Alternative Edge Function exists if server-only writes desired.
- PWA present; SW active in prod, disabled in dev path to avoid HMR conflicts; good base for Lighthouse >90 with minor SEO/UX work.

Priorities
- Remove Supabase keys from `vite.config.js` `define`; use `.env` only.
- Keep only 2 policies on `songs`; enable RLS + self-select on `admins`.
- Choose definitive push model (public vs Edge) and align RLS accordingly.
- Add Helmet titles/metas per page; validate `robots.txt` and sitemaps.
- Review SW caching strategy and offline fallback.

Fast Wins
- Standardize `@/lib/supabase` usage (done).
- Add admin and push Node tests (done): `npm run test:admin`, `npm run test:push`.
- Provide SQL snippets for adding admin users.

Risks
- Conflicting legacy SQL policies if re-applied; ensure only current RLS scripts are used.
- Keys hardcoded in build config can leak; must be removed.

Next Steps
1) Remove `define` Supabase keys from Vite config; load from `.env`.
2) Confirm `admins` RLS and self-select in Supabase; verify `/admin` access.
3) Decide push model and update policies/functions accordingly.
 4) Run Lighthouse in prod; apply image/code-splitting optimizations as needed.


