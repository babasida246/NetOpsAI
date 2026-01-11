# NetOpsAI E2E Tests

## Prereqs
- API & Web UI running (Docker: `docker compose up -d`). Default UI base: `http://localhost:3003`.
- Env creds for login: `E2E_USER` / `E2E_PASS` (fallback to `ADMIN_EMAIL` / `ADMIN_PASSWORD`). Defaults: `admin@example.com` / `ChangeMe123!`.

## Run
```bash
pnpm install
pnpm test:e2e            # headless
pnpm test:e2e:ui         # Playwright UI mode
```
Reports: `tests/e2e/reports/html` and `tests/e2e/reports/junit.xml`. Traces/screenshots/videos kept on failures (`tests/e2e/artifacts`). Storage state saved to `tests/e2e/.auth/state.json` by global setup.

## Notes
- Tests fail on console errors, uncaught exceptions, and unexpected 401/500 responses in authenticated flows.
- Base URL override: `E2E_BASE_URL=http://localhost:3003 pnpm test:e2e`.
