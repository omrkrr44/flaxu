#!/bin/bash
set -e

echo "=== FLAXU Deployment Cleanup and Restart ==="
echo ""

# Stop and delete ALL PM2 processes
echo "Step 1: Cleaning up PM2 processes..."
pm2 delete all 2>/dev/null || echo "No PM2 processes to delete"
pm2 save --force

# Fix npm vulnerabilities and rebuild backend
echo ""
echo "Step 2: Building backend..."
cd backend
npm audit fix --force || npm audit fix || echo "Some vulnerabilities could not be auto-fixed"
npm run build

# Fix npm vulnerabilities and rebuild frontend
echo ""
echo "Step 3: Building frontend..."
cd ../frontend
npm audit fix --force || npm audit fix || echo "Some vulnerabilities could not be auto-fixed"
sudo rm -rf .next
npm run build

# Start backend
echo ""
echo "Step 4: Starting backend (flaxu-backend-new)..."
cd ../backend
pm2 start npm --name "flaxu-backend-new" -- start

# Wait for backend to initialize
sleep 5

# Start frontend
echo ""
echo "Step 5: Starting frontend (flaxu-frontend-new)..."
cd ../frontend
pm2 start npm --name "flaxu-frontend-new" -- start

# Save PM2 configuration
echo ""
echo "Step 6: Saving PM2 configuration..."
pm2 save

# Show final status
echo ""
echo "=== Deployment Complete ==="
echo ""
pm2 status
echo ""
echo "Checking process logs..."
pm2 logs --lines 20 --nostream

