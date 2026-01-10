#!/bin/bash
set -e

echo "=== FLAXU Domain Fix Script ==="
echo ""

# 1. Update Nginx to point to correct backend port
echo "1. Updating Nginx configuration..."
sudo sed -i 's/proxy_pass http:\/\/localhost:4000;/proxy_pass http:\/\/localhost:3001;/g' /etc/nginx/sites-enabled/flaxu.io

echo "✓ Nginx config updated to port 3001"
echo ""

# 2. Test nginx config
echo "2. Testing Nginx configuration..."
sudo nginx -t

# 3. Reload nginx
echo ""
echo "3. Reloading Nginx..."
sudo systemctl reload nginx
echo "✓ Nginx reloaded"
echo ""

# 4. Update frontend environment
echo "4. Updating frontend environment..."
cd /var/www/flaxu/frontend

cat > .env.production << 'EOF'
NEXT_PUBLIC_API_URL=https://api.flaxu.io
EOF

echo "✓ Frontend .env.production updated"
cat .env.production
echo ""

# 5. Update backend CORS
echo "5. Updating backend CORS..."
cd /var/www/flaxu/backend

# Check if CORS_ORIGINS exists, if not add it
if grep -q "CORS_ORIGINS" .env; then
    # Update existing
    sed -i 's|CORS_ORIGINS=.*|CORS_ORIGINS=http://localhost:3000,https://flaxu.io,https://www.flaxu.io,https://api.flaxu.io|g' .env
else
    # Add new
    echo "" >> .env
    echo "# CORS Origins" >> .env
    echo "CORS_ORIGINS=http://localhost:3000,https://flaxu.io,https://www.flaxu.io,https://api.flaxu.io" >> .env
fi

echo "✓ Backend CORS updated"
echo ""

# 6. Rebuild frontend
echo "6. Rebuilding frontend..."
cd /var/www/flaxu/frontend
npm run build

echo "✓ Frontend rebuilt"
echo ""

# 7. Restart services
echo "7. Restarting PM2 services..."
pm2 restart all

echo "✓ Services restarted"
echo ""

# 8. Wait and test
echo "8. Testing endpoints..."
sleep 5

echo ""
echo "Testing Backend (api.flaxu.io)..."
curl -s https://api.flaxu.io/health | head -1 || echo "Backend not responding"

echo ""
echo "Testing Frontend (flaxu.io)..."
curl -s -I https://flaxu.io | head -2 || echo "Frontend not responding"

echo ""
echo "=== Fix Complete! ==="
echo ""
echo "You can now login at: https://flaxu.io"
echo "Email: admin@flaxu.io"
echo "Password: Admin123456"
echo ""
echo "API Endpoint: https://api.flaxu.io"
echo ""
