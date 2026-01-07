# FLAXU Domain Bağlama Rehberi

## 🌐 Mevcut Domain'ler
- flaxu.io (.io) ⭐ **Önerilen - Crypto/Tech projeler için ideal**
- flaxu.network (.network)
- flaxu.org (.org)
- flaxu.xyz (.xyz)

---

## 📋 Gerekli Adımlar

### Adım 1: Hosting Seçimi

**Önerilen Hosting Seçenekleri:**

#### Option A: Vercel (Frontend) + DigitalOcean/Hetzner (Backend) ✅ ÖNERİLEN
**Maliyet:** ~$15-20/ay
- Frontend: Vercel (ücretsiz/hobby plan)
- Backend: Hetzner VPS (€12.96/ay)
- Database: Same VPS
- Domain: flaxu.io

**Artılar:**
- ✅ Kolay setup
- ✅ Otomatik SSL
- ✅ CDN dahil (Vercel)
- ✅ Git entegrasyonu
- ✅ Düşük maliyet

#### Option B: Tamamen Hetzner
**Maliyet:** ~$15/ay
- Frontend + Backend + DB: Hetzner VPS
- Domain: flaxu.io

**Artılar:**
- ✅ Tek yer, kolay yönetim
- ✅ Çok ucuz
- ✅ Full kontrol

---

## 🚀 Production Deployment (Option A - Önerilen)

### 1. Frontend'i Vercel'e Deploy Et

**A. Vercel Hesabı Oluştur:**
```bash
# 1. Git'e push et (zaten yaptık ✅)
git push origin claude/crypto-trading-app-KTgle

# 2. https://vercel.com/signup adresinden hesap oluştur
# GitHub ile giriş yap

# 3. GitHub repo'sunu bağla
# - "Import Project" → GitHub'dan repo seç
# - Root directory: /frontend
# - Framework Preset: Next.js (otomatik algılar)
```

**B. Environment Variables Ekle:**
Vercel dashboard'dan:
```env
NEXT_PUBLIC_API_URL=https://api.flaxu.io
NEXT_PUBLIC_WS_URL=wss://api.flaxu.io
NEXTAUTH_SECRET=flaxu-super-secret-key-change-in-production-2026
NEXTAUTH_URL=https://flaxu.io
```

**C. Domain Bağla:**
```
Vercel Dashboard → Settings → Domains
1. "flaxu.io" ekle
2. DNS ayarlarını kopyala
```

---

### 2. Backend'i VPS'e Deploy Et

**A. Hetzner VPS Satın Al:**
```
1. https://www.hetzner.com/cloud adresine git
2. CPX31 seç (4 vCPU, 8GB RAM, €12.96/ay)
3. Location: Finland (en yakın)
4. SSH key ekle (güvenlik için)
```

**B. VPS'e Bağlan:**
```bash
ssh root@YOUR_VPS_IP
```

**C. Server Kurulumu:**
```bash
# 1. Sistem güncellemesi
apt update && apt upgrade -y

# 2. Docker kur
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh

# 3. Docker Compose kur
apt install docker-compose -y

# 4. Git kur
apt install git -y

# 5. Nginx kur (reverse proxy için)
apt install nginx certbot python3-certbot-nginx -y
```

**D. Projeyi Klonla:**
```bash
cd /opt
git clone https://github.com/YOUR_USERNAME/flaxu.git
cd flaxu
git checkout claude/crypto-trading-app-KTgle
```

**E. Production .env Oluştur:**
```bash
nano .env
```

```env
# Database
DATABASE_URL="postgresql://flaxu_user:STRONG_PASSWORD_HERE@postgres:5432/flaxu_db?schema=public"
REDIS_URL="redis://redis:6379"
ENCRYPTION_KEY="GENERATE_NEW_32_BYTE_HEX"

# Auth
JWT_SECRET="GENERATE_NEW_SECRET"
NEXTAUTH_SECRET="SAME_AS_VERCEL"
NEXTAUTH_URL="https://flaxu.io"

# BingX (senin keyler)
BINGX_API_KEY="r95s18r1yXW7zZ5kTA5OAXu9P3mNSzaqf8AHEp92zr5TCZD73LeaxUycYaK1qgzAZxhPQ3NP9j60SiXpQ"
BINGX_SECRET_KEY="w79nIiouFOTtnh72Q56wWfSAYlhAbGRVSrlQJ1yK62RmlvEqO4ZUE9gadEQbPS0y4e9Ha1Myyc7mAODNHQw"
BINGX_REFERRER_ID="YOUR_BINGX_USER_ID"
BINGX_API_URL="https://open-api.bingx.com"

# Email (Gmail App Password kullan)
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"
SMTP_FROM="FLAXU <noreply@flaxu.io>"

# App Settings
NODE_ENV="production"
BACKEND_PORT="4000"
CORS_ORIGINS="https://flaxu.io,https://www.flaxu.io"
LOG_LEVEL="info"

# Database (Docker)
POSTGRES_USER="flaxu_user"
POSTGRES_PASSWORD="STRONG_PASSWORD_HERE"
POSTGRES_DB="flaxu_db"
```

**F. Güvenli Secretlar Oluştur:**
```bash
# Encryption key (32 bytes hex)
openssl rand -hex 32

# JWT secret
openssl rand -base64 32

# Postgres password
openssl rand -base64 24
```

**G. Docker ile Başlat:**
```bash
# Production için backend ve database'i başlat
docker-compose up -d postgres redis backend python-signals

# Logları kontrol et
docker-compose logs -f backend

# Database migration
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma generate
```

---

### 3. Nginx Reverse Proxy Kurulumu

**A. Nginx Config Oluştur:**
```bash
nano /etc/nginx/sites-available/flaxu-api
```

```nginx
server {
    server_name api.flaxu.io;

    location / {
        proxy_pass http://localhost:4000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}
```

**B. Config'i Aktif Et:**
```bash
ln -s /etc/nginx/sites-available/flaxu-api /etc/nginx/sites-enabled/
nginx -t
systemctl reload nginx
```

---

### 4. DNS Ayarları

**A. Domain Panel'ine Git**
(GoDaddy, Namecheap, Cloudflare vb.)

**B. DNS Kayıtları Ekle:**

```
Type  | Name          | Value              | TTL
------|---------------|--------------------|-----
A     | @             | VERCEL_IP          | Auto (Frontend)
CNAME | www           | cname.vercel-dns.  | Auto (Frontend)
A     | api           | YOUR_VPS_IP        | Auto (Backend)
```

**Vercel IP almak için:**
- Vercel dashboard → Domain settings'ten IP adreslerini kopyala

---

### 5. SSL Sertifikası (HTTPS)

**A. Backend için Let's Encrypt:**
```bash
certbot --nginx -d api.flaxu.io
```

**B. Otomatik yenileme:**
```bash
certbot renew --dry-run
```

**C. Vercel:**
- Otomatik SSL var, hiçbir şey yapma ✅

---

### 6. Test Et

**A. Frontend Test:**
```bash
curl https://flaxu.io
# Status: 200 OK beklenir
```

**B. Backend Test:**
```bash
curl https://api.flaxu.io/health
# Response: {"status":"ok",...}
```

**C. Tarayıcıda:**
```
1. https://flaxu.io → Landing page görünmeli
2. Register → Login → Dashboard
3. API keys bağla → Gatekeeper check
```

---

## 🔧 Production için Docker Compose (Güncellenmiş)

**docker-compose.prod.yml oluştur:**
```yaml
version: '3.8'

services:
  postgres:
    image: timescale/timescaledb:latest-pg15
    restart: always
    environment:
      POSTGRES_USER: ${POSTGRES_USER}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
      POSTGRES_DB: ${POSTGRES_DB}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - flaxu-network

  redis:
    image: redis:7-alpine
    restart: always
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data
    networks:
      - flaxu-network

  backend:
    build: ./backend
    restart: always
    ports:
      - "127.0.0.1:4000:4000"
    environment:
      NODE_ENV: production
      DATABASE_URL: ${DATABASE_URL}
      REDIS_URL: ${REDIS_URL}
      JWT_SECRET: ${JWT_SECRET}
      ENCRYPTION_KEY: ${ENCRYPTION_KEY}
    depends_on:
      - postgres
      - redis
    networks:
      - flaxu-network

  python-signals:
    build: ./python-signals
    restart: always
    ports:
      - "127.0.0.1:8000:8000"
    depends_on:
      - redis
    networks:
      - flaxu-network

volumes:
  postgres_data:
  redis_data:

networks:
  flaxu-network:
    driver: bridge
```

**Kullanım:**
```bash
docker-compose -f docker-compose.prod.yml up -d
```

---

## 📊 Monitoring & Logging

**A. PM2 ile Backend İzleme (opsiyonel):**
```bash
npm install -g pm2
pm2 start "docker-compose -f docker-compose.prod.yml up" --name flaxu
pm2 save
pm2 startup
```

**B. Logları İzle:**
```bash
# Backend logs
docker-compose logs -f backend

# Nginx logs
tail -f /var/log/nginx/access.log
tail -f /var/log/nginx/error.log

# Sistem logs
journalctl -u nginx -f
```

**C. Uptime Monitoring:**
```bash
# UptimeRobot (ücretsiz)
# https://uptimerobot.com
# Monitor ekle:
# - https://flaxu.io
# - https://api.flaxu.io/health
```

---

## 🔒 Güvenlik Kontrol Listesi

- [ ] `.env` dosyası güçlü şifrelerle dolduruldu
- [ ] SSH key-based auth aktif (password disabled)
- [ ] Firewall aktif (ufw enable)
- [ ] Sadece gerekli portlar açık (80, 443, 22)
- [ ] SSL sertifikası yüklendi
- [ ] CORS sadece flaxu.io'ya izin veriyor
- [ ] Rate limiting aktif
- [ ] Database backup cron job kuruldu
- [ ] Log rotation aktif

---

## 💰 Toplam Maliyet (Aylık)

### Minimal Setup
- Hetzner VPS (CPX31): €12.96 (~$14)
- Vercel: $0 (Hobby tier)
- Domain: $0 (zaten var)
- **TOPLAM: ~$14/ay**

### Gelişmiş Setup (100+ kullanıcı)
- Hetzner VPS (CPX41): €23.96 (~$26)
- Vercel Pro: $20
- Managed PostgreSQL: $15
- **TOPLAM: ~$61/ay**

---

## 🚨 Sorun Giderme

### Backend'e ulaşılamıyor
```bash
# Port dinleniyor mu?
netstat -tlnp | grep 4000

# Docker çalışıyor mu?
docker-compose ps

# Nginx çalışıyor mu?
systemctl status nginx

# Firewall kontrolü
ufw status
```

### SSL hatası
```bash
# Sertifikayı yenile
certbot renew

# Nginx reload
systemctl reload nginx
```

### Database bağlantı hatası
```bash
# PostgreSQL çalışıyor mu?
docker-compose exec postgres pg_isready

# Şifreyi kontrol et
echo $DATABASE_URL
```

---

## 📝 Hızlı Başlangıç (Özet)

```bash
# 1. VPS satın al (Hetzner)
# 2. SSH ile bağlan
ssh root@YOUR_VPS_IP

# 3. Kurulum script'i çalıştır
curl -fsSL https://get.docker.com | sh
apt install nginx certbot python3-certbot-nginx git -y

# 4. Projeyi klonla
cd /opt && git clone YOUR_REPO
cd flaxu

# 5. .env oluştur ve doldur
nano .env

# 6. Docker başlat
docker-compose up -d

# 7. Nginx config
nano /etc/nginx/sites-available/flaxu-api
ln -s /etc/nginx/sites-available/flaxu-api /etc/nginx/sites-enabled/

# 8. SSL kur
certbot --nginx -d api.flaxu.io

# 9. DNS ayarları yap (domain panelinde)
# A record: api.flaxu.io → VPS_IP

# 10. Vercel'e deploy (frontend)
# GitHub'dan import et

# 11. Test et
curl https://api.flaxu.io/health
curl https://flaxu.io

# ✅ HAZIR!
```

---

## 🎯 Hangi Domain'i Kullanmalısın?

**Öneri: flaxu.io** ⭐

**Sebep:**
- ✅ .io kripto/tech projeleri için standart
- ✅ Kısa ve akılda kalıcı
- ✅ Profesyonel görünüm
- ✅ Binance.com, Crypto.com gibi büyük platformlar .io kullanıyor

**Diğer domain'leri şöyle kullanabilirsin:**
- flaxu.network → Blog/Community için
- flaxu.org → Dökümantasyon için
- flaxu.xyz → Test/Staging ortamı için

---

## 📞 Yardım

Herhangi bir adımda takılırsan:
1. VPS loglarını kontrol et: `docker-compose logs -f`
2. Nginx logları: `tail -f /var/log/nginx/error.log`
3. DNS propagation: https://dnschecker.org

**Hazır olduğunda söyle, adım adım ilerleyelim! 🚀**
