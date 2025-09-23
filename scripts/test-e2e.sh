#!/bin/bash

# End-to-End Testing Script for Messaging App
# This script tests all major functionalities of the system

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Base URL
BASE_URL="${BASE_URL:-http://localhost}"

# Test data
RANDOM_SUFFIX="$(date +%s)_$RANDOM"
USER1_USERNAME="alice_${RANDOM_SUFFIX}"
USER1_PASSWORD="Alice123@Pass"
USER2_USERNAME="bob_${RANDOM_SUFFIX}"
USER2_PASSWORD="Bob123@Pass"

# Generate RSA keys for testing
generate_rsa_key() {
    openssl genrsa 2048 2>/dev/null | openssl rsa -pubout 2>/dev/null | tr -d '\n' | sed 's/-----BEGIN PUBLIC KEY-----/-----BEGIN PUBLIC KEY-----\\n/' | sed 's/-----END PUBLIC KEY-----/\\n-----END PUBLIC KEY-----/'
}

USER1_PUBLIC_KEY=$(generate_rsa_key)
USER2_PUBLIC_KEY=$(generate_rsa_key)

echo "🧪 Starting End-to-End Tests for Messaging App"
echo "================================================"

# Function to make API calls and check responses
api_call() {
    local method=$1
    local endpoint=$2
    local data=$3
    local token=$4
    local expected_status=${5:-200}

    local curl_cmd="curl -s -w '\n%{http_code}' -X $method \"$BASE_URL$endpoint\""

    if [ ! -z "$token" ]; then
        curl_cmd="$curl_cmd -H 'Authorization: Bearer $token'"
    fi

    if [ ! -z "$data" ]; then
        curl_cmd="$curl_cmd -H 'Content-Type: application/json' -d '$data'"
    fi

    local response=$(eval $curl_cmd)
    local status=$(printf '%s' "$response" | tail -n 1)
    local body=$(printf '%s' "$response" | sed '$d')

    if [ "$status" = "$expected_status" ]; then
        echo "$body"
        return 0
    else
        echo -e "${RED}Failed: Expected status $expected_status, got $status${NC}" >&2
        echo "$body" >&2
        return 1
    fi
}

# Test 1: Health Checks
echo ""
echo -e "${BLUE}Test 1: Health Checks${NC}"
echo "----------------------"
echo -n "Checking Auth Service... "
if curl -s http://localhost/health/auth | grep -q "healthy"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo -n "Checking User Service... "
if curl -s http://localhost/health/users | grep -q "healthy"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo -n "Checking Messaging Service... "
if curl -s http://localhost/health/messaging | grep -q "healthy"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

echo -n "Checking Real-time Service... "
if curl -s http://localhost/health/realtime | grep -q "healthy"; then
    echo -e "${GREEN}✓ Healthy${NC}"
else
    echo -e "${RED}✗ Unhealthy${NC}"
fi

# Test 2: User Registration
echo ""
echo -e "${BLUE}Test 2: User Registration${NC}"
echo "-------------------------"
echo -n "Registering User 1 ($USER1_USERNAME)... "
USER1_REGISTER=$(api_call POST /auth/register "{\"username\":\"$USER1_USERNAME\",\"password\":\"$USER1_PASSWORD\",\"publicKey\":\"$USER1_PUBLIC_KEY\"}" "" 201)
if [ $? -eq 0 ]; then
    USER1_TOKEN=$(echo "$USER1_REGISTER" | jq -r '.data.token')
    USER1_ID=$(echo "$USER1_REGISTER" | jq -r '.data.user.id')
    echo -e "${GREEN}✓ Success${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

sleep 1

echo -n "Registering User 2 ($USER2_USERNAME)... "
USER2_REGISTER=$(api_call POST /auth/register "{\"username\":\"$USER2_USERNAME\",\"password\":\"$USER2_PASSWORD\",\"publicKey\":\"$USER2_PUBLIC_KEY\"}" "" 201)
if [ $? -eq 0 ]; then
    USER2_TOKEN=$(echo "$USER2_REGISTER" | jq -r '.data.token')
    USER2_ID=$(echo "$USER2_REGISTER" | jq -r '.data.user.id')
    echo -e "${GREEN}✓ Success${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
    exit 1
fi

# Test 3: User Login
echo ""
echo -e "${BLUE}Test 3: User Login${NC}"
echo "------------------"
echo -n "Testing login for User 1... "
LOGIN_RESPONSE=$(api_call POST /auth/login "{\"username\":\"$USER1_USERNAME\",\"password\":\"$USER1_PASSWORD\"}" "")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test 4: User Profile Retrieval
echo ""
echo -e "${BLUE}Test 4: User Profile Retrieval${NC}"
echo "-------------------------------"
echo -n "Getting User 2 profile (by User 1)... "
USER2_PROFILE=$(api_call GET /users/$USER2_USERNAME "" "$USER1_TOKEN")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test 5: Message Sending
echo ""
echo -e "${BLUE}Test 5: Message Sending${NC}"
echo "-----------------------"
CLIENT_MSG_ID=$(uuidgen | tr '[:upper:]' '[:lower:]')
ENCRYPTED_MSG=$(echo "Hello from User 1!" | base64)

echo -n "Sending message from User 1 to User 2... "
MSG_RESPONSE=$(api_call POST /messages "{\"receiverUsername\":\"$USER2_USERNAME\",\"encryptedText\":\"$ENCRYPTED_MSG\",\"clientMessageId\":\"$CLIENT_MSG_ID\"}" "$USER1_TOKEN" 201)
if [ $? -eq 0 ]; then
    MSG_ID=$(echo "$MSG_RESPONSE" | jq -r '.data.id')
    echo -e "${GREEN}✓ Success (ID: ${MSG_ID:0:8}...)${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test 6: Idempotency Check
echo ""
echo -e "${BLUE}Test 6: Idempotency Check${NC}"
echo "-------------------------"
echo -n "Sending duplicate message (same clientMessageId)... "
DUPLICATE_RESPONSE=$(api_call POST /messages "{\"receiverUsername\":\"$USER2_USERNAME\",\"encryptedText\":\"$ENCRYPTED_MSG\",\"clientMessageId\":\"$CLIENT_MSG_ID\"}" "$USER1_TOKEN")
if echo "$DUPLICATE_RESPONSE" | grep -q "idempotent"; then
    echo -e "${GREEN}✓ Idempotency working${NC}"
else
    echo -e "${RED}✗ Idempotency failed${NC}"
fi

# Test 7: Chat Listing
echo ""
echo -e "${BLUE}Test 7: Chat Listing${NC}"
echo "--------------------"
echo -n "Getting chats for User 1... "
CHATS_RESPONSE=$(api_call GET "/chats?limit=10" "" "$USER1_TOKEN")
if [ $? -eq 0 ]; then
    CHAT_COUNT=$(echo "$CHATS_RESPONSE" | jq '.data | length')
    echo -e "${GREEN}✓ Success ($CHAT_COUNT chat(s))${NC}"
    CHAT_ID=$(echo "$CHATS_RESPONSE" | jq -r '.data[0].chatId')
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test 8: Message Listing in Chat
echo ""
echo -e "${BLUE}Test 8: Message Listing in Chat${NC}"
echo "--------------------------------"
echo -n "Getting messages in chat... "
if [ ! -z "$CHAT_ID" ]; then
    MESSAGES_RESPONSE=$(api_call GET "/chats/$CHAT_ID/messages?limit=10" "" "$USER1_TOKEN")
    if [ $? -eq 0 ]; then
        MSG_COUNT=$(echo "$MESSAGES_RESPONSE" | jq '.data | length')
        echo -e "${GREEN}✓ Success ($MSG_COUNT message(s))${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipped (no chat ID)${NC}"
fi

# Test 9: Message Status Update
echo ""
echo -e "${BLUE}Test 9: Message Status Update${NC}"
echo "-----------------------------"
if [ ! -z "$MSG_ID" ]; then
    echo -n "Updating message status to 'delivered'... "
    STATUS_UPDATE=$(api_call PATCH "/messages/$MSG_ID/status" "{\"status\":\"delivered\"}" "$USER2_TOKEN")
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi

    echo -n "Updating message status to 'read'... "
    STATUS_UPDATE=$(api_call PATCH "/messages/$MSG_ID/status" "{\"status\":\"read\"}" "$USER2_TOKEN")
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Success${NC}"
    else
        echo -e "${RED}✗ Failed${NC}"
    fi
else
    echo -e "${YELLOW}⚠ Skipped (no message ID)${NC}"
fi

# Test 10: Pagination Test
echo ""
echo -e "${BLUE}Test 10: Pagination Test${NC}"
echo "------------------------"
echo -n "Testing pagination (limit=1, offset=0)... "
PAGINATION_RESPONSE=$(api_call GET "/chats?limit=1&offset=0" "" "$USER1_TOKEN")
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Success${NC}"
else
    echo -e "${RED}✗ Failed${NC}"
fi

# Test 11: Invalid Authentication
echo ""
echo -e "${BLUE}Test 11: Security Tests${NC}"
echo "-----------------------"
echo -n "Testing invalid token... "
INVALID_RESPONSE=$(api_call GET /chats "" "invalid_token_123" 401)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Correctly rejected${NC}"
else
    echo -e "${RED}✗ Security issue${NC}"
fi

echo -n "Testing duplicate username registration... "
DUPLICATE_USER=$(api_call POST /auth/register "{\"username\":\"$USER1_USERNAME\",\"password\":\"Test123@Pass\",\"publicKey\":\"$USER1_PUBLIC_KEY\"}" "" 409)
if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓ Correctly rejected${NC}"
else
    echo -e "${RED}✗ Allowed duplicate${NC}"
fi

# Summary
echo ""
echo "================================================"
echo -e "${GREEN}🎉 End-to-End Tests Complete!${NC}"
echo ""
echo "Test Users Created:"
echo "  User 1: $USER1_USERNAME"
echo "  User 2: $USER2_USERNAME"
echo ""
echo "You can now use these credentials to test manually:"
echo "  curl -X POST $BASE_URL/auth/login -H \"Content-Type: application/json\" -d '{\"username\":\"$USER1_USERNAME\",\"password\":\"$USER1_PASSWORD\"}'"
echo ""
