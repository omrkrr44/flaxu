#!/bin/bash
set -e

echo "🚀 FLAXU Complete Rebuild & Deployment Script"
echo "=============================================="
echo ""

cd /var/www/flaxu

# 1. Stop services first
echo "1️⃣ Stopping services..."
pm2 stop flaxu-frontend || true
pm2 stop flaxu-backend-new || true
echo "✅ Services stopped"
echo ""

# 2. Pull latest code
echo "2️⃣ Pulling latest code..."
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-bots-8yMm2
echo "✅ Code updated"
echo ""

# 3. Clean frontend completely
echo "3️⃣ Cleaning frontend cache..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache
rm -rf out
echo "✅ Cache cleaned"
echo ""

# 4. Verify environment file
echo "4️⃣ Checking environment file..."
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production..."
    cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.flaxu.io
EOF
fi
echo "Current .env.production:"
cat .env.production
echo ""

# 5. Rebuild frontend
echo "5️⃣ Building frontend (this may take a few minutes)..."
NODE_ENV=production npm run build
echo "✅ Frontend built successfully"
echo ""

# 6. Restart services
echo "6️⃣ Restarting services..."
pm2 start npm --name flaxu-frontend -- start || pm2 restart flaxu-frontend
pm2 restart flaxu-backend-new
echo "✅ Services restarted"
echo ""

# 7. Wait for services to start
echo "7️⃣ Waiting for services to initialize..."
sleep 5
echo ""

# 8. Check services
echo "8️⃣ Checking service status..."
pm2 status
echo ""

# 9. Test endpoints
echo "9️⃣ Testing endpoints..."
echo ""
echo "Backend health check:"
curl -s https://api.flaxu.io/health | head -1
echo ""
echo ""
echo "Frontend status:"
curl -s -I https://flaxu.io | head -3
echo ""

echo "=============================================="
echo "✅ Deployment Complete!"
echo ""
echo "🌐 Open your browser and visit: https://flaxu.io"
echo "🔄 Press Ctrl+Shift+R (or Cmd+Shift+R on Mac) to hard refresh"
echo ""
echo "📧 Login: admin@flaxu.io"
echo "🔑 Password: Admin123456"
echo ""
echo "If login still fails, run:"
echo "  pm2 logs flaxu-backend-new --lines 50"
echo "=============================================="
