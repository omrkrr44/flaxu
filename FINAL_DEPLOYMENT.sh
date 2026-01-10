#!/bin/bash
set -e

echo "🚀 FLAXU FINAL DEPLOYMENT - Complete System Update"
echo "===================================================="
echo ""

cd /var/www/flaxu

# 1. Pull latest code
echo "1️⃣ Pulling latest code..."
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-bots-8yMm2
echo "✅ Code updated"
echo ""

# 2. Stop services
echo "2️⃣ Stopping services..."
pm2 stop all
echo "✅ Services stopped"
echo ""

# 3. Clean frontend completely
echo "3️⃣ Deep cleaning frontend..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache
rm -rf out
echo "✅ Frontend cleaned"
echo ""

# 4. Verify environment
echo "4️⃣ Verifying environment files..."
cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.flaxu.io
EOF
echo "Frontend .env.production:"
cat .env.production
echo ""

# 5. Full rebuild
echo "5️⃣ Building frontend (this will take 2-3 minutes)..."
NODE_ENV=production npm run build
echo "✅ Frontend built successfully!"
echo ""

# 6. Backend check
echo "6️⃣ Checking backend..."
cd ../backend
if [ ! -f ".env" ]; then
    echo "❌ Backend .env not found!"
    exit 1
fi
echo "Backend .env exists ✅"
echo ""

# 7. Restart all services
echo "7️⃣ Restarting all services..."
pm2 restart all
pm2 save
echo "✅ Services restarted and saved"
echo ""

# 8. Wait for services to initialize
echo "8️⃣ Waiting for services (10 seconds)..."
sleep 10
echo ""

# 9. Verify services
echo "9️⃣ Verifying services..."
pm2 status
echo ""

# 10. Test endpoints
echo "🔟 Testing endpoints..."
echo ""
echo "Backend Health:"
curl -s https://api.flaxu.io/health || echo "❌ Backend not responding"
echo ""
echo ""

echo "Frontend Status:"
curl -s -I https://flaxu.io | head -5
echo ""

echo "===================================================="
echo "✅ DEPLOYMENT COMPLETE!"
echo ""
echo "🌐 Your Platform:"
echo "   Homepage:  https://flaxu.io"
echo "   Login:     https://flaxu.io/login"
echo "   Dashboard: https://flaxu.io/dashboard"
echo ""
echo "🎯 Trading Bots:"
echo "   ICT Bot:     https://flaxu.io/dashboard/ict-bot"
echo "   Sniper:      https://flaxu.io/dashboard/sniper"
echo "   Arbitrage:   https://flaxu.io/dashboard/arbitrage"
echo "   Liquidity:   https://flaxu.io/dashboard/liquidity"
echo ""
echo "🛡️ Admin Panel: https://flaxu.io/dashboard/admin"
echo ""
echo "📧 Login: admin@flaxu.io"
echo "🔑 Password: Admin123456"
echo ""
echo "⚠️ IMPORTANT:"
echo "1. Clear browser cache (Ctrl+Shift+Delete)"
echo "2. Hard refresh (Ctrl+Shift+R)"
echo "3. Or use Incognito/Private mode"
echo ""
echo "If you still see 404 errors, run:"
echo "  pm2 logs flaxu-frontend --lines 50"
echo "===================================================="
