#!/bin/sh
set -e

# Ensure persistent data directories exist on the mounted volume
mkdir -p /app/data
mkdir -p /app/data/uploads

# Symlink public/uploads → /app/data/uploads so uploaded files survive redeploys
if [ ! -L /app/public/uploads ]; then
  rm -rf /app/public/uploads
  ln -s /app/data/uploads /app/public/uploads
fi

exec node_modules/.bin/next start -p "${PORT:-3000}"
