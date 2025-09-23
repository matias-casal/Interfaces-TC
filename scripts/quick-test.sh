#!/bin/bash

# Quick Test Script - Verifies basic functionality
# Usage: ./scripts/quick-test.sh

GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

echo "🚀 Quick System Test"
echo "==================="

# Check if services are running
echo -n "Checking services... "
if docker ps | grep -q "messaging-nginx" && \
   docker ps | grep -q "auth-service" && \
   docker ps | grep -q "messaging-service"; then
    echo -e "${GREEN}✓ Running${NC}"
else
    echo -e "${RED}✗ Not running. Run './scripts/init.sh' first${NC}"
    exit 1
fi

# Test health endpoints
echo -n "Testing health endpoints... "
HEALTH_OK=true
curl -s http://localhost/health/auth | grep -q "healthy" || HEALTH_OK=false
curl -s http://localhost/health/users | grep -q "healthy" || HEALTH_OK=false
curl -s http://localhost/health/messaging | grep -q "healthy" || HEALTH_OK=false

if $HEALTH_OK; then
    echo -e "${GREEN}✓ All healthy${NC}"
else
    echo -e "${RED}✗ Some services unhealthy${NC}"
fi

# Quick registration test
echo -n "Testing user registration... "
TIMESTAMP=$(date +%s)
TEST_USER="quicktest_$TIMESTAMP"

RESPONSE=$(curl -s -X POST http://localhost/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TEST_USER\",\"password\":\"Test123@Pass\",\"publicKey\":\"-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1234567890\n-----END PUBLIC KEY-----\"}")

if echo "$RESPONSE" | grep -q "success.*true"; then
    echo -e "${GREEN}✓ Works${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

echo ""
echo "Quick test complete! For full testing run: ./scripts/test-e2e.sh"