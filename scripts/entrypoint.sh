#!/bin/sh
# Entrypoint script for services with automatic database migrations

set -e

echo "Starting service initialization..."

# Function to wait for database
wait_for_db() {
    echo "Waiting for database to be ready..."
    until npx prisma db push --skip-generate > /dev/null 2>&1; do
        echo "Database is unavailable - sleeping"
        sleep 2
    done
    echo "Database is ready!"
}

# Function to apply migrations
apply_migrations() {
    echo "Applying database migrations..."
    npx prisma generate
    npx prisma db push
    echo "Migrations applied successfully!"
}

# Main execution
if [ -f "prisma/schema.prisma" ]; then
    wait_for_db
    apply_migrations
fi

# Start the application
echo "Starting application..."
exec "$@"