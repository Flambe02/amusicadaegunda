# SEO AUDIT REPORT - Música da Segunda
*Generated on: 2025-01-15*

## EXECUTIVE SUMMARY
**Domain**: www.amusicadasegunda.com  
**Framework**: Vite/React SPA  
**Hosting**: GitHub Pages  
**Language**: Portuguese (pt-BR)  
**Current Status**: ⚠️ **PARTIALLY OPTIMIZED** - Major issues with URL consistency and missing song-level SEO

---

## A) DISCOVERY / INDEXATION

### Robots.txt
- **Status**: ⚠️ **NEEDS FIX**
- **Issues**: 
  - Sitemap URL uses non-www: `https://amusicadasegunda.com/sitemap.xml`
  - Should be: `https://www.amusicadasegunda.com/sitemap.xml`
- **Content**: ✅ Present with proper Allow/Disallow rules
- **Crawl-delay**: ✅ Set to 1 second

### Sitemaps
- **Main Sitemap**: ✅ **Present** at `/public/sitemap.xml`
- **Content**: 6 static pages (home, calendar, playlist, blog, adventcalendar, sobre)
- **Issues**: 
  - All URLs use non-www: `https://amusicadasegunda.com/*`
  - Should be: `https://www.amusicadasegunda.com/*`
  - **Missing**: Song-level sitemap for individual songs
- **Generator**: ✅ Script exists: `scripts/generate-sitemap.cjs`

### Canonical Policy
- **Base Template**: ✅ **Present** in `docs/index.html`
- **Issues**: 
  - Uses non-www: `https://amusicadasegunda.com/`
  - Should be: `https://www.amusicadasegunda.com/`
- **Hreflang**: ✅ Present (pt-BR + x-default)

### Content URLs & Data Source
- **Songs Data**: ✅ **Present** at `data/songs.json`
- **Content**: 4 song slugs: `["croissant", "confissoes-bancarias", "festas-juninas", "cafe-no-brasil"]`
- **Missing**: Individual song pages not in sitemap
- **Routes**: Song pages exist but not discoverable by search engines

---

## B) PAGE TEMPLATES / SEO METADATA

### Home Page Template
- **Title**: ✅ **Present** - "Música da Segunda - Nova música toda segunda-feira | Descobertas Musicais"
- **Description**: ✅ **Present** - Comprehensive meta description
- **OpenGraph**: ✅ **Present** - All required tags
- **Twitter**: ✅ **Present** - Summary large image card
- **JSON-LD**: ✅ **Present** - WebSite + MusicGroup schemas

### Song Page Templates
- **Dynamic SEO**: ✅ **Present** - `useSEO` hook implemented
- **Client-side**: ⚠️ **ISSUE** - SEO updates happen after hydration
- **Missing**: 
  - Song-specific JSON-LD (MusicRecording)
  - BreadcrumbList schema
  - Individual song sitemap entries

### Internal Linking
- **Navigation**: ✅ **Present** - React Router with proper routes
- **Song Links**: ✅ **Present** - Recent songs displayed on home
- **Missing**: 
  - Prev/next navigation between songs
  - Dedicated songs listing page (`/chansons`)

---

## C) TECHNICAL QUALITY

### Meta Tags
- **Noindex**: ❌ **None found** - Good for SEO
- **Robots**: ✅ **Present** - `index, follow` with proper directives
- **Viewport**: ✅ **Present** - Mobile-optimized

### CNAME & Hosting
- **CNAME**: ✅ **Present** - `www.amusicadasegunda.com`
- **GitHub Pages**: ✅ **Confirmed** - Deploy script exists
- **Custom Domain**: ✅ **Active**

### Build & Deploy
- **Build Script**: ✅ **Present** - `npm run build`
- **Deploy Script**: ✅ **Present** - `npm run deploy`
- **Sitemap Generation**: ✅ **Present** - `npm run sitemap`

---

## D) CRITICAL ISSUES IDENTIFIED

### 🚨 P1 (BLOCKING)
1. **URL Inconsistency**: All metadata uses non-www while CNAME targets www
2. **Missing Song Sitemap**: Individual songs not discoverable by search engines
3. **Canonical Mismatch**: Base canonical points to non-www domain

### ⚠️ P2 (IMPROVEMENTS)
1. **Song-level SEO**: Missing MusicRecording schema for individual songs
2. **Breadcrumbs**: No breadcrumb navigation schema
3. **Sitemap Structure**: Should be hierarchical (index + static + songs)

---

## E) ACTION PLAN

### Phase 1: Critical Fixes (P1)
1. **Fix URL Consistency**: Update all metadata to use `www.amusicadasegunda.com`
2. **Create Song Sitemap**: Generate individual song URLs in sitemap
3. **Fix Canonical URLs**: Ensure all canonical links use www domain

### Phase 2: SEO Enhancements (P2)
1. **Add Song Schema**: Implement MusicRecording JSON-LD for individual songs
2. **Add Breadcrumbs**: Implement BreadcrumbList schema
3. **Optimize Sitemap**: Create hierarchical sitemap structure

### Phase 3: Validation
1. **Test Sitemap Generation**: Verify song URLs are included
2. **Submit to GSC**: Resubmit sitemap to Google Search Console
3. **Request Indexing**: Test individual song page indexing

---

## F) IMPLEMENTATION PRIORITY

**IMMEDIATE (This Session)**:
- Fix robots.txt sitemap URL
- Update sitemap generator for song URLs
- Fix canonical URL consistency

**NEXT SESSION**:
- Add song-level JSON-LD schemas
- Implement breadcrumb navigation
- Create hierarchical sitemap structure

---

## G) EXPECTED OUTCOMES

**After Fixes**:
- ✅ Google will discover individual song pages
- ✅ Canonical URLs will be consistent
- ✅ Sitemap will be properly indexed
- ✅ Search visibility will improve significantly

**Timeline**: 24-48 hours for Google to recrawl, 1-2 weeks for full indexing

---

*Audit completed by: Senior SEO + Frontend Engineer*  
*Next step: Awaiting confirmation to proceed to Phase 2 (Implementation)*
