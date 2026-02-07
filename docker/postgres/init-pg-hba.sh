#!/bin/bash
# Copy custom pg_hba.conf if it doesn't exist
if [ ! -f "$PGDATA/pg_hba.conf" ]; then
    cp /docker-entrypoint-initdb.d/02-pg_hba.conf "$PGDATA/pg_hba.conf"
    chown postgres:postgres "$PGDATA/pg_hba.conf"
    chmod 600 "$PGDATA/pg_hba.conf"
fi