# Route Migration Checklist

**⚠️ MIGRATION BLOCKED** - See [INFRASTRUCTURE_GAPS.md](./INFRASTRUCTURE_GAPS.md) for details  
**Decision**: Keep `routes/v1` and `routes/v2` as-is (100 tests passing ✅)  
**Missing**: Repository implementations, database tables (users, sessions), service layer

This checklist maps every endpoint under `apps/gateway-api/src/routes/v1` and `v2` to an implementation action against the new `core` (use-cases/services). **However, migration cannot proceed without infrastructure layer completion.**

## How to read
- Status: `Done` = core use-case/service exists and covers endpoint. `Needs controller` = core has logic but no HTTP adapter. `Needs use-case` = route logic is only in route and must be moved to `core/use-cases`.
- Action: recommended next step.
- **BLOCKER**: ❌ = Missing infrastructure prevents implementation

---

## v1 routes (file-level)

- `src/routes/v1/auth/` (login, register, refresh, logout)
  - Status: Done
  - Action: Create thin controllers that call `core/use-cases/auth/*` and replace route handlers.

- `src/routes/v1/conversations/index.ts` (POST /v1/conversations, GET /v1/conversations)
  - Status: Done
  - Action: Wire to `core/use-cases/conversations/*` via controllers (thin mapping). Tests: run.

- `src/routes/v1/conversations/messages.ts` (GET/POST messages)
  - Status: Done
  - Action: Wire to `core/use-cases/messages/*` via controllers. Ensure streaming endpoints map to `chat.service`.

- `src/routes/v1/conversations/summarize.ts` (POST /v1/conversations/:id/summarize)
  - Status: Needs use-case
  - Action: Implement `core/use-cases/conversations/summarize.use-case.ts` to encapsulate summarization; then add thin controller. (Priority: High)

- `src/routes/v1/chat.ts` (legacy chat endpoints)
  - Status: Partial (core chat orchestration exists in `chat.service` and `send-message` use-case)
  - Action: Create thin controller mapping request DTO → `send-message` use-case / `chat.service`.

- `src/routes/v1/files.ts` (file upload / management)
  - Status: Needs use-case
  - Action: Implement `core/use-cases/files/*` or an infrastructure adapter for file storage; add controllers. (Priority: High if uploads used)

- `src/routes/v1/models.ts` (GET models/available, GET model/:id)
  - Status: Partial
  - Action: Create `core/use-cases/models/*` or `core/services/model.service` to provide model catalog; add controllers.

- `src/routes/v1/tools.ts` (tools listing / execute)
  - Status: Partial
  - Action: Implement missing tool management use-cases in `core/use-cases/tools` (listing, metadata). Execution logic can reuse `chat.service`'s tool execution. Add controllers.

- `src/routes/v1/providers-health.ts` (providers health checks)
  - Status: Needs controller/service wrapper
  - Action: Add a small `core/service` or `application` wrapper that queries provider adapters and expose through controller.

- `src/routes/v1/admin/*` (database, redis, providers, models, system, users, roles, policies)
  - Status: Needs use-cases
  - Action: Implement admin use-cases in `core/use-cases/admin/*` or keep admin-specific thin handlers but factor out reusable logic into `core` first. (Priority: Medium)

- `src/routes/v1/audit.ts` (GET /v1/audit/events, GET /v1/audit/events/:id)
  - Status: Needs use-case
  - Action: Move audit queries into `core/use-cases/audit/*` or `infrastructure` service; then add controllers. (Priority: Medium)

- `src/routes/v1/incidents.ts` (incident reports)
  - Status: Needs use-case
  - Action: Implement `core/use-cases/incidents` and controllers. (Priority: Low/Medium)

- `src/routes/v1/stats.ts` (metrics/stats endpoints)
  - Status: Partial
  - Action: Ensure metrics access is provided by `observability` services; create controllers mapping data.

- `src/routes/v1/providers-health.ts` (already above)

---

## v2 routes

- `src/routes/v2/chat.ts` (v2 chat endpoints)
  - Status: Partial (core `chat.service` present)
  - Action: Create thin v2 controllers that call `chat.service` streaming/async methods and map v2 request/response DTOs.

- `src/routes/v2/chat-stream.ts` (SSE streaming endpoints)
  - Status: Partial (chat.service has streaming support)
  - Action: Implement controller that opens SSE and streams tokens/events from `chat.service`. Test SSE behavior.

---

## Cross-cutting endpoints (misc)

- Files & Uploads: `files.ts` — Needs use-case/infrastructure adapter (S3/local). High priority if client uses uploads.
- Summarize: `conversations/summarize.ts` — Needs use-case. High priority for conversation features.
- Models: `models.ts` — Needs dedicated core read-model/service for model catalog and tier mapping.
- Tools: Add CRUD/list use-cases in `core/use-cases/tools` where missing.
- Admin endpoints: migrate selectively; keep high-level admin use-cases in `core`.
- Audit/Incidents: move DB queries into `core` or `infrastructure/helpers` for testability.

---

## Suggested migration order (short):
1. Implement `summarize` use-case + controller (high-value, small scope).  
2. Wire `v2/chat-stream` SSE controllers to `chat.service` (streaming tests).  
3. Implement `files` use-cases/adapters if required by clients.  
4. Add models use-case/service and tools listing.  
5. Migrate admin/audit/incidents last.

---

## Notes & Next Steps
- After each feature migration run unit & integration tests and the API route tests.  
- Keep old `src/routes/v1`/`v2` registered until the new controllers pass tests—then remove and clean imports in `server.ts`.

---

Generated: December 24, 2025
