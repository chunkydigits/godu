# API Rules of Engagement (ROE)

Project-agnostic. Apply to all .NET / ASP.NET Core API work unless a project-specific override is explicitly agreed.

## Compliance

- **Strict adherence** — These rules take priority over convenience or habit.
- **Confirmation required** — If a request appears to violate these rules, ask before proceeding.
- **Living document** — Rules may be extended; do not silently ignore new additions.
- **Misunderstanding check** — Clarify when a request conflicts with this ROE.
- **No filler comments** — Only comment where value is added (non-obvious logic, rationale, caveats). Remove comments that merely label a section (e.g. "Register repositories").

## Solution Structure

Separate projects by layer (names follow `{Product}.{Layer}`):

| Project | Responsibility |
| --- | --- |
| `{Product}.Api` | ASP.NET host **and** controllers. Controllers live here; there is no separate Controller project. |
| `{Product}.Service` | Business logic |
| `{Product}.Repository` | Data access and final object validation before persistence |
| `{Product}.Model` | View models, DBOs, DTOs, request/response models |
| `{Product}.Utility` | Shared cross-cutting helpers (extensions, mapping, string utilities, etc.) when reuse across layers is needed |

### Layer Rules

**Controllers (`{Product}.Api`)** — Keep thin. Allowed concerns only:

- Authentication / authorization attributes on endpoints
- Request validation
- Pass-through to the service layer
- Basic try/catch for HTTP responses:
  - `400` — incorrect request / validation failure
  - `200` — success
  - `500` — unexpected failures caught in catch blocks
- Controllers may catch generic `Exception` for simplicity; introduce custom exceptions when distinct error handling is required
- Controllers do **not** use `.ConfigureAwait(false)` (HttpContext / framework context may be required)

**Services** — All business logic lives here.

- Every service has an interface in the **same folder**, in its **own file**
- Unit-test meaningful business behaviour (see Testing)
- Handle orchestration and data transformation between API models and persistence models

**Repositories** — Data interaction only, plus final validation of objects immediately before write.

- No business rules / domain decisions
- Separate repository per Cosmos collection
- Blob / other Azure storage access belongs here
- Every repository has an interface in the **same folder**, in its **own file**

**Models** — All models (view models, DBOs, DTOs, etc.). Focused, single-purpose types with appropriate validation attributes and serialization.

**Utilities** — Shared helpers only when truly reused across layers. Prefer extending existing utility classes over scattering duplicates.

## Coding Standards

### Namespaces & Style

- **File-scoped namespaces** on all C# files
- PascalCase for public members; camelCase for private fields and locals
- Descriptive names that state purpose

### Async

- Use `async`/`await` for I/O (database, storage, HTTP)
- Use `.ConfigureAwait(false)` on async calls in **services, repositories, and utilities** unless there is a documented reason not to
- Controllers are excluded from the ConfigureAwait requirement

### JSON (System.Text.Json only)

- Use **System.Text.Json** exclusively — no Newtonsoft.Json in new code
- Use `[JsonPropertyName("propertyName")]` when custom names are required
- JSON property names: **camelCase**
- Prefer System.Text.Json for performance and ASP.NET Core defaults

### Dates

- Store **UTC only** on the server
- Clients convert to/from local time
- Never assume client timezone or auto-convert on the server
- Convert inbound client dates to UTC before storage
- Serialize dates as ISO 8601 (e.g. `2025-08-14T00:00:00.000Z`)

### String & Shared Utilities

- Centralize string manipulation in `{Product}.Utility` (e.g. `StringUtilities`)
- Do **not** duplicate string helpers in controllers, services, or repositories
- If a helper is missing, add it to the utility class and call it from there

Examples of the kind of helpers that belong in utilities: slug generation, search-string building, random code generation.

### Error Handling & Security

- Validate and sanitize input
- Use appropriate HTTP status codes and meaningful error messages
- Log errors appropriately
- Authentication via **Auth0** tokens in request headers
- Authorization via a **user-auth** document (Cosmos) mapped to Auth0 user ID / permissions
- Cache user permissions in-memory for a configurable duration
- Follow OWASP-aligned practices; rate-limit where appropriate

### Performance

- Async for database/storage work
- Paginate large result sets
- Index queries appropriately
- Cache frequently accessed data when justified

### Secrets & Azure

- **No secrets in source control**
- Store secrets in **Azure Key Vault**; reference Key Vault from configuration
- Prefer Azure services already in use (Cosmos DB, Blob Storage, Key Vault, etc.) over inventing alternatives

## Dependency Injection

Use **two separate configuration classes** in the Api project:

1. `Configuration/RepositoryConfiguration.cs` — **only** `I*Repository` → `*Repository`
2. `Configuration/ServiceConfiguration.cs` — **only** `I*Service` → `*Service`

### Rules

- Never register repositories in `ServiceConfiguration`
- Never register services in `RepositoryConfiguration`
- Group registrations alphabetically or by domain within each file
- When adding a feature: register repository and service in their **respective** files
- Before committing DI changes: verify each file contains only its concern; ensure the Api starts without DI resolution errors

## Testing

- Test project folder layout should **mirror** the service layer
- Focus on **meaningful** business-logic tests — do not over-test or assert implementation details
- Cover **positive and negative** paths for service methods under test
- Naming: `<MethodName>_When<Condition>_Then<Result>`  
  Example: `ApproveJoinAsync_WhenAdminApproves_ThenShouldMoveUserToMembers`
- Integration tests for API endpoints are encouraged where they add confidence; they are not a substitute for service unit tests

## Documentation & Source Control

- XML docs on public APIs; keep them current; include examples when helpful
- Meaningful, atomic commits; feature branches; review before merge

---

**Goal:** a clean, layered, Azure-backed API that stays consistent and easy for the team to maintain.
