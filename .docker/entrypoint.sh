#!/bin/sh
set -e

echo "[entrypoint] Running TypeORM migrations..."
node node_modules/typeorm/cli.js migration:run -d dist/shared/infrastructure/database/data-source.js

echo "[entrypoint] Starting application..."
exec node dist/main.js
