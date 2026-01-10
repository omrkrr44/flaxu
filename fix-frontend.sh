#!/bin/bash
set -e

echo "=== FLAXU Frontend Fix Script ==="
echo ""

# Navigate to project root
cd /var/www/flaxu

echo "1. Stopping PM2 processes..."
pm2 stop flaxu-frontend || true
pm2 delete flaxu-frontend || true

echo ""
echo "2. Killing any processes on port 3000..."
sudo lsof -ti:3000 | xargs -r sudo kill -9 || true
sleep 2

echo ""
echo "3. Cleaning Next.js cache..."
cd frontend
rm -rf .next
rm -rf node_modules/.cache

echo ""
echo "4. Checking environment configuration..."
if [ ! -f ".env.production" ]; then
    echo "Creating .env.production..."
    cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=http://localhost:3001
EOF
fi

echo "Current .env.production:"
cat .env.production

echo ""
echo "5. Rebuilding frontend..."
npm run build

echo ""
echo "6. Starting frontend with PM2..."
pm2 start npm --name flaxu-frontend -- start

echo ""
echo "7. Checking status..."
sleep 3
pm2 status

echo ""
echo "8. Showing recent logs..."
pm2 logs flaxu-frontend --lines 20 --nostream

echo ""
echo "=== Fix Complete ==="
echo "Frontend should now be running on http://localhost:3000"
echo "Backend should be running on http://localhost:3001"
echo ""
echo "Test with: curl http://localhost:3000"
