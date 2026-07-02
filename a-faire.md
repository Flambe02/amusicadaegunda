# À faire — amusicadasegunda.com

> Mis à jour : 2026-07-02  
> Source : audit UX + SEO/AEO de session

---

## P1 — Impact fort, effort faible ✅ DONE (commits `64df8607` redesign / `a915c4b6` main)

### [x] 1. Ajouter "Catálogo" à la sidebar desktop
**Fichier :** `src/pages/Layout.jsx` — tableau `pages` (ligne 91)  
**Fix :** Insérer entre Início et Roda :
```js
{ name: 'Catálogo', url: createPageUrl('Musica'), icon: Library },
```
Importer `Library` depuis lucide-react (déjà importé dans mobileNavItems).  
**Pourquoi urgent :** Sur desktop, le catalogue des 55 chansons est complètement absent de la navigation principale.

---

### [x] 2. Roleta mobile — remplacer les 9 catégories fantômes
**Fichier :** `src/components/mobile/MobileRoletaApp.jsx`  
**Problème :** CATEGORIES = `['politica','futebol','bbb','economia','celebridades','trabalho','caos-nacional','cultura','nostalgia']`  
5 de ces 9 catégories n'existent pas en base → **30/55 chansons inaccessibles (55%)**, cases mortes garanties.  
**Vraies catégories DB :** `esporte`, `midia`, `internacional`, `politica`, `cultura`, `economia`, `gastronomia`, `energia`, `policia`, `seguranca`, `outros`  
**Fix :** Remplacer CATEGORIES + mettre à jour CATEGORY_LABELS + CATEGORY_COLORS + icônes.

---

### [x] 3. Unifier le concept desktop/mobile de la Roda
**Fichier :** `src/pages/RodaDaSegunda.jsx`  
**Problème :** Desktop tourne sur les **mois** ("Descubra um mês ao acaso") alors que mobile tourne sur les **catégories** — deux expériences incohérentes avec deux bases de code à maintenir.  
**Fix :** Passer la roue desktop aux mêmes catégories que mobile. Nouveau titre : "Descubra sua próxima paródia".  
**Labels canvas :** Tronqués à 3 lettres + retournés à gauche → améliorer le rendu texte (`ctx.save/rotate/restore` par segment).

---

## P2 — La récompense mérite mieux

### [ ] 4. Résultat Roda : embed vidéo visible au lieu d'iframe caché
**Fichier :** `src/pages/RodaDaSegunda.jsx`  
**Problème :** L'audio joue via un iframe 1×1 px hors-écran. Le contenu central du site (vidéos Shorts 9/16) n'est jamais montré dans la page récompense.  
**Fix :** Remplacer l'iframe caché par un `YouTubeEmbed` visible (composant existant) + gros CTA "Ver letra e contexto →" vers `/musica/[slug]`.

### [ ] 5. Micro-célébration au résultat
**Fichier :** `src/pages/RodaDaSegunda.jsx`  
**Fix :** `scrollIntoView({ behavior: 'smooth' })` sur la winner-card + animation scale-in (Tailwind `animate-bounce` ou `scale-0 → scale-100`).

### [ ] 6. Nom unifié "Roleta" dans toute la navigation
**Fichiers :** `src/pages/Layout.jsx` (sidebar item ligne 93), `src/config/routes.js`  
**Fix :** Renommer "Roda" → "Roleta" dans la sidebar desktop pour aligner avec le bottom nav mobile.

---

## P3 — Dette technique

### [ ] 7. Corriger CATEGORY_LABELS dans Playlist.jsx
**Fichier :** `src/pages/Playlist.jsx` (ligne ~13)  
**Problème :** Labels `futebol`, `bbb`, `celebridades`, `trabalho`, `nostalgia`, `caos nacional` — aucun ne correspond aux valeurs réelles en DB.  
**Fix :** Remplacer par les vraies catégories avec accents : `Esporte`, `Mídia`, `Internacional`, `Política`, `Cultura`, `Economia`, `Gastronomia`, `Energia`, `Polícia`, `Segurança`, `Outros`.

### [ ] 8. Pages orphelines — Calendar + Advent Calendar
**Fichiers :** `src/config/routes.js`, `src/pages/Layout.jsx`  
**Problème :** `/calendar` et `/adventcalendar` sont dans le sitemap (prio 0.8) mais dans **aucune navigation** → features mortes.  
**Fix :** Soit les ajouter au menu "…" mobile / sidebar desktop, soit passer leur prio sitemap à 0.3 + leur mettre `noindex` si déprécié.

### [ ] 9. Accessibilité de la roue canvas
**Fichier :** `src/pages/RodaDaSegunda.jsx` + `MobileRoletaApp.jsx`  
- Ajouter `role="button"` + `tabIndex={0}` + `onKeyDown` sur le canvas  
- Respecter `prefers-reduced-motion` (court-circuiter l'animation de 4,5 s)  
- `aria-label="Girar a roleta"`

---

## Backlog SEO/AEO (hors code)

### [ ] 10. Letras.mus.br + Vagalume — créer profil artiste + paroles
**Effort :** Moyen (manuel). **Impact :** Haute priorité — ces plateformes captent toutes les requêtes cibles et sont citées 6,5× plus que le site propre par les IA.

### [ ] 11. Descriptions YouTube + Spotify avec lien amusicadasegunda.com
Chaque vidéo YouTube doit avoir `amusicadasegunda.com/musica/[slug]/` dans la description.

### [ ] 12. Couverture presse → Wikipédia pt
Prérequis : 2-3 articles dans Splash UOL / Folha F5 / etc. Long terme.

---

## Fait ✅ (session 2026-07-01)

- IndexNow — pinge Bing à chaque postbuild (72 URLs, HTTP 202)
- `/guia/` — page pilier paródia musical (~1000 mots, Article JSON-LD, route, sitemap)
- `/arquivo/2025/` + `/arquivo/2026/` — stubs dynamiques depuis songs.json
- llms.txt — /guia + archives ajoutées
- RSS autodiscovery — `<link rel="alternate">` dans index.html
- Maillage interne /guia/ — homepage, /sobre/, catégories (×11), footer Layout
- Footer desktop — liens Guia + Política de Privacidade
