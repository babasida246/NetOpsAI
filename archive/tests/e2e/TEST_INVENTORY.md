# Test Inventory - NetOpsAI Web UI (auto-generated)

## Discovered Apps & Frameworks
- Frontend: `apps/web-ui` (SvelteKit + Vite, Flowbite-Svelte UI). Default port: 3003 (Docker).
- Backend API: `apps/api` (Fastify, port 3000). Auth via JWT (access + refresh) stored in `localStorage` keys `authToken` / `refreshToken`. Admin creds from `.env` (`ADMIN_EMAIL`, `ADMIN_PASSWORD`).
- Relevant routes (from `apps/web-ui/src/routes`): `/login`, `/logout`, `/chat`, `/models`, `/stats`, `/admin`, `/netops/*` (devices, changes, configs, tools).

## Pages / Features (UI actions + observed API endpoints)
- **Login** (`/login`)
  - Actions: enter email/password, submit; error banner on failure. Uses `POST /api/auth/login`; stores JWTs; `POST /api/auth/refresh` for renewal; `POST /api/auth/logout` on logout page.
  - Preconditions: valid admin/user credentials.
- **Chat** (`/chat`)
  - Lists conversations (`GET /api/conversations`), create conversation (`POST /api/conversations`), list/send messages (`GET/POST /api/conversations/{id}/messages`), stats cards call `/api/chat/stats/*`. Requires auth; 401 redirect to login.
  - Actions: New chat button, select conversation, send message, view stats.
- **Models / Providers / Orchestration / OpenRouter** (`/models` with tabs)
  - Models: list/filter/group, edit, priority +/- (`PATCH /api/chat/models/{id}/priority`), delete (`DELETE /api/chat/models/{id}`), update (`PATCH /api/chat/models/{id}`), history/performance endpoints.
  - Providers: list, edit, delete, health check (`GET /api/chat/providers/{id}/health`), history.
  - Orchestration: list, create, edit, delete rules (`/api/chat/orchestration` CRUD).
  - OpenRouter tab: fetch remote models (`GET /api/chat/providers/openrouter/models`), import model (`POST /api/chat/providers/openrouter/import-model`), account (`GET /api/chat/providers/openrouter/account`), credits (`GET /api/chat/providers/openrouter/credits`).
- **Stats** (`/stats`)
  - User/usage charts calling `/api/chat/stats/user`, `/api/chat/stats/daily`.
- **Admin** (`/admin`)
  - Users table CRUD (`/api/admin/users`), reset password (`/api/admin/users/{id}/reset-password`), audit logs (`/api/admin/audit-logs`).
- **NetOps** (`/netops/*`)
  - Devices list/detail CRUD (`/api/netops/devices`), configs view/diff, rulepacks, lint runs, change requests, tools (`/api/tools/generate-config` via proxy `/api/tools`). Authentication required.

## Auth & Permissions
- JWT bearer stored in localStorage; fetch wrappers add `Authorization` header. Protected routes redirect to `/login` when unauthenticated. Admin-only routes enforced server-side (`requireAdmin`).

## Prioritized Test Matrix
- **P0 Smoke**: login, navbar navigation, chat load, models tab load, providers tab load, orchestration tab load, stats load.
- **P1 Core flows**: create conversation + send message; create/delete model; update model priority; provider health check; orchestration rule create/edit; OpenRouter remote models fetch + import; admin list users; netops devices list.
- **P2 Negative/edge**: unauthenticated access redirects/401; validation error on model import missing body; backend 500/401 surfaced as toast/error; search/filter/sort behaviors; pagination on OpenRouter list.

## Coverage Checklist
- [ ] Login success + storage state persisted
- [ ] Unauthorized -> redirect to /login
- [ ] Chat: create conversation, send message, stats cards visible
- [ ] Models: list/group, edit priority, delete (guarded)
- [ ] Providers: list, health check action
- [ ] Orchestration: create/update rule (model dropdown uses DB models)
- [ ] OpenRouter tab: fetch remote models (pagination), import model happy path, import validation error
- [ ] Stats page data cards render
- [ ] Admin users list loads, reset password action (stub)
- [ ] NetOps devices page loads
- [ ] Console/Network monitors: fail tests on uncaught errors, console errors, unexpected 401/500
