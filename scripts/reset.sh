#!/bin/bash

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "🧹 Resetting Messaging App..."

# Stop all containers
echo -e "${YELLOW}Stopping all containers...${NC}"
docker-compose down

# Remove volumes (this will delete all data)
read -p "Do you want to delete all data (database and cache)? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing volumes...${NC}"
    docker-compose down -v
    echo -e "${GREEN}✓ All data has been removed${NC}"
else
    echo -e "${YELLOW}Keeping existing data${NC}"
fi

# Remove orphan containers
echo -e "${YELLOW}Cleaning up orphan containers...${NC}"
docker container prune -f

# Remove unused images
read -p "Do you want to remove unused Docker images? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Removing unused images...${NC}"
    docker image prune -f
    echo -e "${GREEN}✓ Unused images removed${NC}"
fi

echo -e "${GREEN}✅ Reset complete!${NC}"
echo ""
echo "To start fresh, run: ./scripts/init.sh"