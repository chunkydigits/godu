# Field feedback — additions from real use

Captured 2026-08-13 after using the Phase 1 timed workout demo on a phone.

These are **spec additions**. Implementation timing is noted in `mvp-build-spec.md` and summarised below.

---

## 1. Keep screen awake during active playback (near-term)

**Problem:** During a timed workout the device screen locked / dimmed unless touched roughly every 20 seconds, interrupting the session.

**Requirement:** While a Steps session is **actively playing** (phase `playing`), the app must request a screen wake lock so the display does not sleep. Release the lock on pause, completion, navigation away, or tab backgrounding as appropriate.

**Technical direction (web-first):**

- Prefer the [Screen Wake Lock API](https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API) in supporting browsers (Chrome / many Android; Safari support varies by version).
- When Capacitor native shells ship later, pair with a keep-awake plugin for iOS/Android WebViews if the web API is insufficient.
- Fail soft: if wake lock is unavailable or denied, playback continues; do not block Start.

**Acceptance:** Start a multi-minute timed Steps session on phone; without touching the screen, the display stays on until pause/complete (on platforms that support wake lock).

---

## 2. Optional “video off” / audio-or-guidance-only mode (MVP playback preference)

**Problem:** After repeating the same routine, the user already knows the movements; the video becomes visual noise. They still need step names, descriptions, and timings.

**Requirement:** A per-session (and preferably remembered) configuration to **hide / disable the video surface** while keeping:

- step title, description, order
- activity timer / untimed controls
- previous / next / step navigator
- pause / resume / completion

**Product notes:**

- Likely more valuable for **personal / returning users** than for first-time creator discovery (creators may prefer video on by default for public Steps).
- Default for public first visit: **video on**.
- Default for returning personal use: may remember last preference (local storage initially; user setting later).
- When video is off: do not require TikTok embed to run; timers and step UX must work standalone. Optional: still allow “show video” toggle mid-session.

**Suggested config name (UI):** “Show video” on/off (or “Video guidance”).

---

## 3. Future integrations (explicit backlog — not MVP)

Document only; do **not** design architecture around these yet:

| Integration | Intent (high level) |
| --- | --- |
| **Amazon Alexa** | Hands-free step announcements / next-step / timer cues during workouts or cooking |
| **Apple Watch** | Glanceable step name + countdown; haptics on step change / complete; start/pause from wrist |

Place under post-MVP / platform expansions. Revisit after core web MVP and creator publishing are stable.

---

## 4. Related Steps from the same creator (creator traffic)

**Opportunity:** After (or alongside) viewing one public Steps item, surface a small set of **other published Steps from the same verified creator / linked platform account**.

**Goals:**

- Help users continue with more content from a creator they already trust
- Give creators discovery / traffic across their catalogue

**Behaviour (when built):**

- Show on completion panel and/or below the viewer (“More from @{username}”)
- Only **Published + Public** items
- Exclude the current `StepsItem`
- Limit to a small number (e.g. 2–4) for MVP polish
- Link to canonical public URLs `/{provider}/{username}/{slug}`

**Depends on:** persistence + public creator catalogue (Phase 8+). Can stub in Phase 1 demos with hard-coded related IDs if useful for UX spike.

---

## 5. Continuous soundtrack — known limitation (nice-to-have polish)

**Status:** Spec’d and partially implemented; **video stability is deferred**. Not a blocker for MVP.

**What works today:** With `continuousSoundtrack`, audio from the full-video soundtrack plays smoothly without the jump/cut that comes from looping step segments with sound.

**Problem (observed 2026-08-13):** The **visual** clip player is slow to get going and then **skips / jumps** heavily while the soundtrack runs. Reproduced on:

- iPhone 15 (Safari)
- Desktop Cursor browser

Likely cause: dual TikTok embeds (muted visual seek/loop + separate soundtrack embed) fighting for decode/bandwidth, plus aggressive segment seek/loop on the visual player.

**Product stance:**

- Keep `continuousSoundtrack` as a creator option in the domain/spec
- Runtime gated by `environment.features.continuousSoundtrack` — **false** in development and production until polished
- Treat smooth dual-embed visual sync as a **nice-to-have** — revisit later if time allows
- Acceptable interim: feature code remains; flag off so users get normal single-embed playback
- Do not prioritise over core create/library/auth/publish work

**Later investigation ideas (not committed):**

- Softer visual loop (less frequent seeks; tolerate drift)
- Single-embed strategies if TikTok APIs allow
- Pause visual when off-screen / lower visual quality
- Platform-specific fallbacks (e.g. soundtrack-only when dual embed is unstable)
