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
  tar --exclude=node_modules --exclude=.next --exclude=.git --exclude=.secrets -czf "$TMP_TAR" .
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
    --exclude=node_modules --exclude=.next --exclude=.git --exclude=.secrets --exclude=pgdata \
    -e "ssh -i $KEY -o StrictHostKeyChecking=no" \
    ./ "ubuntu@$HOST:$REMOTE_DIR/"
fi

# Copy the .env separately (it may be in .gitignore/.dockerignore but is needed by docker-compose)
scp -i "$KEY" -o StrictHostKeyChecking=no ./.env "ubuntu@$HOST:$REMOTE_DIR/.env"

# Build, migrate, and start
ssh -i "$KEY" -o StrictHostKeyChecking=no "ubuntu@$HOST" "
  set -e
  cd $REMOTE_DIR
  docker compose build app
  docker compose up -d postgres
  sleep 5
  docker compose run --rm app npx prisma migrate deploy
  docker compose run --rm app npx prisma db seed || true
  docker compose up -d app caddy
  docker compose ps
"

echo "==> Deploy complete: https://16-59-203-133.sslip.io"
