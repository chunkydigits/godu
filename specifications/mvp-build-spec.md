# Godu MVP — Build Specification

Companion to:

- `initial specification.md` — product/architecture narrative
- `decisions.md` — locked choices (wins on conflicts)
- `../rulesets/UI_ROE.md` / `../rulesets/API_ROE.md`

This document is the **implementation contract**: what to build, in what order, with acceptance focus.

---

## 0. Goal

Prove that instructional videos (starting with TikTok) can become interactive step experiences in a mobile-first **web** app, then grow into personal libraries and verified creator publishing — without over-engineering.

Commercial product name: **Godu**. Keep feature domain names (`StepsItem`, etc.) in models/code; brand the UI and solution as Godu. Auth0 tenant: **`godu.uk.auth0.com`**.

---

## 1. Architecture summary

```text
Angular (latest stable, standalone) + Angular Material + Capacitor (web-first)
        ↓
ASP.NET Core modular monolith (Api / Service / Repository / Model / Utility)
        ↓
Cosmos DB Emulator (local now) / Azure Cosmos later + Auth0 (godu.uk.auth0.com)
```

Core equation:

```text
Video + Structured Steps + Playback Behaviour = Steps Experience
```

TikTok is the first `VideoProvider` only.

---

## 2. Solution layout (ROE)

```text
Godu/
├── src/
│   ├── backend/
│   │   ├── Godu.Api/
│   │   ├── Godu.Service/
│   │   ├── Godu.Repository/
│   │   ├── Godu.Model/
│   │   └── Godu.Utility/
│   └── frontend/
│       └── steps-app/          # Angular + Capacitor (folder name kept for now)
├── tests/
│   ├── Godu.Service.Tests/     # primary business-logic tests
│   └── Godu.Api.Tests/         # optional integration
├── specifications/
├── rulesets/
├── docs/
└── Godu.sln
```

Frontend folder layout follows UI ROE (`modules/`, `core/`, `page-template`, Material module surface).

---

## 3. Domain (reference)

Entities and rules as in initial spec §§7–33, with decisions.md overrides:

| Topic | Rule |
| --- | --- |
| Visibility | `Private` \| `Public` \| `Unlisted` (Unlisted unused in MVP) |
| Status | `Draft` \| `Published` \| `Archived` |
| Personal remove | Archive |
| Public publish | Verified `LinkedPlatformAccount` + video ownership check server-side |
| Creator | Lazy-create on first publish |
| Slugs | `[A-Za-z0-9._-]+`, unique per linked account, stored lowercase |
| IDs | Prefixed ULID-style, server-generated |
| Steps embed | `StepDefinition[]` inside `StepsItem` document — no per-step Cosmos docs |

---

## 4. Frontend playback contracts

### 4.1 `VideoPlayer`

```typescript
export interface VideoPlayer {
  initialise(): Promise<void>;
  play(): Promise<void>;
  pause(): Promise<void>;
  seek(seconds: number): Promise<void>;
  getCurrentTime(): Promise<number>;
  destroy(): Promise<void>;
}
```

### 4.2 TikTok implementation

- Embed URL: `https://www.tiktok.com/player/v1/{externalVideoId}`
- Drive seek/play/pause/time via official embed `postMessage` protocol
- Isolate in `modules/.../video/providers/tiktok/`

### 4.3 `StepPlaybackService`

Owns: current item, selected step, next/previous/select, segment loop, activity timer, pause/resume, auto-advance, completion transition.

Must **not** live in page components.

Loop rule: when `currentTime >= endSeconds`, seek to `startSeconds` (no equality reliance).

### 4.4 Completion

On final-step completion: stop video + timer → completion view with summary + Home / replay this Steps / related light links.

Pause pauses video **and** timer together.

### 4.5 Screen wake lock

While `phase === 'playing'`, request a screen wake lock (Screen Wake Lock API; Capacitor keep-awake later if needed). Release on pause, completion, destroy, or page leave. Fail soft if unsupported.

### 4.6 Video visibility

Support a viewer preference to hide the video surface while keeping step metadata, timers, and navigation fully usable. Public default: video on. See `field-feedback.md` §2.

### 4.7 Related creator Steps

When catalogue data exists, surface a small “More from this creator” list (Published + Public, same linked account, exclude current). Prefer completion panel and/or under viewer. See `field-feedback.md` §4.

---

## 5. UI

- Mobile-first, iPhone portrait as primary viewport target in browser
- Dark, minimalist Material theme
- Large touch targets, safe-area aware
- Viewer chrome roughly as initial spec §37
- All pages via `page-template`

Public route shape (later phases):

```text
/{providerAlias}/{platformUsername}/{stepsSlug}
```

Private:

```text
/my/steps/{id}
```

---

## 6. API surface (later phases)

As initial spec §§56–59, under ROE controller/service/repository rules:

- `GET /api/public/{providerAlias}/{username}/{slug}`
- `/api/me/steps` CRUD/archive
- `/api/me/platform-accounts` connect/list/disconnect
- `/api/creator/steps` + publish/archive

Errors: ProblemDetails. Ownership always from `ICurrentUser` / resolved internal id — never from client-supplied userId.

---

## 7. Phased delivery

### Phase 1 — Playback spike (start here)

Build:

- Angular app (latest stable, standalone)
- Capacitor present but **web browser** is the acceptance path
- Material + dark theme + `page-template`
- `VideoPlayer` + `TikTokVideoPlayer`
- Hard-coded `StepsItem`(s) using demo TikTok IDs from `decisions.md`
- Mobile viewer: select / previous / next / segment loop / timed + untimed behaviour / completion view
- Explicit **Start Steps** (no auto-start); video + timers begin together on user gesture
- Unit tests for `StepPlaybackService` / step validation logic where pure

Phase 1 scope excluded Auth0 / Cosmos / ASP.NET (those land in Phases 3–4).

**Exit criteria:** Acceptable playback + step UX in desktop Chrome and mobile Safari (iPhone). Capacitor WebView nice-to-have same session, not a blocker if browser works.

### Phase 1b — Playback field fixes (from real use)

Priority follow-ups before deepening product features:

- **Screen wake lock** while playing (`field-feedback.md` §1)
- **Video on/off** viewer preference so timers + step text work without the embed (`field-feedback.md` §2)
- Optional: hard-coded “More from this creator” stubs on demo completion to prove the UX (full data in Phase 8)

**Deferred nice-to-have:** smooth `continuousSoundtrack` **visual** playback (dual TikTok embed currently jumpy/slow; audio side is acceptable). See `field-feedback.md` §5 — revisit only if schedule allows.

### Phase 2 — Browser validation polish

Fix Safari / mobile quirks for embed seek/loop/timer/wake-lock. Do not deepen product features until this is solid.

### Phase 3 — Backend & persistence

ASP.NET `Godu.*` solution per ROE; local Cosmos emulator (or in-memory Development fallback) with `Users` / `ExternalIdentities` / `StepsItems`; public read stub + private CRUD/archive (`/api/me/steps`).

### Phase 4 — Auth0 & internal identity

JWT validation against `godu.uk.auth0.com` → `ExternalIdentity` → `User` provisioning → `ICurrentUser`. Angular Auth0 SPA SDK + Bearer interceptor; thin authenticated My Steps list.

Azure cloud Cosmos / Key Vault / hosting remain deferred until deploy.

### Phase 5 — Personal library

My Steps list/open/create/edit/archive/start. Persist video on/off preference when accounts exist (local preference acceptable until then).

### Phase 6 — Personal editor

Paste TikTok URL → load → define steps → timestamps → optional duration → preview → save (private).

### Phase 7 — Linked platform accounts

TikTok OAuth connect + verify + settings UI (sign-in methods vs creator accounts clearly split).

### Phase 8 — Creator publishing

Lazy Creator; publish only if verified account owns video; public URLs; creator dashboard; **related Steps from same creator** on public viewer/completion (`field-feedback.md` §4).

### Phase 8b — Product metrics (after Phase 8)

First-party Early Access analytics. Contract: [`product-metrics.md`](./product-metrics.md).

Do **not** start this until Phase 8 public publishing works — share, public-view, and `godu_published` funnels depend on it.

P0 (event model, anonymous/session IDs, central Angular service, ingest API, core create/consume events, user association, environment/internal flags, summary API) is required before Early Access. P1 dashboard and funnels are strongly recommended. P2 (cohorts, geo, BI, rollups, revenue) stays later.

Events must never block playback, navigation, or saves. No paid analytics vendor for this phase.

### Phase 9 — Additional Auth0 social connections

Apple / Google / Microsoft / Facebook via Auth0 config as needed.

### Phase 10 — UX refinement

Loading states, error states, PWA, sharing UI. Analytics implementation lives in Phase 8b, not here.

### Post-MVP — Device integrations (noted only)

- Amazon Alexa
- Apple Watch

See `field-feedback.md` §3. No implementation in MVP phases.

---

## 8. Testing requirements

No Gherkin.

Must maintain automated tests for:

- Step definition validation (order, timestamps, duration)
- Ownership / publish rules (when backend exists)
- Playback service: select, next, previous, loop boundary, timer auto-advance, final completion transition, pause/resume coupling
- Security cases in initial spec §64 (API level)

---

## 9. Explicit non-goals (MVP)

Per initial spec §67, plus:

- App Store / TestFlight as a delivery requirement
- SSR
- YouTube / Instagram / Vimeo implementations
- AI step generation
- Billing, social feed, comments, offline source video
- Amazon Alexa integration
- Apple Watch integration

---

## 10. First implementation task

Phase 1 playback spike is complete enough for real timed workouts.

**Next:** Phase **1b** field fixes — wake lock + video on/off preference (see `field-feedback.md`), unless product work is prioritised differently.
