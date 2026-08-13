# Steps MVP — Master Implementation Specification for Cursor

## 1. Purpose

Build an MVP for **Steps**, a mobile-first application that turns instructional social-media videos into interactive step-by-step experiences.

“Steps” is a temporary internal product name. Do not hard-code the eventual commercial brand name into domain models or architecture.

The MVP must prove that users can:

- take an existing TikTok video;
- define logical steps within it;
- assign start/end timestamps to each step;
- optionally assign a real-world activity duration;
- loop the relevant video segment while completing the step;
- move forwards and backwards between steps;
- save private Steps for personal use;
- publish public Steps when the user owns a verified creator account.

The application must be designed so that additional video providers such as YouTube and Instagram can be added later without redesigning the core domain.

---

# 2. Core Product Principle

The product is not fundamentally a TikTok application.

The core model is:

```text
Video
+
Structured Steps
+
Playback Behaviour
=
Steps Experience
```

TikTok is only the first implemented video provider.

---

# 3. Core Use Cases

## 3.1 Personal Steps

A normal user finds an instructional video and creates Steps for their own use.

Example:

```text
User finds TikTok workout
↓
Pastes link into Steps
↓
Defines exercise sections
↓
Saves privately
↓
Uses workout later without repeatedly scrubbing video
```

Personal Steps:

```text
created by normal user
private
not publicly discoverable
only accessible by owner
```

---

## 3.2 Creator Steps

A creator links and verifies ownership of a social-media account.

Example:

```text
Joe links TikTok @therealjoefitness
↓
Steps verifies Joe controls the account
↓
Joe selects one of his videos
↓
Creates Steps
↓
Publishes
↓
Anybody can use the public Steps URL
```

Creator Steps:

```text
created by verified account owner
public
shareable
associated with original creator account
```

---

# 4. Technical Stack

Use:

## Frontend

```text
Angular
TypeScript
Angular Router
Angular HttpClient
RxJS
Angular Signals where appropriate
```

Prefer standalone Angular components.

Do not introduce NgRx unless explicitly requested later.

---

## Mobile

Use:

```text
Capacitor
```

The same Angular codebase must support:

```text
Web
PWA
iOS
Android later
```

Primary MVP mobile target:

```text
iPhone
```

---

## Backend

Use:

```text
ASP.NET Core Web API
C#
```

Requirements:

```text
dependency injection
async/await
nullable reference types
strongly typed configuration
strongly typed DTOs
ProblemDetails for errors
```

---

## Database

Use:

```text
Azure Cosmos DB
NoSQL API
```

Steps belonging to a StepsItem should be embedded inside the parent document.

Do not create a Cosmos document for each individual step.

---

## Authentication

Use:

```text
Auth0
```

Auth0 should broker authentication providers.

Initial supported login providers should be designed to include:

```text
Apple
Google
Microsoft
Facebook
```

TikTok login may be added later where appropriate.

Do not implement direct application-level OAuth integrations for each login provider unless required by a feature that Auth0 cannot support.

---

# 5. Architecture

Use a:

```text
modular monolith
```

Do not introduce:

```text
microservices
CQRS
event sourcing
API gateway
service mesh
distributed caching
message buses
```

for the MVP.

Optimise for:

```text
simplicity
maintainability
speed of development
testability
```

---

# 6. Repository Structure

Suggested:

```text
Steps/
│
├── src/
│   ├── backend/
│   │   ├── Steps.Api/
│   │   ├── Steps.Domain/
│   │   ├── Steps.Infrastructure/
│   │   └── Steps.Contracts/
│   │
│   └── frontend/
│       └── steps-app/
│
├── tests/
│   ├── Steps.Api.Tests/
│   └── Steps.Domain.Tests/
│
├── docs/
│
└── Steps.sln
```

A simpler structure is acceptable during the playback spike.

Do not add project separation merely for architectural ceremony.

---

# 7. Domain Terminology

Use:

```text
User
Creator
StepsItem
StepDefinition
VideoReference
LinkedPlatformAccount
ExternalIdentity
```

A `StepsItem` is one interactive instructional video.

A `StepDefinition` is one individual step within that StepsItem.

---

# 8. Internal User Identity

Steps must maintain its own internal user identity.

Example:

```text
usr_01K27XVNQ13...
```

All product data must reference this internal user ID.

Do not store Auth0 IDs throughout product data.

Incorrect:

```json
{
  "createdByUserId": "auth0|123456"
}
```

Correct:

```json
{
  "createdByUserId": "usr_01K27XVNQ13"
}
```

The internal identity decouples the Steps domain from Auth0.

---

# 9. Auth0 Identity Mapping

Maintain an explicit mapping between Auth0 identity and Steps identity.

Concept:

```text
Auth0 subject
↓
ExternalIdentity
↓
Steps User
```

Suggested model:

```csharp
public sealed class ExternalIdentity
{
    public required string Id { get; init; }

    public required string UserId { get; init; }

    public required string IdentityProvider { get; init; }

    public required string ExternalSubjectId { get; init; }

    public DateTime CreatedUtc { get; init; }
}
```

For MVP:

```text
IdentityProvider = "auth0"
ExternalSubjectId = JWT "sub" value
UserId = Steps internal User ID
```

---

# 10. Authentication Request Flow

Angular receives an Auth0 access token.

API request:

```http
Authorization: Bearer <token>
```

ASP.NET validates:

```text
signature
issuer
audience
expiry
```

The API reads:

```text
sub
```

Then resolves:

```text
Auth0 sub
↓
ExternalIdentity
↓
Steps UserId
```

Feature/domain code should only consume the internal Steps User ID.

---

# 11. Current User Abstraction

Create something conceptually like:

```csharp
public interface ICurrentUser
{
    bool IsAuthenticated { get; }

    string? UserId { get; }
}
```

Authentication infrastructure resolves the external Auth0 identity into the internal Steps user.

Business logic should never need to parse Auth0 claims directly.

---

# 12. First Login

When an authenticated Auth0 subject is seen for the first time:

```text
Validate token
↓
Look up ExternalIdentity
↓
No mapping exists
↓
Create Steps User
↓
Create ExternalIdentity mapping
↓
Continue request
```

Example:

```text
Auth0:
google-oauth2|102839485

↓

Steps:
usr_01K27XVNQ13

↓

ExternalIdentity:
provider = auth0
subject = google-oauth2|102839485
userId = usr_01K27XVNQ13
```

---

# 13. Multiple Login Methods

A single Steps user may use multiple login mechanisms.

Auth0 should manage linked authentication identities where practical.

Example:

```text
Steps User
    ↓
Auth0 User
    ├── Google
    ├── Microsoft
    └── Facebook
```

Do not silently merge accounts purely because email addresses match.

Account linking must require authenticated proof of both identities.

---

# 14. Authentication Identity vs Social Account Ownership

These concepts must remain separate.

## Authentication Identity

Answers:

> How does this person authenticate to Steps?

Examples:

```text
Google
Microsoft
Facebook
Apple
```

Managed primarily through Auth0.

---

## Linked Platform Account

Answers:

> Which creator/social-media account has this Steps user proved they control?

Examples:

```text
TikTok @therealjoefitness
YouTube @joefitness
Instagram @joe.fitness
```

These are product/domain data.

They must not automatically become login identities.

---

# 15. LinkedPlatformAccount

Suggested model:

```json
{
  "id": "platform_01ABC",

  "userId": "usr_01ABC",

  "provider": "tiktok",

  "externalAccountId": "stable-platform-id",

  "username": "therealjoefitness",

  "displayName": "Joe Fitness",

  "profileUrl": "https://...",

  "isVerified": true,

  "verifiedUtc": "2026-08-13T08:00:00Z",

  "createdUtc": "2026-08-13T08:00:00Z",

  "updatedUtc": "2026-08-13T08:00:00Z"
}
```

The external account ID must be treated as the stable identity.

The username is a mutable public alias.

---

# 16. Platform Providers

Define:

```csharp
public enum VideoProvider
{
    TikTok,
    YouTube,
    Instagram,
    Vimeo
}
```

Only TikTok is implemented initially.

Suggested short URL aliases:

```text
t = TikTok
y = YouTube
i = Instagram
v = Vimeo
```

---

# 17. Public Username Strategy

Steps must not create its own global creator username namespace.

Do not require users to register:

```text
@joefitness
```

within Steps.

This avoids:

```text
username squatting
username ransom
duplicate identity
unnecessary namespace management
```

Instead, public identity is based on the verified external platform account.

---

# 18. Public URLs

Canonical creator URL structure:

```text
/{providerAlias}/{platformUsername}/{stepsSlug}
```

Examples:

```text
/t/therealjoefitness/morning-stretch

/y/joefitness/morning-stretch

/i/joe.fitness/morning-stretch
```

Display names may include the `@` prefix in the UI.

Do not require `@` inside the URL itself.

---

# 19. URL Lookup Identity

Do not use the username as the true database identity.

The URL resolves:

```text
providerAlias
+
platformUsername
```

to a:

```text
LinkedPlatformAccount
```

whose stable identity is:

```text
provider
+
externalAccountId
```

A creator changing username must not become a different creator.

---

# 20. Username Changes

When a linked account's platform username changes:

```text
update LinkedPlatformAccount.username
```

Keep previous usernames as aliases where practical.

Old shared URLs should redirect to the new canonical URL.

Concept:

```text
/t/therealjoefitness/morning-stretch

↓

redirect

/t/joefitnessofficial/morning-stretch
```

Do not implement full alias history in the first playback spike.

Design the domain so it can be added later.

---

# 21. Multiple Accounts Per Provider

One Steps user may control multiple accounts on the same platform.

Example:

```text
YouTube
    @joefitness

YouTube
    @joefitnessshorts
```

Each is a separate `LinkedPlatformAccount`.

Do not assume one account per provider per user.

---

# 22. User

Suggested minimal model:

```json
{
  "id": "usr_01ABC",

  "displayName": "Andrew",

  "createdUtc": "2026-08-13T08:00:00Z",

  "updatedUtc": "2026-08-13T08:00:00Z"
}
```

Avoid storing unnecessary authentication-provider-specific data here.

---

# 23. Creator

A Creator is a Steps user who publishes public content.

A user may have one logical creator profile associated with multiple LinkedPlatformAccounts.

Suggested:

```json
{
  "id": "creator_01ABC",

  "userId": "usr_01ABC",

  "displayName": "Joe Fitness",

  "bio": "Simple workouts you can do at home.",

  "profileImageUrl": "https://...",

  "createdUtc": "2026-08-13T08:00:00Z"
}
```

Linked social accounts remain separate documents/entities.

---

# 24. Visibility

Use:

```csharp
public enum StepsVisibility
{
    Private,
    Public,
    Unlisted
}
```

MVP:

```text
Private:
personal user-created Steps

Public:
verified creator Steps

Unlisted:
reserved for future use
```

Do not use:

```csharp
bool IsPublic
```

---

# 25. Status

Use:

```csharp
public enum StepsItemStatus
{
    Draft,
    Published,
    Archived
}
```

Visibility and lifecycle are separate concepts.

---

# 26. VideoReference

Suggested:

```json
{
  "provider": "tiktok",

  "externalVideoId": "745293857293",

  "sourceUrl": "https://www.tiktok.com/...",

  "creatorExternalAccountId": "stable-platform-account-id",

  "creatorUsername": "joefitness",

  "thumbnailUrl": "https://...",

  "durationSeconds": 54.3
}
```

Not all metadata must initially be available.

---

# 27. StepsItem

Example private item:

```json
{
  "id": "steps_01XYZ",

  "createdByUserId": "usr_andrew",

  "linkedPlatformAccountId": null,

  "visibility": "private",

  "status": "published",

  "title": "Shoulder Mobility",

  "description": "Quick shoulder routine",

  "video": {
    "provider": "tiktok",

    "externalVideoId": "745293857293",

    "sourceUrl": "https://www.tiktok.com/...",

    "creatorUsername": "joefitness",

    "durationSeconds": 54.3
  },

  "steps": [
    {
      "id": "step_1",

      "order": 1,

      "title": "Arm Swings",

      "startSeconds": 4.2,

      "endSeconds": 10.8,

      "durationSeconds": 60,

      "autoAdvance": true
    }
  ],

  "createdUtc": "2026-08-13T08:00:00Z",

  "updatedUtc": "2026-08-13T08:00:00Z"
}
```

---

# 28. Public Creator StepsItem

Example:

```json
{
  "id": "steps_01CREATOR",

  "createdByUserId": "usr_joe",

  "linkedPlatformAccountId": "platform_tiktok_joe",

  "visibility": "public",

  "status": "published",

  "slug": "morning-stretch",

  "title": "5 Minute Morning Stretch",

  "video": {
    "provider": "tiktok",

    "externalVideoId": "745293857293",

    "sourceUrl": "https://www.tiktok.com/...",

    "creatorExternalAccountId": "12345",

    "creatorUsername": "therealjoefitness"
  },

  "steps": [],

  "createdUtc": "2026-08-13T08:00:00Z",

  "publishedUtc": "2026-08-13T08:30:00Z"
}
```

---

# 29. Creator Publishing Ownership Rule

A user can create private Personal Steps for any supported public source video.

A user may only publish a public Creator Steps item when:

```text
they own a verified LinkedPlatformAccount
and
the source video belongs to that linked account
```

Enforce this server-side.

Do not trust client-supplied ownership information.

---

# 30. StepDefinition

Suggested:

```csharp
public sealed class StepDefinition
{
    public required string Id { get; init; }

    public required int Order { get; init; }

    public required string Title { get; init; }

    public string? Description { get; init; }

    public required double StartSeconds { get; init; }

    public required double EndSeconds { get; init; }

    public int? DurationSeconds { get; init; }

    public bool AutoAdvance { get; init; }
}
```

Validation:

```text
Order >= 1

Title not blank

StartSeconds >= 0

EndSeconds > StartSeconds

DurationSeconds is null or > 0

EndSeconds <= video duration when duration is known
```

---

# 31. Video Segment vs Activity Duration

These are different.

Example:

```text
video segment:
4.2 → 10.8 seconds

activity duration:
60 seconds
```

The video segment loops while the real-world timer runs.

---

# 32. Untimed Steps

If:

```text
DurationSeconds = null
```

the source segment loops indefinitely.

User manually selects:

```text
Next
Previous
another Step
```

Useful for:

```text
recipes
DIY
crafts
makeup
```

---

# 33. Timed Steps

If:

```text
DurationSeconds != null
```

show a countdown.

At zero:

```text
if AutoAdvance:
    select next Step
else:
    mark current Step complete
```

---

# 34. Frontend VideoPlayer Abstraction

Define:

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

TikTok implementation:

```typescript
export class TikTokVideoPlayer implements VideoPlayer
{
}
```

Future implementations:

```text
YouTubeVideoPlayer

InstagramVideoPlayer

VimeoVideoPlayer
```

No generic playback logic should depend on TikTok APIs.

---

# 35. StepPlaybackService

Create a dedicated playback service.

Responsibilities:

```text
maintain current StepsItem

maintain selected Step

select Step

Next

Previous

seek source video

loop source segment

run real-world activity timer

pause/resume

auto-advance

completion

analytics hooks later
```

Do not place this logic directly inside Angular components.

---

# 36. Loop Behaviour

When Step selected:

```text
stop previous timer

set selected Step

seek StartSeconds

start playback

start timer if required
```

While playing:

```typescript
if (currentTime >= currentStep.endSeconds) {
    await player.seek(currentStep.startSeconds);
}
```

Do not rely on exact timestamp equality.

---

# 37. Mobile Viewer

Design phone-first.

Primary target:

```text
iPhone portrait
```

Example:

```text
┌─────────────────────────────┐
│ Joe Fitness                 │
│ Morning Shoulder Routine    │
├─────────────────────────────┤
│                             │
│        SOURCE VIDEO         │
│                             │
├─────────────────────────────┤
│ Step 2 of 5                 │
│                             │
│ SHOULDER ROLLS              │
│                             │
│           00:24             │
│                             │
│ ◀ Previous       Next ▶     │
│                             │
├─────────────────────────────┤
│ 1    ●2    3    4    5      │
└─────────────────────────────┘
```

Use:

```text
large touch targets
clear selected state
safe-area support
minimal text entry
```

---

# 38. Public Routes

Canonical:

```text
/{providerAlias}/{platformUsername}/{stepsSlug}
```

Examples:

```text
/t/therealjoefitness/morning-stretch

/y/joefitness/morning-stretch
```

These routes are anonymous/public.

---

# 39. Private Routes

Private user content:

```text
/my/steps/{id}
```

Authentication required.

The server must enforce ownership.

Route guards alone are insufficient.

---

# 40. Public Access

Anonymous users can:

```text
view public Creator Steps

play

navigate

use timers

view linked creator account

open original platform profile

view more public Steps
```

No login required.

---

# 41. Personal Library

Authenticated users have:

```text
My Steps
```

Example:

```text
Shoulder Mobility
@joefitness · TikTok

Chicken Carbonara
@cookwithsarah · TikTok

Lower Back Stretch
@physiomike · TikTok
```

MVP actions:

```text
open
create
edit
archive/delete
start
```

---

# 42. Personal Creation

Workflow:

```text
My Steps
↓
Add
↓
Paste TikTok URL
↓
Load video
↓
Create Step
↓
Set start/end
↓
Optional activity duration
↓
Save
```

Automatically set:

```text
createdByUserId = current authenticated user

visibility = Private

linkedPlatformAccountId = null
```

---

# 43. Creator Flow

Workflow:

```text
Creator Dashboard
↓
Choose verified linked account
↓
Choose/paste video belonging to account
↓
Create Steps
↓
Preview
↓
Publish
```

Published item:

```text
visibility = Public

linkedPlatformAccountId = verified account
```

---

# 44. Connected Accounts UI

Eventually account settings should distinguish:

```text
SIGN-IN METHODS

Microsoft ✓
Facebook ✓
Google +
Apple +

CONNECTED CREATOR ACCOUNTS

TikTok
@therealjoefitness ✓

YouTube
@joefitness ✓

Instagram
@joe.fitness ✓
```

These are distinct concepts.

---

# 45. Cosmos Containers

Initial suggestion:

```text
Users

ExternalIdentities

Creators

LinkedPlatformAccounts

StepsItems
```

Analytics can be separate later.

If some entities can be safely consolidated without reducing clarity, Cursor may suggest simplification.

Do not create excessive containers unnecessarily.

---

# 46. Cosmos Partitioning

Suggested initial `StepsItems` partition key:

```text
/createdByUserId
```

This supports personal-library access efficiently.

Public provider/username/slug access may initially require cross-partition querying.

Expected MVP scale is very small.

Do not introduce complex denormalisation before real access patterns justify it.

---

# 47. ExternalIdentity Security

Never accept:

```text
userId
```

from a client request as ownership proof.

Authenticated identity must resolve server-side:

```text
JWT
↓
Auth0 subject
↓
ExternalIdentity
↓
Steps UserId
```

The resolved internal user ID is authoritative.

---

# 48. Public Creator Ownership Security

Publishing requires server-side verification:

```text
currentUser.UserId
owns
LinkedPlatformAccount.UserId
```

and:

```text
LinkedPlatformAccount.IsVerified == true
```

and the video must belong to that external account.

---

# 49. Authentication Providers

Auth0 configuration should permit:

```text
Apple
Google
Microsoft
Facebook
```

Do not build custom OAuth integrations for these providers.

Auth0 is the authentication broker.

Platform APIs may still require separate OAuth flows when accessing creator account/video data.

That platform authorisation belongs under:

```text
LinkedPlatformAccount
```

not authentication identity.

---

# 50. Provider Integration Separation

Backend:

```text
Features/
└── VideoProviders/
    ├── TikTok/
    ├── YouTube/
    └── Instagram/
```

Frontend:

```text
video/
└── providers/
    ├── tiktok/
    ├── youtube/
    └── instagram/
```

Only TikTok should be implemented initially.

---

# 51. TikTok Provider

Create:

```text
TikTokVideoPlayer
TikTokVideoProviderService
```

TikTok-specific code must remain isolated.

Generic Steps components must not know TikTok API implementation details.

---

# 52. Future Provider Expansion

The architecture should allow:

```text
YouTube
Instagram
Vimeo
```

without changes to:

```text
StepDefinition

StepPlaybackService

timer behaviour

navigation behaviour
```

Provider-specific logic should only concern video loading/control/account integration.

---

# 53. Multiple Domains

Do not implement separate applications or domains for:

```text
StepTok
StepTube
StepReels
Stepagram
```

Use one application and one canonical domain.

Provider is represented in the URL path.

Separate domains may be purchased later for defensive branding/redirect purposes but are not part of application architecture.

---

# 54. Authentication Provider Independence

Auth0 must not leak deeply into application code.

Avoid:

```text
Auth0-specific User IDs
Auth0-specific profile models
Auth0-specific domain services
```

outside authentication infrastructure.

If Auth0 is replaced later, product data should remain unchanged.

---

# 55. Auth0 Migration Capability

Architecture should permit:

```text
ExternalIdentity:

provider = auth0
subject = auth0|123
user = usr_ABC
```

to coexist temporarily with:

```text
provider = future-provider
subject = abc123
user = usr_ABC
```

during a future identity-provider migration.

No StepsItem migration should be required.

---

# 56. API — Public

Example:

```http
GET /api/public/{providerAlias}/{username}/{slug}
```

Returns only:

```text
Published
+
Public
```

content.

---

# 57. API — Personal

Authentication required:

```http
GET /api/me/steps

GET /api/me/steps/{id}

POST /api/me/steps

PUT /api/me/steps/{id}

DELETE /api/me/steps/{id}
```

All ownership is derived from the authenticated user.

---

# 58. API — Linked Platform Accounts

Authentication required:

```http
GET /api/me/platform-accounts

POST /api/me/platform-accounts/{provider}/connect

DELETE /api/me/platform-accounts/{id}
```

Exact OAuth flow can be provider-specific.

---

# 59. API — Creator

Authentication required:

```http
GET /api/creator/steps

POST /api/creator/steps

PUT /api/creator/steps/{id}

POST /api/creator/steps/{id}/publish

POST /api/creator/steps/{id}/archive
```

Publishing validates linked-account ownership.

---

# 60. Timestamp Editor

MVP may initially use numeric timestamps.

Preferred quick controls later:

```text
Set current video position as Step Start

Set current video position as Step End
```

Avoid making manual decimal entry the long-term editor experience.

---

# 61. Analytics

Do not build advanced analytics during initial MVP.

Potential events:

```text
StepsViewed

StepsStarted

StepStarted

StepCompleted

StepsCompleted

PlatformProfileClicked

PersonalStepsCreated
```

Analytics must never interfere with playback.

---

# 62. AI

Do not implement AI in initial MVP.

Future paid workflow:

```text
Share video
↓
AI identifies likely Steps
↓
User checks/edit
↓
Save
```

Manual creation must remain functional.

---

# 63. Future Collections and Routines

Do not implement initially.

Potential future concepts:

```text
Collections

Fitness
Recipes
DIY
```

and:

```text
Routine

Warmup Steps
Workout Steps
Cooldown Steps
```

---

# 64. Security Testing

Required tests:

```text
Anonymous can access public Steps

Anonymous cannot access private Steps

Owner can access private Steps

Different authenticated user cannot access private Steps

Owner can update own private Steps

Different user cannot update private Steps

Unverified creator cannot publish public Steps

User cannot publish against another user's linked account
```

---

# 65. Playback Testing

Required tests:

```text
select Step seeks correctly

Next works

Previous works

segment loops

untimed Step loops indefinitely

timer starts

timer stops on navigation

timer auto-advances where configured

final Step completes correctly
```

---

# 66. MVP Development Order

Do not build everything at once.

## Phase 1 — Playback Spike

Build:

```text
Angular application

Capacitor setup

VideoPlayer interface

TikTokVideoPlayer

hard-coded StepsItem

mobile viewer

Next

Previous

direct selection

segment looping

optional activity timer
```

No:

```text
Auth0
Cosmos
creator accounts
analytics
```

yet.

---

## Phase 2 — iPhone Validation

Test Phase 1 in:

```text
desktop Chrome

Safari on iPhone

Capacitor iOS WebView
```

Do not proceed deeply until TikTok playback works acceptably in all required environments.

---

## Phase 3 — Backend & Persistence

Build:

```text
ASP.NET Core API

Cosmos

StepsItems

basic repositories

public read

private CRUD
```

---

## Phase 4 — Auth0 & Internal Identity

Build:

```text
Auth0 integration

JWT validation

ExternalIdentity

Steps User

ICurrentUser

first-login provisioning
```

Ensure all product data uses internal Steps User IDs.

---

## Phase 5 — Personal Library

Build:

```text
My Steps

create Personal Steps

edit

delete/archive

private playback
```

---

## Phase 6 — Personal Editor

Build:

```text
paste TikTok URL

load video

add Steps

timestamp editing

timer settings

preview

save
```

---

## Phase 7 — Linked Platform Accounts

Build:

```text
LinkedPlatformAccount model

TikTok creator account connection

ownership verification

account settings
```

---

## Phase 8 — Creator Publishing

Build:

```text
Creator model

Creator dashboard

public publishing

provider-based URLs

creator/public listing
```

---

## Phase 9 — Additional Authentication Providers

Configure:

```text
Google

Microsoft

Facebook

Apple
```

through Auth0 as required.

Do not create separate application authentication implementations.

---

## Phase 10 — Basic Analytics & UX Refinement

Add:

```text
analytics events

mobile polish

loading states

error states

PWA refinements

sharing
```

---

# 67. Explicitly Out of Scope

Do not implement unless separately requested:

```text
AI Step creation

subscriptions

Stripe

consumer billing

creator billing

YouTube playback

Instagram playback

advanced analytics

Collections

Routines

user messaging

likes

comments

followers

social feed

video downloading

video hosting

offline source-video playback

push notifications

microservices

CQRS

event sourcing
```

---

# 68. Primary Architectural Rules

Cursor must follow these rules:

1. Steps owns its own internal User ID.

2. Auth0 IDs must not be used as domain IDs.

3. Auth0 authentication and linked social creator accounts are separate concepts.

4. A creator may link multiple platforms.

5. A creator may link multiple accounts from the same platform.

6. Social-platform usernames are mutable aliases, not database identities.

7. External platform account IDs are the stable creator-account identities.

8. Steps does not maintain a global creator username namespace.

9. Public creator URLs use provider + platform username + Steps slug.

10. Personal Steps are private by default.

11. Public Steps require verified ownership of the source creator account.

12. TikTok-specific playback logic remains behind the VideoPlayer abstraction.

13. Angular remains the single frontend codebase for web/PWA/native.

14. Private resource ownership is always enforced server-side.

15. Do not over-engineer for scale that does not yet exist.

---

# 69. First Task for Cursor

Do not implement the full specification.

Start only with Phase 1.

Task:

> Create the initial Angular frontend and configure Capacitor for iOS. Build a provider-independent `VideoPlayer` abstraction and a TikTok implementation. Create a mobile-first hard-coded Steps viewer containing at least one untimed Step and one timed Step. Implement direct Step selection, Previous, Next, segment looping and real-time activity countdown behaviour. Keep all TikTok implementation details isolated behind the VideoPlayer abstraction. Do not create the ASP.NET backend, Cosmos integration, Auth0 integration, user accounts, creator accounts or analytics yet. The sole objective of this first implementation is to prove that the core playback interaction works correctly in desktop Chrome, Safari on iPhone and a Capacitor iOS WebView.