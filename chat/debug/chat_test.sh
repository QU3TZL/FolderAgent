#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# URLs for different environments
NEXT_URL="http://localhost:3000"  # Development
VECTORIA_URL="http://localhost:8001"  # Development

# Test data
FOLDER_ID="234d86fc-2c32-40ee-8697-6389a3d5fde8"  # Supabase internal ID
DRIVE_FOLDER_ID="1b1cuIdPlxyiXir8BWa5SrWOW-bdfFzG3"  # Google Drive ID
USER_ID="7767c51b-c125-42d6-b003-989de4cd4e0a"
TEST_QUERY="What is UpGrade?"

# Mock user credentials
USER_CREDS='{
  "token": "mock_access_token",
  "refresh_token": "mock_refresh_token",
  "token_uri": "https://oauth2.googleapis.com/token",
  "client_id": "mock_client_id",
  "client_secret": "mock_client_secret",
  "scopes": ["https://www.googleapis.com/auth/drive.file"],
  "email": "test@example.com"
}'

# Function to log request details
log_request() {
  local url=$1
  local method=$2
  local body=$3
  echo -e "${BLUE}Request Details:${NC}"
  echo -e "URL: ${url}"
  echo -e "Method: ${method}"
  echo -e "Body: ${body}\n"
}

echo "=== Starting Chat Debug Tests ==="

# Test 1: Check if vectoria is running
echo -e "\n${BLUE}Test 1: Checking if vectoria is running${NC}"
log_request "${VECTORIA_URL}/health" "GET" "none"
HEALTH_RESPONSE=$(curl -s "${VECTORIA_URL}/health")
if [[ $HEALTH_RESPONSE == *"healthy"* ]]; then
  echo -e "${GREEN}✓ Vectoria is running${NC}"
else
  echo -e "${RED}✗ Vectoria is not running${NC}"
  exit 1
fi

# Test 2: Test vectoria chat endpoint directly
echo -e "\n${BLUE}Test 2: Testing vectoria chat endpoint${NC}"
CHAT_BODY="{\"query\":\"${TEST_QUERY}\",\"folder_id\":\"${FOLDER_ID}\",\"user_id\":\"${USER_ID}\",\"user_creds\":${USER_CREDS}}"
log_request "${VECTORIA_URL}/api/chat" "POST" "${CHAT_BODY}"
curl -v -X POST "${VECTORIA_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d "${CHAT_BODY}"

# Test 3: Test Next.js chat endpoint
echo -e "\n${BLUE}Test 3: Testing Next.js chat endpoint${NC}"
NEXT_BODY="{\"query\":\"${TEST_QUERY}\",\"folder_id\":\"${DRIVE_FOLDER_ID}\"}"
log_request "${NEXT_URL}/api/chat" "POST" "${NEXT_BODY}"
curl -v -X POST "${NEXT_URL}/api/chat" \
  -H "Content-Type: application/json" \
  -d "${NEXT_BODY}"

# Test 4: Get folder info
echo -e "\n${BLUE}Test 4: Getting folder info${NC}"
log_request "${NEXT_URL}/api/folder/${DRIVE_FOLDER_ID}/vectorization-status" "GET" "none"
curl -s "${NEXT_URL}/api/folder/${DRIVE_FOLDER_ID}/vectorization-status" | jq . 