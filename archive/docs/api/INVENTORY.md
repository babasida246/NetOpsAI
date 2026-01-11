# API Inventory (Current vs RESTful normalised)

## Stack Overview
- **API**: Fastify (TypeScript) with Zod schemas (`integrated-chat.routes.ts`, `conversations.routes.ts`, `admin.routes.ts`, `netopsRoutes`, `tools.routes.ts`).
- **DB**: PostgreSQL.
- **Auth**: JWT (access + refresh) via bearer `Authorization`.
- **Consumers**: `apps/web-ui` SvelteKit (calls configured by `VITE_API_BASE`).
- **Gaps previously**: mixed resources under `/chat/*`, non-uniform error payloads, missing OpenAPI exposure (now added).

## Route Inventory
| Current Endpoint | Purpose / Notes | Consumer (web-ui) | RESTful Endpoint (now available) |
| --- | --- | --- | --- |
| `POST /api/auth/login` | Login | `/login` | same |
| `POST /api/auth/refresh` | Refresh tokens | auth client | same |
| `POST /api/auth/logout` | Logout | navbar/logout | same |
| `GET /api/auth/me` | Current user | navbar | same |
| `GET /api/conversations` | List conversations | `/chat` | same |
| `POST /api/conversations` | Create conversation | `/chat` | same |
| `GET /api/conversations/:id` | Get conversation | `/chat` | same |
| `DELETE /api/conversations/:id` | Delete conversation | `/chat` | same |
| `GET /api/conversations/:id/messages` | List messages | `/chat` | same |
| `POST /api/conversations/:id/messages` | Add message | `/chat` | same |
| `POST /api/chat/send` | Chat send (legacy) | `/chat` | `POST /api/chat/messages` |
| `POST /api/chat/completions` | Completion (legacy) | `/chat` | `POST /api/completions` |
| `GET /api/chat/stats/conversation/:id` | Conversation stats | `/chat` | `/api/stats/chat/conversations/:id` |
| `GET /api/chat/stats/user` | User stats | `/stats` | `/api/stats/chat/user` |
| `GET /api/chat/stats/daily` | Daily usage | `/stats` | `/api/stats/chat/daily` |
| `GET /api/chat/models` | List models | `/models` | `/api/models` |
| `GET /api/chat/models/:id` | Get model | `/models` | `/api/models/:id` |
| `POST /api/chat/models` | Create model | `/models` | `/api/models` |
| `PATCH /api/chat/models/:id` | Update model | `/models` | `/api/models/:id` |
| `DELETE /api/chat/models/:id` | Delete model | `/models` | `/api/models/:id` |
| `PATCH /api/chat/models/:id/priority` | Update priority | `/models` | `/api/models/:id/priority` |
| `GET /api/chat/models/:id/performance` | Performance | `/models` | `/api/models/:id/performance` |
| `GET /api/chat/models/:id/history` | Usage history | `/models` | `/api/models/:id/history` |
| `GET /api/chat/providers` | List providers | `/models` | `/api/providers` |
| `POST /api/chat/providers` | Create provider | `/models` | `/api/providers` |
| `PATCH /api/chat/providers/:id` | Update provider | `/models` | `/api/providers/:id` |
| `DELETE /api/chat/providers/:id` | Delete provider | `/models` | `/api/providers/:id` |
| `GET /api/chat/providers/:id/history` | Provider history | `/models` | `/api/providers/:id/history` |
| `GET /api/chat/providers/:id/health` | Provider health | `/models` | `/api/providers/:id/health` |
| `GET /api/chat/providers/openrouter/models` | OR remote models | `/models` | `/api/providers/openrouter/remote-models` |
| `POST /api/chat/providers/openrouter/import-model` | Import OR model | `/models` | `/api/providers/openrouter/models/import` |
| `GET /api/chat/providers/openrouter/account` | OR account | `/models` | `/api/providers/openrouter/account` |
| `GET /api/chat/providers/openrouter/credits` | OR credits | `/models` | `/api/providers/openrouter/credits` |
| `GET /api/chat/usage/logs` | Recent usage | `/models` | `/api/usage/logs` |
| `GET /api/chat/orchestration` | List rules | `/models` | `/api/orchestration/rules` |
| `POST /api/chat/orchestration` | Create rule | `/models` | `/api/orchestration/rules` |
| `PATCH /api/chat/orchestration/:id` | Update rule | `/models` | `/api/orchestration/rules/:id` |
| `DELETE /api/chat/orchestration/:id` | Delete rule | `/models` | `/api/orchestration/rules/:id` |
| `GET /api/admin/users` (and CRUD) | User admin | `/admin` | same |
| `POST /api/admin/users/:id/reset-password` | Reset password | `/admin` | same |
| `GET /api/admin/audit-logs` | Audit logs | `/admin` | same |
| `POST /api/tools/generate-config` | Config generator | tools | same |
| `GET/POST/PATCH/DELETE /api/netops/*` | NetOps devices/configs/rulepacks/changes | NetOps pages | same |

## Immediate REST Updates
- Legacy `/api/chat/*` kept with deprecation headers; RESTful `/api/*` is primary.
- Error format now RFC 7807 + legacy `error` envelope.
- Swagger/OpenAPI exposed at `/docs` and `/openapi.json`.

## TODO Coverage
- Add contract tests vs OpenAPI for models/providers/orchestration/chat send.
- Ensure pagination filter metadata documented per endpoint.
