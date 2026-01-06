# FLAXU - Ultimate Crypto Super App & Trading Terminal
## Software Architecture & Technical Design Document

---

## 📋 Table of Contents
1. [Executive Summary](#executive-summary)
2. [Technology Stack](#technology-stack)
3. [System Architecture](#system-architecture)
4. [Core Modules](#core-modules)
5. [Data Providers Strategy](#data-providers-strategy)
6. [Security Architecture](#security-architecture)
7. [Implementation Roadmap](#implementation-roadmap)
8. [Infrastructure & Deployment](#infrastructure--deployment)

---

## 1. Executive Summary

**Project Goal**: Build a professional-grade crypto trading platform with BingX integration, advanced market analytics, and automated/semi-automated trading capabilities.

**Key Differentiators**:
- Gatekeeper system ensuring only verified referrals access the platform
- Real-time ICT & PA trading signals with auto-execution
- Sniper bot for extreme volatility opportunities
- Comprehensive market intelligence dashboard

**Target Users**: BingX users in your referral network with $200+ deposits in last 5 days

---

## 2. Technology Stack

### 2.1 Frontend
```
Framework: Next.js 14+ (App Router)
Language: TypeScript
UI Library: React 18+
Styling: Tailwind CSS + shadcn/ui
State Management: Zustand + React Query
Charts: TradingView Lightweight Charts + Recharts
Real-time: Socket.IO Client
```

**Rationale**:
- Next.js provides SSR/SSG for SEO optimization
- TypeScript ensures type safety for complex trading logic
- shadcn/ui offers beautiful, customizable dark-mode components
- TradingView charts are industry standard for crypto trading

### 2.2 Backend
```
Framework: Node.js + Express.js (TypeScript)
Alternative Services: Python FastAPI (for ML/AI trading signals)
API: RESTful + WebSocket (Socket.IO)
Validation: Zod
ORM: Prisma
Queue: Bull (Redis-based job queue)
Cron Jobs: node-cron
```

**Rationale**:
- Node.js for real-time capabilities and JavaScript ecosystem
- Python FastAPI for ICT/PA signal processing (if ML needed)
- Bull queue for async trading operations
- Prisma for type-safe database queries

### 2.3 Database
```
Primary: PostgreSQL 15+
Cache: Redis 7+
Time-Series: TimescaleDB (PostgreSQL extension)
```

**Structure**:
- PostgreSQL: Users, API keys (encrypted), trade history, admin data
- Redis: Session cache, rate limiting, real-time data cache
- TimescaleDB: OHLCV data, liquidation history, funding rates

### 2.4 Security & Authentication
```
Auth: NextAuth.js (Email/Password)
Encryption: crypto (Node.js native) + AES-256-GCM
API Security: Helmet.js, CORS, Rate Limiting
Environment: dotenv-vault (encrypted .env)
```

### 2.5 DevOps & Infrastructure
```
Containerization: Docker + Docker Compose
CI/CD: GitHub Actions
Hosting:
  - Frontend: Vercel (Next.js optimized)
  - Backend: DigitalOcean Droplet / Hetzner VPS
  - Database: Managed PostgreSQL (DigitalOcean)
Monitoring:
  - Application: Sentry
  - Infrastructure: Uptime Kuma (self-hosted)
  - Logs: Winston + Better-Stack
```

---

## 3. System Architecture

### 3.1 High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND (Next.js)                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐        │
│  │   Auth   │  │Dashboard │  │  Trading │  │  Admin   │        │
│  │Gatekeeper│  │Analytics │  │ Engines  │  │  Panel   │        │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘        │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS/WSS
┌─────────────────────────▼───────────────────────────────────────┐
│                    API GATEWAY (Express.js)                      │
│                  Authentication Middleware                       │
│                   Rate Limiting Middleware                       │
└─────┬─────────────┬─────────────┬─────────────┬─────────────────┘
      │             │             │             │
┌─────▼─────┐ ┌────▼─────┐ ┌─────▼─────┐ ┌────▼─────┐
│   Auth    │ │ Trading  │ │  Market   │ │  Admin   │
│  Service  │ │  Engine  │ │   Data    │ │ Service  │
│           │ │ Service  │ │  Service  │ │          │
└─────┬─────┘ └────┬─────┘ └─────┬─────┘ └────┬─────┘
      │            │              │             │
      │     ┌──────▼──────────────▼─────┐       │
      │     │   Job Queue (Bull/Redis)  │       │
      │     └──────┬──────────────┬─────┘       │
      │            │              │             │
┌─────▼────────────▼──────────────▼─────────────▼─────┐
│              PostgreSQL + Redis + TimescaleDB        │
└──────────────────────────────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────┐
│              EXTERNAL APIs                          │
│  ┌──────┐  ┌────────┐  ┌──────────┐  ┌──────────┐ │
│  │BingX │  │CoinGecko│ │Coinglass│  │ Others   │ │
│  └──────┘  └────────┘  └──────────┘  └──────────┘ │
└─────────────────────────────────────────────────────┘
```

### 3.2 Service Breakdown

#### **Auth Service**
- User registration (email/password)
- Email verification
- JWT token generation
- Session management
- API key storage (encrypted)

#### **Gatekeeper Service**
- BingX API key validation
- Referral verification via BingX API
- Deposit history check (last 5 days, $200+ threshold)
- Access control logic

#### **Trading Engine Service**
- ICT & PA signal generator
- Sniper scalp detector
- Trade execution via BingX API
- Risk management (TP/SL calculation)
- Position monitoring

#### **Market Data Service**
- Multi-exchange data aggregation
- Arbitrage opportunity detection
- Liquidation heatmap data
- Fear & Greed index
- Altcoin season index
- Funding rate aggregation

#### **Admin Service**
- User management
- Activity monitoring
- Inactive user detection (0 volume in 30 days)
- System health checks

---

## 4. Core Modules

### 4.1 The Gatekeeper System

**Flow Diagram**:
```
User Registration (Email)
         ↓
Email Verification
         ↓
User Enters BingX API Keys
         ↓
┌────────────────────────────────┐
│  API Key Validation (BingX)    │
└────────┬───────────────────────┘
         ↓
┌────────────────────────────────┐
│  Referral Check via BingX API  │
└────┬───────────────────┬───────┘
     │                   │
  ✓ YES              ✗ NO
     │                   │
     ↓                   ↓
Deposit Check      Show Warning
(Last 5 days)      + Referral Link
     │                   │
  $200+            Redirect to KYC
     ↓              Transfer Guide
FULL ACCESS             ↓
                   LIMITED ACCESS
```

**Implementation Details**:

1. **API Key Storage**:
```typescript
// Database schema
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  passwordHash    String
  bingxApiKey     String?  // Encrypted with AES-256-GCM
  bingxSecretKey  String?  // Encrypted with AES-256-GCM
  isVerified      Boolean  @default(false)
  isReferral      Boolean  @default(false)
  hasDeposit      Boolean  @default(false)
  lastDepositCheck DateTime?
  accessLevel     AccessLevel @default(LIMITED)
  createdAt       DateTime @default(now())
}

enum AccessLevel {
  LIMITED
  FULL
  SUSPENDED
}
```

2. **BingX Referral Check**:
```typescript
// Pseudo-code
async function checkReferralStatus(apiKey: string, secretKey: string) {
  const client = new BingXClient(apiKey, secretKey);

  // Check referral
  const referralInfo = await client.getReferralInfo();
  const isReferral = referralInfo.referrerId === YOUR_BINGX_ID;

  if (!isReferral) {
    return {
      status: 'NOT_REFERRAL',
      redirectTo: 'SIGNUP_LINK'
    };
  }

  // Check deposits (last 5 days)
  const deposits = await client.getDepositHistory({
    startTime: Date.now() - (5 * 24 * 60 * 60 * 1000)
  });

  const totalDeposit = deposits.reduce((sum, d) => sum + d.amount, 0);

  if (totalDeposit < 200) {
    return {
      status: 'INSUFFICIENT_DEPOSIT',
      amount: totalDeposit,
      required: 200
    };
  }

  return { status: 'APPROVED' };
}
```

3. **Periodic Re-validation**:
- Check deposit status every 24 hours (cron job)
- If user drops below threshold, downgrade access
- Email notification system

### 4.2 Trading Engines

#### **A. ICT & PA Futures Engine**

**Signal Generation Logic**:
```
Data Collection (1m, 5m, 15m, 1h candles)
         ↓
Technical Indicators
  - Order Blocks (OB)
  - Fair Value Gaps (FVG)
  - Liquidity Sweeps
  - Market Structure Shifts
  - Volume Profile
         ↓
Pattern Recognition
  - Breaker Blocks
  - Mitigation Blocks
  - Liquidity Grabs
         ↓
Confidence Score Calculation
  (0-100 based on confluence)
         ↓
     Score > 75?
         ↓
    ✓ YES → Auto Execute Trade
         - Calculate Position Size (1-2% risk)
         - Set TP (1:2 or 1:3 R:R)
         - Set SL (below/above key level)
         ↓
    Monitor Position
         ↓
    Exit on TP/SL
```

**Tech Stack for Signal Processing**:
```python
# Python microservice (FastAPI)
import pandas as pd
import numpy as np
from ta import trend, volatility, volume

class ICTSignalGenerator:
    def __init__(self, symbol: str):
        self.symbol = symbol
        self.confidence_threshold = 75

    def detect_order_blocks(self, df: pd.DataFrame):
        # OB logic
        pass

    def detect_fvg(self, df: pd.DataFrame):
        # Fair Value Gap logic
        pass

    def calculate_confidence(self, signals: dict) -> float:
        # Weight different signals
        # Return 0-100 score
        pass

    def generate_signal(self) -> Optional[TradeSignal]:
        df = self.get_ohlcv_data()

        signals = {
            'order_block': self.detect_order_blocks(df),
            'fvg': self.detect_fvg(df),
            'liquidity': self.detect_liquidity_sweep(df),
            'structure': self.detect_market_structure(df)
        }

        confidence = self.calculate_confidence(signals)

        if confidence >= self.confidence_threshold:
            return TradeSignal(
                symbol=self.symbol,
                direction='LONG' or 'SHORT',
                entry=calculated_entry,
                tp=calculated_tp,
                sl=calculated_sl,
                confidence=confidence
            )

        return None
```

**Database Schema for Trades**:
```typescript
model Trade {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id])

  symbol        String
  side          String   // LONG/SHORT
  entryPrice    Decimal
  exitPrice     Decimal?
  stopLoss      Decimal
  takeProfit    Decimal

  positionSize  Decimal
  leverage      Int

  status        TradeStatus // OPEN, CLOSED, CANCELLED
  pnl           Decimal?
  pnlPercent    Decimal?

  signalType    String   // ICT, SNIPER
  confidence    Int?

  openedAt      DateTime @default(now())
  closedAt      DateTime?

  bingxOrderId  String?
}

enum TradeStatus {
  PENDING
  OPEN
  CLOSED
  CANCELLED
  FAILED
}
```

#### **B. Sniper Scalp Engine**

**Detection Criteria**:
```typescript
interface SniperCriteria {
  timeWindow: 5 minutes
  priceMovement: {
    pump: +5% or more
    dump: -10% or more
  }
  liquidationCleared: 75% of order book liquidations
}
```

**Implementation**:
```typescript
class SniperScalpDetector {
  private ws: WebSocket;
  private priceCache: Map<string, PriceData[]>;
  private liquidationCache: Map<string, LiquidationData>;

  async detectOpportunities() {
    const symbols = await this.getActiveSymbols();

    for (const symbol of symbols) {
      const recentPrices = this.priceCache.get(symbol) || [];
      const current = recentPrices[recentPrices.length - 1];
      const fiveMinAgo = recentPrices[0];

      if (!current || !fiveMinAgo) continue;

      const priceChange = ((current.price - fiveMinAgo.price) / fiveMinAgo.price) * 100;

      // Check pump/dump
      if (Math.abs(priceChange) >= 5) {
        const liqData = await this.getLiquidationData(symbol);
        const liqClearPercent = this.calculateLiquidationClear(liqData);

        if (liqClearPercent >= 75) {
          // OPPORTUNITY FOUND!
          await this.notifyUser({
            symbol,
            priceChange,
            liqClearPercent,
            direction: priceChange > 0 ? 'LONG' : 'SHORT'
          });
        }
      }
    }
  }

  async executeManualTrade(userId: string, signal: SniperSignal) {
    // One-click trade execution
    const user = await getUserWithApiKeys(userId);
    const bingx = new BingXClient(user.apiKey, user.secretKey);

    return await bingx.placeOrder({
      symbol: signal.symbol,
      side: signal.direction,
      type: 'MARKET',
      quantity: calculatePositionSize(user, signal),
      stopLoss: calculateSL(signal),
      takeProfit: calculateTP(signal)
    });
  }
}
```

### 4.3 Market Intelligence Panel

#### **Data Sources Strategy**:

| Feature | Primary Provider | Backup/Alternative | Cost | Rate Limit |
|---------|-----------------|-------------------|------|------------|
| **Arbitrage Scanner** | Self-built (BingX + Binance + OKX public APIs) | - | Free | Varies |
| **Global Liquidation Heatmap** | Coinglass Free API | CoinGlass Paid ($50/mo for real-time) | Free→Paid | 100 req/day free |
| **Fear & Greed Index** | Alternative.me | - | Free | No limit |
| **Altcoin Season Index** | BlockchainCenter.net | Self-calculated | Free | No limit |
| **Top 500 Coins** | CoinGecko Free | CoinMarketCap Free | Free | 30 calls/min |
| **Long/Short Ratios** | BingX API | Binance API | Free | As per exchange |
| **Funding Rates** | BingX + Binance APIs | Coinglass | Free | As per exchange |

**Cost-Effective Approach**:
- Start with free APIs
- Implement aggressive caching (Redis)
- Upgrade to paid when user base > 100 active users
- Self-host scrapers for non-API data (if legal)

#### **Arbitrage Scanner Architecture**:
```typescript
class ArbitrageScanner {
  private exchanges = ['bingx', 'binance', 'okx', 'bybit'];

  async scanOpportunities() {
    const symbols = this.getCommonSymbols(); // BTC, ETH, etc.
    const opportunities = [];

    for (const symbol of symbols) {
      const prices = await Promise.all(
        this.exchanges.map(ex => this.getPrice(ex, symbol))
      );

      const min = Math.min(...prices.map(p => p.price));
      const max = Math.max(...prices.map(p => p.price));
      const spread = ((max - min) / min) * 100;

      if (spread > 0.5) { // 0.5% threshold (accounting for fees)
        opportunities.push({
          symbol,
          buyExchange: prices.find(p => p.price === min).exchange,
          sellExchange: prices.find(p => p.price === max).exchange,
          spread: spread.toFixed(2) + '%',
          potential: calculatePotentialProfit(spread)
        });
      }
    }

    return opportunities;
  }
}
```

### 4.4 Admin Panel

**Features**:
1. **User Management Dashboard**
```sql
-- Query for inactive users
SELECT
  u.id,
  u.email,
  u.createdAt,
  COALESCE(SUM(t.positionSize), 0) as totalVolume,
  MAX(t.openedAt) as lastTradeDate
FROM users u
LEFT JOIN trades t ON u.id = t.userId
  AND t.openedAt >= NOW() - INTERVAL '30 days'
GROUP BY u.id
HAVING COALESCE(SUM(t.positionSize), 0) = 0
ORDER BY u.createdAt DESC;
```

2. **System Metrics**
- Total users / Active users (last 7 days)
- Total trades executed
- Success rate (winning trades %)
- Total PnL across all users
- API health status
- Error logs

3. **User Actions**
- Suspend/Activate accounts
- Manual access override
- Reset API keys
- View individual trade history

---

## 5. Data Providers Strategy

### 5.1 Free Tier Maximization

```yaml
Primary Strategy:
  - Use free APIs with caching
  - Implement fallback chains
  - Respect rate limits with queue system
  - Cache duration: 10s-60s for prices, 1h-24h for static data

Caching Strategy:
  Real-time prices: 10 seconds
  Liquidation data: 30 seconds
  Funding rates: 5 minutes
  Fear & Greed: 1 hour
  Top 500 coins: 10 minutes
  Arbitrage opportunities: 15 seconds
```

### 5.2 API Integration Priority

**Phase 1 (MVP)**:
- BingX API (essential)
- CoinGecko (top coins data)
- Alternative.me (F&G index)

**Phase 2**:
- Binance public API (arbitrage)
- BlockchainCenter (altcoin season)

**Phase 3** (When budget allows):
- Coinglass Pro ($50-100/mo)
- CryptoQuant (if needed for advanced analytics)

---

## 6. Security Architecture

### 6.1 API Key Encryption

```typescript
import crypto from 'crypto';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY; // 32 bytes
const ALGORITHM = 'aes-256-gcm';

export function encryptApiKey(apiKey: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  let encrypted = cipher.update(apiKey, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  // Store: iv:authTag:encrypted
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

export function decryptApiKey(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### 6.2 Authentication Flow

```
User Login
    ↓
Email + Password
    ↓
Verify Password Hash (bcrypt)
    ↓
Generate JWT (24h expiration)
    ↓
Store Session in Redis (refresh token)
    ↓
Return JWT + Refresh Token
    ↓
Frontend stores in httpOnly cookies
```

### 6.3 Rate Limiting

```typescript
// Per-user rate limits
const rateLimits = {
  api: {
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100 // 100 requests per 15 min
  },
  trading: {
    windowMs: 60 * 1000, // 1 minute
    max: 10 // 10 trades per minute
  },
  auth: {
    windowMs: 15 * 60 * 1000,
    max: 5 // 5 login attempts per 15 min
  }
};
```

### 6.4 Security Checklist

- [x] API keys encrypted at rest (AES-256-GCM)
- [x] HTTPS only (TLS 1.3)
- [x] JWT with short expiration
- [x] CORS properly configured
- [x] Helmet.js for HTTP headers
- [x] Input validation (Zod schemas)
- [x] SQL injection prevention (Prisma ORM)
- [x] XSS protection (sanitize user inputs)
- [x] CSRF tokens for state-changing operations
- [x] Rate limiting per user/IP
- [x] 2FA (optional, can add later)

---

## 7. Implementation Roadmap

### Phase 1: Foundation & MVP (Week 1-2)

**Goal**: Basic app with authentication and BingX integration

**Tasks**:
- [x] Project setup (Next.js + Express + PostgreSQL)
- [x] Database schema design
- [x] User authentication (email/password)
- [x] Email verification system
- [x] Gatekeeper implementation
  - BingX API integration
  - Referral check
  - Deposit verification
- [x] Basic dashboard UI
- [x] API key management page
- [x] Dark mode UI theme

**Deliverables**:
- Users can register and verify email
- Users can enter BingX API keys
- System checks referral status and deposits
- Access granted/denied based on criteria

---

### Phase 2: Trading Engines (Week 3-4)

**Goal**: ICT/PA bot and Sniper bot functional

**Tasks**:
- [x] WebSocket connection to BingX
- [x] Real-time price data streaming
- [x] ICT signal generator (Python microservice)
  - Order block detection
  - FVG detection
  - Confidence scoring
- [x] Auto-trade execution logic
- [x] TP/SL calculation algorithms
- [x] Sniper scalp detector
  - 5-minute price monitoring
  - Liquidation data integration
  - Manual trigger UI
- [x] Trade history dashboard
- [x] Position monitoring (open trades)

**Deliverables**:
- ICT bot generates signals and executes trades (auto mode)
- Sniper bot detects opportunities (manual trigger)
- Users can see trade history and PnL

---

### Phase 3: Market Intelligence (Week 5-6)

**Goal**: Comprehensive analytics dashboard

**Tasks**:
- [x] Arbitrage scanner
  - Multi-exchange integration
  - Opportunity detection
- [x] Liquidation heatmap
  - Coinglass API integration
  - Visual heatmap component
- [x] Fear & Greed Index widget
- [x] Altcoin Season Index widget
- [x] Top 500 coins table
  - Sortable columns
  - Real-time price updates
- [x] Long/Short ratios display
- [x] Funding rates table
  - Multi-exchange comparison

**Deliverables**:
- Full market intelligence dashboard
- All data sources integrated
- Real-time updates via WebSocket

---

### Phase 4: Admin Panel & Polish (Week 7-8)

**Goal**: Admin controls and production-ready app

**Tasks**:
- [x] Admin authentication (separate from users)
- [x] User management interface
- [x] Inactive user detection (30-day filter)
- [x] System health monitoring
- [x] Error logging and alerts
- [x] Performance optimization
  - Database query optimization
  - Redis caching implementation
  - Frontend code splitting
- [x] SEO optimization
  - Meta tags
  - Sitemap
  - Robots.txt
- [x] Responsive mobile design
- [x] User documentation/help center
- [x] API key tutorial page

**Deliverables**:
- Admin can manage all users
- System monitoring dashboard
- Production-optimized build
- Mobile-responsive UI
- SEO-ready

---

### Phase 5: Testing & Deployment (Week 9)

**Tasks**:
- [x] Unit tests (critical functions)
- [x] Integration tests (API endpoints)
- [x] End-to-end tests (user flows)
- [x] Security audit
  - Penetration testing
  - Dependency vulnerability scan
- [x] Load testing (simulate 100+ users)
- [x] Docker containerization
- [x] CI/CD pipeline setup
- [x] Production deployment
  - Frontend: Vercel
  - Backend: VPS (DigitalOcean/Hetzner)
  - Database: Managed PostgreSQL
- [x] Monitoring setup (Sentry, Uptime Kuma)

**Deliverables**:
- Fully tested application
- Production deployment
- Monitoring and alerting active

---

## 8. Infrastructure & Deployment

### 8.1 Docker Architecture

```yaml
# docker-compose.yml
version: '3.8'

services:
  frontend:
    build: ./frontend
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:4000
    depends_on:
      - backend

  backend:
    build: ./backend
    ports:
      - "4000:4000"
    environment:
      - DATABASE_URL=postgresql://user:pass@postgres:5432/flaxu
      - REDIS_URL=redis://redis:6379
    depends_on:
      - postgres
      - redis

  python-signals:
    build: ./python-signals
    ports:
      - "8000:8000"
    depends_on:
      - redis

  postgres:
    image: timescale/timescaledb:latest-pg15
    ports:
      - "5432:5432"
    environment:
      - POSTGRES_DB=flaxu
      - POSTGRES_USER=user
      - POSTGRES_PASSWORD=password
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

### 8.2 Deployment Strategy

**Option A: Monolithic (Recommended for MVP)**
- Frontend: Vercel (free tier, auto-scaling)
- Backend + DB: Single VPS (Hetzner CPX31: €12.96/mo, 4 vCPU, 8GB RAM)
- Redis: Same VPS
- Cost: ~$15/month

**Option B: Microservices (For Scale)**
- Frontend: Vercel
- Backend API: DigitalOcean App Platform ($12/mo)
- Python Signals: Separate droplet ($6/mo)
- Database: Managed PostgreSQL ($15/mo)
- Redis: DigitalOcean Managed Redis ($15/mo)
- Cost: ~$50/month

**Recommendation**: Start with Option A, migrate to Option B when >500 active users.

### 8.3 CI/CD Pipeline

```yaml
# .github/workflows/deploy.yml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run tests
        run: |
          npm install
          npm run test

  deploy-frontend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to Vercel
        run: vercel --prod --token=${{ secrets.VERCEL_TOKEN }}

  deploy-backend:
    needs: test
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to VPS
        run: |
          ssh user@vps "cd /app && git pull && docker-compose up -d --build"
```

### 8.4 Monitoring & Alerts

```typescript
// Sentry integration
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: 0.1,
  beforeSend(event, hint) {
    // Filter sensitive data
    if (event.request) {
      delete event.request.headers?.authorization;
    }
    return event;
  }
});

// Trading engine alerts
async function notifyAdminOnError(error: Error, context: any) {
  await sendEmail({
    to: 'admin@flaxu.com',
    subject: `[CRITICAL] Trading Engine Error`,
    body: `
      Error: ${error.message}
      Context: ${JSON.stringify(context)}
      Timestamp: ${new Date().toISOString()}
    `
  });

  Sentry.captureException(error, { extra: context });
}
```

---

## 9. Cost Estimation

### 9.1 Monthly Operating Costs (MVP Phase)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend Hosting | Vercel | $0 (free tier) |
| Backend + DB VPS | Hetzner CPX31 | €12.96 (~$14) |
| Domain | Namecheap | $1/mo |
| SSL Certificate | Let's Encrypt | $0 |
| Email Service | SendGrid | $0 (100 emails/day free) |
| Monitoring | Sentry | $0 (free tier, 5k events/mo) |
| **Total** | | **~$15/month** |

### 9.2 Scaling Costs (100+ Active Users)

| Service | Provider | Cost |
|---------|----------|------|
| Frontend | Vercel Pro | $20 |
| Backend | DigitalOcean (larger droplet) | $24 |
| Database | Managed PostgreSQL | $15 |
| Redis | Managed Redis | $15 |
| Coinglass API | Pro Plan | $50 |
| Email | SendGrid Essentials | $15 |
| Monitoring | Sentry Team | $26 |
| **Total** | | **~$165/month** |

---

## 10. Risk Mitigation

### 10.1 Trading Risks

**Risk**: Auto-trading causes financial losses
**Mitigation**:
- Implement strict position sizing (max 2% account per trade)
- Daily loss limits (pause trading if -5% daily drawdown)
- Confidence threshold (only execute if >75% confidence)
- Paper trading mode for new users
- Clear disclaimers and terms of service

### 10.2 Technical Risks

**Risk**: BingX API downtime
**Mitigation**:
- Graceful error handling
- Queue failed requests for retry
- User notifications
- Fallback to manual trading

**Risk**: Data provider rate limits
**Mitigation**:
- Aggressive caching strategy
- Multiple data source fallbacks
- Request queuing with exponential backoff

### 10.3 Security Risks

**Risk**: API key theft
**Mitigation**:
- AES-256-GCM encryption at rest
- No API keys in logs
- No API keys in client-side code
- Regular security audits

---

## 11. Success Metrics (KPIs)

```typescript
interface KPIs {
  // User Metrics
  totalUsers: number;
  activeUsers30d: number;
  retentionRate: number; // % users active after 30 days
  avgSessionDuration: number; // minutes

  // Trading Metrics
  totalTradesExecuted: number;
  winRate: number; // % profitable trades
  avgPnLPerTrade: number;
  totalVolume: number; // USD

  // Technical Metrics
  apiUptime: number; // %
  avgResponseTime: number; // ms
  errorRate: number; // %

  // Business Metrics
  referralConversionRate: number; // % approved vs attempted
  monthlyActiveTraders: number;
  avgTradesPerUser: number;
}
```

---

## 12. Future Enhancements (Post-MVP)

### Phase 6+ (Optional)
- [ ] Mobile app (React Native)
- [ ] Telegram bot integration
- [ ] Copy trading (follow other users)
- [ ] Backtesting engine
- [ ] Portfolio analytics
- [ ] Multi-exchange support (beyond BingX)
- [ ] AI-powered market sentiment analysis
- [ ] Social features (leaderboard, chat)
- [ ] Referral reward system
- [ ] Subscription tiers (free vs premium features)

---

## 13. Conclusion

This architecture provides a **solid foundation** for FLAXU to scale from MVP to a production-grade trading platform. The stack choices prioritize:

1. **Developer Experience**: TypeScript everywhere, modern frameworks
2. **Performance**: Redis caching, WebSocket for real-time data
3. **Security**: Encryption, rate limiting, input validation
4. **Cost-Efficiency**: Free tiers for MVP, gradual scaling
5. **Maintainability**: Modular architecture, clear separation of concerns

**Next Steps**:
1. Review and approve this architecture
2. Set up development environment
3. Initialize project structure
4. Begin Phase 1 implementation

**Estimated Time to MVP**: 2-3 weeks (Phase 1 + Phase 2)
**Estimated Time to Full Launch**: 8-9 weeks (All phases)

---

**Document Version**: 1.0
**Last Updated**: 2026-01-06
**Author**: Senior Software Architect
**Status**: Ready for Implementation
