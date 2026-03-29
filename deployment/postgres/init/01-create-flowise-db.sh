#!/bin/sh
set -eu

FLOWISE_DB="${FLOWISE_POSTGRES_DB:-flowise}"
FLOWISE_USER="${FLOWISE_POSTGRES_USER:-flowise}"
FLOWISE_PASSWORD="${FLOWISE_POSTGRES_PASSWORD:-}"

if [ -z "$FLOWISE_PASSWORD" ]; then
  echo "FLOWISE_POSTGRES_PASSWORD is required for production startup." >&2
  exit 1
fi

psql -v ON_ERROR_STOP=1 \
  --username "$POSTGRES_USER" \
  --dbname postgres \
  --set=flowise_db="$FLOWISE_DB" \
  --set=flowise_user="$FLOWISE_USER" \
  --set=flowise_password="$FLOWISE_PASSWORD" <<'EOSQL'
SELECT format('CREATE ROLE %I LOGIN PASSWORD %L', :'flowise_user', :'flowise_password')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_catalog.pg_roles
  WHERE rolname = :'flowise_user'
)\gexec

SELECT format('CREATE DATABASE %I OWNER %I', :'flowise_db', :'flowise_user')
WHERE NOT EXISTS (
  SELECT 1
  FROM pg_database
  WHERE datname = :'flowise_db'
)\gexec

SELECT format('GRANT ALL PRIVILEGES ON DATABASE %I TO %I', :'flowise_db', :'flowise_user')\gexec
EOSQL
