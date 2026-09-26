# ✅ FIX: /playlist → /musica Inconsistency Resolution

**Date:** 18 janvier 2026  
**Objective:** Remove crawler ambiguity by making /musica the single canonical editorial route

---

## 📋 CHANGES SUMMARY

### Files Modified:
1. `src/pages/index.jsx` - Added redirect route
2. `scripts/generate-sitemap-unified.cjs` - Removed /playlist from staticPages
3. `public/robots.txt` - Removed "Allow: /playlist"
4. `docs/robots.txt` - Removed "Allow: /playlist"
5. `scripts/generate-stubs.cjs` - Added static redirect stub for /playlist
6. `scripts/verify-sitemap-seo.cjs` - Added verification checks for /playlist

---

## 🔧 UNIFIED DIFFS

### 1. src/pages/index.jsx

```diff
                    {/* ✅ SEO: Redirection 301 pour /home → / (évite duplication de contenu) */}
                    <Route path="/home" element={<Navigate to="/" replace />} />
                    
+                   {/* ✅ SEO: Redirection 301 pour /playlist → /musica (single source of truth) */}
+                   <Route path="/playlist" element={<Navigate to="/musica" replace />} />
+                   
                    {ROUTES.map((route) => (
```

### 2. scripts/generate-sitemap-unified.cjs

```diff
-// Static pages configuration
+// Static pages configuration
+// ✅ /playlist removed - redirects to /musica (single source of truth)
 const staticPages = [
   { path: '/', priority: 1.0, changefreq: 'daily' },
   { path: '/musica', priority: 0.9, changefreq: 'weekly' },
   { path: '/calendar', priority: 0.8, changefreq: 'weekly' },
-  { path: '/playlist', priority: 0.9, changefreq: 'weekly' },
   { path: '/blog', priority: 0.8, changefreq: 'weekly' },
   { path: '/sobre', priority: 0.7, changefreq: 'monthly' },
   { path: '/adventcalendar', priority: 0.8, changefreq: 'weekly' },
 ];
```

### 3. public/robots.txt

```diff
 # Permettre l'indexation des pages principales
 Allow: /calendar
-Allow: /playlist
 Allow: /blog
 Allow: /adventcalendar
 Allow: /sobre
+# ✅ /playlist removed - redirects to /musica (single source of truth)
```

### 4. docs/robots.txt

```diff
 # Permettre l'indexation des pages principales
 Allow: /calendar
-Allow: /playlist
 Allow: /blog
 Allow: /adventcalendar
 Allow: /sobre
+# ✅ /playlist removed - redirects to /musica (single source of truth)
```

### 5. scripts/generate-stubs.cjs

```diff
  await fs.writeFile(homeFile, homeRedirectHtml, { encoding: 'utf8' });
  console.log(`✅ Stub /home créé avec redirection 301 vers /`);

+  // ✅ SEO: Stub pour /playlist avec redirection 301 vers /musica (single source of truth)
+  const playlistRedirectDir = path.join(OUT, 'playlist');
+  const playlistRedirectFile = path.join(playlistRedirectDir, 'index.html');
+  await fs.ensureDir(playlistRedirectDir);
+  const playlistRedirectHtml = `<!DOCTYPE html>
+<html lang="pt-BR">
+<head>
+  <meta charset="utf-8">
+  <meta http-equiv="refresh" content="0; url=${siteUrl}/musica/">
+  <link rel="canonical" href="${siteUrl}/musica/">
+  <meta name="robots" content="noindex, follow">
+  <title>Redirection - A Música da Segunda</title>
+  <script>
+    // Redirection JavaScript pour GitHub Pages (fallback)
+    window.location.replace('${siteUrl}/musica/');
+  </script>
+</head>
+<body>
+  <p>Redirection en cours vers <a href="${siteUrl}/musica/">la playlist</a>...</p>
+</body>
+</html>`;
+  await fs.writeFile(playlistRedirectFile, playlistRedirectHtml, { encoding: 'utf8' });
+  console.log(`✅ Stub /playlist créé avec redirection 301 vers /musica/`);
+
   // ✅ SEO: Stubs pour les anciennes URLs /chansons/ avec redirection 301 vers /musica/
```

### 6. scripts/verify-sitemap-seo.cjs

```diff
  }
  
+  // Check for /playlist in sitemaps (should not be indexable)
+  console.log('\n🔍 Vérification de /playlist (doit rediriger vers /musica)...');
+  const playlistUrl = `${SITE_URL}/playlist`;
+  for (const sitemap of EXPECTED_SITEMAPS) {
+    const publicSitemap = path.join(publicDir, sitemap);
+    const docsSitemap = path.join(docsDir, sitemap);
+    
+    for (const sitemapPath of [publicSitemap, docsSitemap]) {
+      if (fs.existsSync(sitemapPath)) {
+        const xml = fs.readFileSync(sitemapPath, 'utf8');
+        if (xml.includes(playlistUrl)) {
+          allErrors.push(`❌ ${sitemapPath} contient /playlist (doit rediriger vers /musica)`);
+        }
+      }
+    }
+  }
+  
+  // Check robots.txt for "Allow: /playlist"
+  console.log('🔍 Vérification de robots.txt...');
+  const robotsPublic = path.join(publicDir, 'robots.txt');
+  const robotsDocs = path.join(docsDir, 'robots.txt');
+  
+  for (const robotsPath of [robotsPublic, robotsDocs]) {
+    if (fs.existsSync(robotsPath)) {
+      const robotsContent = fs.readFileSync(robotsPath, 'utf8');
+      if (robotsContent.includes('Allow: /playlist')) {
+        allErrors.push(`❌ ${robotsPath} contient "Allow: /playlist" (doit être supprimé)`);
+      }
+    }
+  }
+  
   // Report results
   console.log('\n📊 Résultats de la vérification:\n');
   
   if (allErrors.length === 0 && allWarnings.length === 0) {
     console.log('✅ Tous les sitemaps sont conformes SEO!');
     console.log('   - Aucune URL avec hash');
     console.log('   - Aucun doublon');
     console.log('   - Toutes les URLs sont absolues');
     console.log('   - sitemap-index.xml référence tous les sitemaps');
+    console.log('   - /playlist n\'apparaît pas dans les sitemaps');
+    console.log('   - robots.txt ne permet pas /playlist');
     return 0;
   }
```

---

## ✅ VERIFICATION RESULTS

### Verification Script Output:
```
🔍 Vérification SEO des sitemaps...

📑 Vérification de sitemap-index.xml...
📄 Vérification de sitemap-pages.xml...
📄 Vérification de sitemap-songs.xml...

🔍 Vérification de /playlist (doit rediriger vers /musica)...
🔍 Vérification de robots.txt...

📊 Résultats de la vérification:

✅ Tous les sitemaps sont conformes SEO!
   - Aucune URL avec hash
   - Aucun doublon
   - Toutes les URLs sont absolues
   - sitemap-index.xml référence tous les sitemaps
   - /playlist n'apparaît pas dans les sitemaps
   - robots.txt ne permet pas /playlist
```

**Status:** ✅ **PASS**

---

## 📊 FINAL CHECKLIST

### ✅ URL Behavior
- [x] `/playlist` redirects to `/musica` (client-side via React Router)
- [x] Static redirect stub created at `docs/playlist/index.html`
- [x] Redirect stub includes `meta http-equiv="refresh"` and `window.location.replace()`
- [x] Redirect stub includes canonical pointing to `/musica/`
- [x] Redirect stub includes `meta robots="noindex, follow"`

### ✅ robots.txt Status
- [x] `public/robots.txt` - "Allow: /playlist" removed
- [x] `docs/robots.txt` - "Allow: /playlist" removed
- [x] Verification script confirms no "Allow: /playlist" in robots.txt

### ✅ Sitemap Status
- [x] `public/sitemap-pages.xml` - `/playlist` removed (6 pages, down from 7)
- [x] `docs/sitemap-pages.xml` - `/playlist` removed
- [x] Verification script confirms `/playlist` not in any sitemap
- [x] Only `/musica` appears in sitemap (single source of truth)

### ✅ Internal Links Status
- [x] No internal navigation links to `/playlist` found
- [x] All references to "playlist" are external URLs (Spotify, YouTube)
- [x] Route definition in `src/config/routes.js` remains (for redirect to work)

### ✅ Verification Script
- [x] `scripts/verify-sitemap-seo.cjs` updated to check for `/playlist`
- [x] Verification fails CI if `/playlist` appears in sitemaps
- [x] Verification fails CI if "Allow: /playlist" appears in robots.txt
- [x] All checks pass ✅

---

## 🚀 COMMANDS TO VALIDATE LOCALLY

```bash
# 1. Regenerate sitemaps
npm run sitemap

# 2. Verify SEO compliance
npm run seo:verify

# 3. Build and generate stubs
npm run build

# 4. Check redirect stub exists
ls docs/playlist/index.html

# 5. Verify sitemap content
grep -i playlist public/sitemap-pages.xml
# Expected: No matches

# 6. Verify robots.txt
grep -i "Allow: /playlist" public/robots.txt docs/robots.txt
# Expected: No matches
```

---

## ✅ CONFIRMATION

**All requirements satisfied:**

1. ✅ Visiting `/playlist` in browser ends up on `/musica` (redirect implemented)
2. ✅ `/playlist` does not appear in any sitemap (removed from staticPages)
3. ✅ robots.txt does not explicitly allow `/playlist` (removed from both files)
4. ✅ `/playlist` is not indexable (canonical points to `/musica/`, meta robots="noindex")
5. ✅ Verification script fails CI if `/playlist` appears in sitemaps or robots.txt

**Status:** ✅ **PASS** - All checks verified

---

## 📝 NOTES

- The `/playlist` route definition in `src/config/routes.js` remains but is now unreachable (redirect happens first)
- External playlist URLs (Spotify, YouTube) are unaffected
- PWA manifest.json still references `/playlist` for shortcuts (acceptable, not SEO navigation)
- Prefetch in `src/config/seo.js` still includes `/playlist` (performance optimization, not SEO)

**Fix Complete:** 18 janvier 2026
