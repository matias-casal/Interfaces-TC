#!/bin/sh
set -e

echo "🔄 Initializing Auth Service..."

# Wait for database to be ready
echo "⏳ Waiting for database..."
until npx prisma db push --skip-generate > /dev/null 2>&1; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "✅ Database is ready!"

# Apply database schema
echo "📝 Applying database schema..."
npx prisma db push --skip-generate

echo "✅ Database schema applied!"

# Start the application
echo "🚀 Starting Auth Service..."
exec npm start