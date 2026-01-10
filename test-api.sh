#!/bin/bash

echo "=== FLAXU API Test Script ==="
echo ""

# Test backend health
echo "1. Testing Backend Health..."
curl -s http://localhost:3001/health | jq '.' || curl -s http://localhost:3001/health
echo ""
echo ""

# Test frontend
echo "2. Testing Frontend..."
curl -s -I http://localhost:3000 | head -5
echo ""

# Test user registration
echo "3. Testing User Registration..."
REGISTER_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@flaxu.io", "password": "Test123456"}')

echo "$REGISTER_RESPONSE" | jq '.' || echo "$REGISTER_RESPONSE"
echo ""

# Test user login
echo "4. Testing User Login..."
LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@flaxu.io", "password": "Test123456"}')

echo "$LOGIN_RESPONSE" | jq '.' || echo "$LOGIN_RESPONSE"
echo ""

# Check PM2 status
echo "5. PM2 Status..."
pm2 status

echo ""
echo "=== Test Complete ==="
