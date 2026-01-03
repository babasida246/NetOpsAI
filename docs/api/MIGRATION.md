# API Migration Plan (Legacy `/api/chat/*` → RESTful `/api/*`)

## Goals
- Keep a single, versionless `/api` surface but make it resource-oriented and consistent.
- Preserve legacy `/api/chat/*` adapters with deprecation headers: `Deprecation: true`, `Sunset: 2026-06-30`, `Link: </docs/api/MIGRATION.md>; rel="deprecation"`.
- Update web-ui to call the RESTful endpoints while older clients continue to function.

## Mapping (Legacy → New RESTful)
- `/api/chat/send` → `/api/chat/messages`  
- `/api/chat/completions` → `/api/completions`
- `/api/chat/stats/conversation/:id` → `/api/stats/chat/conversations/:id`
- `/api/chat/stats/user` → `/api/stats/chat/user`
- `/api/chat/stats/daily` → `/api/stats/chat/daily`
- `/api/chat/models*` → `/api/models*`
- `/api/chat/providers*` → `/api/providers*`
- `/api/chat/providers/openrouter/models` → `/api/providers/openrouter/remote-models`
- `/api/chat/providers/openrouter/import-model` → `/api/providers/openrouter/models/import`
- `/api/chat/orchestration*` → `/api/orchestration/rules*`
- `/api/chat/usage/logs` → `/api/usage/logs`
- Existing `/api/conversations*`, `/api/admin/*`, `/api/netops/*` stay resource-oriented.

## Error Format
- RFC 7807 Problem Details (`application/problem+json`) everywhere, including `type`, `title`, `status`, `detail`, `instance`, `requestId`, `errors`.
- Backward-compatible `{ error: { code, message, details } }` envelope retained.

## Pagination & Filtering
- Collections support `page`/`limit` (cursor-ready) plus filters; responses return `meta` with totals.

## Auth
- Bearer JWT unchanged. Consistent 401/403 semantics documented in OpenAPI.

## Steps
1) Keep legacy `/api/chat/*` with deprecation headers; add RESTful routes on `/api/*`.
2) Error handler emits problem+json globally.
3) Expose OpenAPI at `/docs` + `/openapi.json`; validate in CI.
4) Point web-ui calls to RESTful paths; keep adapters for old clients.
5) Add regression tests for CRUD (models, providers, orchestration, chat send) and contract checks.

## Backward Compatibility
- Legacy routes stay functional until the sunset date; headers signal migration. RESTful routes are the primary interface going forward.
