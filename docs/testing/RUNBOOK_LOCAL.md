# Local Test Runbook

## Start Stacks
1) Cloud data: `pnpm compose:cloud:data`
2) Cloud app: `pnpm compose:cloud:app`
3) Edge data: `pnpm compose:edge:data`
4) Edge app: `pnpm compose:edge:app`

## Migrate All DBs
- Run per-service migrations from each service package
- Validate migration history tables

## Seed Demo Tenant
- Use existing seed scripts in db/ or service-specific seeders
- Verify demo admin login

## Run Tests
- Unit: `pnpm test:unit`
- Integration: `pnpm test:integration:all`
- E2E web-cloud: `pnpm test:e2e:web-cloud`
- E2E web-edge: `pnpm test:e2e:web-edge`

## Debug Tips
- Logs: `docker compose logs -f`
- DB connect: check per-service connection strings
- Playwright: enable `PWDEBUG=1` and review traces
- Correlation: track `correlationId` in API logs and audit tables
