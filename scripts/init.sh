#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🚀 Initializing Messaging App..."

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed. Please install Docker first.${NC}"
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed. Please install Docker Compose first.${NC}"
    exit 1
fi

# Create .env from .env.example if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file from .env.example...${NC}"
    cp .env.example .env
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file already exists${NC}"
fi

# Stop any running containers
echo -e "${YELLOW}Stopping any existing containers...${NC}"
docker-compose down 2>/dev/null

# Build and start services
echo -e "${YELLOW}Building and starting services...${NC}"
docker-compose up -d --build

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to be ready...${NC}"
sleep 10

# Run database migrations and ensure schema is created
echo -e "${YELLOW}Setting up database schema...${NC}"
# Always run db push to ensure schema exists
docker-compose exec -T auth-service npx prisma db push --skip-generate
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Database schema ready${NC}"
else
    echo -e "${RED}✗ Failed to create database schema${NC}"
    exit 1
fi

# Health checks
echo -e "${YELLOW}Performing health checks...${NC}"

check_health() {
    local service=$1
    local url=$2

    if curl -s "$url" > /dev/null; then
        echo -e "${GREEN}✓ $service is healthy${NC}"
        return 0
    else
        echo -e "${RED}✗ $service is not responding${NC}"
        return 1
    fi
}

# Wait a bit more for services to fully initialize
sleep 5

# Check each service
all_healthy=true

check_health "Auth Service" "http://localhost/health/auth" || all_healthy=false
check_health "User Service" "http://localhost/health/users" || all_healthy=false
check_health "Messaging Service" "http://localhost/health/messaging" || all_healthy=false
check_health "Real-time Service" "http://localhost/health/realtime" || all_healthy=false
check_health "Nginx Gateway" "http://localhost/nginx-health" || all_healthy=false

if $all_healthy; then
    echo -e "${GREEN}✅ All services are running successfully!${NC}"
    echo ""
    echo "📚 API Documentation:"
    echo "  - Base URL: http://localhost"
    echo "  - Auth endpoints: /auth/*"
    echo "  - User endpoints: /users/*"
    echo "  - Message endpoints: /messages/*"
    echo "  - Chat endpoints: /chats/*"
    echo "  - WebSocket: /socket.io/*"
    echo ""
    echo "🧪 To run tests:"
    echo "  npm test"
    echo ""
    echo "📋 To view logs:"
    echo "  docker-compose logs -f [service-name]"
    echo ""
    echo "🛑 To stop all services:"
    echo "  docker-compose down"
else
    echo -e "${RED}⚠️ Some services failed to start properly${NC}"
    echo "Check logs with: docker-compose logs"
    exit 1
fi