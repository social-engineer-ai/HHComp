#!/bin/bash
# Deploy hh-comp to EC2.
# Run from the project root on your local machine.
set -euo pipefail

HOST="${HOST:-16.59.203.133}"
KEY="${KEY:-./.secrets/hh-comp-key.pem}"
REMOTE_DIR="/opt/hh-comp"

echo "==> Deploying to $HOST"

# Build and push the app source via rsync (faster than SCP for incrementals)
if ! command -v rsync >/dev/null 2>&1; then
  echo "rsync not found; falling back to scp"
  TMP_TAR=$(mktemp --suffix=.tar.gz)
  tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.secrets --exclude=.env --exclude=.env.* --exclude=tsconfig.tsbuildinfo -czf "$TMP_TAR" .
  scp -i "$KEY" -o StrictHostKeyChecking=no "$TMP_TAR" "ubuntu@$HOST:/tmp/hh-comp.tar.gz"
  ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" "
    set -e
    mkdir -p $REMOTE_DIR
    cd $REMOTE_DIR
    tar -xzf /tmp/hh-comp.tar.gz
    rm /tmp/hh-comp.tar.gz
  "
  rm -f "$TMP_TAR"
else
  rsync -avz --delete \
    --exclude=node_modules --exclude=.next --exclude=.git --exclude=.secrets --exclude=pgdata --exclude=.env --exclude=.env.* --exclude=tsconfig.tsbuildinfo \
    -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
    ./ "ubuntu@$HOST:$REMOTE_DIR/"
fi

# Production .env is managed on the server — NEVER overwrite it from a developer
# laptop. A missing / wrong .env on prod is the kind of outage that takes the site
# down and wipes pgdata credentials (see incident 2026-04-22). If you genuinely
# need to push a local .env (first-time bootstrap, not an update), run this
# explicitly from the command line:
#     SYNC_ENV=1 bash deploy/deploy.sh
if [[ "${SYNC_ENV:-0}" == "1" ]]; then
  echo "==> SYNC_ENV=1: pushing local .env to $HOST (confirm you meant this)"
  scp -i "$KEY" -o StrictHostKeyChecking=no ./.env "ubuntu@$HOST:$REMOTE_DIR/.env"
fi

# Build, migrate, and start
ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" "
  set -e
  cd $REMOTE_DIR
  docker compose build app
  docker compose up -d postgres
  sleep 5
  # Schema is managed via 'prisma db push' against a pre-existing DB, so
  # 'migrate deploy' always fails with P3005 on this project. Kept for the
  # day we switch to proper migrations; '|| true' so the rest of the deploy
  # still runs. See incident 2026-04-22 for the half-complete deploy that
  # happened when this line hard-failed.
  docker compose run --rm app npx prisma@6.19.3 migrate deploy || true
  docker compose run --rm app npx prisma@6.19.3 db seed || true
  docker compose up -d app caddy
  docker compose ps
"

echo "==> Deploy complete: https://16-59-203-133.sslip.io"
