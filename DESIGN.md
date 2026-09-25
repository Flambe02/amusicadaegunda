---
name: A Música da Segunda
description: Nova música toda segunda-feira — a dark stage with one yellow spotlight.
colors:
  spotlight-yellow: "#FDE047"
  focus-yellow: "#FACC15"
  stage-black: "#0A0A0A"
  stage-black-deep: "#050505"
  wing-charcoal: "#111111"
  tv-card: "#14161C"
  on-yellow-ink: "#171505"
  text-primary: "#FFFFFF"
  text-secondary: "rgba(255,255,255,0.68)"
  text-muted: "rgba(255,255,255,0.42)"
  glass-fill: "rgba(255,255,255,0.05)"
  glass-fill-strong: "rgba(255,255,255,0.08)"
  glass-border: "rgba(255,255,255,0.10)"
  chrome-bar: "rgba(0,0,0,0.82)"
  sky-haze: "rgba(125,211,252,0.12)"
  tv-dpad-cyan: "#22D3EE"
  destructive-red: "#DC2626"
  platform-youtube: "#FF0000"
  platform-spotify: "#1DB954"
  platform-apple-music: "#FA233B"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "clamp(2.8rem, 4vw, 4.3rem)"
    fontWeight: 900
    lineHeight: 0.95
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  feed-title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "28px"
    fontWeight: 900
    lineHeight: 1.1
    letterSpacing: "-0.025em"
  feed-title-compact:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "15px"
    fontWeight: 900
    lineHeight: 1.25
  title:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 700
    lineHeight: 1.3
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
  body-lead:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.75
  label-eyebrow:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.2
    letterSpacing: "0.28em"
  label-nav:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, 'Segoe UI', Roboto, sans-serif"
    fontSize: "10px"
    fontWeight: 500
    lineHeight: 1.2
  mono-meta:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace"
    fontSize: "0.875rem"
    fontWeight: 600
    fontFeature: "'tnum'"
rounded:
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "26px"
  panel: "30px"
  pill: "9999px"
spacing:
  touch: "44px"
  mobile-x: "16px"
  mobile-y: "14px"
  bottom-nav: "64px"
  panel-pad: "24px"
  panel-pad-xl: "28px"
  section-gap: "32px"
  header-desktop: "72px"
  sidebar-tablet: "260px"
components:
  button-primary:
    backgroundColor: "{colors.spotlight-yellow}"
    textColor: "{colors.on-yellow-ink}"
    typography: "{typography.title}"
    rounded: "{rounded.pill}"
    padding: "12px 24px"
    height: "48px"
  button-glass:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.pill}"
    padding: "12px 20px"
    height: "44px"
  button-icon:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.pill}"
    size: "44px"
  chip-eyebrow:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-secondary}"
    typography: "{typography.label-eyebrow}"
    rounded: "{rounded.pill}"
    padding: "8px 16px"
  panel-glass:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.panel}"
    padding: "{spacing.panel-pad}"
  metric-tile:
    backgroundColor: "{colors.glass-fill}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.xl}"
    padding: "20px"
  nav-item-mobile:
    backgroundColor: "transparent"
    textColor: "rgba(255,255,255,0.6)"
    typography: "{typography.label-nav}"
    height: "48px"
  nav-item-mobile-active:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
  nav-catalogo-pill:
    backgroundColor: "{colors.spotlight-yellow}"
    rounded: "11px"
    width: "46px"
    height: "34px"
  bottom-nav:
    backgroundColor: "#000000"
  tv-card:
    backgroundColor: "{colors.tv-card}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.md}"
---

# Design System: A Música da Segunda

## Overview

**Creative North Star: "The Monday Night Stage"**

The interface is a dark stage after the lights go down, and the only thing lit is this week's song. Almost everything is near-black with white type at a few calibrated opacities. One saturated yellow works like a spotlight: it marks what is playing, what is selected and what to do next. Soft yellow and sky-blue light haze in from the top corners of the page like stage wash. Panels sit in front of that wash as frosted glass, so the haze stays visible behind the content.

The same world runs on every surface: mobile web and PWA, the Capacitor app, desktop, and the 10-foot Android TV interface. Mobile is immersive and full-bleed, with a fixed glass bottom bar. Desktop places the same material inside a max-1440px frame with a glass sidebar (tablet) or a glass top bar (≥1024px). TV scales type up with fluid clamps and turns focus into a yellow glow that can be read from the sofa.

Type is loud and heavy, and never decorative. Headlines are system sans at weight 900 with tight tracking, set close to a poster's leading. Supporting text drops sharply to small, quiet sizes. There is no webfont: the heavy type comes from weight contrast, not from a special typeface.

**Key Characteristics:**
- Dark-only. The palette has a `.light` definition but no route ever activates it.
- One accent, Spotlight Yellow. It is rationed and always means "this one".
- Frosted glass on black is the signature material: a 5% white fill, heavy blur, a hairline border and a deep ambient shadow.
- Generous, soft geometry: 26–32px panel corners, pill buttons and chips, and 44px minimum touch targets.
- Heavy display type (900) against small, widely tracked uppercase eyebrows.
- Stage-wash radial gradients on the page background, never on content.

## Colors

The palette is a near-black stage with a white text ramp and one yellow spotlight. Everything else is either functional (focus, destructive) or borrowed from a streaming platform.

### Primary
- **Spotlight Yellow** (#FDE047): the single brand accent. It fills the Caipivara pill at the centre of the mobile nav (the bar's only yellow; active tabs are white), the tablet sidebar's active dot, the primary CTA fill, the karaoke line being sung, and accent metrics. It also tints the stage wash (`rgba(253,224,71,0.08–0.18)` radial gradients), text selection (28% alpha) and the scrollbar hover. On a yellow fill, text is **On-Yellow Ink** (#171505) or Stage Black, never white.
- **Focus Yellow** (#FACC15): the slightly deeper yellow used only for the keyboard and remote focus ring. Keeping it separate from Spotlight Yellow lets a focused-and-active element still show the ring.

### Secondary
- **Sky Haze** (rgba 125,211,252 at 12%): the cool counter-light in the top-right corner of the page background. It is never used as a fill or text colour, only as atmosphere.

### Neutral
- **Stage Black** (#0A0A0A): the page, karaoke and TV background.
- **Stage Black Deep** (#050505): the deepest black, used for the focus-ring outline and text on yellow badges.
- **Wing Charcoal** (#111111): the top of the page's vertical gradient, which fades to Stage Black.
- **TV Card** (#14161C): the opaque card surface on TV, where blur is too expensive.
- **Text ramp:** white at 100% (headings, active labels), 68–72% (secondary copy), 42–55% (muted meta, eyebrows) and 30% (footnotes).
- **Glass Fill / Glass Fill Strong / Glass Border** (white at 5% / 8–12% / 10%): panel, hover and hairline border surfaces.
- **Chrome Bar** (black at 80–92%): the fixed headers, always under a heavy backdrop blur.

### Functional and borrowed
- **TV D-pad Cyan** (#22D3EE): the default D-pad focus colour inside some TV grids. Karaoke contexts switch it to yellow.
- **Destructive Red** (#DC2626, the shadcn `--destructive`): used only for destructive confirmation.
- **Platform colours** (YouTube #FF0000, Spotify #1DB954, Apple Music #FA233B): used only on the "listen on" link for that platform. They are never brand colours.

### Named Rules
**The One Spotlight Rule.** Spotlight Yellow marks at most one thing per region: the current item, the primary action or the line being sung. It is never the fill for a hero block, a card background or a section band. If two yellow things compete in one viewport, one of them is wrong.

**The Borrowed Colour Rule.** A platform's brand colour appears only on that platform's own link or badge. Other hues in the codebase (purple, blue and emerald Tailwind classes in admin tools, the sync studio, Calendar and Youtube pages) are legacy and not part of the public system.

## Typography

**Display Font:** the system sans stack (ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto)
**Body Font:** the same system stack
**Label/Mono Font:** ui-monospace, used only for tabular meta such as countdowns and version strings

**Character:** a single system sans, pushed to weight 900 for headlines and pulled down to small tracked uppercase labels for context. The contrast between the two carries the personality, not the typeface.

### Hierarchy
- **Display** (900, clamp(2.8rem, 4vw, 4.3rem), line-height 0.95, tight tracking): desktop page and hero titles, max ~14ch. On TV the hero title runs at clamp(2.1rem, 67px, 4.25rem) and steps down for long titles (`is-long`, `is-xlong`).
- **Headline** (900, 1.875–2.25rem, tight): section heads and metric values.
- **Feed title** (900, 28px, line-height 1.1, 2 lines max): the song title over the Início video, which is the mobile page's `h1`. When the sound plays it becomes **Feed title compact** (900, 15px, one line, ellipsis) at the bottom of the frame, so the lyrics burned into the video stay readable. It is the same element; only its style changes, over 300ms, with no transition under reduced motion.
- **Title** (600–700, 1–1.125rem): song titles in lists, card titles and sidebar labels.
- **Body** (400, 0.875rem with 1rem/1.75 for lead copy): descriptions and lyrics context, at 62–72% white and max-w-3xl.
- **Label, eyebrow** (500, 11px, 0.22–0.28em tracking, uppercase, 42–68% white): badges, section kickers and metric captions.
- **Label, nav** (500, 700 active, 10px): bottom-nav captions under 24px icons.

### Named Rules
**The Weight Contrast Rule.** Hierarchy comes from weight and opacity, not from typeface changes. Headlines are 900 and white, and the context above them is small, tracked and uppercase at under 70% white. Don't bring in a webfont to create hierarchy the weights already give.

**The Fluid TV Rule.** TV type always uses a `clamp()` so it stays legible from across a room. Nothing on TV is set below ~0.68rem, and body copy there is ≥1.1rem.

## Layout

- **Mobile (<768px):** the page is a fixed-height `100svh` immersive app shell. `html` and `body` don't scroll; an inner container (`#mobile-scroll`) does. There is a compact top header (52px): transparent and floating over the content on Início, hidden on Sobre, opaque glass elsewhere. At the bottom sits a pure black nav (about 59px plus the safe area) with five items: Início, Karaokê, the Caipivara pill (Catálogo), Buscar, Menu. Side gutter is 16px and vertical rhythm is 14px.
- **Tablet (768–1023px):** a fixed 260px glass sidebar sits inset 16px from the viewport edge with rounded 30px corners. Content is offset by `ml-[260px]`.
- **Desktop (≥1024px):** a fixed 72px glass top bar with centred nav at a max width of 1440px. Content has `px-6 / xl:px-8 / 2xl:px-10` and a footer bar. Pages use `DesktopPageShell`, a glass hero panel with badge, display title, lead, actions and a 2–3-column metric grid, plus an optional 340px side column at 2xl.
- **TV:** a 960×540 CSS viewport at 2× density, with generous safe margins (`scroll-margin: 12vh 8vw` on focus) and horizontal rows of cards moved through by D-pad.
- **Rhythm:** panels pad 24px (28px at xl), sections separate by 32px, and grids use 16px gaps.

## Elevation & Depth

Depth is layered, not lifted. Surfaces are translucent sheets over a lit background, and depth comes from three things together: blur (what's behind goes soft), a deep ambient shadow that pools darkness under the panel, and a 1px inner top highlight that catches the light. Hover changes the tone (the fill goes from 5% to 10% white), not the height.

### Shadow Vocabulary
- **Glass ambient** (`box-shadow: 0 20px 60px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.04)`): every glass panel.
- **Soft** (`0 16px 40px rgba(0,0,0,0.28)`): floating thumbnails and smaller raised elements.
- **Float** (`0 24px 80px rgba(0,0,0,0.45)`): drawers and dialogs.
- **Nav** (`0 -12px 32px rgba(0,0,0,0.32)`): no longer used by the mobile bottom bar (flat, TikTok-style, since 2026-09-25); kept as a token.
- **Spotlight glow** (`0 0 0 3–4px rgba(253,224,71,0.32–0.4), 0 0 22–36px rgba(253,224,71,0.42–0.55)`): TV focus on yellow-themed items. It is the only shadow that carries colour.

### Named Rules
**The Glass-on-Black Rule.** Glass is the house material. A panel is a 5% white fill with `backdrop-blur-xl`, a 10% white hairline border and the glass ambient shadow. Glass must sit over the lit background or other content. On flat black it reads as a dull grey box.

**The Only-Glow-Is-Yellow Rule.** Coloured light is reserved for focus and the spotlight. No other hue ever glows.

## Shapes

The form language is soft and generous. Corners get rounder as elements get bigger: 12px for small controls, 16px for inputs and TV cards, 18–22px for nav and list items, 26px for metric tiles, and 30–32px for panels and the sidebar. Buttons, icon buttons, chips, badges and avatars are full pills or circles. Artwork thumbnails use 16–24px radii with a hairline border and never sit hard against a panel edge. Borders are always 1px hairlines at 8–12% white, except the TV card, which reserves a 3px transparent border that becomes the focus colour.

**The Nested Radius Rule.** An inner element's radius is smaller than its container's, reduced by roughly the padding between them: a 30px panel holds 22px items holding 16px icon wells. Two nested elements never share the same large radius.

## Components

The components are tactile and confident, with a pill for every action, glass for every container and a bright yellow for the current item.

### Buttons
- **Shape:** fully rounded pills (9999px). Icon buttons are 40–44px circles.
- **Primary:** a Spotlight Yellow fill with On-Yellow Ink text at weight 700–900, a 48px height and 24px horizontal padding. There is one per view.
- **Glass (secondary):** a Glass Fill background with a Glass Border hairline and white text. Hover raises the fill to 10%.
- **Hover / Focus:** transitions last 200–300ms on colour and background. Touch press uses `active:scale-95`. Keyboard and remote focus uses the global ring: a 3px Stage Black Deep outline plus a 5px Focus Yellow halo and an 8px dark outer halo, so it reads on any background.
- **shadcn `Button`** (`src/components/ui/button.jsx`) is still present, with a 6px radius, 36px height and theme tokens. It is used mostly in admin, and public surfaces prefer the pill forms above.

### Chips
- **Eyebrow badge:** a Glass Fill pill with a hairline border and 11px uppercase text at 0.28em tracking and 68% white. It opens page heroes.

### Cards / Containers
- **Corner Style:** 30–32px for panels and 26px for metric tiles.
- **Background:** Glass Fill (5%) or 4% for tiles, with the `desktop-shell-gradient` yellow wash in the top-left corner of hero panels.
- **Shadow Strategy:** glass ambient (see Elevation).
- **Border:** a 1px hairline at 10% white.
- **Internal Padding:** 24px (28px at xl) for panels and 20px for tiles.

### Navigation
- **Mobile bottom bar** (`src/components/mobile/AppBottomNav.jsx`, fed by `mobileNavItems` in `src/pages/Layout.jsx`), TikTok-style since 2026-09-25: a pure black bar (#000) with no blur and no shadow, a very discreet 1px top rule at 10% white, and the bottom safe-area inset. Five items in a grid: Início, Karaokê, [Caipivara pill], Buscar, Menu. Each tab is a 48px-tall target with a 24px icon over a 10px caption. **Active:** filled white icon (`src/components/mobile/icons/FilledIcons.jsx`) and bold white caption. **Inactive:** the lucide outline icon and caption at 60% white. No pill or wash behind tabs and no yellow on them; press feedback is a 70% opacity dip.
  - **Caipivara pill (Catálogo):** at the centre, the Caipivara face (`caipivara-3d-head-128.webp`, 28px) in a 46×34px Spotlight Yellow pill with an 11px radius, inside a 48px target. No caption; `aria-label="Catálogo"`. It is the bar's only yellow. When active it takes a light 1.5px white ring, offset by 1.5px of black. It opens `/catalogo` and lights up on every page that browses the songs (`/catalogo`, `/musica`, song pages, categories, arquivo). Below 768px, `/search` and `/roda` lead to `/catalogo`; on desktop they are unchanged.
  - **Karaokê tab:** a lyrics icon (music list), never a microphone, because the karaoke works without one.
  - **Buscar tab:** opens the search panel from any screen (step 10). Until that panel exists it leads to `/catalogo`. It is never shown as active.
  - **Menu tab:** three lines (three thick lines when active), opens a bottom sheet rather than a page. It lights up for the pages reached from the sheet (Blog, Sobre, TV, Festa, Aprender), since those pages have no tab of their own.
  - **Top header (mobile only):** 52px with the Caipivara avatar at left (the still 3D Caipivara, head crop, `caipivara-3d-head-128/256.webp`; not the old microphone logo), the name centred and an info button (Sobre) at right — except on Início, where the info button is removed (it duplicated the Menu tab) and a same-size spacer keeps the name centred. On Início the header is transparent and floats over the content, and only the avatar catches taps, so the rest of the area passes touches through to the video. On Sobre it is hidden. Everywhere else it is glass at 90% black with a bottom hairline.
- **Tablet sidebar:** a 260px glass panel with a 30px radius and a yellow radial glow at the top. The brand block at the top combines the Caipivara avatar with an eyebrow and the name. Nav items are 22px-radius rows with 40px icon wells and a status dot that turns yellow when active.
- **Desktop top bar:** 72px tall at 80% black with `backdrop-blur-xl`. On the left is the logo (a 44px, 12px-radius square) with the name at 15px/700. The centred nav has 15px links, and a 40px circular search button sits on the right.

### Karaoke lyric line (signature)
The line being sung fills with Spotlight Yellow word by word, from left to right (a gradient clipped to the text), under a soft yellow halo (`text-shadow: 0 0 28px rgba(253,224,71,0.35)`, or a `drop-shadow` filter on the wipe). A small yellow ball glowing at 85% alpha bobs above the current word. The lyric column fades out at the top and bottom through an 18% mask gradient, so lines scroll in and out rather than being cut off. Karaoke surfaces use their own scoped tokens (`--karaoke-*`: 4% and 7% surfaces, 12/18/26px radii) that belong to the same world. Karaoke focus uses a solid 3px yellow outline with a pill radius.

### TV focus card (signature)
An opaque #14161C card with a 16px radius, a 3px transparent border and a dark drop shadow. On D-pad focus the border takes the focus colour, the card scales to about 1.04, and in yellow contexts it picks up the spotlight glow. Transitions last 150ms.

## Do's and Don'ts

### Do:
- **Do** keep every public surface dark (Stage Black #0A0A0A under the lit stage-wash gradient). The system is dark-only.
- **Do** reserve Spotlight Yellow (#FDE047) for the one active, primary or playing thing in a region, with On-Yellow Ink (#171505) text on yellow fills.
- **Do** build containers from the glass recipe: a 5% white fill, `backdrop-blur-xl`, a 10% white hairline and `0 20px 60px rgba(0,0,0,0.35)` with a 1px inset top highlight.
- **Do** set headlines at 900 with tight tracking, and set context as 11px uppercase eyebrows tracked at 0.22–0.28em.
- **Do** keep touch targets ≥44px and use the global yellow focus ring (`src/styles/a11y.css`). The ring must be visible on every focusable element, and on TV at the larger 7px halo.
- **Do** use `clamp()` for all TV type and respect `prefers-reduced-motion`.

### Don't:
- **Don't** fill a hero, band or card background with yellow. Yellow is a spotlight, not paint.
- **Don't** introduce new accent hues (purple, blue, emerald) on public surfaces. Those classes are legacy admin and tool styling.
- **Don't** use a platform's brand colour anywhere except that platform's own link.
- **Don't** put glass on flat black with nothing behind it, and don't stack glass on glass more than one level deep.
- **Don't** give nested elements the same large radius. Step radii down, from 30 to 22 to 16.
- **Don't** use white text on a yellow fill.
- **Don't** let any glow be a colour other than yellow.
- **Don't** put a gradient, scrim or veil over the Início feed video: it darkens the video. Text and icons on the video (site name, week label, song title, rail labels and icons) stay readable with a soft shadow only: `text-shadow: 0 1px 3px rgba(0,0,0,0.6), 0 0 12px rgba(0,0,0,0.35)` (icons: the same as `filter: drop-shadow`). The compact 15px title uses a denser shadow (`0 1px 2px rgba(0,0,0,0.85), 0 0 6px rgba(0,0,0,0.6), 0 0 14px rgba(0,0,0,0.4)`) at full opacity. The right rail is TikTok-style: filled white 32px icons (speaker, text sheet, newspaper, music list, curved share arrow) sitting straight on the video with no disc behind them, 12px semibold white captions, targets of at least 56×52px, 6px from the right edge.
