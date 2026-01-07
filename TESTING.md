# FLAXU Testing Guide

## 🚀 Quick Start

### Option 1: Docker (Recommended)

```bash
# 1. Start all services
docker-compose up -d

# 2. Check services status
docker-compose ps

# 3. View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# 4. Run database migrations
docker-compose exec backend npx prisma migrate dev --name init

# 5. Generate Prisma client
docker-compose exec backend npx prisma generate

# 6. Access the app
Frontend: http://localhost:3000
Backend API: http://localhost:4000
Python Signals: http://localhost:8000

# 7. Stop services
docker-compose down
```

### Option 2: Manual (Development)

**Terminal 1 - Database Services:**
```bash
# Start PostgreSQL and Redis
docker-compose up postgres redis -d
```

**Terminal 2 - Backend:**
```bash
cd backend
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

**Terminal 3 - Frontend:**
```bash
cd frontend
npm install
npm run dev
```

**Terminal 4 - Python Signals (Optional):**
```bash
cd python-signals
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

---

## 🧪 Test Scenarios

### 1. User Registration & Login

**Step 1: Register**
```bash
# Via Frontend
1. Go to http://localhost:3000
2. Click "Get Started"
3. Fill in:
   - Email: test@example.com
   - Password: Test1234
   - Confirm Password: Test1234
4. Click "Create Account"
5. See success message

# Via API (cURL)
curl -X POST http://localhost:4000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'
```

**Step 2: Verify Email**
```bash
# Check database for verification token
docker-compose exec postgres psql -U flaxu_user -d flaxu_db \
  -c "SELECT token FROM verification_tokens WHERE email='test@example.com';"

# Copy token and verify
curl -X POST http://localhost:4000/api/auth/verify-email \
  -H "Content-Type: application/json" \
  -d '{"token": "YOUR_TOKEN_HERE"}'
```

**Step 3: Login**
```bash
# Via Frontend
1. Go to http://localhost:3000/login
2. Enter credentials
3. Click "Sign In"

# Via API
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "Test1234"
  }'

# Save the returned token
```

### 2. Gatekeeper - API Keys Connection

**Step 1: Get Profile**
```bash
TOKEN="your-jwt-token-from-login"

curl -X GET http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer $TOKEN"
```

**Step 2: Connect BingX API Keys**
```bash
# Via Frontend
1. Go to http://localhost:3000/dashboard/api-keys
2. Enter API Key: r95s18r1yXW7zZ5kTA5OAXu9P3mNSzaqf8AHEp92zr5TCZD73LeaxUycYaK1qgzAZxhPQ3NP9j60SiXpQ
3. Enter Secret Key: w79nIiouFOTtnh72Q56wWfSAYlhAbGRVSrlQJ1yK62RmlvEqO4ZUE9gadEQbPS0y4e9Ha1Myyc7mAODNHQw
4. Click "Connect"

# Via API
curl -X POST http://localhost:4000/api/users/api-keys \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "apiKey": "r95s18r1yXW7zZ5kTA5OAXu9P3mNSzaqf8AHEp92zr5TCZD73LeaxUycYaK1qgzAZxhPQ3NP9j60SiXpQ",
    "secretKey": "w79nIiouFOTtnh72Q56wWfSAYlhAbGRVSrlQJ1yK62RmlvEqO4ZUE9gadEQbPS0y4e9Ha1Myyc7mAODNHQw"
  }'
```

**Step 3: Check Gatekeeper Status**
```bash
curl -X GET http://localhost:4000/api/users/gatekeeper/status \
  -H "Authorization: Bearer $TOKEN"
```

**Step 4: Run Gatekeeper Check**
```bash
curl -X POST http://localhost:4000/api/users/gatekeeper/check \
  -H "Authorization: Bearer $TOKEN"
```

### 3. Database Queries

**Check Users:**
```bash
docker-compose exec postgres psql -U flaxu_user -d flaxu_db \
  -c "SELECT id, email, \"accessLevel\", \"isVerified\", \"isDirectReferral\", \"isIndirectReferral\", \"walletBalance\" FROM users;"
```

**Check API Keys (encrypted):**
```bash
docker-compose exec postgres psql -U flaxu_user -d flaxu_db \
  -c "SELECT id, email, \"bingxApiKey\" IS NOT NULL as has_api_key FROM users;"
```

**Check Sessions:**
```bash
docker-compose exec postgres psql -U flaxu_user -d flaxu_db \
  -c "SELECT s.id, u.email, s.\"expiresAt\" FROM sessions s JOIN users u ON s.\"userId\" = u.id;"
```

---

## 🔍 Health Checks

### Backend Health
```bash
curl http://localhost:4000/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2026-01-07T...",
  "environment": "development"
}
```

### Frontend Health
```bash
curl -I http://localhost:3000
```

### Database Health
```bash
docker-compose exec postgres pg_isready -U flaxu_user
```

### Redis Health
```bash
docker-compose exec redis redis-cli ping
```

---

## 🐛 Troubleshooting

### Backend won't start
```bash
# Check logs
docker-compose logs backend

# Check if database is ready
docker-compose exec postgres pg_isready

# Recreate Prisma client
cd backend
npm run prisma:generate
```

### Database connection error
```bash
# Check DATABASE_URL in .env
# Make sure postgres service is running
docker-compose ps postgres

# Restart postgres
docker-compose restart postgres
```

### Frontend can't connect to backend
```bash
# Check NEXT_PUBLIC_API_URL in .env
# Should be: http://localhost:4000

# Check if backend is running
curl http://localhost:4000/health
```

### Prisma migration error
```bash
# Reset database (WARNING: deletes all data)
cd backend
npx prisma migrate reset

# Or manually in Docker
docker-compose exec postgres psql -U flaxu_user -d flaxu_db -c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"
```

---

## 📊 Expected Results

### ✅ Successful Registration
- Status: 201 Created
- Response contains: `{ success: true, data: { message: "...", email: "..." } }`
- Email verification token created in database

### ✅ Successful Login
- Status: 200 OK
- Response contains: `token`, `refreshToken`, `user` object
- Session created in database

### ✅ Successful API Key Connection
- Status: 200 OK
- Keys encrypted and stored in database
- Gatekeeper check runs automatically

### ✅ Gatekeeper APPROVED
- Status: 200 OK
- Response: `{ status: "APPROVED", accessLevel: "FULL" }`
- User's `accessLevel` updated to `FULL` in database

### ⚠️ Gatekeeper NOT_REFERRAL
- Status: 200 OK
- Response: `{ status: "NOT_REFERRAL", accessLevel: "LIMITED" }`
- Message contains referral signup link

### ⚠️ Gatekeeper INSUFFICIENT_BALANCE
- Status: 200 OK
- Response: `{ status: "INSUFFICIENT_BALANCE", accessLevel: "LIMITED" }`
- Shows current balance and required amount

---

## 🔐 Security Test

### Test Encrypted API Keys
```bash
# After connecting API keys, check they're encrypted
docker-compose exec postgres psql -U flaxu_user -d flaxu_db \
  -c "SELECT \"bingxApiKey\" FROM users WHERE email='test@example.com';"

# Should show encrypted string like: "abc123:def456:encrypted_data"
# NOT the plain API key
```

### Test JWT Expiration
```bash
# Try to use an expired or invalid token
curl -X GET http://localhost:4000/api/users/profile \
  -H "Authorization: Bearer invalid_token"

# Should return 401 Unauthorized
```

### Test Rate Limiting
```bash
# Try to login 10 times quickly
for i in {1..10}; do
  curl -X POST http://localhost:4000/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "wrong"}' &
done
wait

# After 5 attempts, should return 429 Too Many Requests
```

---

## 📝 Test Checklist

- [ ] Docker services start successfully
- [ ] Database migrations run without errors
- [ ] Backend server starts on port 4000
- [ ] Frontend server starts on port 3000
- [ ] Health check endpoints return 200 OK
- [ ] User can register with valid email/password
- [ ] Verification token is created in database
- [ ] User can login with correct credentials
- [ ] JWT token is returned and valid
- [ ] Dashboard loads for authenticated user
- [ ] User can connect BingX API keys
- [ ] API keys are encrypted in database
- [ ] Gatekeeper check runs automatically
- [ ] Access level updates based on gatekeeper result
- [ ] User can logout successfully
- [ ] Protected routes redirect to login when not authenticated

---

## 🚀 Next Steps After Testing

1. **If all tests pass:**
   - Proceed to Phase 2 (Trading Engines)
   - Implement ICT & PA bot
   - Implement Sniper Scalp bot

2. **If tests fail:**
   - Check logs: `docker-compose logs -f`
   - Review error messages
   - Fix issues and re-test

3. **Production deployment:**
   - Update .env with production values
   - Use strong secrets
   - Enable HTTPS
   - Set up monitoring (Sentry)
   - Configure CI/CD

---

## 📞 Support

If you encounter issues:
1. Check logs: `docker-compose logs -f [service_name]`
2. Review environment variables in `.env`
3. Ensure all dependencies are installed
4. Check GitHub issues: https://github.com/anthropics/claude-code/issues
