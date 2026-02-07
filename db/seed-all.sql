-- Combined seed data for NetOpsAI Gateway
-- Usage:
--   docker cp db/seed-all.sql netopsai-gateway-postgres:/tmp/
--   docker exec -i netopsai-gateway-postgres psql -U postgres -d netopsai_gateway -f /tmp/seed-all.sql

\set ON_ERROR_STOP on

-- Base inventory/organization/user data + CMDB
\i db/seed-data.sql

-- Asset management module seed
\i db/seed-assets-management.sql

-- QLTS workflow demo seed
\i db/seed-qlts-demo.sql
