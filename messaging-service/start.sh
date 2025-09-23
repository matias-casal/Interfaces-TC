#!/bin/sh
set -e

echo "[Messaging Service] Starting initialization..."

# Wait for database to be ready
echo "[Messaging Service] Waiting for database..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if npx prisma db push --skip-generate > /dev/null 2>&1; then
        echo "[Messaging Service] Database is ready!"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "[Messaging Service] Database unavailable (attempt $retry_count/$max_retries) - sleeping..."
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "[Messaging Service] ERROR: Database connection timeout after $max_retries attempts"
    exit 1
fi

# Apply migrations
echo "[Messaging Service] Applying database schema..."
npx prisma db push --accept-data-loss

echo "[Messaging Service] Generating Prisma client..."
npx prisma generate || true

echo "[Messaging Service] ✓ Database initialization completed"

# Start the application
echo "[Messaging Service] Starting application..."
exec npm start