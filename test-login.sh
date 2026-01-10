#!/bin/bash

echo "🔍 FLAXU Login Troubleshooting Script"
echo "======================================"
echo ""

# Test 1: Backend health
echo "1️⃣ Testing backend health..."
HEALTH=$(curl -s https://api.flaxu.io/health)
echo "$HEALTH"

if echo "$HEALTH" | grep -q "ok"; then
    echo "✅ Backend is healthy"
else
    echo "❌ Backend is not responding correctly"
    exit 1
fi
echo ""

# Test 2: Test login endpoint
echo "2️⃣ Testing login endpoint..."
LOGIN_RESPONSE=$(curl -s -X POST https://api.flaxu.io/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@flaxu.io", "password": "Admin123456"}')

echo "$LOGIN_RESPONSE"
echo ""

if echo "$LOGIN_RESPONSE" | grep -q "token"; then
    echo "✅ Backend login is working!"
    echo ""
    echo "🎉 Login is successful via API"
    echo "If you still can't login from browser, the issue is frontend:"
    echo ""
    echo "Solutions:"
    echo "1. Clear browser cache completely"
    echo "2. Press Ctrl+Shift+Delete and clear all cache"
    echo "3. Try in Incognito/Private mode"
    echo "4. Check browser console for errors (F12)"
    echo ""
elif echo "$LOGIN_RESPONSE" | grep -q "rate limit"; then
    echo "⚠️ Rate limit hit - clearing Redis..."
    sudo docker exec flaxu-redis redis-cli FLUSHALL
    echo "✅ Redis cleared, try again"
    echo ""
    echo "Run this script again: ./test-login.sh"
else
    echo "❌ Login failed"
    echo ""
    echo "Debugging steps:"
    echo "1. Check backend logs:"
    echo "   pm2 logs flaxu-backend-new --lines 50"
    echo ""
    echo "2. Verify user exists:"
    echo '   sudo docker exec -i flaxu-postgres psql -U flaxu_user -d flaxu_db -c "SELECT id, email, \"isVerified\", \"accessLevel\" FROM users WHERE email = '"'admin@flaxu.io'"';"'
    echo ""
    echo "3. Check CORS settings in backend .env"
    echo "   cat /var/www/flaxu/backend/.env | grep CORS"
fi

echo ""
echo "======================================"
echo "3️⃣ Checking frontend build..."
if [ -d "/var/www/flaxu/frontend/.next" ]; then
    echo "✅ Frontend build exists"
    BUILD_DATE=$(stat -c %y /var/www/flaxu/frontend/.next 2>/dev/null || stat -f %Sm /var/www/flaxu/frontend/.next 2>/dev/null)
    echo "   Last build: $BUILD_DATE"
else
    echo "❌ Frontend build missing!"
    echo "   Run: cd /var/www/flaxu/frontend && npm run build"
fi

echo ""
echo "4️⃣ Checking PM2 processes..."
pm2 list | grep -E "flaxu-frontend|flaxu-backend"

echo ""
echo "======================================"
