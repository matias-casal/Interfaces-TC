#!/bin/sh
set -e

echo "[Auth Service] Starting initialization..."

# Wait for database to be ready
echo "[Auth Service] Waiting for database..."
max_retries=30
retry_count=0

while [ $retry_count -lt $max_retries ]; do
    if npx prisma db push --skip-generate > /dev/null 2>&1; then
        echo "[Auth Service] Database is ready!"
        break
    fi
    retry_count=$((retry_count + 1))
    echo "[Auth Service] Database unavailable (attempt $retry_count/$max_retries) - sleeping..."
    sleep 2
done

if [ $retry_count -eq $max_retries ]; then
    echo "[Auth Service] ERROR: Database connection timeout after $max_retries attempts"
    exit 1
fi

# Apply migrations
echo "[Auth Service] Applying database schema..."
npx prisma db push --accept-data-loss

echo "[Auth Service] Generating Prisma client..."
npx prisma generate || true

echo "[Auth Service] ✓ Database initialization completed"

# Start the application
echo "[Auth Service] Starting application..."
exec npm start