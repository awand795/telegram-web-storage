# TeleStore v2.0

**Telegram Cloud Storage · AI Agent Platform**

TeleStore adalah platform cloud storage yang memanfaatkan infrastruktur Telegram Bot API sebagai backend penyimpanan. Dengan TeleStore, Anda dapat mengupload, mengelola, dan mendistribusikan file melalui Telegram, dengan REST API yang siap untuk integrasi AI Agent.

---

## Tech Stack

### Frontend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| React | 19 | UI library dengan Concurrent Features & Actions API |
| Vite | 6 | Build tool & dev server, HMR |
| TypeScript | 5.6 | Type safety end-to-end |
| TanStack Router | 1.x | File-based routing type-safe |
| TanStack Query | 5.x | Server state: fetch, cache, invalidate, optimistic update |
| TanStack Table | 8.x | Headless table: sort, filter, pagination |
| Zustand | 5.x | Global client state (auth, UI, upload queue) |
| Tailwind CSS | 4.x | Utility-first CSS dengan CSS Layers |
| Motion | 12.x | Layout animation, gesture, transition (ex Framer Motion) |
| shadcn/ui | latest | Komponen Radix-based (Dialog, Dropdown, Tooltip, dll) |
| Recharts | 2.x | Chart library (area, pie, bar) |
| Zod | 3.x | Schema validation (form + API response) |

### Backend
| Teknologi | Versi | Kegunaan |
|-----------|-------|----------|
| Laravel | 12 | Core framework, Eloquent ORM, Queue |
| PHP | 8.4+ | Runtime |
| FrankenPHP / Laravel Octane | 2.x | High-performance server with Caddy |
| Laravel Sanctum | 4.x | API token auth (Bearer) |
| PostgreSQL | 17 | Database dengan JSONB & ltree support |
| Redis | 7 | Queue, Cache, Session driver |

---

## Role-Based Access Control

TeleStore memiliki 2 level user:

| Role | Akses |
|------|-------|
| **User** | Dashboard (statistik sendiri), Files (upload & lihat file sendiri) |
| **Admin** | Semua menu: Dashboard, Files, Bots, API Keys, Webhooks, Audit Log + bisa lihat semua file user |

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                  │
│  localhost:7888 (Docker) / localhost:5173 (local)       │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Router  │ │ TanStack │ │ Zustand  │ │ shadcn/ui   │ │
│  │ (10 rute)│ │ Query    │ │ (5 store)│ │ Components  │ │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (proxy /api, /web, /auth)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Laravel Octane)               │
│  localhost:8000                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ API v1   │ │ Web SPA  │ │ Auth     │ │ Middleware │ │
│  │ /api/v1/*│ │ /web/*   │ │ /auth/*  │ │ Admin,     │ │
│  └──────────┘ └──────────┘ └──────────┘ │ ApiKeyAuth │ │
│  ┌───────────────────────────────────────┴────────────┘ │
│  │ Services: TelegramService, ApiKeyService, Storage     │
│  │ Jobs: UploadFileToTelegramJob, WebhookDispatchJob     │
│  └──────────────────────────────────────────────────────┘
└──────┬──────────────────────┬───────────────────────────┘
       │                      │
       ▼                      ▼
┌────────────┐        ┌────────────┐
│ PostgreSQL │        │   Redis    │
│  (port 5432)│        │  (port 6379)│
│  · users   │        │  · Queue   │
│  · bots    │        │  · Cache   │
│  · files   │        │  · Session │
│  · folders │        └────────────┘
│  · api_keys│
│  · webhooks│
│  · audit   │
└────────────┘
```

### Alur Upload File

```
POST /api/v1/files/upload
  → Validasi file (max 50MB)
  → Simpan ke temp storage (/storage/app/uploads/)
  → Buat record File (status: pending)
  → Dispatch UploadFileToTelegramJob ke Redis queue
  → Return 202 { job_id, status: 'pending' }

Queue Worker (uploads queue):
  → UploadFileToTelegramJob handles
  → Kirim file ke Telegram Bot API (sendDocument)
  → Update File record (telegram_file_id, status: done)
  → Dispatch WebhookDispatchJob (event: file.uploaded)
  → Hapus temp file

Client polling:
  → GET /api/v1/files/{job_id}
  → Sampai status = 'done'
```

### Alur Autentikasi

```
Web SPA (Email/Password):
  POST /auth/register → { name, email, password }
  → Create user (role: user)
  → Return { user, token } (Sanctum Bearer token)

  POST /auth/login → { email, password }
  → Verify credentials
  → Return { user, token }

  Header Authorization: Bearer <token>
  → Setiap request ke /web/* atau /api/v1/*

Telegram OAuth (alternatif):
  GET /auth/telegram → redirect ke Telegram OAuth
  → Callback → verify hash → create/update User
  → Set session cookie → redirect ke dashboard

AI Agent (API Key):
  Header: Authorization: Bearer ts_live_<64hex>
  → ApiKeyAuth middleware → verify Argon2 hash
  → RateLimitByKey middleware → Redis counter
```

---

## Setup Development

### Prasyarat
- Node.js 22+
- PHP 8.4+
- Composer
- PostgreSQL 17
- Redis 7
- Telegram Bot Token (dari [@BotFather](https://t.me/BotFather))
- Docker Desktop

### Setup dengan Docker (Recommended)

```bash
# 1. Clone & masuk direktori
cd telegramstorage

# 2. Setup .env (sudah tersedia)
# Pastikan TELEGRAM_BOT_USERNAME dan TELEGRAM_BOT_TOKEN terisi

# 3. Jalankan semua services
docker compose up -d

# 4. Run migrations
docker compose exec backend php artisan migrate

# 5. (Opsional) Install Sanctum migrations
docker compose exec backend php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider" --tag="sanctum-migrations" --force
docker compose exec backend php artisan migrate

# 6. Akses aplikasi
# Frontend: http://localhost:7888
# Backend API: http://localhost:8000/api/v1
```

### Setup Local (tanpa Docker)

#### 1. Clone & Install Backend

```bash
cd backend
cp .env.example .env
# Edit .env: isi TELEGRAM_BOT_USERNAME, TELEGRAM_BOT_TOKEN, DB credentials

composer install
php artisan key:generate
php artisan migrate
php artisan storage:link
```

#### 2. Install Frontend

```bash
cd frontend
npm install

# Buat .env untuk frontend (opsional, default proxy ke localhost:8000)
echo "VITE_API_URL=http://localhost:8000" > .env
```

#### 3. Jalankan Services

Terminal 1 - Backend:
```bash
cd backend
php artisan octane:start --server=frankenphp --host=localhost --port=8000
```

Terminal 2 - Queue Worker:
```bash
cd backend
php artisan queue:work --queue=uploads,webhooks,default --sleep=3 --tries=3
```

Terminal 3 - Frontend:
```bash
cd frontend
npm run dev
```

---

## Environment Variables

### Backend (`backend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `APP_NAME` | No | `TeleStore` | Nama aplikasi |
| `APP_ENV` | No | `local` | Environment (`local`, `production`) |
| `APP_DEBUG` | No | `true` | Debug mode |
| `APP_URL` | Yes | `http://localhost:8000` | Backend URL |
| `FRONTEND_URL` | Yes | `http://localhost:7888` | Frontend URL (CORS + redirect) |
| `APP_KEY` | **Yes** | — | Laravel encryption key (32-char random) |
| `DB_CONNECTION` | No | `pgsql` | Database driver |
| `DB_HOST` | Yes | `127.0.0.1` | Database host |
| `DB_PORT` | No | `5432` | Database port |
| `DB_DATABASE` | Yes | `telestore` | Database name |
| `DB_USERNAME` | Yes | `telestore` | Database username |
| `DB_PASSWORD` | Yes | `telestore_secret` | Database password |
| `REDIS_HOST` | Yes | `127.0.0.1` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | `` | Redis password |
| `SESSION_DRIVER` | No | `redis` | Session driver |
| `SANCTUM_STATEFUL_DOMAINS` | Yes | `localhost:7888` | Domain untuk Sanctum SPA auth |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:7888` | Origin yang diizinkan CORS |
| `QUEUE_CONNECTION` | No | `redis` | Queue driver |
| `CACHE_STORE` | No | `redis` | Cache driver |
| `TELEGRAM_BOT_USERNAME` | **Yes** | — | Username bot Telegram (dari @BotFather) |
| `TELEGRAM_BOT_TOKEN` | **Yes** | — | Token bot Telegram |

### Frontend (`frontend/.env`)

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `VITE_API_URL` | No | `http://localhost:8000` | Backend API URL (untuk proxy) |

---

## API Reference

### Base URL

| Mode | URL |
|------|-----|
| Production | `https://api.telestore.dev` |
| Local | `http://localhost:8000` |

### Autentikasi

| Metode | Cara | Untuk |
|--------|------|-------|
| **Email/Password** | `POST /auth/register` atau `POST /auth/login` → dapat Bearer token | Web SPA user |
| **Telegram OAuth** | `GET /auth/telegram` → redirect → session cookie | Web SPA (alternatif) |
| **API Key** | `Authorization: Bearer ts_live_<64hex>` | AI Agent / 3rd party |

### Endpoints

#### Auth (Public)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/auth/register` | — | Register email/password → `{ user, token }` |
| `POST` | `/auth/login` | — | Login email/password → `{ user, token }` |
| `GET` | `/auth/telegram` | — | Redirect ke Telegram OAuth |
| `GET` | `/auth/telegram/callback` | — | OAuth callback |

#### Web SPA (Sanctum Bearer Token)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/web/me` | Sanctum | Current user + bots |
| `POST` | `/web/logout` | Sanctum | Revoke token |
| `GET` | `/web/bots` | Sanctum | List bots |
| `POST` | `/web/bots` | Sanctum | Tambah bot |
| `DELETE` | `/web/bots/{id}` | Sanctum | Hapus bot |
| `GET` | `/web/apikeys` | Sanctum | List API keys |
| `POST` | `/web/apikeys` | Sanctum | Generate key |
| `DELETE` | `/web/apikeys/{id}` | Sanctum | Revoke key |
| `GET` | `/web/users` | Admin | List all users (admin only) |
| `GET` | `/web/audit` | Admin | Audit log (admin only) |

#### Files (API Key)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/files/upload` | API Key | Upload file (multipart) → return 202 |
| `GET` | `/api/v1/files` | API Key | List files (user: hanya milik sendiri, admin: semua) |
| `GET` | `/api/v1/files/{id}` | API Key | File detail + metadata |
| `GET` | `/api/v1/files/{id}/download` | API Key | Redirect/stream file dari Telegram CDN |
| `DELETE` | `/api/v1/files/{id}` | API Key | Hard delete |
| `PATCH` | `/api/v1/files/{id}/tags` | API Key | Update tags |

#### Folders
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/folders` | API Key | List folder tree |
| `POST` | `/api/v1/folders` | API Key | Buat folder baru |

#### Webhooks
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/webhooks` | API Key | List webhooks |
| `POST` | `/api/v1/webhooks` | API Key | Register webhook |
| `DELETE` | `/api/v1/webhooks/{id}` | API Key | Unregister |

#### Usage
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/api/v1/usage` | API Key | Stats dashboard |

---

## Queue Worker

TeleStore menggunakan Redis queue untuk async upload file dan webhook dispatch.

### Menjalankan Worker

```bash
# Process all queues
php artisan queue:work --queue=uploads,webhooks,default --sleep=3 --tries=3

# Dengan Supervisor (production)
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start telestore-worker:*
```

### Queue Structure

| Queue | Job | Description |
|-------|-----|-------------|
| `uploads` | `UploadFileToTelegramJob` | Upload file ke Telegram, update status, dispatch webhook |
| `webhooks` | `WebhookDispatchJob` | POST event ke registered webhook URLs |

---

## Struktur Project

```
telegramstorage/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/V1/     # AI Agent API endpoints
│   │   │   │   └── Web/        # Web SPA endpoints (Auth, Bots, dll)
│   │   │   └── Middleware/     # AdminMiddleware, ApiKeyAuth, RateLimitByKey
│   │   ├── Jobs/              # UploadFileToTelegramJob, WebhookDispatchJob
│   │   ├── Models/            # User (dengan role), Bot, File, Folder, ApiKey, Webhook, AuditLog
│   │   └── Services/          # TelegramService, ApiKeyService, StorageService
│   ├── database/
│   │   ├── migrations/        # 9 migration files (termasuk role, email, password)
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php            # API v1 routes
│   │   └── web.php            # Web SPA + Auth + Admin routes
│   └── bootstrap/app.php      # Middleware config (admin alias, CSRF exclude)
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── routes/            # TanStack Router (10 pages: login, register, dashboard, dll)
│   │   ├── components/
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── stores/            # Zustand (authStore, botStore, dll)
│   │   ├── queries/           # TanStack Query hooks
│   │   ├── lib/               # Axios (dengan Bearer token interceptor)
│   │   └── types/             # Zod schemas + TS types
│   └── vite.config.ts         # Proxy /api, /web, /auth
│
├── docker-compose.yml         # 5 services (DB, Redis, API, Queue, Web)
└── README.md
```

---

## Development Commands

```bash
# === Backend ===
composer test                  # Run Pest tests
php artisan migrate            # Run migrations
php artisan queue:work         # Process queue
php artisan tinker             # Interactive shell
php artisan make:user admin    # Buat user admin (custom command)

# === Frontend ===
npm run dev                    # Dev server (port 5173)
npm run build                  # Production build
npm run preview                # Preview production build

# === Docker Compose (Development) ===
docker compose up -d           # Start all services
docker compose down            # Stop all services
docker compose logs -f         # Follow logs
docker compose exec backend php artisan migrate   # Run migrations in container

# === Docker Swarm (Production) ===
./deploy.sh deploy             # Full deployment (build → deploy → migrate)
./deploy.sh status             # Check deployment status
./deploy.sh logs backend       # View service logs
./deploy.sh rollback           # Rollback to previous version
```

---

## Docker Swarm — Zero-Downtime Production Deployment

TeleStore menggunakan **Docker Swarm** untuk production deployment dengan **zero-downtime rolling updates** dan **graceful shutdown 30 menit** untuk queue worker.

### Arsitektur Swarm

```
┌─────────────────────────────────────────────────────────────┐
│                    Docker Swarm Cluster                       │
│                                                               │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │
│  │ Backend  │  │ Backend  │  │ Frontend │  │ Frontend     │ │
│  │ (replica1)│  │ (replica2)│  │ (replica1)│  │ (replica2)   │ │
│  │ :8000    │  │ :8000    │  │ :5173    │  │ :5173        │ │
│  └──────────┘  └──────────┘  └──────────┘  └──────────────┘ │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────────┐ │
│  │ PostgreSQL   │  │ Redis        │  │ Queue Worker        │ │
│  │ (1 replica)  │  │ (1 replica)  │  │ (1 replica)         │ │
│  │ :5432        │  │ :6379        │  │ grace: 30 menit     │ │
│  └──────────────┘  └──────────────┘  └─────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

### Konsep Zero-Downtime

| Fitur | Konfigurasi | Penjelasan |
|-------|------------|------------|
| **Rolling update** | `order: start-first` | Container baru start **sebelum** container lama distop |
| **Parallelism** | `parallelism: 1` | Update 1 container per waktu |
| **Health check** | `interval: 15s` | Cek health sebelum traffic dialihkan |
| **Auto-rollback** | `failure_action: rollback` | Rollback otomatis jika update gagal |
| **Graceful shutdown** | `stop_grace_period: 30m` | Queue worker diberi **30 menit** untuk selesaikan upload |

### Graceful Shutdown 30 Menit

Ketika queue worker menerima sinyal **SIGTERM** (saat deployment/restart):

1. Docker mengirim SIGTERM ke container
2. Laravel `queue:work` menangkap SIGTERM dan **tidak memproses job baru**
3. **Job yang sedang berjalan** (upload file ke Telegram) tetap dilanjutkan
4. Docker menunggu **30 menit** (stop_grace_period) sebelum mengirim SIGKILL
5. Jika job selesai dalam < 30 menit, container berhenti normal
6. Container baru sudah running (start-first order), jadi tidak ada downtime

### Cara Deploy

#### 1. Inisialisasi Swarm (Pertama Kali)

```bash
# Inisialisasi Docker Swarm
docker swarm init

# Setup secrets dari .env
./deploy.sh setup
```

#### 2. Deploy Aplikasi

```bash
# Full deployment: build image → deploy ke swarm → migrate
./deploy.sh deploy

# Atau dengan tag versi spesifik
TAG=v1.2.3 ./deploy.sh deploy

# Atau dengan registry kustom
REGISTRY=ghcr.io ./deploy.sh deploy
```

#### 3. Update Aplikasi (Tanpa Downtime)

```bash
# Rebuild & deploy dengan rolling update
./deploy.sh deploy-only

# Rollback jika terjadi masalah
./deploy.sh rollback
```

### File Terkait

| File | Deskripsi |
|------|-----------|
| `docker-stack.yml` | Swarm stack definition (production) |
| `docker-compose.yml` | Development compose (local) |
| `deploy.sh` | Deployment script (build, deploy, rollback) |
| `backend/Dockerfile` | Multi-stage Dockerfile (base → build → production) |
| `backend/docker/Caddyfile` | FrankenPHP Caddy config untuk production |

### Node Labels

Swarm menggunakan node labels untuk menempatkan service di node yang tepat:

```bash
# Set label pada node manager (single-node cluster)
NODE=$(docker node ls --format '{{.ID}}' | head -1)
docker node update --label-add telestore.db=true "$NODE"
docker node update --label-add telestore.redis=true "$NODE"
docker node update --label-add telestore.backend=true "$NODE"
docker node update --label-add telestore.queue=true "$NODE"
docker node update --label-add telestore.frontend=true "$NODE"
```

### Secrets Management

Password dan token disimpan sebagai **Docker Secrets** (tidak ada di .env):

```bash
# Membuat secrets (dilakukan otomatis oleh deploy.sh setup)
echo "base64:your-app-key" | docker secret create app_key -
echo "your-db-password" | docker secret create db_password -
echo "your-bot-token" | docker secret create telegram_bot_token -
echo "your-bot-username" | docker secret create telegram_bot_username -
```

---

## Struktur Project (Lengkap)

```
telegramstorage/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/V1/     # AI Agent API endpoints
│   │   │   │   └── Web/        # Web SPA endpoints (Auth, Bots, dll)
│   │   │   └── Middleware/     # AdminMiddleware, ApiKeyAuth, RateLimitByKey
│   │   ├── Jobs/              # UploadFileToTelegramJob, WebhookDispatchJob
│   │   ├── Models/            # User (dengan role), Bot, File, Folder, ApiKey, Webhook, AuditLog
│   │   └── Services/          # TelegramService, ApiKeyService, StorageService
│   ├── docker/
│   │   └── Caddyfile          # FrankenPHP Caddy production config
│   ├── database/
│   │   ├── migrations/        # 10 migration files
│   │   └── seeders/
│   ├── routes/
│   │   ├── api.php            # API v1 routes
│   │   └── web.php            # Web SPA + Auth + Admin routes
│   ├── Dockerfile             # Multi-stage (base → build → production)
│   └── bootstrap/app.php      # Middleware config
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── routes/            # TanStack Router (10 pages)
│   │   ├── components/
│   │   │   └── ui/            # shadcn/ui components
│   │   ├── stores/            # Zustand (auth, bot, filter, ui, upload)
│   │   ├── queries/           # TanStack Query hooks
│   │   ├── lib/               # Axios (Bearer token interceptor)
│   │   └── types/             # Zod schemas + TS types
│   └── vite.config.ts         # Proxy /api, /web, /auth
│
├── docker-compose.yml         # Dev: 5 services (DB, Redis, API, Queue, Web)
├── docker-stack.yml           # Swarm: production stack with deploy config
├── deploy.sh                  # Zero-downtime deployment script
└── README.md
```

---

## License

MIT — built for the TeleStore platform.
