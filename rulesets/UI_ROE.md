# UI Rules of Engagement (ROE)

Project-agnostic. Apply to all Angular + Angular Material UI work unless a project-specific override is explicitly agreed.

## Compliance

- **Strict adherence** — These rules take priority over convenience or habit.
- **Confirmation required** — If a request appears to violate these rules, ask before proceeding.
- **Living document** — Rules may be extended; do not silently ignore new additions.
- **Misunderstanding check** — Clarify when a request conflicts with this ROE.

## General Principles

- **Mobile-friendly at all times**
- **Angular Material** for UI — follow Material best practices; prefer patterns from [material.angular.dev](https://material.angular.dev)
- **Modularise** to keep initial download size down (lazy-loaded feature modules)
- A dedicated **Material module** (or shared Material import surface) holds all Angular Material references — feature code imports that surface, not ad-hoc Material imports scattered everywhere
- Components are always split into **separate** `.ts` / `.html` / `.scss` (or `.css`) files — **never** inline templates or styles
- **All pages** use the `page-template` component for initial layout unless explicitly told not to
- One component per folder — **never** multiple components in a single folder
- Name components consistently within a module (e.g. `create-team.component`, `create-club.component`)

## Project Structure

```text
modules/
  {feature}/
    services/      # ALL feature services
    components/    # reusable feature components (not pages)
    pages/         # ALL page-level components
    models/        # ALL feature models
  ...
core/
  services/
  components/
  interceptors/
  static/
  guards/
  models/
app.component.* 
app.routes.*
```

### Module Folder Rules

- Page-level components → `pages/` only
- Reusable/shared feature components → `components/` at module root
- Services → `services/` at module root
- Models → `models/` at module root
- Routes reference pages as: `./pages/{name}/{name}.component`

### Import Path Conventions (from a `pages/` component)

| Target | Typical relative path |
| --- | --- |
| App-level (`app` components / services / models) | `../../../../...` (4 levels up) |
| Core module | `../../../core/...` |
| Same-module services / models / components | `../../services/`, `../../models/`, `../../components/` |
| Extra nesting (e.g. `pages/x/tabs/`) | Add one `../` per extra folder |

Example from `modules/teams/pages/view-team/`:

- App `page-template`: `../../../../components/page-template/page-template.component`
- App service: `../../../../services/user.service`
- Core Material: `../../../core/material.module`
- Module service: `../../services/team.service`
- Module model: `../../models/team-edit.model`
- Module component: `../../components/fixture-list/fixture-list.component`

Adjust depth if the app root layout differs; keep **relative imports consistent** with the structure above.

## TypeScript & Models

- Angular/TypeScript model properties use **camelCase** (e.g. `badgeUrl`, `clubName`)
- Align with API JSON camelCase conventions

## Observables (Strict)

- Prefer **observables + async pipe** over manual subscriptions
- Template pattern: `*ngIf="data$ | async as data"`
- Avoid `.subscribe()` in components — let async pipe manage lifecycle
- Services return **observables**, not promises or raw eagerly resolved data
- Transform and handle errors with RxJS operators (`map`, `catchError`, `tap`, `switchMap`, `forkJoin`, etc.)
- Use `BehaviorSubject` (or similar) for state when needed
- Always handle errors with `catchError`
- Use `of()` for static/test data
- Prefer async pipe over manual change-detection calls for normal data flow

## Component Lifecycle & Timing (Strict)

- **Never** use `setTimeout`, `delay()`, or arbitrary waits for functional behaviour — they cause races and hide real readiness conditions
- Drive UI from **data availability**: loading flags, `*ngIf`, observables
- Initialize via lifecycle hooks (`ngOnInit`, `ngAfterViewInit`) and real conditions (API result, view-child presence), not time
- Defer expensive work until needed (e.g. lazy tab content)
- Images: use `load` / `error` events, not delays
- Post-success navigation: state or explicit user action, not delays
- Forms: proper debounce operators, not fixed delays
- Retries: exponential backoff with real error handling, not fixed delays
- `ExpressionChangedAfterItHasBeenCheckedError`: fix with structure, async pipe, or legitimate `ChangeDetectorRef` / `NgZone.run()` — **not** `setTimeout`
- If async work outside Angular needs CD, prefer `NgZone.run()` or completing an observable the template already binds to

## Azure / Backend Alignment

- Call Azure-backed APIs; do not invent parallel client-side persistence for server concerns
- Treat API dates as UTC; convert for display in the client
- Do not embed secrets in the UI bundle; use proper auth token flow (e.g. Auth0)

---

**Goal:** a modular, Material-based Angular UI that stays mobile-friendly, predictable, and free of timing hacks.
