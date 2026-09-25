# TODO — Tailwind opacity steps that generate no CSS

Separate cleanup, **after** the mobile redesign. Do not fix these during the redesign steps.

## Problem

The project runs Tailwind CSS 3 (`tailwind.config.js` does not extend `opacity`). In v3,
the `/NN` opacity modifier only accepts the default opacity scale: **0, 5, 10, 15, … 95,
100** (multiples of 5). Any other step, such as `bg-white/8`, `text-white/72` or
`bg-black/92`, is silently dropped: **no CSS rule is generated**, so the element falls back to
its default (usually transparent or unset colour). There is no build error or warning.

This was found during step 2 of the mobile redesign (2026-09-25): the Menu sheet's icon
wells and grabber were invisible, and the opaque mobile header had no background. Those
were fixed in the markup touched by step 2 (`AppBottomNav.jsx`, mobile part of
`Layout.jsx`). Everything below is untouched.

**Always check in a real browser** (`getComputedStyle`), not by reading the class name.

## Fix options (to decide when the cleanup starts)

1. Replace each off-scale step with the nearest multiple of 5 (visual change of 1–3 %).
2. Or extend the scale once in `tailwind.config.js` (`theme.extend.opacity`) with the
   steps actually used (e.g. `8`, `12`, `38`, `42`, `62`, `68`, `72`, `92`): all
   classes start working at once, but pages that currently render *without* those styles
   will change appearance, desktop included. Needs a visual review page by page.
3. Or use arbitrary values (`bg-white/[0.08]`) where a precise value matters.

Whatever the option, it changes rendering that is live today (sometimes on desktop and
TV), so it needs its own visual check against the current screens.

## Count

Measured on branch `feat/mobile-redesign` on 2026-09-25: **263 occurrences in
39 files** (classes `bg|text|border|from|to|via|ring|shadow|fill|stroke|divide|
outline|placeholder` with a colour and an opacity that is not a multiple of 5; arbitrary
values `/[0.08]` excluded).

Most frequent steps: `/8` ×58, `/12` ×41, `/38` ×34, `/68` ×17, `/6` ×15, `/42` ×12, `/62` ×11, `/24` ×10, `/58` ×8, `/72` ×8, `/82` ×7, `/28` ×5.

| File | Occurrences |
|---|---:|
| `src/pages/Song.jsx` | 50 |
| `src/pages/Home.jsx` | 26 |
| `src/pages/Sobre.jsx` | 26 |
| `src/pages/Blog.jsx` | 14 |
| `src/pages/Search.jsx` | 11 |
| `src/pages/Layout.jsx` | 10 |
| `src/components/home/DesktopHero.jsx` | 9 |
| `src/components/learn/LearnPanel.jsx` | 9 |
| `src/components/HomeMobileImmersive.jsx` | 8 |
| `src/components/InstallAppBanner.jsx` | 7 |
| `src/pages/Calendar.jsx` | 7 |
| `src/components/BottomNavigationModern.jsx` | 6 |
| `src/components/learn/lesson-steps/IntroStep.jsx` | 6 |
| `src/components/learn/lesson-steps/ResultStep.jsx` | 6 |
| `src/components/MenuDrawerModern.jsx` | 5 |
| `src/pages/Categoria.jsx` | 5 |
| `src/pages/Playlist.jsx` | 5 |
| `src/components/karaoke/KaraokePlayer.jsx` | 4 |
| `src/components/LyricsDialog.jsx` | 4 |
| `src/pages/Tv.jsx` | 4 |
| `src/components/AppUpdate/RecommendedUpdateDialog.jsx` | 3 |
| `src/components/DesktopPageShell.jsx` | 3 |
| `src/components/karaoke/LearningZone.jsx` | 3 |
| `src/components/learn/ExerciseItem.jsx` | 3 |
| `src/components/learn/lesson-steps/KaraokeStep.jsx` | 3 |
| `src/components/learn/lesson-steps/RepetitionStep.jsx` | 3 |
| `src/components/mobile/AppChip.jsx` | 3 |
| `src/pages/RodaDaSegunda.jsx` | 3 |
| `src/components/learn/lesson-steps/ListeningStep.jsx` | 2 |
| `src/components/learn/StudySheetPanel.jsx` | 2 |
| `src/components/mobile/AppButton.jsx` | 2 |
| `src/components/YouTubeEmbed.jsx` | 2 |
| `src/pages/Guia.jsx` | 2 |
| `src/pages/Privacy.jsx` | 2 |
| `src/components/AppUpdate/RequiredUpdateScreen.jsx` | 1 |
| `src/components/karaoke/KaraokeSyncTool.jsx` | 1 |
| `src/components/mobile/AppCard.jsx` | 1 |
| `src/components/mobile/MobileRoletaApp.jsx` | 1 |
| `src/pages/ApprenderLesson.jsx` | 1 |

Regenerate this count with the script in the cleanup PR rather than trusting these numbers.
