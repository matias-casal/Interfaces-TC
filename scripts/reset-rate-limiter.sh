#!/bin/bash

# Reset Rate Limiter Script
# Clears Redis rate limiting data and restarts services

set -e

echo "🔄 Resetting Rate Limiter"
echo "========================"

# Function to check if services are running
check_services() {
    if ! docker-compose ps | grep -q "Up"; then
        echo "❌ Services are not running. Please start them first with: docker-compose up -d"
        exit 1
    fi
}

# Check if services are running
check_services

echo "📦 Flushing Redis cache..."
docker-compose exec -T redis redis-cli FLUSHALL > /dev/null 2>&1 || {
    echo "⚠️  Could not flush Redis. Trying alternative method..."
    docker-compose exec -T redis sh -c 'redis-cli FLUSHALL' > /dev/null 2>&1 || {
        echo "❌ Failed to flush Redis cache"
        exit 1
    }
}
echo "✅ Redis cache flushed"

echo "🔄 Restarting auth service to reset in-memory rate limiters..."
docker-compose restart auth-service > /dev/null 2>&1
echo "✅ Auth service restarted"

echo "⏳ Waiting for services to be healthy..."
sleep 5

# Check health of services
echo "🏥 Checking service health..."
HEALTH_CHECK=$(curl -s -o /dev/null -w "%{http_code}" http://localhost/health/auth 2>/dev/null || echo "000")

if [ "$HEALTH_CHECK" = "200" ]; then
    echo "✅ Services are healthy"
else
    echo "⚠️  Services may not be fully ready. Waiting additional 5 seconds..."
    sleep 5
fi

echo ""
echo "✨ Rate limiter has been reset!"
echo "You can now run tests without rate limiting issues."
echo ""