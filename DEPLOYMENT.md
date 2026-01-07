# FLAXU Domain Bağlama Rehberi

## 🌐 Mevcut Domain'ler
- flaxu.io (.io) ⭐ **Önerilen - Crypto/Tech projeler için ideal**
- flaxu.network (.network)
- flaxu.org (.org)
- flaxu.xyz (.xyz)

---

## 📁 VPS Dosya Yapısı (Amazon EC2)

Proje `/var/www/flaxu` dizinine kurulacak:

```
/var/www/
├── flaxu/                          # FLAXU projesi (yeni)
│   ├── backend/                    # Express.js backend
│   │   ├── src/                    # Kaynak kodlar
│   │   ├── prisma/                 # Database schema
│   │   └── Dockerfile              # Backend container
│   ├── frontend/                   # Next.js frontend
│   │   ├── src/                    # React components
│   │   ├── .next/                  # Production build (PM2 ile serve edilir)
│   │   └── Dockerfile              # Frontend container
│   ├── python-signals/             # Python AI servisi
│   ├── docker-compose.yml          # Servis orchestration
│   └── .env                        # Production secrets
│
├── site1/                          # Mevcut site 1
└── site2/                          # Mevcut site 2

/etc/nginx/sites-enabled/
├── site1.com                       # Mevcut site 1 config
├── site2.com                       # Mevcut site 2 config
├── flaxu.io -> sites-available/   # FLAXU frontend (yeni)
└── api.flaxu.io -> sites-available/# FLAXU API (yeni)
```

**GitHub Token ile Erişim:**
```bash
# Clone
git clone https://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@github.com/omrkrr44/flaxu.git

# Pull (güncellemeler için)
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle
```

---

## 📋 Gerekli Adımlar

### Adım 1: Hosting Seçimi

**Önerilen Hosting Seçenekleri:**

#### Option A: Amazon EC2 (Mevcut VPS) ⭐⭐ ÜCRETSİZ - ÖNERİLEN
**Maliyet:** $0 (Mevcut VPS kullanılacak)
- Frontend + Backend + DB: Mevcut Amazon EC2 VPS
- Domain: flaxu.io
- Diğer 2 sitenle birlikte çalışır

**Artılar:**
- ✅ Ek maliyet yok
- ✅ Statik IP zaten var
- ✅ Full kontrol
- ✅ Mevcut sitelerle birlikte çalışır
- ✅ Tek yerden yönetim

**Gereksinimler:**
- Minimum 4GB RAM (önerilen 8GB)
- En az 20GB boş disk alanı
- Docker ve Docker Compose
- Nginx (muhtemelen zaten kurulu)

---

#### Option B: Vercel (Frontend) + Amazon EC2 (Backend)
**Maliyet:** $0 (Free tier)
- Frontend: Vercel (ücretsiz/hobby plan)
- Backend: Mevcut Amazon EC2 VPS
- Database: Same VPS
- Domain: flaxu.io

**Artılar:**
- ✅ Frontend için CDN
- ✅ Kolay setup
- ✅ Otomatik SSL (Vercel)
- ✅ Git entegrasyonu
- ✅ Backend VPS'te kalır

---

#### Option C: Vercel (Frontend) + Yeni Hetzner (Backend)
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
- ✅ Amazon VPS yükünü azaltır

---

## 🚀 Production Deployment (Option A - Amazon EC2 Mevcut VPS)

### Ön Hazırlık: VPS Sistem Kontrolü

**A. VPS'e Bağlan:**
```bash
ssh ubuntu@YOUR_AMAZON_VPS_IP
# veya
ssh ec2-user@YOUR_AMAZON_VPS_IP
```

**B. Sistem Kaynaklarını Kontrol Et:**
```bash
# RAM kontrolü
free -h

# Disk kontrolü
df -h

# CPU kontrolü
nproc

# Mevcut Docker kontrol
docker --version
docker-compose --version

# Nginx kontrol
nginx -v
systemctl status nginx
```

**C. Gerekli Kurulumlar (yoksa):**
```bash
# Docker kurulu değilse
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Docker Compose kurulu değilse
sudo apt update
sudo apt install docker-compose -y

# Git kurulu değilse
sudo apt install git -y

# Nginx kurulu değilse
sudo apt install nginx certbot python3-certbot-nginx -y
```

---

### 1. AWS Security Group Ayarları

**A. AWS Console'a Git:**
- EC2 Dashboard → Security Groups
- VPS'inin kullandığı Security Group'u seç

**B. Inbound Rules Ekle:**
```
Type        | Protocol | Port Range | Source      | Description
------------|----------|------------|-------------|------------------
HTTP        | TCP      | 80         | 0.0.0.0/0   | Web traffic
HTTPS       | TCP      | 443        | 0.0.0.0/0   | Secure web
SSH         | TCP      | 22         | MY_IP/32    | SSH (sadece senin IP'n)
Custom TCP  | TCP      | 4000       | 127.0.0.1   | Backend (local only)
Custom TCP  | TCP      | 3000       | 127.0.0.1   | Frontend (local only)
```

**NOT:** Port 4000 ve 3000 sadece localhost'tan erişilebilir olmalı. Nginx reverse proxy üzerinden dışarıya açılacak.

---

### 2. Projeyi VPS'e Klonla

**A. Proje Dizini Oluştur:**
```bash
# Projeler için dizin oluştur
sudo mkdir -p /var/www
cd /var/www

# FLAXU'yu klonla (GitHub token ile)
sudo git clone https://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@github.com/omrkrr44/flaxu.git
sudo chown -R $USER:$USER flaxu
cd flaxu
git checkout claude/crypto-trading-app-KTgle

# Güncellemeler için git pull
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle
```

**B. Production .env Oluştur:**
```bash
nano .env
```

```env
# Database
DATABASE_URL="postgresql://flaxu_user:STRONG_PASSWORD_HERE@postgres:5432/flaxu_db?schema=public"
REDIS_URL="redis://redis:6379"
ENCRYPTION_KEY="GENERATE_32_BYTE_HEX"

# Auth
JWT_SECRET="GENERATE_SECRET"
NEXTAUTH_SECRET="GENERATE_SECRET"
NEXTAUTH_URL="https://flaxu.io"

# BingX
BINGX_API_KEY="r95s18r1yXW7zZ5kTA5OAXu9P3mNSzaqf8AHEp92zr5TCZD73LeaxUycYaK1qgzAZxhPQ3NP9j60SiXpQ"
BINGX_SECRET_KEY="w79nIiouFOTtnh72Q56wWfSAYlhAbGRVSrlQJ1yK62RmlvEqO4ZUE9gadEQbPS0y4e9Ha1Myyc7mAODNHQw"
BINGX_REFERRER_ID="YOUR_BINGX_USER_ID"
BINGX_API_URL="https://open-api.bingx.com"

# Email
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-gmail-app-password"
SMTP_FROM="FLAXU <noreply@flaxu.io>"

# App Settings
NODE_ENV="production"
BACKEND_PORT="4000"
FRONTEND_PORT="3000"
NEXT_PUBLIC_API_URL="https://api.flaxu.io"
NEXT_PUBLIC_WS_URL="wss://api.flaxu.io"
CORS_ORIGINS="https://flaxu.io,https://www.flaxu.io"
LOG_LEVEL="info"

# Database (Docker)
POSTGRES_USER="flaxu_user"
POSTGRES_PASSWORD="STRONG_PASSWORD_HERE"
POSTGRES_DB="flaxu_db"
```

**C. Güvenli Secrets Oluştur:**
```bash
# Encryption key (32 bytes hex)
openssl rand -hex 32

# JWT secret
openssl rand -base64 32

# Postgres password
openssl rand -base64 24
```

---

### 3. Frontend Build Oluştur (Next.js Production)

**A. Frontend Build:**
```bash
cd /var/www/flaxu/frontend

# Node modules kur
npm install

# Production build
npm run build

# Build başarılı mı kontrol et
ls -la .next
```

---

### 4. Docker Servisleri Başlat

**A. Backend ve Database'i Çalıştır:**
```bash
cd /var/www/flaxu

# Servisleri başlat (frontend hariç, onu Nginx serve edecek)
docker-compose up -d postgres redis backend python-signals

# Servisleri kontrol et
docker-compose ps

# Logları izle
docker-compose logs -f backend
```

**B. Database Migration:**
```bash
# Migration çalıştır
docker-compose exec backend npx prisma migrate deploy

# Prisma client oluştur
docker-compose exec backend npx prisma generate

# Database bağlantısını test et
docker-compose exec backend npx prisma db pull
```

**C. Health Check:**
```bash
# Backend'in çalıştığını kontrol et
curl http://localhost:4000/health
# Beklenen: {"status":"ok",...}
```

---

### 5. Nginx Multi-Site Configuration

**A. FLAXU Frontend Nginx Config:**
```bash
sudo nano /etc/nginx/sites-available/flaxu.io
```

```nginx
# FLAXU Frontend (flaxu.io)
server {
    server_name flaxu.io www.flaxu.io;

    root /var/www/flaxu/frontend/.next;

    # Next.js static files
    location /_next/static {
        alias /var/www/flaxu/frontend/.next/static;
        expires 1y;
        access_log off;
        add_header Cache-Control "public, immutable";
    }

    # Next.js server (production mode)
    location / {
        proxy_pass http://localhost:3000;
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

**B. FLAXU API Nginx Config:**
```bash
sudo nano /etc/nginx/sites-available/api.flaxu.io
```

```nginx
# FLAXU Backend API (api.flaxu.io)
server {
    server_name api.flaxu.io;

    # WebSocket support
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

        # Timeout ayarları
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api_limit:10m rate=10r/s;
    limit_req zone=api_limit burst=20 nodelay;
}
```

**C. Config'leri Aktif Et:**
```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/flaxu.io /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.flaxu.io /etc/nginx/sites-enabled/

# Nginx config test
sudo nginx -t

# Nginx reload
sudo systemctl reload nginx
```

**D. Diğer Sitelerin Config'i:**
```bash
# Mevcut sitelerini listele
ls -la /etc/nginx/sites-enabled/

# Örnek yapı:
# /etc/nginx/sites-enabled/
# ├── site1.com -> /etc/nginx/sites-available/site1.com
# ├── site2.com -> /etc/nginx/sites-available/site2.com
# ├── flaxu.io -> /etc/nginx/sites-available/flaxu.io
# └── api.flaxu.io -> /etc/nginx/sites-available/api.flaxu.io
```

---

### 6. Frontend Production Server (PM2)

**A. PM2 Kur:**
```bash
sudo npm install -g pm2
```

**B. Frontend'i PM2 ile Başlat:**
```bash
cd /var/www/flaxu/frontend

# Production mode'da Next.js başlat
pm2 start npm --name "flaxu-frontend" -- start

# PM2'yi kaydet
pm2 save

# Otomatik başlatma
pm2 startup
# Çıkan komutu çalıştır (sudo ile başlayan)
```

**C. PM2 Status Kontrol:**
```bash
pm2 status
pm2 logs flaxu-frontend
```

---

### 7. SSL Sertifikası (Let's Encrypt)

**A. Certbot ile SSL Kur:**
```bash
# Frontend için
sudo certbot --nginx -d flaxu.io -d www.flaxu.io

# Backend API için
sudo certbot --nginx -d api.flaxu.io

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

**B. SSL Başarılı mı Kontrol:**
```bash
# HTTPS kontrolü
curl -I https://flaxu.io
curl https://api.flaxu.io/health
```

---

### 8. Domain Bağlama (Fastcomet cPanel → AWS EC2)

#### Option 1: cPanel DNS Yönetimi (Önerilen - Kolay)

**A. Fastcomet cPanel'e Giriş Yap:**
```
1. https://my.fastcomet.com → Login
2. "Services" → "My Services"
3. Domain'ini seç (flaxu.io)
4. "Manage" butonuna tıkla
```

**B. DNS Zone Editor'e Git:**
```
cPanel Dashboard → "Zone Editor" (veya "Advanced DNS Zone Editor")
```

**C. Mevcut DNS Kayıtlarını Kontrol Et:**
```
Domain: flaxu.io seç
Mevcut A record'ları göreceksin
```

**D. Yeni A Record'ları Ekle:**

**1. Root Domain (flaxu.io):**
```
Type: A
Name: @ (veya boş bırak)
Address/Value: YOUR_AMAZON_VPS_IP (AWS Elastic IP)
TTL: 14400 (4 saat) veya Auto
```

**2. WWW Subdomain (www.flaxu.io):**
```
Type: A
Name: www
Address/Value: YOUR_AMAZON_VPS_IP
TTL: 14400
```

**3. API Subdomain (api.flaxu.io):**
```
Type: A
Name: api
Address/Value: YOUR_AMAZON_VPS_IP
TTL: 14400
```

**E. Eski Kayıtları Sil (Önemli!):**
```
Eğer domain Fastcomet sunucusuna işaret eden eski A record'lar varsa:
- Eski A record'ları sil (Fastcomet IP'si olanları)
- Sadece yeni eklediğin AWS IP'li kayıtları bırak
```

**F. Kaydet ve Bekle:**
```
"Save" veya "Add Record" → DNS propagation 5-30 dakika sürebilir
```

---

#### Option 2: Nameserver Değişikliği (Cloudflare için - İleri Seviye)

Eğer Cloudflare gibi DNS yönetimi kullanmak istersen:

**A. Cloudflare Hesabı Oluştur:**
```
1. https://dash.cloudflare.com/sign-up
2. "Add a Site" → flaxu.io yaz
3. Free plan seç
```

**B. Cloudflare Nameserver'ları Al:**
```
Cloudflare sana 2 nameserver verecek:
- alexa.ns.cloudflare.com
- brad.ns.cloudflare.com
```

**C. Fastcomet'te Nameserver Değiştir:**
```
1. Fastcomet Client Area → Domains → Manage
2. "Nameservers" sekmesi
3. "Use Custom Nameservers" seç
4. Cloudflare'in verdiği 2 nameserver'ı gir
5. Save → 24-48 saat bekle (genelde 1-2 saatte tamamlanır)
```

**D. Cloudflare'de DNS Ayarları:**
```
Cloudflare Dashboard → DNS → Records

A | @ | YOUR_AMAZON_VPS_IP | Proxied ☁️ (veya DNS only)
A | www | YOUR_AMAZON_VPS_IP | Proxied ☁️
A | api | YOUR_AMAZON_VPS_IP | DNS only ⚠️

NOT: API subdomain için "DNS only" kullan (Proxied değil)
```

---

#### AWS Elastic IP Almak (Önemli!)

Domain eklemeden önce AWS'de sabit IP al:

**A. AWS Console → EC2 → Elastic IPs:**
```
1. "Allocate Elastic IP address" tıkla
2. "Allocate" → Yeni IP oluştur
3. IP'yi not al (örn: 54.123.45.67)
```

**B. Elastic IP'yi VPS'e Bağla:**
```
1. Yeni oluşturduğun Elastic IP'yi seç
2. "Actions" → "Associate Elastic IP address"
3. Instance: VPS'ini seç
4. "Associate" tıkla
```

**C. VPS'in Yeni IP'sini Kontrol Et:**
```bash
# VPS'e SSH ile bağlan
ssh ubuntu@NEW_ELASTIC_IP

# Public IP'yi kontrol et
curl ifconfig.me
# Çıktı: NEW_ELASTIC_IP olmalı
```

**⚠️ ÖNEMLİ:**
- Elastic IP kullanmazsan AWS her restart'ta IP değiştirir!
- Domain'i eklemeden önce mutlaka Elastic IP al ve VPS'e bağla
- Elastic IP ücretsizdir (VPS'e bağlıysa)

---

#### DNS Propagation Kontrol

**A. Online Araçlar:**
```
https://dnschecker.org
Domain: flaxu.io yaz → "Search" tıkla
Dünya çapında DNS propagation durumunu gösterir
```

**B. Komut Satırı (Linux/Mac):**
```bash
# Root domain kontrol
dig flaxu.io +short
# Çıktı: YOUR_AMAZON_VPS_IP olmalı

# WWW subdomain
dig www.flaxu.io +short

# API subdomain
dig api.flaxu.io +short

# Detaylı kontrol
nslookup flaxu.io
```

**C. Windows'ta:**
```cmd
nslookup flaxu.io
```

**D. Bekleme Süresi:**
```
- En hızlı: 5-10 dakika
- Ortalama: 30 dakika - 2 saat
- Maksimum: 24-48 saat (nameserver değişikliğinde)
```

---

#### Fastcomet cPanel Screenshot Rehberi

**1. Zone Editor Bul:**
```
cPanel → Arama kutusuna "dns" yaz → "Zone Editor" seç
```

**2. Domain Seç:**
```
Dropdown'dan "flaxu.io" seç
→ "Manage" tıkla
```

**3. A Record Ekle:**
```
"Add Record" butonu
Type: A
Name: @ (root için) veya www, api (subdomain için)
Address: YOUR_AMAZON_VPS_IP
TTL: 14400
→ "Add Record"
```

**4. Kayıtları Kontrol:**
```
Ekledikten sonra:
@ → YOUR_AWS_IP
www → YOUR_AWS_IP
api → YOUR_AWS_IP

Eski kayıtlar varsa sil (Fastcomet IP'li olanlar)
```

---

#### Sorun Giderme

**DNS kayıtları değişmiyor:**
```bash
# DNS cache temizle (bilgisayarında)
# Mac
sudo dscacheutil -flushcache
sudo killall -HUP mDNSResponder

# Windows
ipconfig /flushdns

# Linux
sudo systemd-resolve --flush-caches

# Tarayıcı cache temizle
Chrome: Ctrl+Shift+Delete → "Cached images and files"
```

**Domain hala Fastcomet'e gidiyor:**
```
1. cPanel'de eski A record'ları sildiğinden emin ol
2. Fastcomet'in "Parking Page" veya "Default Page" varsa kaldır
3. DNS propagation'ı bekle (dnschecker.org ile kontrol et)
4. 24 saat geçtiyse Fastcomet support'a ticket aç
```

**"ERR_NAME_NOT_RESOLVED" hatası:**
```
1. DNS henüz yayılmadı → Bekle
2. A record'ları doğru IP'ye işaret etmiyor → cPanel'de kontrol et
3. AWS Elastic IP VPS'e bağlı değil → AWS Console'da kontrol et
```

**SSL sertifikası almak için:**
```bash
# DNS yayıldıktan SONRA (dig flaxu.io çalışıyor mu kontrol et)
sudo certbot --nginx -d flaxu.io -d www.flaxu.io -d api.flaxu.io

# Eğer hata alırsan:
# 1. DNS tamamen yayıldı mı? → dig flaxu.io +short
# 2. Nginx config doğru mu? → sudo nginx -t
# 3. Port 80 açık mı? → sudo netstat -tlnp | grep 80
```

---

### 9. DNS Ayarları Özet Tablosu

**Fastcomet cPanel DNS Kayıtları:**

```
Type  | Name | Value                  | TTL   | Açıklama
------|------|------------------------|-------|------------------
A     | @    | YOUR_AMAZON_VPS_IP     | 14400 | Root domain (flaxu.io)
A     | www  | YOUR_AMAZON_VPS_IP     | 14400 | www.flaxu.io
A     | api  | YOUR_AMAZON_VPS_IP     | 14400 | api.flaxu.io
```

**AWS Elastic IP:**
```
Elastic IP: YOUR_AMAZON_VPS_IP (örn: 54.123.45.67)
VPS Instance: i-xxxxxxxxxxxxx (senin EC2 instance)
Status: Associated ✅
```

**DNS Propagation Kontrolü:**
```bash
# Her 3'ü de AWS IP'sini döndürmeli:
dig flaxu.io +short
dig www.flaxu.io +short
dig api.flaxu.io +short
```

---

### 10. Test Et

**A. Backend Test:**
```bash
curl https://api.flaxu.io/health
# Beklenen: {"status":"ok",...}
```

**B. Frontend Test:**
```bash
curl -I https://flaxu.io
# Beklenen: 200 OK
```

**C. Tarayıcıda Test:**
1. `https://flaxu.io` → Landing page görünmeli
2. Register → Email doğrula → Login
3. Dashboard → API Keys → BingX bağla
4. Gatekeeper check → Access level kontrol

---

## 🔄 Proje Güncelleme (Update/Pull)

Kod güncellendiğinde VPS'te projeyi güncellemek için:

**A. Backend Güncellemesi:**
```bash
# VPS'e bağlan
ssh ubuntu@YOUR_AMAZON_VPS_IP

# Proje dizinine git
cd /var/www/flaxu

# Güncellemeleri çek (GitHub token ile)
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle

# Backend'i yeniden başlat
cd /var/www/flaxu
docker-compose restart backend

# Migration varsa çalıştır
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma generate

# Logları kontrol et
docker-compose logs -f backend
```

**B. Frontend Güncellemesi:**
```bash
# Frontend dizinine git
cd /var/www/flaxu/frontend

# Güncellemeleri çek
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle

# Node modules güncelle (gerekirse)
npm install

# Yeniden build
npm run build

# PM2'yi restart et
pm2 restart flaxu-frontend

# Logları kontrol et
pm2 logs flaxu-frontend
```

**C. Hızlı Güncelleme (Tek Komut):**
```bash
cd /var/www/flaxu && \
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle && \
docker-compose restart backend && \
cd frontend && npm install && npm run build && pm2 restart flaxu-frontend && \
cd .. && docker-compose logs --tail=50 backend
```

**D. Database Schema Değişikliği Varsa:**
```bash
cd /var/www/flaxu

# Önce backup al
docker-compose exec postgres pg_dump -U flaxu_user flaxu_db > backup_$(date +%Y%m%d_%H%M%S).sql

# Güncellemeleri çek
git pull https://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@github.com/omrkrr44/flaxu.git claude/crypto-trading-app-KTgle

# Migration çalıştır
docker-compose exec backend npx prisma migrate deploy

# Backend restart
docker-compose restart backend
```

---

## 🚀 Production Deployment (Option B - Vercel + Amazon EC2)

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
cd /var/www
sudo git clone https://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@github.com/omrkrr44/flaxu.git
sudo chown -R $USER:$USER flaxu
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

### Option A: Amazon EC2 (Mevcut VPS) ⭐
- Amazon EC2: $0 (Zaten var)
- Vercel: $0 (Kullanılmıyor)
- Domain: $0 (Zaten var)
- **TOPLAM: $0/ay** 🎉

### Option B: Vercel + Amazon EC2
- Amazon EC2: $0 (Zaten var)
- Vercel: $0 (Hobby tier)
- Domain: $0 (Zaten var)
- **TOPLAM: $0/ay** 🎉

### Option C: Vercel + Yeni Hetzner
- Hetzner VPS (CPX31): €12.96 (~$14)
- Vercel: $0 (Hobby tier)
- Domain: $0 (Zaten var)
- **TOPLAM: ~$14/ay**

### Gelişmiş Setup (100+ kullanıcı)
- Amazon EC2 (Upgrade): ~$50-100/ay
- Vercel Pro: $20
- Managed PostgreSQL: $15
- **TOPLAM: ~$85-135/ay**

---

## 🚨 Sorun Giderme

### Backend'e ulaşılamıyor
```bash
# Port dinleniyor mu?
sudo netstat -tlnp | grep 4000

# Docker çalışıyor mu?
docker-compose ps

# Nginx çalışıyor mu?
sudo systemctl status nginx

# Nginx error log
sudo tail -f /var/log/nginx/error.log

# Backend logs
docker-compose logs -f backend

# Firewall kontrolü (Ubuntu)
sudo ufw status
```

### AWS Security Group Hatası
```bash
# Problem: Port 80/443'e dışarıdan erişilemiyor
# Çözüm:
# 1. AWS Console → EC2 → Security Groups
# 2. VPS'in security group'unu seç
# 3. Inbound rules:
#    - HTTP (80) - Source: 0.0.0.0/0
#    - HTTPS (443) - Source: 0.0.0.0/0

# Local'den test et
curl http://localhost:4000/health   # ✅ Çalışmalı
curl http://YOUR_VPS_IP:4000/health # ❌ Çalışmamalı (security)
curl https://api.flaxu.io/health    # ✅ Çalışmalı (Nginx üzerinden)
```

### Nginx Config Hatası
```bash
# Config test
sudo nginx -t

# Syntax hatası varsa gösterir
# Config'i düzenle
sudo nano /etc/nginx/sites-available/flaxu.io

# Reload et
sudo systemctl reload nginx
```

### SSL hatası
```bash
# Sertifika durumu
sudo certbot certificates

# Sertifikayı yenile
sudo certbot renew

# Nginx reload
sudo systemctl reload nginx

# Manuel SSL yenileme
sudo certbot --nginx -d flaxu.io -d www.flaxu.io --force-renewal
```

### Database bağlantı hatası
```bash
# PostgreSQL çalışıyor mu?
docker-compose exec postgres pg_isready

# Database logs
docker-compose logs postgres

# .env dosyasını kontrol et
cat .env | grep DATABASE_URL

# Container'a bağlan
docker-compose exec postgres psql -U flaxu_user -d flaxu_db
```

### Frontend PM2 Hatası
```bash
# PM2 status
pm2 status

# PM2 logs
pm2 logs flaxu-frontend

# Restart
pm2 restart flaxu-frontend

# Delete ve yeniden başlat
pm2 delete flaxu-frontend
cd /var/www/flaxu/frontend
pm2 start npm --name "flaxu-frontend" -- start
```

### Disk Alanı Doldu
```bash
# Disk kullanımı
df -h

# Docker volumes temizle
docker system prune -a --volumes

# Eski logları temizle
sudo journalctl --vacuum-time=7d

# Nginx logs
sudo truncate -s 0 /var/log/nginx/access.log
sudo truncate -s 0 /var/log/nginx/error.log
```

### RAM Yetersiz
```bash
# RAM kontrolü
free -h

# Swap ekle (4GB)
sudo fallocate -l 4G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### DNS Çalışmıyor
```bash
# DNS propagation kontrol (online)
# https://dnschecker.org

# Local DNS test
dig flaxu.io
dig api.flaxu.io

# DNS cache temizle (bilgisayarında)
# Mac: sudo dscacheutil -flushcache
# Windows: ipconfig /flushdns
# Linux: sudo systemd-resolve --flush-caches
```

### Mevcut Siteler Çalışmıyor
```bash
# Tüm Nginx site config'lerini kontrol et
sudo nginx -t

# Nginx ana config
sudo nano /etc/nginx/nginx.conf

# Diğer sitelerin config'i
ls -la /etc/nginx/sites-enabled/

# Her birini test et
curl -I http://site1.com
curl -I http://site2.com
curl -I http://flaxu.io

# Problem varsa Nginx restart
sudo systemctl restart nginx
```

---

## 📝 Hızlı Başlangıç (Özet - Amazon EC2)

```bash
# 1. SSH ile mevcut VPS'e bağlan
ssh ubuntu@YOUR_AMAZON_VPS_IP

# 2. Sistem kontrolü
free -h && df -h && docker --version

# 3. Gerekli paketleri kur (yoksa)
curl -fsSL https://get.docker.com | sh
sudo apt install nginx certbot python3-certbot-nginx git npm -y
sudo npm install -g pm2

# 4a. AWS Elastic IP al (İLK ADIM!)
# AWS Console → EC2 → Elastic IPs → Allocate
# IP'yi VPS'e bağla (Associate)
# Bu IP'yi not al: YOUR_ELASTIC_IP

# 4b. AWS Security Group'ta port aç
# AWS Console → EC2 → Security Groups
# Inbound: 80, 443 (0.0.0.0/0)

# 5. Projeyi klonla (GitHub token ile)
cd /var/www
sudo git clone https://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@github.com/omrkrr44/flaxu.git
sudo chown -R $USER:$USER flaxu
cd flaxu && git checkout claude/crypto-trading-app-KTgle

# 6. .env oluştur (secrets oluştur)
nano .env
# openssl rand -hex 32, openssl rand -base64 32

# 7. Frontend build
cd frontend && npm install && npm run build

# 8. Docker servisleri başlat
cd .. && docker-compose up -d postgres redis backend python-signals

# 9. Database migration
docker-compose exec backend npx prisma migrate deploy
docker-compose exec backend npx prisma generate

# 10. Frontend PM2 ile başlat
cd frontend && pm2 start npm --name "flaxu-frontend" -- start
pm2 save && pm2 startup

# 11. Nginx config
sudo nano /etc/nginx/sites-available/flaxu.io
sudo nano /etc/nginx/sites-available/api.flaxu.io
sudo ln -s /etc/nginx/sites-available/flaxu.io /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/api.flaxu.io /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# 12. Domain DNS ayarları (Fastcomet cPanel'de YAP!)
# https://my.fastcomet.com → Login
# Services → My Services → flaxu.io → Manage
# cPanel → Zone Editor
# Yeni A Record'lar ekle:
#   Type: A, Name: @, Address: YOUR_ELASTIC_IP, TTL: 14400
#   Type: A, Name: www, Address: YOUR_ELASTIC_IP, TTL: 14400
#   Type: A, Name: api, Address: YOUR_ELASTIC_IP, TTL: 14400
# Eski Fastcomet IP'li kayıtları SİL!
# DNS propagation bekle (5-30 dakika)

# 13. DNS yayıldığını kontrol et
dig flaxu.io +short
# Çıktı: YOUR_ELASTIC_IP olmalı

# 14. SSL kur (DNS yayıldıktan SONRA!)
sudo certbot --nginx -d flaxu.io -d www.flaxu.io
sudo certbot --nginx -d api.flaxu.io

# 15. Test et
curl https://api.flaxu.io/health
curl -I https://flaxu.io

# ✅ HAZIR! Mevcut sitelerin yanında FLAXU da çalışıyor 🎉
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
