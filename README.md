# FLAXU - Ultimate Crypto Super App & Trading Terminal

Professional-grade crypto trading platform with BingX integration, advanced market analytics, and automated trading capabilities.

## 🎯 Features

- **Gatekeeper System**: Only verified referrals (direct/indirect) with $200+ wallet balance
- **ICT & PA Trading Bot**: Automated trading with 75%+ confidence signals
- **Sniper Scalp Bot**: Mean-reversion strategy for extreme volatility (PUMP→SHORT, DUMP→LONG)
- **User Profile Dashboard**: Real-time wallet, trades, ROI, and active positions tracking
- **Market Intelligence**: Arbitrage scanner, liquidation heatmap, fear/greed index, funding rates
- **Admin Panel**: User management, inactive user detection, system monitoring

## 🏗️ Architecture

```
flaxu/
├── frontend/          # Next.js 14 + TypeScript + Tailwind CSS
├── backend/           # Express.js + TypeScript + Prisma
├── python-signals/    # FastAPI (ICT/PA signal processing)
├── docker-compose.yml # Docker orchestration
└── .env.example       # Environment variables template
```

## 🛠️ Tech Stack

**Frontend**: Next.js 14, TypeScript, Tailwind CSS, shadcn/ui, TradingView Charts
**Backend**: Node.js, Express, TypeScript, Prisma, PostgreSQL, Redis
**Signals**: Python, FastAPI, pandas, numpy, ta (technical analysis)
**DevOps**: Docker, Docker Compose, GitHub Actions
**Security**: AES-256-GCM encryption, JWT auth, rate limiting

## 🚀 Quick Start

### Prerequisites

- Docker & Docker Compose
- Node.js 18+ (for local development)
- Python 3.11+ (for signal processing)

### 1. Clone and Setup

```bash
git clone <repo-url>
cd flaxu
cp .env.example .env
# Edit .env with your API keys
```

### 2. Start with Docker

```bash
docker-compose up -d
```

Services will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Python Signals: http://localhost:8000
- PostgreSQL: localhost:5432
- Redis: localhost:6379

### 3. Development Mode

**Frontend**:
```bash
cd frontend
npm install
npm run dev
```

**Backend**:
```bash
cd backend
npm install
npm run dev
```

**Python Signals**:
```bash
cd python-signals
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

## 🔐 Environment Variables

See `.env.example` for all required environment variables:

- **Database**: `DATABASE_URL`, `REDIS_URL`
- **Auth**: `NEXTAUTH_SECRET`, `JWT_SECRET`
- **BingX**: `BINGX_API_KEY`, `BINGX_SECRET_KEY`, `BINGX_REFERRER_ID`
- **Email**: `SMTP_HOST`, `SMTP_USER`, `SMTP_PASS`
- **APIs**: CoinGecko, Coinglass, etc.

## 📖 Documentation

- [Architecture](./ARCHITECTURE.md) - Comprehensive system architecture
- [API Documentation](./docs/API.md) - Backend API endpoints
- [Database Schema](./docs/DATABASE.md) - Prisma schema details
- [Deployment](./docs/DEPLOYMENT.md) - Production deployment guide

## 🧪 Testing

```bash
# Backend tests
cd backend
npm run test

# Frontend tests
cd frontend
npm run test

# E2E tests
npm run test:e2e
```

## 📊 Project Phases

✅ **Phase 1** (Week 1-2): Foundation & MVP
⏳ **Phase 2** (Week 3-4): Trading Engines & User Profile
⏳ **Phase 3** (Week 5-6): Market Intelligence
⏳ **Phase 4** (Week 7-8): Admin Panel & Polish
⏳ **Phase 5** (Week 9): Testing & Deployment

## 🔒 Security

- API keys encrypted with AES-256-GCM
- JWT authentication with httpOnly cookies
- Rate limiting on all endpoints
- Input validation with Zod
- CORS & Helmet.js configured
- No API keys in client-side code

## 📝 License

Proprietary - All rights reserved

## 🤝 Contributing

This is a private project. Unauthorized access is prohibited.

---

**Version**: 1.0.0
**Last Updated**: 2026-01-06
**Status**: In Development
