# Godu MVP — Locked Decisions

Status: agreed 2026-08-13; product naming and Phase 3–4 auth/data updated 2026-08-14.  
Supersedes conflicting guidance in `initial specification.md` where noted.  
Where this file and the API/UI ROEs conflict on identity, **this file wins**. Where this file and the initial repo layout conflict, **API ROE wins**.

---

## 0. Product naming

| Layer | Name |
| --- | --- |
| Commercial product | **Godu** |
| Auth0 tenant domain | **`godu.uk.auth0.com`** |
| .NET solution / projects | `Godu.sln`, `Godu.Api`, `Godu.Service`, `Godu.Repository`, `Godu.Model`, `Godu.Utility` |
| Domain model terms | Keep feature names (`StepsItem`, `StepDefinition`, etc.) — instructional-step concept, not brand |
| Frontend folder | `steps-app` path for now; surface **Godu** in titles / UI copy |

---

## 1. Playback (TikTok)

| Decision | Choice |
| --- | --- |
| Player | Official TikTok Embed Player (`https://www.tiktok.com/player/v1/{videoId}`) |
| Control API | `postMessage` host ↔ iframe (`play`, `pause`, `seekTo`, `onCurrentTime`, `onStateChange`, etc.) |
| Abstraction | All TikTok details stay behind `VideoPlayer` / `TikTokVideoPlayer` |

Phase 1 hard-coded demo videos:

| Purpose | URL | Video ID |
| --- | --- | --- |
| Fitness (timed steps) | https://www.tiktok.com/@mydisciplinedrive/video/7668570367119691030 | `7668570367119691030` |
| Recipe (untimed steps) | https://www.tiktok.com/@lagomchef/video/7667587928620600609 | `7667587928620600609` |

Exact step timestamps for the spike may be chosen during Phase 1 implementation; each demo must include at least one timed and one untimed step across the spike (not necessarily both on the same video).

---

## 2. Frontend stack

| Decision | Choice |
| --- | --- |
| Framework | Latest stable Angular at project creation (currently Angular 22.x) |
| Components | Standalone only |
| SSR | Not required for MVP |
| UI library | Angular Material (UI ROE) |
| Layout | All pages use `page-template` (UI ROE) |
| State | No NgRx unless later requested |
| Visual direction | Minimalist, **dark palette** (video-app convention) |
| Primary delivery | **Web app** (mobile Safari / Chrome). Capacitor prepared so native shell can follow; no Apple Developer requirement for MVP |

---

## 3. Backend stack & project layout

| Decision | Choice |
| --- | --- |
| API | ASP.NET Core Web API (C#) |
| Project layout | **API ROE wins**: `Godu.Api`, `Godu.Service`, `Godu.Repository`, `Godu.Model`, `Godu.Utility` |
| Do not use | Initial-spec names `Steps.Domain` / `Steps.Infrastructure` / `Steps.Contracts` as primary layout |
| Database (now) | **Cosmos DB Emulator** locally (or in-memory repos when `Cosmos:UseInMemory=true`) |
| Database (later) | Azure Cosmos DB account when deploying to cloud |
| Auth broker | **Auth0** at `godu.uk.auth0.com` (API audience e.g. `https://api.godu.uk`) |
| Hosting / CORS (now) | Local `dotnet run` + `ng serve`; CORS allow `http://localhost:4200` |
| Hosting (later) | App Service / Container Apps / Static Web Apps (or similar); Key Vault for secrets |

Identity rule (overrides generic API ROE “Auth0 user ID in product data”):

```text
JWT sub → ExternalIdentity → internal UserId (usr_…)
```

Product documents store only the internal Godu `UserId` (e.g. `usr_…`). Auth0 IDs must not appear as domain foreign keys.

---

## 4. Domain IDs

| Decision | Choice |
| --- | --- |
| Style | Prefixed IDs, ULID-style suffix (e.g. `usr_01K27…`, `steps_…`, `step_…`, `platform_…`, `creator_…`) |
| Generation | Server-generated for persisted entities |

---

## 5. Public slugs

| Decision | Choice |
| --- | --- |
| Allowed characters | Letters, numbers, dots (`.`), dashes (`-`), underscores (`_`) |
| Uniqueness | Unique per linked platform account (same creator can reuse a slug only after archive/delete of the prior item — exact collision error: `409`) |
| Case | Store and compare case-insensitively; canonical form lowercase |

---

## 6. Personal Steps lifecycle

| Decision | Choice |
| --- | --- |
| Remove from library | **Archive** (`status = Archived`), not hard delete |
| API | Prefer archive endpoint / status transition; hard `DELETE` may map to archive for MVP |
| Listing | Default “My Steps” excludes archived; optional later “show archived” |

---

## 7. Creator vs LinkedPlatformAccount (clarification)

Two different concepts:

| Concept | Answers | Required to publish public Steps? |
| --- | --- | --- |
| `LinkedPlatformAccount` | “Which TikTok/YouTube/… account did this user prove they control?” | **Yes** — verified ownership of the account that owns the source video |
| `Creator` | Steps-side public profile (display name, bio, image) | **Not as a separate manual setup step** |

**Locked recommendation (confirm if you disagree):**

- Publishing requires a **verified** `LinkedPlatformAccount` whose `externalAccountId` owns the source video.
- On first successful publish, if no `Creator` exists for that user, **lazily create** one (display name from linked account / user).
- Users do not fill a separate “become a creator” form before publishing.

---

## 8. Platform ownership verification (TikTok) — best practice

Do **not** trust client-supplied “I own this account”.

MVP approach for TikTok `LinkedPlatformAccount`:

1. User starts **TikTok Login Kit / OAuth** (platform connect — separate from Auth0 login).
2. Backend exchanges code for tokens; stores tokens securely (Key Vault / encrypted secrets — not in source).
3. Backend calls TikTok Display API `user.info` → stable `open_id` becomes `externalAccountId`; username/display metadata stored as mutable aliases.
4. Mark `isVerified = true` only after successful OAuth + profile fetch.
5. On publish: backend verifies the source `externalVideoId` belongs to that account via Display API `video.query` / `video.list` using the stored token. Reject if not owned.

Scopes (minimum intent): `user.info.basic`, `user.info.profile`, `video.list` (exact scope names as approved in the TikTok developer app).

Auth0 remains **login only**. TikTok OAuth is **creator account linking only**.

---

## 9. Playback completion UX

When the **final** step finishes (timed step reaches zero, or user completes the last step):

| Decision | Choice |
| --- | --- |
| Behaviour | **Stop** playback and timer |
| UI | Show a **completion page / panel** summarising what just ran |
| Actions | Links/buttons: Home, Back to this Steps experience (restart), and any other light navigation agreed in UI |

Pause: pause **both** video segment playback and activity timer together; resume restores both.

---

## 9a. Screen wake lock (field feedback)

| Decision | Choice |
| --- | --- |
| While phase is `playing` | Hold a screen wake lock so the device does not sleep mid-session |
| On pause / complete / leave | Release wake lock |
| Unsupported browsers | Fail soft — do not block playback |
| Detail | See `field-feedback.md` §1 |

---

## 9b. Video visibility preference (field feedback)

| Decision | Choice |
| --- | --- |
| Config | User can turn **video off** and still run steps (titles, descriptions, timers, navigation) |
| Public first visit default | Video **on** |
| Returning / personal use | May remember last preference |
| Creators | Video-on remains the default showcase path; off is an audience convenience |
| Detail | See `field-feedback.md` §2 |

---

## 9b2. Continuous soundtrack (creator config)

| Decision | Choice |
| --- | --- |
| Field | `StepsItem.continuousSoundtrack` (boolean, creator-set) |
| Meaning | Soundtrack does **not** belong to individual step clips |
| Timed steps | Visual clips play **muted** and loop per step; a separate full-video soundtrack plays (and loops) with audio |
| Untimed steps | **Not affected** — normal segment audio on the visual player; soundtrack paused |
| User mute | Mutes soundtrack (and any unmuted visual audio) |
| Priority | **Nice-to-have / deferred.** Gated by `environment.features.continuousSoundtrack` (false in development and production). Audio continuity worked; visual dual-embed was jumpy. See `field-feedback.md` §5 |

---

## 9b3. Completion chrome

| Decision | Choice |
| --- | --- |
| Video | Hidden on completion |
| Actions | Icon-only: Home (house), Replay, Open original (platform mark — leaving Steps) |

---

## 9c. Related creator Steps (field feedback)

| Decision | Choice |
| --- | --- |
| Surface | Completion / viewer: “More from this creator” |
| Content | Other Published+Public Steps for the same linked platform account |
| Purpose | Creator traffic + continued user sessions |
| Detail | See `field-feedback.md` §4 |

---

## 9d. Future device integrations (backlog only)

Noted for later — **not** MVP:

- Amazon Alexa (hands-free step / timer cues)
- Apple Watch (glanceable step + countdown / haptics)

See `field-feedback.md` §3.

---

## 10. Testing

| Decision | Choice |
| --- | --- |
| Gherkin | Not required |
| Required | Unit tests around **core business logic** (domain validation, ownership rules, playback service behaviour where testable without TikTok) |
| Also required | Security tests listed in initial spec §64; playback behaviour tests §65 |

---

## 11. Scope emphasis

| In MVP focus | Out / deferred |
| --- | --- |
| Functionality in initial spec as a **web app** | Native App Store shipping, Apple certs |
| Capacitor project wired so conversion later is easy | Deep iOS packaging work before web playback is proven |
| TikTok only | YouTube / Instagram / Vimeo playback |
| Manual step creation | AI step detection |
| Archive | Hard delete of content |
| Dark minimal UI | Heavy branding / multi-theme |
| Wake lock + optional video-off | Alexa, Apple Watch |

---

## 12. Explicit ROE overrides for this product

1. **API project names** follow API ROE (`Service` / `Repository` / `Model` / `Utility`), not the initial spec’s `Domain` / `Infrastructure` / `Contracts`.
2. **UI ROE** applies fully (Material, `page-template`, folder layout, no timing hacks).
3. **Identity**: Godu `ExternalIdentity` → internal `UserId` overrides any generic ROE wording that stores Auth0 IDs on product documents.
4. **Product name**: Commercial brand is **Godu**; domain models keep Steps* feature names.
4. Initial specification remains the narrative source for product rules not restated here.
5. Field feedback in `field-feedback.md` extends product requirements; conflict order unchanged (`decisions.md` still wins).
