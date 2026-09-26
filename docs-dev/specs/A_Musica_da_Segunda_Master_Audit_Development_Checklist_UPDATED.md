# A MÚSICA DA SEGUNDA

## MASTER PRODUCT AUDIT, DEVELOPMENT CHECKLIST AND EXECUTION REFERENCE

*Operational reference for Claude Code, Codex and the product owner*

**Revision:** V3. Product-first, simple architecture, family Festa, hybrid lyric synchronization

**Date:** 2026-07-12

**This document supersedes all earlier Master Audit and Development Checklist versions.**

> **Product North Star**
>
> A user must be able to open the app, understand the experience, find a song and start singing in less than 30 seconds.
>
> The TV is the stage. The phone is optional. The product must work without an account, without a paywall and without a microphone.

## Current product surfaces

Web / PWA  •  Android mobile  •  Android TV in production  •  Companion phone for Festa  •  Existing Back Office connected to Supabase

## Current and future modes

- **Current core:** Karaoke, Solo, Dueto, Festa
- **Current extension to improve:** Learn Portuguese
- **Future content extension:** Family / Kids
- **Future platform extension:** Fire TV, Samsung Tizen
- **Future business extension:** Creator Studio, accounts and monetization

---

# 0. NON-NEGOTIABLE PRODUCT DECISIONS

These decisions override any contradictory instruction in an older checklist or audit.

## 0.1 Keep the product open and frictionless

- [x] Public users can use Karaoke without registration.
- [x] Festa participants can join through QR code or short code and nickname only.
- [ ] Do not implement public user registration during the current development phases.
- [ ] Do not implement Google sign-in, public profiles or family accounts during the current development phases.
- [ ] Do not implement a paywall, subscription, entitlement system, Festa Pass or payment flow during the current development phases.
- [ ] Monetization remains documented as a future direction only.
- [ ] Revisit monetization only after Karaoke, synchronization, Festa, gamification, Back Office and platform reliability work correctly.

The intended public flow remains:

```text
Open the app
→ choose a song
→ sing
```

The intended Festa flow remains:

```text
Open Festa on the TV
→ display QR code
→ scan on phone
→ enter nickname
→ add songs and react
```

## 0.2 Keep Supabase simple

The current architecture is appropriate for this product and must not be replaced without a real demonstrated need.

- Static React / Vite application
- Supabase Auth for the existing admin accounts
- Supabase database and Realtime
- Public `anon` key in the frontend
- Row Level Security for access control
- Edge Functions only when a secret or privileged server operation is genuinely required
- No `service_role` key in the browser

### Explicit architecture rule

Do not create complexity only to satisfy an abstract enterprise architecture checklist.

Do not implement now:

- a new application server;
- a generalized API layer around every Supabase request;
- a mandatory separate staging Supabase project;
- complex role-based access control with many roles;
- a generic database console;
- a large audit infrastructure intended for a multi-team company.

Continue using direct browser-to-Supabase operations protected by RLS for normal song and synchronization workflows.

Use an Edge Function only for operations such as:

- OpenAI or another secret API key;
- secure Auth administration;
- future payment verification;
- another action that cannot safely use the public client.

## 0.3 Festa is a simple family experience

Festa is intended first for family and friends in the same room. It must remain playful and easy, not become an event-management platform.

Do not add now:

- mandatory accounts;
- SMS or email verification;
- complex participant approval;
- rotating security tokens visible to users;
- multiple administrative roles inside one Festa;
- heavy moderation workflows;
- complicated setup screens.

Minimum protection should prevent accidental destruction without adding visible friction.

Recommended simple distinction:

- The TV controls playback, skip, queue clearing and session ending.
- A phone participant can add a song, react and remove only the song they added.
- The participant identity may be an invisible local identifier stored in `localStorage`.
- The user only sees their nickname. No security concept needs to be explained.

## 0.4 Android TV is already in production

The Android TV version is already released in production. Treat Android TV as a live product, not a theoretical future port.

- [x] Android TV packaging and store release exist.
- [x] Leanback and TV launcher configuration exist.
- [x] D-pad navigation and responsive TV layouts exist.
- [ ] Continue testing production behavior on the real devices available to the product owner.
- [ ] Prioritize real user problems, player reliability and navigation regressions over theoretical certification work already passed.

## 0.5 Synchronization must support phrases and optional words

The current line / phrase synchronization remains valid and must not be removed.

The next strategic improvement is an optional hybrid model:

- `line`: phrase-level timing only;
- `word`: word-level timing for the full line;
- `hybrid`: some lines have word timing and others keep phrase timing.

Existing songs must continue to work without migration.

---

# 1. HOW TO USE THIS DOCUMENT

This document is the execution reference. It combines the current code audit, product decisions and development checklist.

## Operating sequence

1. Audit the selected theme before editing code.
2. Confirm what already works end to end.
3. Identify only the missing, partial or broken elements in that theme.
4. Propose the smallest complete implementation slice.
5. Preserve working behavior and the current visual identity.
6. Implement one theme at a time.
7. Run tests and the relevant build.
8. Verify the visible flow manually.
9. Update the status and evidence in this document or in `docs/product-audit.md`.
10. Continue only when the selected slice is complete.

A complete full-repository audit already exists in the prior Claude Code review. A new full audit is not required before every task. A targeted audit of the theme being modified is required.

## Status legend

| Status | Meaning |
| --- | --- |
| **Implemented** | Works end to end in the current implementation. |
| **Partial** | Exists but needs completion, reliability work or UX improvement. |
| **Missing** | No usable implementation exists. |
| **Broken** | Exists but currently fails. |
| **Future / Frozen** | Deliberately not to be implemented during the current phase. |
| **Unknown** | Requires direct verification. |

## Priority legend

| Priority | Meaning |
| --- | --- |
| **P0** | Current product quality or reliability. Do now. |
| **P1** | Important enhancement after the current P0 slice. |
| **P2** | Strategic future extension. |
| **Frozen** | Do not implement until the product owner explicitly reactivates it. |

## Evidence required before checking an item

- [ ] Files and components changed
- [ ] Database migration, when required
- [ ] Tests run and results
- [ ] Manual verification steps
- [ ] Android TV or browser build result
- [ ] Known limitations
- [ ] Screenshot or recording when the change is visual

---

# 2. CURRENT PRODUCT REALITY

## Strong existing foundations

- Karaoke player with playback controls, options, countdown and progressive lyric rendering
- Existing line-level LRC synchronization editor with timeline, drag, undo / redo and shortcuts
- Solo and Dueto presentation
- Festa session with QR code, short code, shared Realtime queue and reactions
- TV-specific navigation with D-pad support
- Android TV production release
- Back Office for song CRUD, subtitles and lyric synchronization
- GA4 event tracking
- Supabase RLS with no secret key exposed in frontend code

## Main current opportunities

1. Improve lyric synchronization with optional word timing.
2. Add autosave and persistent versions to the synchronization editor.
3. Improve player recovery for buffering, invalid media and interrupted playback.
4. Complete the end-of-song experience.
5. Make Festa more playful while keeping it family-simple.
6. Add a mic-free score and final recap.
7. Improve Back Office song validation and publication workflow.
8. Expand Learn Portuguese without requiring an account.
9. Continue real-device Android TV testing based on the production build.

## Deliberately deferred

- Public accounts and registration
- Paywall and payments
- Subscription plans
- Complex Supabase architecture
- Complex Festa security and moderation
- Professional vocal scoring
- Creator Studio
- Fire TV production port
- Samsung Tizen production port

---

# 3. PRODUCT MODEL. KARAOKE AND FESTA

The same player and catalogue may support both experiences, but the promise must be clear.

| Dimension | Karaoke | Festa |
| --- | --- | --- |
| Primary promise | Start singing immediately. | Sing together and play as a family or group. |
| Setup | None. | QR code or short code, then nickname. |
| Phone required | No. | No, but recommended for adding songs and reactions. |
| Queue | Optional local queue. | Shared queue is central. |
| Gamification | Light and optional. | Reactions, votes, challenges and recap. |
| Microphone | Optional. | Optional. Festa remains fun without one. |
| Account | No. | No. |
| Payment | No current paywall. | No current paywall. |

## Mode entry checklist

- [x] Solo is a distinct mode.
- [x] Dueto is a distinct mode.
- [x] Festa has its own entry flow.
- [ ] Ensure each mode page explains the experience before listing songs.
- [ ] Ensure relevant songs appear below each mode explanation.
- [ ] Add a clearer Família entry when the family catalogue is ready.
- [ ] Add a clearer Aprender Português entry when the learning experience is ready.

## Core UX rule

Do not send Solo, Dueto and Festa to visually identical pages with identical behavior.

---

# 4. HOME, CATALOGUE AND SONG DETAIL

## Current status

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| UX-01 | Primary action clearly starts Karaoke. | P0 | Implemented |
| UX-02 | Festa is a distinct experience. | P0 | Implemented |
| UX-03 | Solo, Dueto, Família and Português are clearly explained. | P0 | Partial |
| UX-04 | Karaoke has priority over passive clips on TV. | P0 | Implemented |
| UX-05 | TV navigation is consistent and D-pad accessible. | P0 | Implemented |
| CAT-01 | Search by title and keyword. | P0 | Partial. Title works, lyric fragment needs verification. |
| CAT-02 | Filters by month, year, theme and difficulty. | P0 | Partial |
| CAT-03 | Surprise song action. | P0 | Implemented |
| CAT-04 | Song detail explains context, difficulty and mode. | P0 | Partial |
| CAT-05 | Cantar agora and Add to queue. | P0 | Partial across surfaces |
| CAT-06 | Local guest favorites and recent history. | P1 | Missing |
| CAT-07 | Easy starters, latest Monday song and recommendations. | P1 | Partial |

## Development checklist

- [ ] Confirm lyric-fragment search requirements before changing search architecture.
- [ ] Add or verify month, year, theme and difficulty filters on mobile, desktop and TV.
- [ ] Add audience classification: Adult, Family, Future Kids.
- [ ] Add duration where it can be measured reliably.
- [ ] Add a clear mode recommendation on song detail.
- [ ] Add local favorites using device storage, without registration.
- [ ] Add local recent-history using device storage, without registration.
- [ ] Keep Surprise simple and avoid immediately repeating the same song.

---

# 5. KARAOKE PLAYER AND PLAYBACK RELIABILITY

## Current status

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| PLY-01 | Play, pause, rewind, forward, retry, next and exit. | P0 | Implemented |
| PLY-02 | Visible Options panel. | P0 | Implemented |
| PLY-03 | Current lyric, progress and next lyric. | P0 | Implemented, verify on production devices |
| PLY-04 | Intro and countdown. | P0 | Implemented |
| PLY-05 | Buffering and media error recovery. | P0 | Unknown / Partial |
| PLY-06 | Restore useful state after interruption. | P0 | Partial |
| PLY-07 | Android audio focus and lifecycle. | P0 | Unknown |
| PLY-09 | Font size, translation and reduced speed. | P1 | Implemented |
| PLY-10 | Complete end-of-song screen. | P1 | Partial |
| PLY-11 | Next-song preload and low-memory optimization. | P1 | Missing |

## P0 player checklist

- [ ] Test invalid or removed YouTube video.
- [ ] Test slow or interrupted network.
- [ ] Test app background and resume.
- [ ] Test TV sleep and resume where possible.
- [ ] Show a clear retry action instead of a silent frozen player.
- [ ] Preserve or rebuild the queue after a temporary interruption.
- [ ] Verify D-pad focus on every footer and Options control in production.
- [ ] Verify Play / Pause media keys on real production devices.

## End-of-song screen

Develop a simple dedicated end state with:

- [ ] Rejouer
- [ ] Chanson suivante
- [ ] Voir la file
- [ ] Retour au catalogue
- [ ] Festa result or reactions when in Festa
- [ ] A light share action only if it remains simple

---

# 6. LYRIC SYNCHRONIZATION. PHRASE, WORD AND HYBRID

## Product decision

Preserve the current line-level LRC system and add optional word timing.

Do not require every existing song to be converted.

Do not rebuild the removed Whisper pipeline during this phase.

## 6.1 Timing modes

| Mode | Behavior |
| --- | --- |
| `line` | Current phrase-level timing. Existing behavior. |
| `word` | Every word in the selected line has timing. |
| `hybrid` | Word timing exists only for selected lines, such as refrains or fast passages. |

## 6.2 Backward-compatible data model

Keep the existing `lrc_content` field as the compatibility source.

Add a structured timing field only when required:

```text
timing_mode TEXT DEFAULT 'line'
timing_data JSONB NULL
timing_version INTEGER DEFAULT 1
```

Recommended shape:

```json
{
  "version": 1,
  "timingMode": "hybrid",
  "lines": [
    {
      "id": "line-001",
      "text": "Camarada quer CPF",
      "start": 12.4,
      "end": 15.2,
      "singer": "lead",
      "words": [
        { "text": "Camarada", "start": 12.4, "end": 13.2 },
        { "text": "quer", "start": 13.2, "end": 13.8 },
        { "text": "CPF", "start": 13.8, "end": 15.2 }
      ]
    }
  ]
}
```

Before creating this migration, inspect the current schema and reusable parser. Reuse existing timing utilities where possible.

## 6.3 Player fallback logic

```text
If valid word timestamps exist for the active line
→ render word-level highlighting

Else if phrase start and end exist
→ render the current progressive phrase wipe

Else
→ use the current historical fallback
```

No existing karaoke song may stop working after this feature is introduced.

## 6.4 Synchronization editor requirements

### Preserve current capabilities

- [x] Timeline
- [x] Playhead
- [x] Line start and end timing
- [x] Global offset
- [x] Drag blocks
- [x] Undo / redo
- [x] Playback speed
- [x] Keyboard shortcuts
- [x] Production-player preview

### Add P0 reliability

| ID | Requirement | Status |
| --- | --- | --- |
| SYNC-01 | Autosave draft during editing. | Missing |
| SYNC-02 | Unsaved-change indicator. | Missing |
| SYNC-03 | Warning before refresh or navigation. | Missing |
| SYNC-04 | Local recovery after accidental refresh. | Missing |
| SYNC-05 | Persistent timing version history. | Missing |
| SYNC-06 | Restore a previous version. | Missing |
| SYNC-07 | Timing validation before publication. | Missing |

### Add optional word editor

| ID | Requirement | Priority |
| --- | --- | --- |
| WORD-01 | Expand a phrase into individual word blocks. | P0 |
| WORD-02 | Automatically distribute words between line start and end. | P0 |
| WORD-03 | Capture word boundaries by tapping a key during playback. | P0 |
| WORD-04 | Drag or resize each word block. | P0 |
| WORD-05 | Loop the active line or selected segment. | P0 |
| WORD-06 | Preview with the production renderer. | P0 |
| WORD-07 | Revert a line back to phrase timing. | P0 |
| WORD-08 | Support mixed phrase and word lines in one song. | P0 |
| WORD-09 | Split, merge or ignore tokens when lyrics and singing differ. | P1 |
| WORD-10 | Mark singer, spoken word, ad-lib or instrumental gap. | P1 |

## 6.5 Deterministic word distribution

The first version must not depend on AI.

The editor should:

1. tokenize the line;
2. calculate the available line duration;
3. allocate an initial duration to each word;
4. weight allocation using word length and punctuation;
5. let the admin correct the result manually.

The proposed timing is only a starting point. Human review is mandatory.

## 6.6 Keyboard capture mode

Recommended flow:

```text
Select a line
→ play or loop the line
→ press Space or another dedicated key at every new word
→ save captured boundaries
→ allow visual correction
```

The shortcut must not conflict with the existing phrase capture mode. Provide a visible mode label and shortcut reminder.

## 6.7 Quality validation

Add warnings for:

- [ ] negative duration;
- [ ] word outside its parent line;
- [ ] overlapping words;
- [ ] line overlap beyond permitted tolerance;
- [ ] missing word timing in a line declared as `word`;
- [ ] timestamp after video duration;
- [ ] empty line;
- [ ] words whose text no longer matches the line;
- [ ] invalid or unreadable timing JSON.

Warnings should not create a complicated publication workflow. A simple validation panel is sufficient.

## 6.8 Pilot plan

Do not convert the full catalogue immediately.

Pilot on five songs:

- [ ] one simple slow song;
- [ ] one fast song;
- [ ] one duet;
- [ ] one popular Festa song;
- [ ] the current Monday song.

Start with refrains and difficult passages. Convert the full song only when useful.

## 6.9 Acceptance gate

- [ ] Existing LRC songs still play correctly.
- [ ] A song can contain phrase and word lines.
- [ ] Word timing is editable without raw JSON.
- [ ] Word preview matches the production player.
- [ ] Autosave and recovery protect the editing session.
- [ ] At least five pilot songs are validated manually.
- [ ] Android TV production build renders word highlighting correctly.

---

# 7. QUEUE AND SESSION STATE

## Product principle

Keep the local Karaoke queue and Festa shared queue understandable. Do not create a complex session framework.

| ID | Requirement | Priority | Status |
| --- | --- | --- | --- |
| QUE-01 | Add song from catalogue and detail. | P0 | Implemented |
| QUE-02 | Show current, next and remaining songs. | P0 | Partial |
| QUE-03 | Remove, skip and clear. | P0 | Partial |
| QUE-04 | Automatically advance. | P0 | Implemented |
| QUE-05 | Recover Festa queue after reconnect. | P0 | Partial |
| QUE-06 | Add singer nickname to a queue item. | P1 | Missing |
| QUE-07 | Reorder queue from the TV. | P1 | Missing |
| QUE-08 | Suggest a song when the queue is empty. | P1 | Missing |

## Development checklist

- [ ] Show who added each Festa song.
- [ ] Let a phone remove only the song it added.
- [ ] Keep skip, clear and end-session controls on the TV.
- [ ] Add queue reorder on TV only if the UX remains simple.
- [ ] Ensure reconnect does not duplicate rows.
- [ ] Ensure song completion cannot advance twice.
- [ ] Add a simple empty-queue suggestion.

---

# 8. FESTA. SIMPLE FAMILY MULTIPLAYER

## Current status

- [x] Create a Festa session from TV.
- [x] Display QR code and short code.
- [x] Join without account.
- [x] Use nickname identity.
- [x] Shared Realtime queue.
- [x] Applause and tomato reactions.
- [ ] Improve multi-phone reconnect testing.
- [ ] Add playful end-of-song votes.
- [ ] Add final recap.
- [ ] Add simple TV controls for queue cleanup.

## Required Festa flow

### TV

```text
Festa
→ Create Festa
→ Show QR code and short code
→ Wait for participants or continue without phone
→ Start songs
```

### Phone

```text
Scan QR code
→ Enter nickname
→ Join
→ Search or browse
→ Add a song
→ React and vote
```

Maximum visible setup should remain three short steps.

## Minimum family-safe rules

- [ ] No account required.
- [ ] No password required.
- [ ] No participant approval required.
- [ ] TV can skip the current song.
- [ ] TV can remove any queue item.
- [ ] TV can clear the queue with confirmation.
- [ ] TV can end the session.
- [ ] Phone can add a song.
- [ ] Phone can remove its own song.
- [ ] Phone cannot accidentally clear the whole queue.
- [ ] Phone cannot accidentally end the Festa.

This can use an invisible generated `participant_id` stored locally. Do not expose technical security language to the family.

## TV-only fallback

Festa should still work when nobody uses a phone:

- [ ] Create local nicknames or simply choose Solo, Dueto or Todos.
- [ ] Add songs with the TV remote.
- [ ] Run the queue from the TV.
- [ ] Use TV reactions or automatic recap if no phones are connected.

## Explicit non-goals for the current phase

- public Festa discovery;
- moderation teams;
- host approval for every join;
- identity verification;
- professional event administration;
- paid Festa Pass;
- complicated access tokens;
- multiple host roles.

---

# 9. GAMIFICATION. FUN BEFORE VOCAL ACCURACY

## Product principle

The score must make people laugh and continue singing. It must not pretend to be a professional vocal assessment.

## Current status

- [x] Applause reaction
- [x] Tomato reaction
- [x] Optional microphone energy meter
- [ ] Mic-free result
- [ ] End-of-song voting
- [ ] Challenges
- [ ] Teams
- [ ] Final Festa recap

## P0 mic-free game layer

A session must produce a fun result even without microphone access.

Possible inputs:

- song completed;
- audience applause;
- audience tomatoes;
- participant vote;
- queue participation;
- challenge completion;
- group participation.

Do not use hidden pseudo-precision. Display the score as playful entertainment.

## Simple post-song votes

Suggested categories:

- Energia
- Presença de palco
- Diversão
- Conhecimento da letra

Keep voting fast. One screen, large buttons, a short countdown.

## Challenges

- [ ] Todo mundo canta
- [ ] Troca de cantor no refrão
- [ ] Dueto surpresa
- [ ] Só o refrão
- [ ] Sem bola de acompanhamento
- [ ] Velocidade treino
- [ ] Música surpresa

## Final recap

Possible humorous awards:

- Rei do Refrão
- Rainha da Energia
- Dupla Improvável
- Mais Corajoso da Noite
- Campeão do Tomate
- Música Mais Aplaudida

The recap may display:

- participants;
- songs completed;
- reactions;
- selected awards;
- team result when team mode is later added.

## Microphone score label

Keep the current microphone feature clearly labeled as an energy meter, not a vocal-grade score.

Preferred wording:

```text
Medidor de energia
```

Avoid:

```text
Nota vocal profissional
```

---

# 10. MICROPHONE AND AUDIO INPUT

## Current rule

Microphone is optional. No-microphone Karaoke and Festa are the default reliable experiences.

## Supported hierarchy

1. No microphone
2. Browser / device input exposed through `getUserMedia`
3. USB or Bluetooth input when exposed by the operating system
4. TV microphone only when the platform genuinely exposes it to the app
5. Phone microphone as a future optional research path

## Current development checklist

- [x] Microphone capture is opt-in.
- [x] Capture does not start automatically.
- [x] No raw audio is stored.
- [ ] Hide or disable the microphone option when capability is clearly unavailable.
- [ ] Display the selected input name when browser APIs allow it.
- [ ] Handle device disconnect without stopping the song.
- [ ] Return a neutral result when no usable signal exists.
- [ ] Test a USB or Bluetooth microphone if available.
- [ ] Test whether the production Android TV device exposes the TV or remote microphone.

## Platform constraint

Do not assume that the voice button on Google TV, Android TV or Fire TV remotes is available as raw singing audio. It is often reserved for the system assistant.

Phone-to-TV microphone streaming remains future research. Do not implement it during the current synchronization and Festa phases.

---

# 11. COMPANION PHONE

## Current role

The phone is an optional Festa companion. It is not required for Karaoke.

## Current status

| Requirement | Status |
| --- | --- |
| QR / code join | Implemented |
| Nickname join without account | Implemented |
| Browse and add songs | Implemented |
| View current and upcoming queue | Implemented |
| Send applause and tomatoes | Implemented |
| Vote after songs | Missing |
| Remove own queued song | To verify / improve |
| Control play, pause or skip | Future, only if kept simple |
| Use phone as microphone | Future / Frozen |
| Private lyrics or translation view | Future |

## Development checklist

- [ ] Improve reconnect state.
- [ ] Show the user's own queued songs clearly.
- [ ] Add remove-own-song behavior.
- [ ] Add fast post-song voting.
- [ ] Add upcoming-turn indication.
- [ ] Keep the interface usable as a mobile web page without app installation.

---

# 12. BACK OFFICE / ADMIN. PRACTICAL SUPABASE CONTROL PLANE

## Product principle

The existing Back Office must be improved, not rebuilt.

It is a product-specific interface over Supabase for:

- song management;
- media references;
- lyric and timing synchronization;
- publication;
- existing admin account support;
- simple operational diagnostics.

It is not a generic SQL console and does not need enterprise complexity.

## 12.1 Existing architecture to preserve

- [x] Admin login through Supabase Auth
- [x] Admin access through the `admins` table and RLS
- [x] Direct authorized CRUD from the browser for normal content operations
- [x] Edge Function for secret-backed subtitle generation
- [x] No `service_role` key in frontend code

Do not move every content write to an Edge Function.

## 12.2 Admin navigation

Create a clear desktop-first Back Office structure:

1. Dashboard
2. Songs
3. Synchronization
4. Festa sessions
5. Admin accounts
6. Diagnostics
7. Settings

Keep the number of screens small.

## 12.3 Dashboard

Useful cards only:

- [ ] Current Monday song
- [ ] Next scheduled song, when scheduling exists
- [ ] Songs missing synchronization
- [ ] Songs with timing warnings
- [ ] Broken or missing YouTube links
- [ ] Recent Festa sessions
- [ ] Last subtitle-generation errors
- [ ] Quick actions: New song, Synchronize, Preview

No complex business or finance dashboard is required now.

## 12.4 Song management

### Current fields to preserve

- title;
- slug;
- description;
- release date;
- category / theme;
- cover image;
- YouTube URL;
- YouTube Music URL;
- lyrics;
- LRC content;
- difficulty.

### Fields to add when useful

- [ ] Audience: Adult / Family / Future Kids
- [ ] Karaoke mode suitability: Solo / Dueto / Festa
- [ ] Language-learning level
- [ ] Duration, only if reliable
- [ ] Status: Draft / Published / Archived
- [ ] Scheduled publication date and time, only if the current release process needs it
- [ ] Timing mode: line / word / hybrid
- [ ] Timing validation status

Do not add payment, entitlement or territory fields during the current phase.

## 12.5 Publication quality check

Before publishing, show a simple checklist:

- [ ] title exists;
- [ ] slug exists and is unique;
- [ ] cover image loads;
- [ ] YouTube video loads;
- [ ] lyrics exist;
- [ ] synchronization exists when Karaoke is enabled;
- [ ] timing data is valid;
- [ ] difficulty exists;
- [ ] audience exists;
- [ ] production preview opens.

Allow an admin override with a visible warning. Do not create a multi-person approval workflow.

## 12.6 Synchronization Studio

The detailed requirements are defined in Section 6.

Admin priorities:

1. autosave;
2. unsaved-change warning;
3. local recovery;
4. persistent versions;
5. rollback;
6. timing validation;
7. line / word / hybrid editor;
8. explicit singer assignment for duets;
9. loop selected segment;
10. production-player preview.

## 12.7 Admin accounts only

There is no public end-user account system in the current product.

The Back Office may manage the existing admin accounts only.

Minimal admin account functions:

- [ ] List current admin accounts.
- [ ] Show email and last sign-in when available.
- [ ] Send password reset email.
- [ ] Provide Change my password for the logged-in admin.
- [ ] Invite a new admin only when genuinely needed.
- [ ] Remove admin authorization with confirmation.

Security rules:

- never display the current password;
- never display password hashes;
- never display access or refresh tokens;
- use Supabase reset flows or a protected Edge Function for Auth admin actions;
- do not expose secret keys.

Public user list, public profile management, subscriptions and entitlement support are Frozen until public accounts exist.

## 12.8 Festa operations

Keep this simple:

- [ ] List recent sessions.
- [ ] Show session code, creation time, active status and queue size.
- [ ] Allow cleanup of an obviously stale session.
- [ ] Allow opening the queue for diagnosis.

Do not build a full live-operations command center.

## 12.9 Diagnostics

Useful operational checks:

- [ ] Last subtitle Edge Function success or error
- [ ] Push function error status if available
- [ ] Broken YouTube links
- [ ] Timing parse errors
- [ ] Current application version
- [ ] Current database migration version or last applied migration note

A separate staging environment is not required by this document.

## 12.10 Admin testing

- [ ] Login and logout
- [ ] Create song
- [ ] Edit song
- [ ] Save synchronization
- [ ] Recover synchronization draft
- [ ] Restore timing version
- [ ] Preview production player
- [ ] Publish / unpublish or Draft / Published behavior
- [ ] Password reset email for an admin account
- [ ] Unauthorized user cannot access admin routes or modify songs

---

# 13. LEARN PORTUGUESE

## Current status

- French and English translation toggle exists.
- Reduced playback speed exists.
- General song context exists.
- Structured learning exercises do not yet exist.

## Development direction

Keep this mode accessible without account or progress tracking.

### P1 features

- [ ] Add Spanish translation.
- [ ] Add optional line-by-line translation.
- [ ] Add key expressions for each song.
- [ ] Add simple meaning and cultural explanation.
- [ ] Add Repeat line.
- [ ] Add Listen then sing.
- [ ] Add vocabulary notes editable in Back Office.
- [ ] Add Beginner / Intermediate / Advanced classification.

### Future features

- saved learning progress;
- streaks;
- teacher accounts;
- school dashboard.

These require accounts and remain Frozen.

---

# 14. FAMILY AND KIDS

Family is a product positioning and future content mode. It does not currently require family accounts.

## Near-term family improvements

- [ ] Classify songs as Adult or Family.
- [ ] Create a Family filter.
- [ ] Create a family-friendly mode explanation.
- [ ] Add simple group challenges.
- [ ] Ensure adult songs do not appear in a future Kids view.

## Future Kids module

- dedicated child-safe catalogue;
- age groups;
- simpler interface;
- short repetitive songs;
- parental controls;
- child privacy review.

Do not build profiles, parental PIN or child accounts until the Kids catalogue and experience are approved.

---

# 15. MULTI-PLATFORM DIRECTION

## Shared core principle

Avoid creating separate product logic for each TV platform.

Share:

- song model;
- lyric parser and timing model;
- Karaoke player state;
- catalogue filters;
- queue model;
- Festa Realtime logic;
- analytics event names;
- microphone capability abstraction where practical.

Use small platform adapters for:

- remote keys and Back behavior;
- lifecycle;
- store packaging;
- supported microphone input;
- future payment integration.

## Android TV

Status: **In production**.

Priorities:

- [ ] Continue production-device testing.
- [ ] Fix real remote and player issues as they appear.
- [ ] Verify word-level highlighting on the production build.
- [ ] Test optional microphone inputs where available.
- [ ] Keep launcher and store assets updated.

## Fire TV

Status: **Future**.

Do not begin a full port until the current Android TV Karaoke, hybrid synchronization and Festa experience are stable.

Future checklist:

- audit Google service dependencies;
- reuse spatial navigation;
- map Fire remote buttons;
- do not depend on the Alexa voice button as raw audio;
- test low-memory Fire TV Stick devices;
- prepare Amazon Appstore packaging.

Amazon purchasing is not part of the first Fire TV port because monetization is Frozen.

## Samsung Tizen

Status: **Future**.

Future checklist:

- package the production web core for Tizen;
- register remote keys;
- verify YouTube player behavior and codecs;
- verify lifecycle and local storage;
- detect microphone capability;
- test on a real Samsung TV;
- prepare Seller Office package.

Samsung payment strategy is not part of the first Tizen proof of concept because monetization is Frozen.

---

# 16. ANALYTICS, RELIABILITY AND QA

## Analytics

GA4 event tracking already exists. Improve only the events that help product decisions.

### P0 events

- [ ] App opened
- [ ] Karaoke catalogue opened
- [ ] Song detail opened
- [ ] Play requested
- [ ] Audible playback started
- [ ] Time to first song
- [ ] Song completed
- [ ] Song abandoned
- [ ] Retry
- [ ] Next song started
- [ ] Player error
- [ ] Buffering timeout

### Festa events

- [ ] Festa created
- [ ] Participant joined
- [ ] Song added
- [ ] Reaction sent
- [ ] Vote completed
- [ ] Festa ended
- [ ] Number of completed songs

No payment events are required now.

## Crash and error visibility

- [ ] Add a lightweight crash or error reporting solution appropriate for React / Capacitor.
- [ ] Capture player failures without recording private audio.
- [ ] Include app version, platform and song ID.
- [ ] Do not build a complex observability platform.

## Release smoke tests

Create one repeatable test list:

1. Home loads.
2. D-pad navigation works.
3. Catalogue search works.
4. Song detail opens.
5. Karaoke starts.
6. Controls work.
7. Options open and close.
8. Lyrics advance.
9. End screen appears.
10. Queue advances.
11. Festa QR joins from at least two phones.
12. Reactions appear.
13. Back Office loads.
14. Song edit saves.
15. Synchronization edit saves and restores.

## Production-device verification

The Android TV app is already in production. Record tests on devices actually available rather than blocking development on a theoretical device matrix.

For each significant release, record:

- device;
- Android / Google TV version;
- screen resolution;
- app version;
- main flows tested;
- defects found.

---

# 17. SECURITY AND PRIVACY. MINIMUM NECESSARY PROTECTION

## Supabase

- [x] No frontend `service_role` key.
- [x] Normal admin operations use the public client and RLS.
- [ ] Add focused RLS tests for songs and admin access.
- [ ] Confirm Festa participant writes cannot alter unrelated sessions.
- [ ] Keep secret API keys only in Edge Functions.

## Festa

The product is designed for family and friends, not anonymous public rooms.

Minimum requirements:

- session code required to join;
- session must be active;
- participant identity stored invisibly;
- phone removes only its own queued item;
- TV owns destructive controls;
- no raw microphone audio stored;
- stale sessions can be cleaned up.

Short-lived tokens, approval systems and abuse moderation are Future unless real misuse appears.

## Admin

- admin route is protected;
- unauthorized users cannot modify songs;
- password reset uses Supabase Auth;
- current passwords and tokens are never visible;
- destructive content actions require confirmation.

## Music and YouTube

- Continue using the official YouTube player for referenced media.
- Do not silently download or extract unauthorized third-party media.
- Creator Studio rights workflows are Future.

---

# 18. FROZEN FUTURE SCOPE

The following sections remain part of the long-term product vision but must not be implemented until explicitly reactivated by the product owner.

## Public accounts

Frozen:

- registration;
- email login;
- Google login;
- profiles;
- family accounts;
- cross-device favorites;
- account deletion workflow;
- public user administration.

Local device storage may be used for preferences, favorites and history without registration.

## Monetization

Frozen:

- paywall;
- Premium;
- Family subscription;
- Festa Pass;
- Google Play Billing;
- web checkout;
- Amazon purchasing;
- Samsung purchasing;
- entitlement service;
- Creator credits.

### Reactivation gate

Monetization may be reconsidered only when:

- [ ] Karaoke player is reliable.
- [ ] Phrase and optional word synchronization work.
- [ ] At least five word-timed pilot songs are validated.
- [ ] Festa is simple and fun.
- [ ] Mic-free gamification and recap work.
- [ ] Back Office supports safe publishing and timing recovery.
- [ ] Android TV production feedback is stable.
- [ ] Core analytics measure usage and completion.

## Creator Studio

Future concept:

- upload a user-owned song;
- provide lyrics;
- create an initial karaoke version;
- correct timing;
- keep private or share with Festa.

Do not start Creator Studio during the current product-quality roadmap.

---

# 19. STEP-BY-STEP ROADMAP

## Phase 0. Completed reality audit

Outcome: understand what already exists.

Status: substantially completed by the Claude Code audit.

Actions:

- [x] Audit main repository and Supabase migrations.
- [x] Identify mature Karaoke and Festa components.
- [x] Identify missing synchronization autosave and versions.
- [x] Confirm no paywall or public accounts exist.
- [x] Confirm Android TV is now in production based on product-owner information.

## Phase 1. Synchronization reliability

Outcome: editing work cannot be lost.

Order:

1. [ ] Add unsaved-change state.
2. [ ] Add `beforeunload` and route-leave warning.
3. [ ] Add periodic draft autosave.
4. [ ] Add local recovery.
5. [ ] Add persisted timing versions.
6. [ ] Add version restore.
7. [ ] Add timing validation.
8. [ ] Add loop selected line.

Exit gate:

- refresh does not destroy work;
- previous timing can be restored;
- malformed timing is clearly reported.

## Phase 2. Hybrid phrase and word synchronization

Outcome: optional word-by-word Karaoke without breaking current songs.

Order:

1. [ ] Audit parser and storage compatibility.
2. [ ] Define `line`, `word` and `hybrid` model.
3. [ ] Add backward-compatible storage.
4. [ ] Add automatic word distribution.
5. [ ] Add tap-per-word capture mode.
6. [ ] Add drag and resize word blocks.
7. [ ] Add production renderer support.
8. [ ] Validate five pilot songs.
9. [ ] Verify Android TV production build.

Exit gate:

- current LRC songs are unchanged;
- hybrid song renders correctly;
- five pilot songs pass manual review.

## Phase 3. Player hardening

Outcome: the live product recovers gracefully.

Order:

1. [ ] Invalid YouTube source state.
2. [ ] Buffering timeout and retry.
3. [ ] Network-loss recovery.
4. [ ] App background and resume.
5. [ ] Audio focus verification.
6. [ ] Dedicated end-of-song screen.
7. [ ] Next-song transition verification.

## Phase 4. Family Festa and mic-free gamification

Outcome: a family can run a complete fun session without account or microphone.

Order:

1. [ ] Verify participant identity and remove-own-song behavior.
2. [ ] Keep destructive controls on TV.
3. [ ] Add upcoming turn.
4. [ ] Add post-song voting.
5. [ ] Add simple challenges.
6. [ ] Add mic-free score.
7. [ ] Add final recap.
8. [ ] Test with TV plus at least three phones.

## Phase 5. Back Office improvements

Outcome: weekly content publication is safe and efficient.

Order:

1. [ ] Dashboard with useful content alerts.
2. [ ] Audience and mode classification.
3. [ ] Draft / Published / Archived states.
4. [ ] Pre-publication quality checklist.
5. [ ] Monday scheduling only if needed operationally.
6. [ ] Admin account list and password reset.
7. [ ] Recent Festa session view.
8. [ ] Diagnostics for subtitle and media errors.

## Phase 6. Learn Portuguese and Family content

Outcome: new reasons to use the free product.

Order:

1. [ ] Spanish translation.
2. [ ] Key expressions.
3. [ ] Cultural notes.
4. [ ] Repeat line.
5. [ ] Listen then sing.
6. [ ] Beginner / Intermediate / Advanced classification.
7. [ ] Adult / Family classification.
8. [ ] First dedicated family content collection.

## Phase 7. Platform expansion

Outcome: validate another TV ecosystem after the current product is stable.

Possible sequence:

1. Fire TV technical audit and proof of concept.
2. Fire TV production port.
3. Samsung Tizen proof of concept.
4. Samsung Tizen production work.

No payment integration in the first port.

## Phase 8. Future business features

Only after explicit product-owner decision:

- public accounts;
- monetization;
- paywall;
- subscriptions;
- Creator Studio;
- advanced vocal scoring.

---

# 20. CURRENT DEVELOPMENT PRIORITY CHECKLIST

Use this as the immediate queue for Claude Code or Codex.

## Theme A. Synchronization safety

- [ ] SYNC-01 Autosave
- [ ] SYNC-02 Unsaved indicator
- [ ] SYNC-03 Navigation warning
- [ ] SYNC-04 Draft recovery
- [ ] SYNC-05 Version history
- [ ] SYNC-06 Rollback
- [ ] SYNC-07 Validation panel
- [ ] WORD-05 Loop selected line

## Theme B. Word timing pilot

- [ ] WORD-01 Expand line into words
- [ ] WORD-02 Auto distribute
- [ ] WORD-03 Tap capture
- [ ] WORD-04 Drag and resize
- [ ] WORD-06 Production preview
- [ ] WORD-07 Revert to phrase
- [ ] WORD-08 Hybrid song support
- [ ] Five pilot songs

## Theme C. Player reliability

- [ ] Invalid source recovery
- [ ] Buffering recovery
- [ ] Offline recovery
- [ ] Resume behavior
- [ ] End screen
- [ ] Next-song reliability

## Theme D. Festa family game

- [ ] Own-song removal
- [ ] TV-only destructive controls
- [ ] Upcoming turn
- [ ] Voting
- [ ] Challenges
- [ ] Mic-free score
- [ ] Final recap
- [ ] Three-phone test

## Theme E. Back Office

- [ ] Practical dashboard
- [ ] Song audience and mode fields
- [ ] Draft / Published / Archived
- [ ] Publication quality checklist
- [ ] Admin account reset flow
- [ ] Festa recent-session view
- [ ] Diagnostics

## Frozen. Do not start

- [ ] Public registration
- [ ] Public login
- [ ] Paywall
- [ ] Billing
- [ ] Entitlements
- [ ] Subscriptions
- [ ] Creator Studio
- [ ] Phone microphone streaming

---

# 21. MASTER PROMPT FOR CLAUDE CODE OR CODEX

Attach this document and any relevant screenshots. Use the following prompt.

```text
You are the lead product engineer for A Música da Segunda.

This attached document is the current product and development reference. It supersedes older checklists when they conflict.

IMPORTANT CURRENT PRODUCT DECISIONS

1. Keep the current Supabase architecture simple.
   - Do not create a new application server.
   - Do not move normal song CRUD or synchronization writes behind Edge Functions when RLS already protects them.
   - Do not create a staging Supabase project unless the product owner explicitly requests it.
   - Never expose a service_role key or secret in frontend code.

2. Keep the public product free and frictionless during the current phases.
   - Do not implement public registration.
   - Do not implement public login or profiles.
   - Do not implement a paywall, subscriptions, billing, entitlements or Festa Pass.
   - Do not scaffold monetization unless explicitly requested later.

3. Android TV is already in production.
   - Treat it as a live product.
   - Preserve production-compatible behavior.
   - Verify relevant changes with the Android build and real-device steps when available.

4. Festa is a simple family and friends experience.
   - QR code or short code plus nickname only.
   - No mandatory account, password, participant approval or complex security flow.
   - Prevent accidental destructive actions with simple invisible ownership rules.
   - Keep skip, clear and session-ending controls on the TV.

5. Preserve the current line-level lyric synchronization.
   - Add optional word-level and hybrid timing.
   - Existing songs must continue to work without migration.
   - Do not rebuild the removed Whisper alignment pipeline during this phase.

WORKING METHOD

1. Audit only the selected theme before code changes. A complete repository audit has already been performed.
2. Report what already exists, exact files inspected, gaps and proposed smallest complete slice.
3. Preserve working behavior and visual identity.
4. Implement one theme at a time.
5. Add or update tests.
6. Run lint, tests, build and relevant Android sync/build steps.
7. Provide manual verification steps.
8. Update the checklist evidence and status only after end-to-end validation.

CURRENT PRIORITY ORDER

A. Synchronization safety
- autosave;
- unsaved-change warning;
- local recovery;
- persistent versions;
- rollback;
- timing validation;
- selected-line loop.

B. Hybrid phrase and word timing
- line, word and hybrid modes;
- backward-compatible storage;
- deterministic word distribution;
- tap-per-word capture;
- drag and resize word blocks;
- production-player preview;
- revert line to phrase timing;
- five pilot songs.

C. Player reliability
- buffering, invalid source and network recovery;
- resume behavior;
- end-of-song screen;
- next-song transition.

D. Family Festa
- own-song removal;
- TV-only destructive controls;
- upcoming turn;
- votes, challenges, mic-free scoring and recap;
- test with at least three phones.

E. Back Office
- practical dashboard;
- song audience and mode fields;
- Draft, Published and Archived states;
- publication quality checks;
- existing admin-account password reset;
- recent Festa sessions;
- simple diagnostics.

LYRIC TIMING RULES

- Keep lrc_content as the current compatibility format.
- Inspect the current parser before defining the final migration.
- Support timing modes line, word and hybrid.
- Use word timestamps where present.
- Fall back to the current phrase wipe where absent.
- The admin must never edit raw JSON for normal timing work.
- Word timing must be optional per line.
- Automatic distribution is a starting proposal and always remains manually editable.
- Add autosave and versioning before asking the product owner to perform significant word-timing work.

PRODUCT RULES

- The TV is the stage.
- The phone is optional.
- Karaoke works without account, phone or microphone.
- Festa works without account and remains family-simple.
- Microphone scoring is optional and labeled as energy, not professional vocal accuracy.
- Every TV screen must work with D-pad and Back.
- Do not download or extract unauthorized third-party YouTube media.

REQUIRED OUTPUT FOR EACH IMPLEMENTED SLICE

- What existed before;
- gaps found;
- files changed;
- database migration, if any;
- tests run and results;
- Android build or sync result when relevant;
- manual verification steps;
- known limitations;
- next checklist IDs.

Begin with the first selected checklist theme. Do not start any Frozen feature.
```

---

# 22. OFFICIAL TECHNICAL REFERENCES

These links are reference material. Use current platform documentation when implementing a platform-specific feature.

- [Android TV hardware features and optional microphone handling](https://developer.android.com/training/tv/get-started/hardware)
- [Android MediaRecorder audio capture overview](https://developer.android.com/media/platform/mediarecorder)
- [Android permission guidance for microphone access](https://developer.android.com/training/permissions/explaining-access)
- [Supabase password reset flow](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail)
- [Supabase Auth user management](https://supabase.com/docs/guides/auth/managing-user-data)
- [Supabase Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security)
- [Supabase data security](https://supabase.com/docs/guides/database/secure-data)
- [Amazon Fire TV remote input](https://developer.amazon.com/docs/fire-tv/remote-input.html)
- [Amazon Fire TV microphone-button behavior](https://developer.amazon.com/docs/fire-tv/faq-general.html)
- [Samsung Smart TV Microphone API](https://developer.samsung.com/smarttv/develop/api-references/samsung-product-api-references/microphone-api.html)
- [Samsung SystemInfo capability detection](https://developer.samsung.com/smarttv/develop/api-references/tizen-web-device-api-references/systeminfo-api/getting-device-capabilities-using-systeminfo-api.html)

---

> **Final definition of done**
>
> A feature is complete only when it works end to end, preserves the simple product experience, passes the relevant tests and can be verified in the production-compatible build.
>
> More architecture is not automatically better. More features are not automatically better. The objective is a delightful, reliable family Karaoke product.
