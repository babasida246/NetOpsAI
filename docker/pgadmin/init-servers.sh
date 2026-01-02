#!/bin/sh
# Init script for pgAdmin: generate `servers.json` from runtime env and
# attempt to register the server via pgAdmin HTTP API. Logs actions to /tmp.

set -ex

LOGFILE=/tmp/init-servers.log
echo "init-servers starting: $(date)" > $LOGFILE


PGADMIN_URL=${PGADMIN_URL:-http://127.0.0.1:80}
ADMIN_EMAIL=${PGADMIN_DEFAULT_EMAIL:-admin@example.com}
ADMIN_PASS=${PGADMIN_DEFAULT_PASSWORD:-admin}
PRESEED_FILE=/pgadmin4/servers.json

# Wait for pgAdmin to be reachable
MAX_RETRIES=60
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -sS -f "$PGADMIN_URL/" >/dev/null 2>&1; then
    break
  fi
  RETRY=$((RETRY+1))
  sleep 1
done

# If preseed file present, try to use it via HTTP API (best-effort)
if [ -f "$PRESEED_FILE" ]; then
  # Generate a servers.json that includes runtime POSTGRES_USER/POSTGRES_PASSWORD
  GENERATED=/tmp/pg_servers_generated.json
  cat > "$GENERATED" <<EOF
{
  "Servers": {
    "1": {
      "Name": "NetOpsAI Gateway - PostgreSQL",
      "Group": "NetOpsAI",
      "Host": "postgres",
      "Port": 5432,
      "MaintenanceDB": "${POSTGRES_DB:-netopsai_gateway}",
      "Username": "${POSTGRES_USER:-postgres}",
      "Password": "${POSTGRES_PASSWORD:-}",
      "SSLMode": "prefer",
      "Comment": "Auto-configured connection to NetOpsAI Gateway database"
    }
  }
}
EOF

  # attempt API login and POST using the generated file (best-effort)
  TMP_COOKIE=/tmp/pgadmin_cookie
  echo "Trying pgAdmin login at $PGADMIN_URL/login" >> $LOGFILE
  curl -v -sS -c $TMP_COOKIE -X POST "$PGADMIN_URL/login" \
    -H 'Content-Type: application/json' \
    -d "{\"email\": \"$ADMIN_EMAIL\", \"password\": \"$ADMIN_PASS\"}" 2>>$LOGFILE || true

  for endpoint in "/browser/server/register" "/browser/server/save" "/api/servers" "/api/servers/"; do
    echo "Trying endpoint $endpoint" >> $LOGFILE
    curl -v -sS -b $TMP_COOKIE "$PGADMIN_URL${endpoint}" -H 'Content-Type: application/json' -d @"$GENERATED" 2>>$LOGFILE || true
  done

  # Fallback: copy the generated file into the pgAdmin data dir
  if [ -d "/var/lib/pgadmin" ]; then
    echo "Copying generated servers.json to /var/lib/pgadmin/servers.json" >> $LOGFILE
    cp -f "$GENERATED" /var/lib/pgadmin/servers.json || true
  fi

  echo "init-servers finished" >> $LOGFILE
fi

exit 0

