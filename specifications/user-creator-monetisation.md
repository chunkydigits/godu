# Godu — User, Creator and Monetisation Specification

**Status:** agreed 2026-08-24. Product rules in this file are locked. Stripe/payment integration remains out of scope until a convertible creator base is proven.

Companion to:

- `decisions.md` — identity, TikTok verify, lazy `Creator` profile
- `mvp-build-spec.md` — phased delivery (this work is **after** MVP phases 1–10)
- `product-metrics.md` — Early Access analytics catalogue
- `initial specification.md` — original “no billing in MVP” narrative (this file wins on commercial model)

**Conflict order:** `decisions.md` still wins on identity, playback, and TikTok ownership. This file wins on **user tiers, creator capability, trial, subscription *state*, public commercial gating, and when Stripe may be built**. Analytics event *names* for commercial funnels are specified here; storage and PII rules still follow `product-metrics.md`.

---

## 0. Objective

Define how Godu users, creators, trials and future subscriptions should work.

The system should support the commercial model **now**, but **Stripe/payment integration must not be implemented until there is a proven user base worth converting**.

Core equation for this slice:

```text
Verified TikTok ownership → creator capability
First public creator Godu → trial starts (3 months from that publish)
Trial / paid period ends with no active entitlement → public creator surfaces are gated off
```

---

## 1. Implementation principle

Build the **user model, creator capability, trial lifecycle and subscription-state abstraction now**.

Do **not** build the payment provider integration yet.

Payment integration is a later phase, added once Godu has demonstrated a sufficiently strong convertible creator base.

---

## 2. User tier

All accounts begin as standard Godu users.

**Price: Free**

A standard user can:

- Create a Godu account (existing Auth0 → internal `User`).
- Use public Godus **that have an active creator entitlement**.
- Create private/personal Godus from supported video links.
- Play their own private Godus after a creator trial has expired.
- Connect social platform accounts (`LinkedPlatformAccount`).
- Verify ownership of a TikTok account.
- Later gain creator functionality **without creating a separate account**.

There is **no** separate `User` and `Creator` registration flow.

### Mapping to today

| Concept | Existing code |
| --- | --- |
| Standard user | `User` (`usr_…`) |
| Sign-in | Auth0 only |
| Platform connect / verify | `LinkedPlatformAccount` + TikTok OAuth |
| Public profile document | `Creator` — still **not** a second login |

---

## 3. Creator tier

A user becomes **creator-enabled** after successfully verifying ownership of a TikTok account.

Creator status is an **additional capability on the existing user account**, not a different account type.

This updates the earlier “lazy Creator on first publish” wording for *capability*. The `Creator` **profile document** may still be created lazily (on verify or on first publish). Capability itself comes from verified platform account(s), not from filling a “become a creator” form.

**Publishing public Godus also requires a current commercial entitlement** (trial in date, or later a paid period). Verify-TikTok alone is not enough once a trial has expired.

### Creator price

**£9.99 per month**

This is the intended launch price. Store/configure it so it can be changed later without a code change to business rules (e.g. options/config). Do not hard-code the amount in domain logic.

Currency: **GBP**. Display as £9.99 until a later localisation decision.

### Creator features (while entitlement is active)

Creators can:

- Publish public Godus against videos from their **verified** TikTok account (existing ownership check on publish).
- Manage their published Godus.
- Make TikTok content easier for viewers to follow step-by-step.
- Access creator-specific usage/engagement information as that functionality is introduced.

Core proposition:

> **Turn your TikToks from something people watch into something people can follow.**

---

## 4. Creator verification (identity)

TikTok ownership verification determines whether a user can act as a creator **for that TikTok account**.

```text
User
 └── Connected platform accounts
      └── TikTok @handle
           └── Verified
                └── Creator capabilities for that account
```

A user may eventually own or manage more than one social account.

**Do not assume:**

```text
User == TikTok account
User == Creator
```

**Do assume:**

```text
User
 └── Verified platform account(s)
      └── Creator capabilities (scoped to those accounts)
```

Auth0 remains login only. TikTok OAuth remains creator-account linking only (`decisions.md` §8).

---

## 5. Creator trial

Creators receive a **3-month free trial**.

The trial must **not** begin when:

- The user registers.
- The user connects TikTok.
- TikTok ownership is verified.

The trial begins when the creator publishes their **first public creator Godu**.

**Existing publishers:** anyone who already has a public creator Godu starts their 3 months from **that first publish** (`PublishedUtc` of the earliest public creator Godu), not from the day this feature ships. They do not get a fresh clock.

Store at minimum:

```text
TrialStartedAt
TrialEndsAt
```

Intended duration:

```text
3 months
```

Use UTC. `TrialEndsAt = TrialStartedAt + 3 months` (calendar months). Day-of-month overflow (e.g. 31 Jan → last day of April) clamps to the last valid day of the target month.

Publishing additional Godus during the trial does **not** extend it.

### One trial per Auth0 user

The trial is keyed to the internal Godu `UserId`.

That `UserId` is provisioned from Auth0 `sub` (`ExternalIdentity`). Additional Auth0 connections (Google, Apple, …) on the **same Auth0 user** share one `sub`, one Godu user, and **one trial**. Logging in with a different social account that Auth0 has linked to the same username/user does not mint a second trial.

A **new** Auth0 registration (new `sub`) is a new Godu user and would start its own trial on first publish. Godu does not merge users by email. Preventing duplicate Auth0 users is Auth0 account linking.

### Settings UI

The **top of Settings** shows an info panel with the trial expiry when a trial has started:

- Copy must state that creator publishing is a 3-month trial and **when it ends** (date, user-local).
- While in trial: expiry date + remaining time is enough.
- After expiry (no paid entitlement): the same panel becomes the **subscription / reactivation prompt** (pay later; for now, explain that public Godus are off until a subscription exists).

Internal/admin accounts that skip the clock should not see a misleading countdown (omit, or show that creator publishing is not metered for this account).

### Skip the trial clock

Users with `IsInternal` **or** `IsAdmin` do **not** start or expire a trial. Their public creator Godus stay publicly usable. They still verify TikTok and pass ownership checks.

---

## 6. Creator commercial states

The domain model must support states similar to:

```text
NotStarted
Trial
Active
PastDue
Cancelled
Expired
```

Exact naming may be adapted to fit the codebase (e.g. `CreatorCommercialStatus`).

These states exist **independently of Stripe** so the commercial model can be implemented and tested before payments.

Suggested meaning (pre-Stripe):

| State | Meaning now |
| --- | --- |
| `NotStarted` | Creator-enabled (verified TikTok) but has not published a first public Godu; no trial clock |
| `Trial` | First public Godu published; `now < TrialEndsAt`; no paid entitlement |
| `Active` | Paid period in force (unused until Stripe; keep the value in the model) |
| `PastDue` | Reserved for payment-provider failures after Stripe exists |
| `Cancelled` | Will not renew; access continues until `SubscriptionEndsAt` |
| `Expired` | No current entitlement; public creator surfaces are gated off |

Internal fields (no Stripe IDs yet):

```text
CreatorSubscriptionStatus
TrialStartedAt
TrialEndsAt
SubscriptionStartedAt
SubscriptionEndsAt
TrialWarningEmailSentAt
TrialEndedEmailSentAt
```

Stripe-specific identifiers are added **only** when payments are implemented.

Avoid designing core business logic around Stripe objects (Customer, Price, Subscription). Stripe should later **update** this internal state, not replace it.

**Entitlement is active** when:

- the user is `IsInternal` or `IsAdmin`, or
- status is `Trial` and `now < TrialEndsAt`, or
- status is `Active` / `Cancelled` with `now < SubscriptionEndsAt` (paid era).

---

## 7. Commercial gate (inactive public access)

Do **not** Archive Godus when a trial or paid period ends. Archive remains the creator-initiated “remove from my library” path.

When entitlement is **not** active:

### Public (viewers)

- Public Godu URLs (`/t/…`, `/tiktok/…`, public API) must **not** play or return the item (treat as unavailable — same class of response as not found, not a teaser).
- Related “More from this creator” must not list them.
- The **public creator profile is hidden** (no free catalogue, no bio page). Profile routes behave as not found.

### Creator (owner)

- Godus are **not** deleted.
- The owner can still see them in My Godus / creator dashboard, edit, archive, and **play them privately**.
- **All publishing is blocked** until they pay (later) or otherwise regain entitlement: no new public publish, no re-publish. They can still **create and use personal/private** Godus.
- Show a clear subscription / reactivation prompt (Settings panel + publish actions).

### Reactivation

When entitlement becomes active again (paid subscribe in the future; not applicable during an already-running trial):

- **All** previously public creator Godus that were only commercially gated come **back on together**.
- The creator does not confirm per item.
- Archived items stay archived.

Inactive is a **read-time entitlement check** against the owner’s commercial state (plus excluding archived). Do not rely on flipping every `StepsItem.Status` unless a later implementation needs a denormalised flag for query cost; public read must still be correct if that flag is stale.

Private/personal Godus stay fully usable on the free user tier after trial expiry.

---

## 8. Subscription cancellation (when payments exist)

When paid subscriptions are eventually introduced:

1. Cancellation stops **renewal**; it does not immediately terminate access.
2. Creator functionality stays active until the end of the paid billing period.
3. At expiry, the commercial gate applies (same as trial expiry).
4. The creator receives an email confirming deactivation.
5. Godu configurations and data are retained.
6. Resubscribing **automatically restores all** previously public (non-archived) creator Godus.

A **warning email** is also sent **7 days** before trial or subscription expiry, then an **end** email at the instant entitlement ends.

---

## 9. Stripe / payments

### Do not implement Stripe yet

Stripe is **out of scope** for this phase.

Do not:

- Add Stripe SDKs/packages.
- Create Stripe customers.
- Create Stripe subscriptions.
- Add checkout/payment screens.
- Add Stripe webhook endpoints.
- Require payment card details during the trial.

The current goal is to validate whether creators actually use Godu enough to justify paying for it.

### Prepare for later Stripe

Keep commercial state internal. Later, Stripe becomes the payment provider that updates Godu’s subscription state.

Until checkout exists, expired creators see copy that publishing will require a £9.99/month subscription; there is no pay button that charges a card.

---

## 10. User journeys

```text
Register
   ↓
Free Godu user
   ↓
Connect TikTok
   ↓
Verify TikTok ownership
   ↓
Creator capabilities enabled
   ↓
Publish first public Godu
   ↓
3-month free trial begins (clock from that publish)
   ↓
Settings shows expiry
   ↓
7 days before end: warning email
   ↓
Trial expires: end email, public gate, profile hidden, publish blocked
```

Future paid journey:

```text
Trial or Expired
   ↓
Subscribe £9.99/month
   ↓
All previously public creator Godus come back on
   ↓
Cancel subscription
   ↓
Current billing period ends (7-day warning, then end email)
   ↓
Commercial gate again
```

---

## 11. Data / metrics

Capture enough now to decide whether payments are commercially justified.

At minimum track (names below are product-level; map onto `product-metrics.md` snake_case when implemented):

```text
UserRegistered
TikTokAccountConnected
TikTokAccountVerified
FirstCreatorGoduPublished
CreatorTrialStarted
CreatorGoduPublished
CreatorGoduViewed / CreatorGoduUsed
TrialExpired
```

Already close in the Early Access catalogue:

| This spec | Existing event (if any) |
| --- | --- |
| UserRegistered | `registration_started` / `login_completed` (first-time association) |
| CreatorGoduPublished | `godu_published` |
| CreatorGoduViewed | `godu_viewed` |
| CreatorGoduUsed | `godu_started` |

New events still required for the commercial funnel (connect, verify, trial start/expiry). First public publish must persist `TrialStartedAt` on the commercial record so expiry is not analytics-only.

When payments are introduced, additionally track:

```text
SubscriptionStarted
SubscriptionRenewed
SubscriptionCancelled
SubscriptionExpired
SubscriptionReactivated
```

Key validation question before Stripe:

> Are enough creators repeatedly publishing Godus and generating real viewer usage that a meaningful proportion could reasonably be converted to £9.99/month subscribers?

Events remain fire-and-forget and must never block publish, playback, or save (`product-metrics.md`).

---

## 12. Email — Amazon SES

Send **for real** (not a no-op stub in Production). Transport is **Amazon Simple Email Service (SES)**.

### Timing (trial; paid period later uses the same pattern)

| When | Email |
| --- | --- |
| 7 days before `TrialEndsAt` | Warning: trial ending; public Godus and profile will go away for viewers |
| At `TrialEndsAt` (entitlement ended, no paid sub) | End of trial: creator Godus deactivated for the public |
| 7 days before `SubscriptionEndsAt` | Warning (paid era) |
| At paid-period end after cancel / expiry | Deactivation (paid era) |

Do not send these on register, TikTok connect, or verify.

Send at most once per trigger per user. Persist `TrialWarningEmailSentAt` / `TrialEndedEmailSentAt` (and later subscription equivalents) so retries and multiple job runs do not spam.

A background/check path (timer, queued job, or equivalent) must evaluate users approaching or past `TrialEndsAt`. Do not rely on the creator opening the app.

### Configuration

| Item | Rule |
| --- | --- |
| Provider | AWS SES |
| From | Configurable (e.g. `noreply@godu.it`); domain must be verified in SES |
| Region | Configurable |
| Credentials | **Key Vault**, never source. Same `--` → `:` mapping as Cosmos/TikTok (e.g. `Email--SmtpUsername` / `Email--SmtpPassword`, or access key pair — pick one SES auth style and stick to it) |
| Development | May use SES sandbox (verified recipients only) or a dedicated from-address; still a real send path, not a fake in-memory “sent” log as the only Production behaviour |
| Recipients | Auth0 email on the user when present; skip send (and log) if there is no email |
| Content | Plain language; include expiry date; no payment links until Stripe exists |

Analytics events must not include email addresses (`product-metrics.md`).

---

## 13. Explicit non-goals (this phase)

- Stripe or any card capture
- Checkout UI
- Creator billing portal
- Changing the £9.99 amount via a user-facing “price experiment” product
- Alexa / Apple Watch
- YouTube / Instagram as paid creator platforms (TikTok remains the first verified platform)

---

## 14. Locked decisions (was: open questions)

| # | Decision |
| --- | --- |
| 1 | **Commercial gate** on public read. Do not Archive. Do not use `Unlisted` as the expiry mechanism. |
| 2 | **Reactivation restores all** previously public (non-archived) creator Godus at once. |
| 3 | **3 months from that user’s first public publish**, including people who already published. Settings shows the expiry date. |
| 4 | **One trial per Godu user / Auth0 `sub`**. Extra Auth0 connections on the same Auth0 user are not a second trial. |
| 5 | Warning email at **7 days**, then **end-of-trial email** at `TrialEndsAt`. Same pattern later for paid period end. |
| 6 | After expiry: **block all publishing**. Personal/private create + play remain. |
| 7 | **Hide the public creator profile** (and public Godus). Viewers get nothing for free. |
| 8 | **`IsInternal` and `IsAdmin` skip the trial clock.** |
| 9 | **Send mail for real via Amazon SES.** |
