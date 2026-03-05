-- Combined seed data for NetOpsAI Gateway
-- Usage:
--   docker cp db/seed-all.sql netopsai-gateway-postgres:/tmp/
--   docker exec -i netopsai-gateway-postgres psql -U postgres -d netopsai_gateway -f /tmp/seed-all.sql

\set ON_ERROR_STOP on

-- Asset management module seed
\i db/seed-assets-management.sql

-- QLTS workflow demo seed
\i db/seed-qlts-demo.sql

-- Supplemental seed for under-seeded features/modules
\i db/seed-feature-complete.sql

-- Step 3 completion seed for governance/audit/workflow gaps
\i db/seed-step3-completion.sql
