# Login Issue Fix - Deployment Instructions

## Problem
The frontend cannot communicate with the backend because:
1. Missing `.env.production` file in frontend
2. Possible CORS misconfiguration
3. Backend might not be listening on correct interface

## Solution

### Step 1: Update Frontend Environment Configuration

The frontend needs to know where the backend API is. On your server at `/var/www/flaxu`:

```bash
cd /var/www/flaxu

# Pull the latest changes (includes new .env files)
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-bots-8yMm2

# For production deployment, update the API URL in frontend/.env.production
cd frontend
nano .env.production
```

Update to your production URL:
```
NEXT_PUBLIC_API_URL=https://api.flaxu.io
```

Or if using same domain with path:
```
NEXT_PUBLIC_API_URL=https://flaxu.io/api
```

Or for testing locally first:
```
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### Step 2: Update Backend CORS Configuration

Edit `/var/www/flaxu/backend/.env` and update CORS_ORIGINS:

```bash
cd /var/www/flaxu/backend
nano .env
```

Add your frontend URL to CORS_ORIGINS:
```env
# For production domain
CORS_ORIGINS=https://flaxu.io,https://www.flaxu.io

# For local testing
CORS_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### Step 3: Verify Backend Port Configuration

Ensure backend is using port 3001:
```env
BACKEND_PORT=3001
PORT=3001
```

### Step 4: Rebuild and Restart Services

```bash
# Stop services
pm2 stop flaxu-backend flaxu-frontend

# Rebuild backend (if needed)
cd /var/www/flaxu/backend
npm run build

# Rebuild frontend with new env vars
cd /var/www/flaxu/frontend
npm run build

# Restart services
pm2 start flaxu-backend
pm2 start flaxu-frontend

# Check status
pm2 status
pm2 logs --lines 50
```

### Step 5: Test Backend Connectivity

```bash
# Test backend health endpoint
curl http://localhost:3001/health

# Test registration
curl -X POST http://localhost:3001/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "test@flaxu.io", "password": "Test123456"}'

# Test login
curl -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@flaxu.io", "password": "Test123456"}'
```

### Step 6: Check Logs for Errors

```bash
# Backend logs
pm2 logs flaxu-backend --lines 100

# Frontend logs
pm2 logs flaxu-frontend --lines 100
```

### Step 7: Create Test User (if needed)

If no users exist:
```bash
cd /var/www/flaxu/backend
npx ts-node -e "
import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function createTestUser() {
  const hashedPassword = await bcrypt.hash('Test123456', 10);
  const user = await prisma.user.create({
    data: {
      email: 'test@flaxu.io',
      passwordHash: hashedPassword,
      accessLevel: 'FULL',
      isVerified: true,
    },
  });
  console.log('Test user created:', user.email);
}

createTestUser();
"
```

## Troubleshooting

### Backend not responding
- Check if it's running: `pm2 status`
- Check if port 3001 is listening: `sudo netstat -tlnp | grep 3001`
- Check firewall: `sudo ufw status`
- Check logs: `pm2 logs flaxu-backend`

### Frontend can't reach backend
- Verify NEXT_PUBLIC_API_URL in .env.production
- Check browser console for CORS errors
- Verify backend CORS_ORIGINS includes frontend URL

### Login still failing
- Check backend logs for authentication errors
- Verify JWT_SECRET is set in backend .env
- Verify database is connected: `pm2 logs flaxu-backend | grep "Database"`
- Test backend endpoint directly with curl

## Quick Restart Script

Save this as `/var/www/flaxu/restart.sh`:

```bash
#!/bin/bash
cd /var/www/flaxu

echo "Stopping services..."
pm2 stop flaxu-backend flaxu-frontend

echo "Rebuilding frontend..."
cd frontend
npm run build

echo "Restarting services..."
pm2 start flaxu-backend
pm2 start flaxu-frontend

echo "Checking status..."
pm2 status

echo "Tailing logs (Ctrl+C to exit)..."
pm2 logs --lines 20
```

Make it executable:
```bash
chmod +x /var/www/flaxu/restart.sh
```
