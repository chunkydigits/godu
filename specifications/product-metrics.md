# Godu product metrics & analytics

**Status:** agreed 2026-08-19. Scheduled **after TikTok creator publishing** (Phase 8).  
**Does not start until:** a creator can publish a public Godu from a verified TikTok account.

This is the implementation contract for first-party Early Access analytics. It **supersedes** the old “light analytics hooks” wording in `mvp-build-spec.md` Phase 10 and `initial specification.md` Phase 10.

Naming in this file:

| This spec | Existing codebase |
| --- | --- |
| Godu (the product / a created experience) | Commercial name **Godu**; persisted entity remains `StepsItem` (`goduId` in events = `StepsItem.Id`) |
| Event names (`godu_saved`, …) | Keep these strings as the analytics catalogue — do not rename to `steps_*` |
| Suggested `Analytics/` folders | Follow API/UI ROEs: `Godu.Model`, `Godu.Service` analytics types, `Godu.Api` controllers, frontend `src/app/core/analytics/` |

**Conflict order:** `decisions.md` still wins. This file wins over the initial spec on analytics scope and over any “do not build analytics in MVP” leftover.

---

# GODU Product Metrics & Analytics Implementation Specification

## Objective

Implement first-party product analytics for GODU so that we can understand how real users interact with the product during Early Access.

The purpose of this work is **not** to build a complex analytics platform.

We need enough reliable data to answer:

* Are people creating GODUs?
* Are people actually using GODUs?
* Do users complete them?
* Do people return and use GODU again?
* Are public GODUs being shared?
* Which source platforms/content types are generating engagement?
* Where are users abandoning the creation flow?
* Are anonymous visitors converting into registered users?
* What proportion of users create or use a second GODU?

The primary Early Access metric is **repeat usage**, not registrations.

---

# 1. Principles

The implementation should:

* use first-party event tracking
* avoid storing unnecessary personal data
* use GODU's existing internal user ID rather than Auth0/provider identifiers
* allow anonymous usage to be tracked before login
* associate anonymous activity with a user after registration/login where possible
* store analytics independently from core domain entities
* never allow analytics failures to interrupt the user's normal GODU experience
* support later export to Application Insights, Power BI, PostHog, Mixpanel or another analytics platform if required
* avoid introducing a paid external analytics dependency for the MVP

Analytics event submission should therefore be **fire-and-forget from the user's perspective**.

---

# 2. Metrics Architecture

Implement an append-only analytics event system.

Create a Cosmos DB container:

`analytics-events`

Recommended partition key:

`/partitionKey`

For now:

```text
partitionKey = yyyy-MM
```

Example:

```text
2026-08
```

This avoids creating a hot partition around a single user while keeping reporting queries manageable.

Events must never be updated after creation.

---

# 3. Analytics Event Model

Create a model similar to:

```csharp
public class AnalyticsEvent
{
    public string Id { get; set; } = Guid.NewGuid().ToString();

    public string PartitionKey { get; set; }

    public DateTimeOffset Timestamp { get; set; }

    public string EventName { get; set; }

    public string? UserId { get; set; }

    public string AnonymousId { get; set; }

    public string SessionId { get; set; }

    public string? GoduId { get; set; }

    public string? VideoPlatform { get; set; }

    public string? SourceCreatorHandle { get; set; }

    public string? Referrer { get; set; }

    public string? Path { get; set; }

    public string? UserAgent { get; set; }

    public Dictionary<string, object>? Properties { get; set; }
}
```

Do not store:

* Auth0 subject IDs
* Microsoft account IDs
* Facebook IDs
* TikTok IDs relating to authenticated GODU users
* email addresses
* names
* IP addresses

unless they are already legitimately required elsewhere in the application.

Analytics should operate against GODU's internal user identifier.

---

# 4. Anonymous Identity

Generate an anonymous browser identifier.

Example:

```text
anonymousId
```

Generate a UUID and persist it in local storage.

Example:

```text
godu_anon_id
```

The identifier should persist between browser sessions.

Example:

```text
95c168d7-b728-43a5-a3fd-08efe4191882
```

This allows us to recognise behaviour such as:

```text
anonymous visitor
    ↓
views GODU
    ↓
uses GODU
    ↓
creates GODU
    ↓
registers
```

without knowing who that person actually is.

---

# 5. Session Tracking

Generate a `sessionId`.

Persist it in session storage.

Example:

```text
godu_session_id
```

A new browser session should create a new session ID.

This lets analytics distinguish:

```text
same user
same browser
different visit
```

---

# 6. Anonymous → Registered User Association

When a user logs in or registers:

continue sending:

```text
anonymousId
```

and additionally send:

```text
userId
```

Example:

```json
{
  "anonymousId": "anon-123",
  "userId": "usr-987"
}
```

Previous events do **not** need to be modified.

Analytics queries can associate historical anonymous events with a user where later events contain both identifiers.

Do not rewrite potentially thousands of historical analytics records after login.

---

# 7. Core Event Catalogue

Use explicit event names rather than arbitrary free-form strings throughout the frontend.

Create an enum/constants definition so events remain consistent.

---

## 7.1 Application / Acquisition

### `page_viewed`

Trigger whenever a route/page is viewed.

Properties:

```json
{
  "route": "/",
  "referrer": "...",
  "utmSource": "...",
  "utmMedium": "...",
  "utmCampaign": "..."
}
```

Capture UTM parameters where present.

Persist first-touch attribution for the browser.

---

### `landing_page_viewed`

Trigger specifically when the main GODU landing page is loaded.

Useful for measuring the complete acquisition funnel.

---

# 8. GODU Creation Funnel

These events are especially important.

---

### `create_started`

Trigger when the user begins the GODU creation process.

---

### `video_url_submitted`

Trigger when somebody submits a video URL.

Properties:

```json
{
  "platform": "tiktok"
}
```

Do not include the entire source URL unless there is a genuine analytics requirement.

Prefer platform and video identifier if one already exists in the GODU domain.

---

### `video_loaded`

Trigger once GODU successfully loads/processes the supplied source video.

Properties:

```json
{
  "platform": "tiktok",
  "videoDurationSeconds": 42
}
```

---

### `video_load_failed`

Properties:

```json
{
  "platform": "tiktok",
  "failureReason": "unsupported-video"
}
```

Avoid including raw exception text where it might expose sensitive information.

---

### `step_added`

Trigger whenever a step is added.

Properties:

```json
{
  "stepNumber": 3
}
```

---

### `step_deleted`

Properties:

```json
{
  "stepNumber": 3
}
```

---

### `step_timing_changed`

Trigger when timings are meaningfully changed.

Avoid sending one analytics event for every tiny drag/mouse movement.

Emit once when the interaction finishes.

---

### `godu_saved`

Trigger after a GODU is successfully persisted.

Properties:

```json
{
  "stepCount": 6,
  "visibility": "private",
  "platform": "tiktok"
}
```

This is one of the main conversion events.

---

### `godu_published`

Trigger when a GODU becomes publicly available.

Properties:

```json
{
  "stepCount": 6,
  "platform": "tiktok"
}
```

---

### `godu_creation_abandoned`

Do **not** attempt to reliably emit this as a browser event.

Abandonment should instead be calculated analytically:

```text
create_started
WITHOUT
godu_saved
within the same session
```

---

# 9. GODU Consumption Events

These are equally important.

A user creating something is interesting.

A user actually following it is more important.

---

### `godu_viewed`

Trigger whenever the public/private GODU page is opened.

Properties:

```json
{
  "owner": false,
  "stepCount": 6,
  "visibility": "public",
  "platform": "tiktok"
}
```

---

### `godu_started`

Trigger when the user actually starts following the GODU.

This should represent deliberate interaction rather than simply visiting the page.

For example:

* pressing Start
* starting playback
* selecting the first step

depending upon the current UX.

---

### `step_started`

Properties:

```json
{
  "stepNumber": 2,
  "totalSteps": 6
}
```

---

### `step_completed`

Trigger where GODU can reasonably determine that a step was completed.

---

### `next_step_clicked`

Properties:

```json
{
  "fromStep": 2,
  "toStep": 3
}
```

---

### `previous_step_clicked`

---

### `step_repeated`

Trigger when the user explicitly repeats/replays the current step.

This could become particularly useful for understanding whether step timing/loop functionality is valuable.

---

### `godu_completed`

Trigger when the final step is completed/reached.

Properties:

```json
{
  "stepCount": 6,
  "elapsedSeconds": 490
}
```

This is a **critical metric**.

---

### `godu_abandoned`

Again, avoid depending upon browser unload events.

Calculate this analytically:

```text
godu_started
WITHOUT
godu_completed
```

within an appropriate period/session.

---

# 10. Sharing Events

### `share_clicked`

Properties:

```json
{
  "method": "native"
}
```

Possible methods:

```text
native
copy-link
whatsapp
facebook
other
```

Do not attempt to claim that a share definitely occurred if the browser only opened the native share dialog.

---

### `link_copied`

Record independently where relevant.

---

### `shared_godu_viewed`

Do not emit this explicitly.

Derive this using referrer/UTM/share tokens where practical.

---

# 11. Account Events

### `registration_started`

### `registration_completed`

### `login_completed`

### `logout`

Avoid recording authentication provider identity unless there is a clear product reason.

If useful, a generic property is acceptable:

```json
{
  "provider": "microsoft"
}
```

but do not record provider-specific user IDs.

---

# 12. Save / Favourite Events

If saved/favourite GODUs currently exist:

### `godu_bookmarked`

### `godu_bookmark_removed`

These will help determine whether GODU is also being used as:

> "I want to do this video later."

This may prove to be an important product behaviour.

---

# 13. Feedback Metrics

If feedback is implemented:

### `feedback_submitted`

Properties:

```json
{
  "rating": "positive",
  "context": "godu-complete"
}
```

Do not put long free-text feedback into the analytics event.

Store feedback separately and put only the feedback record ID in analytics if required.

---

# 14. Analytics API

Create an endpoint such as:

```http
POST /api/analytics/events
```

Request:

```json
{
  "eventName": "godu_started",
  "anonymousId": "...",
  "sessionId": "...",
  "goduId": "...",
  "properties": {
    "stepCount": 6
  }
}
```

The server must determine trusted information itself where possible.

For example:

```text
Timestamp
Authenticated UserId
```

must come from server-side context rather than being trusted from the browser.

---

# 15. Batch Event Support

Prefer supporting batching:

```http
POST /api/analytics/events/batch
```

Request:

```json
{
  "events": [
    {},
    {},
    {}
  ]
}
```

The Angular client may queue several events and send them together.

However this is an optimisation rather than a prerequisite if it adds unnecessary complexity.

Correct tracking is more important than batching.

---

# 16. Angular Analytics Service

Create a central service.

Example:

```typescript
analyticsService.track(
    AnalyticsEvent.GoduStarted,
    {
        goduId,
        stepCount
    }
);
```

Feature components must not manually construct API requests.

Everything must go through one analytics service.

The service should automatically add:

```text
anonymousId
sessionId
current path
referrer where appropriate
```

Authentication data should come from existing authentication infrastructure.

---

# 17. Analytics Must Never Break GODU

This requirement is important.

Calls should resemble:

```typescript
try {
    await analytics.track(...);
} catch {
    // analytics failure intentionally ignored
}
```

Prefer asynchronous/non-blocking behaviour.

For example:

saving a GODU should be:

```text
save GODU
↓
save succeeds
↓
show success to user
↓
record analytics
```

NOT:

```text
save GODU
↓
wait for analytics
↓
show success
```

Analytics must never become part of the critical path.

---

# 18. Duplicate Event Protection

Some Angular lifecycle events may execute multiple times.

Prevent obvious accidental duplicate events.

Particularly:

```text
godu_viewed
godu_started
godu_completed
landing_page_viewed
```

An individual session should not emit `godu_completed` repeatedly because the final component re-rendered.

Interactions such as:

```text
next_step_clicked
step_repeated
```

may legitimately happen multiple times.

---

# 19. Development / Production

Each event needs an environment identifier.

Example:

```text
Development
Staging
Production
```

Development analytics must not contaminate Early Access metrics.

Could be stored as:

```json
{
  "environment": "Production"
}
```

or use completely separate databases/configuration if already supported.

Production reporting must always filter to Production.

---

# 20. Bot/Internal Traffic

Add the ability to exclude internal/test users.

The simplest implementation is an analytics property against the GODU user such as:

```text
ExcludeFromAnalytics
```

or maintain a configured list of internal user IDs.

Events can either:

1. not be recorded, or
2. be recorded with:

```json
{
  "isInternal": true
}
```

Option 2 is preferable because it allows debugging while excluding them from reports.

My own GODU usage must therefore not artificially inflate the launch numbers.

---

# 21. Dashboard / Metrics API

Do **not** build a full analytics UI yet.

Create an admin-only metrics endpoint that aggregates the important numbers.

Example:

```http
GET /api/admin/analytics/summary
```

Parameters:

```text
from
to
```

Example:

```http
GET /api/admin/analytics/summary?from=2026-08-01&to=2026-08-31
```

Response:

```json
{
  "uniqueVisitors": 532,
  "registeredUsers": 84,

  "goduCreationStarted": 105,
  "godusCreated": 61,
  "creationConversionRate": 58.1,

  "godusViewed": 942,
  "godusStarted": 402,
  "godusCompleted": 287,
  "completionRate": 71.4,

  "shares": 95,

  "returningUsers": 32,
  "repeatCreators": 18,
  "repeatConsumers": 45
}
```

---

# 22. Key Metric Definitions

Metric definitions need to be explicit so numbers don't silently change meaning.

---

## Unique Visitor

Unique:

```text
anonymousId
```

during selected period.

---

## Registered User

Distinct `userId` active during the selected period.

Do not use total rows in the Users collection.

This metric means:

> registered users who actually used GODU during this period.

---

## GODUs Created

Count:

```text
godu_saved
```

Prefer distinct `goduId` where repeated saves could otherwise inflate it.

---

## Creation Conversion

```text
unique sessions containing godu_saved
/
unique sessions containing create_started
```

---

## GODUs Started

Distinct GODU usage sessions containing:

```text
godu_started
```

---

## GODU Completion Rate

```text
usage sessions containing godu_completed
/
usage sessions containing godu_started
```

Do not calculate simply from number of event records.

---

# 23. Returning User

Define initially as:

A browser/user which has activity on **at least two different calendar dates**.

Anonymous visitors should be determined using:

```text
anonymousId
```

Registered users should preferably use:

```text
userId
```

where known.

This is intentionally simple for MVP.

---

# 24. Repeat Consumer — Critical Metric

A repeat consumer is somebody who starts GODUs on at least two distinct occasions.

Preferably:

```text
2+ distinct GODU usage sessions
```

rather than clicking Start twice in the same session.

Return:

```text
repeatConsumers
```

and:

```text
repeatConsumerRate
```

This is one of the main Early Access health indicators.

---

# 25. Repeat Creator — Critical Metric

A repeat creator has created at least two distinct GODUs.

Calculate using:

```text
COUNT(DISTINCT goduId) >= 2
```

grouped by user/anonymous identity.

Return:

```text
repeatCreators
```

and:

```text
repeatCreatorRate
```

---

# 26. Second GODU Metric

Expose explicitly:

```text
usersCreatingFirstGodu
usersCreatingSecondGodu
secondCreationRate
```

because moving from:

```text
1 GODU → 2 GODUs
```

is an especially important signal that the product has value beyond novelty.

Likewise expose:

```text
usersUsingFirstGodu
usersUsingSecondGodu
secondUsageRate
```

---

# 27. Cohort / Retention Metrics

We do not need a sophisticated cohort system yet.

Implement enough to determine:

### Next-day return

User active again on a later calendar day.

### 7-day return

User performs a meaningful action again between days 1–7 after first activity.

Meaningful actions include:

```text
godu_started
godu_saved
godu_completed
```

Do not treat simple page views as meaningful retention.

---

# 28. Creation Funnel

Provide aggregation for:

```text
Landing page viewed
    ↓
Creation started
    ↓
Video submitted
    ↓
Video loaded
    ↓
First step added
    ↓
GODU saved
    ↓
GODU published
```

Return counts and conversion percentage between stages.

This will tell us where users struggle.

---

# 29. Usage Funnel

Provide:

```text
GODU viewed
    ↓
GODU started
    ↓
Second step reached
    ↓
Final step reached
    ↓
GODU completed
```

This will help distinguish:

```text
"People don't understand it."
```

from:

```text
"People understand it but don't find it useful."
```

---

# 30. Platform Dimension

Every GODU-related event should support:

```text
platform
```

Initially:

```text
tiktok
```

but design this as an enum/value rather than TikTok-specific database structure.

Future values may include:

```text
youtube
instagram
```

This prevents analytics needing to be redesigned when GODU becomes multi-platform.

---

# 31. Admin Analytics Page

Once the API exists, add a very simple admin-only Angular screen.

Suggested route:

```text
/admin/analytics
```

Do not spend significant time styling this.

Show:

## Headline

```text
Unique Visitors
Active Users
GODUs Created
GODUs Used
Completion Rate
Returning Users
```

## Product Health

```text
Repeat Consumers
Repeat Creators
Second GODU Rate
7-Day Return Rate
```

## Funnels

Creation funnel.

Usage funnel.

## Activity

Last:

```text
7 days
30 days
90 days
```

Allow a custom date range if straightforward.

---

# 32. Daily Trend

Return a daily series from the API:

```json
[
  {
    "date": "2026-08-18",
    "visitors": 20,
    "godusCreated": 4,
    "godusStarted": 17,
    "godusCompleted": 12
  }
]
```

Display this using whatever chart library already exists in GODU.

Do not introduce a large new dependency purely for the analytics dashboard unless necessary.

---

# 33. Privacy

Analytics is intended to measure product behaviour, not profile users.

Avoid storing unnecessary personal information.

Identifiers should be pseudonymous internal identifiers.

Where analytics cookies/storage require consent under the application's eventual privacy implementation, the analytics service should be structured so tracking can later be conditioned on:

```typescript
analyticsConsent === true
```

Do not attempt a complete consent-management redesign as part of this ticket unless one already exists.

---

# 34. Event Versioning

Include:

```text
schemaVersion
```

Example:

```json
{
  "schemaVersion": 1
}
```

This will allow event structures to evolve without making historic analytics impossible to interpret.

---

# 35. Recommended Event Envelope

Final event structure should approximately resemble:

```json
{
  "id": "evt_xxx",
  "partitionKey": "2026-08",
  "schemaVersion": 1,

  "eventName": "godu_completed",
  "timestamp": "2026-08-19T13:18:24Z",

  "anonymousId": "anon_xxx",
  "sessionId": "session_xxx",
  "userId": "usr_xxx",

  "goduId": "godu_xxx",

  "platform": "tiktok",

  "path": "/t/@creator/example",

  "environment": "Production",
  "isInternal": false,

  "properties": {
    "stepCount": 5,
    "elapsedSeconds": 312
  }
}
```

---

# 36. Recommended Implementation Structure

Backend:

```text
Analytics/
    Models/
        AnalyticsEvent.cs
        AnalyticsEventName.cs

    Services/
        IAnalyticsService.cs
        AnalyticsService.cs

    Controllers/
        AnalyticsController.cs

    Admin/
        AnalyticsSummaryService.cs
        AnalyticsSummaryResponse.cs
```

Frontend:

```text
core/
    analytics/
        analytics.service.ts
        analytics-event.ts
        analytics.models.ts
```

Components should depend upon the central AnalyticsService rather than communicating with the analytics endpoint directly.

Place those types inside the existing `Godu.*` projects and `src/app/core/` tree rather than a new solution project.

---

# 37. Performance

Analytics writes should use an appropriate Cosmos strategy and should not cause excessive RU consumption.

Do not perform aggregation queries every time a normal GODU page loads.

Only admin analytics calls should execute reporting queries.

Where aggregation becomes expensive later we can introduce:

```text
daily-rollups
```

but **do not implement rollups prematurely**.

The raw event dataset should be sufficient during Early Access volumes.

---

# 38. Error Handling

Analytics failures:

* should be logged
* should not be shown as errors to users
* should not cause API operations to fail
* should not prevent navigation
* should not prevent GODUs being created
* should not prevent GODUs being used

Do not retry indefinitely.

A small bounded retry policy is acceptable.

---

# 39. Tests

Implement unit/integration tests for at least:

### Identity

* anonymous ID generated
* anonymous ID retained
* session ID generated
* authenticated events include internal user ID

### Events

* GODU saved generates `godu_saved`
* GODU started generates `godu_started`
* GODU completion only generates once per usage session
* step interaction events contain correct GODU ID
* internal/test status is correctly represented

### Analytics API

* accepts valid event
* rejects unknown/invalid event names where appropriate
* server generates timestamp
* authenticated user ID cannot be spoofed by request
* analytics failure does not affect main GODU functionality

### Aggregation

Verify:

* unique visitors
* completion rate
* repeat consumers
* repeat creators
* second GODU rate
* returning user calculation

using deterministic test data.

---

# 40. Early Access Dashboard Targets

For context, these are the numbers we currently want to watch during Early Access.

They are **not hard-coded targets in the application**.

Initial validation would look roughly like:

```text
100 genuine users

30 users create a GODU

20 users use GODU more than once

10 users return on another day/week

5 users provide useful product feedback
```

The dashboard should make it easy to determine whether we are approaching these behaviours.

---

# 41. Priority Order

Implement in this order:

## P0 — Required before Early Access

1. Analytics event model/container
2. Anonymous ID
3. Session ID
4. Central Angular AnalyticsService
5. Analytics API
6. Core creation events
7. Core consumption events
8. User association after authentication
9. Production/internal traffic distinction
10. Basic summary API

## P1 — Strongly Recommended

11. `/admin/analytics`
12. Creation funnel
13. Usage funnel
14. Returning users
15. Repeat consumers
16. Repeat creators
17. Second GODU metrics
18. Daily trend

## P2 — Later

19. More sophisticated cohorts
20. Geographic analytics
21. Creator analytics
22. Traffic attribution reports
23. External BI integration
24. Daily aggregation/rollup collections
25. Revenue analytics

---

# 42. Definition of Done

This work is complete when we can answer, from production data:

> How many people visited GODU?

> How many started creating a GODU?

> How many successfully created one?

> How many GODUs were actually used?

> How many were completed?

> How many users came back?

> How many people used GODU more than once?

> How many people created more than one GODU?

> At what stage do users abandon creation?

> At what stage do users abandon using a GODU?

> Are people sharing GODUs?

and development/testing activity can be reliably excluded from those numbers.

The implementation should favour **accurate, simple behavioural analytics over a sophisticated analytics product**.

The goal is to establish whether GODU has genuine product usage before investing significantly in subscriptions, payment infrastructure or additional platforms.
