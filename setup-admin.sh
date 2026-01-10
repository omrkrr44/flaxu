#!/bin/bash

echo "=== FLAXU Admin Setup Script ==="
echo ""

# Clear rate limiting cache
echo "1. Clearing rate limit cache..."
sudo docker exec flaxu-redis redis-cli FLUSHALL
echo "✓ Redis cache cleared"
echo ""

# Update user to be verified and admin
echo "2. Setting up admin user..."
sudo docker exec -i flaxu-postgres psql -U flaxu_user -d flaxu_db << 'SQL'
-- Update admin user
UPDATE users
SET "isVerified" = true,
    "accessLevel" = 'ADMIN'
WHERE email = 'admin@flaxu.io';

-- Show result
SELECT id, email, "isVerified", "accessLevel" FROM users WHERE email = 'admin@flaxu.io';
SQL

echo ""
echo "3. Testing login..."
sleep 2

RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@flaxu.io", "password": "Admin123456"}')

echo "$RESPONSE"
echo ""

if echo "$RESPONSE" | grep -q "token"; then
    echo "✓ Login successful!"
    echo ""
    echo "=== Admin Credentials ==="
    echo "Email: admin@flaxu.io"
    echo "Password: Admin123456"
    echo "Access Level: ADMIN"
    echo ""
    echo "You can now login at: http://localhost:3000"
else
    echo "✗ Login failed. Check the error above."
fi
