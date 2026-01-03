# API Docs & OpenAPI

## How to view
- Swagger UI: `/docs` (Fastify Swagger UI).
- OpenAPI JSON: `/openapi.json` (generated from route schemas).
- Optional Redoc: not enabled.

## Status
- Inventory + migration updated (`docs/api/INVENTORY.md`, `docs/api/MIGRATION.md`).
- Global problem+json error handler in place; legacy error envelope kept for compatibility.
- RESTful `/api/*` routes live alongside legacy `/api/chat/*` (deprecated headers).
- Swagger UI + OpenAPI enabled.

## Conventions
- Resource-first paths, kebab-case segments.
- RFC 7807 errors with `requestId`.
- Pagination meta `{ limit, page|cursor, total }`.
- Auth: Bearer JWT.

## Running
- Dev: `pnpm --filter @apps/api dev` or `docker-compose up`.
- Docs: open `http://localhost:3000/docs` (or container hostname).
- Tests: `pnpm test:e2e` (web-ui smoke) plus API contract tests (to be added).
