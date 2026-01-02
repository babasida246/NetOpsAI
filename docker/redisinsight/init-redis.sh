#!/bin/sh
# Auto-configure RedisInsight with NetOpsAI Redis connection; log to /tmp

set -ex
LOG=/tmp/init-redis.log
echo "init-redis starting: $(date)" > $LOG

# Wait for RedisInsight HTTP API to become available
MAX_RETRIES=180
RETRY=0
while [ $RETRY -lt $MAX_RETRIES ]; do
  if curl -sS -f http://localhost:5540/ >/dev/null 2>&1; then
    break
  fi
  RETRY=$((RETRY+1))
  sleep 1
done

# Give the application a short grace period to finish initializing keyring/keytar
sleep 3

# Build payload file (expand REDIS_PASSWORD safely)
cat > /tmp/ri_payload.json <<EOF
{
  "name": "NetOpsAI Gateway Redis",
  "host": "redis",
  "port": 6379,
  "password": "${REDIS_PASSWORD:-}",
  "tls": false
}
EOF

echo "Payload:" >> $LOG
cat /tmp/ri_payload.json >> $LOG

# Post the database connection and capture response
HTTP_OUT=/tmp/ri_response.json
curl -v -sS -X POST http://localhost:5540/api/databases \
  -H 'Content-Type: application/json' \
  -d @/tmp/ri_payload.json -o $HTTP_OUT -w "HTTPSTATUS:%{http_code}" 2>>$LOG || true

echo "Response:" >> $LOG
cat $HTTP_OUT >> $LOG || true

echo "init-redis finished" >> $LOG
exit 0

