#!/bin/sh
set -e

echo "[User Service] Starting initialization..."

# Wait for database to be ready
echo "[User Service] Waiting for database..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if npx prisma db push --skip-generate > /dev/null 2>&1; then
        echo "[User Service] Database is ready!"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "[User Service] Database unavailable (attempt $retry_count/$max_retries) - sleeping..."
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "[User Service] ERROR: Database connection timeout after $max_retries attempts"
    exit 1
fi

# Apply migrations
echo "[User Service] Applying database schema..."
npx prisma db push --accept-data-loss

echo "[User Service] Generating Prisma client..."
npx prisma generate || true

echo "[User Service] ✓ Database initialization completed"

# Start the application
echo "[User Service] Starting application..."
exec npm start