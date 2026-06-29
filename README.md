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
| PHP | 8.2+ | Runtime |
| Laravel Octane | 2.x | High-performance server via Swoole |
| Laravel Sanctum | 4.x | SPA cookie auth + API token auth |
| PostgreSQL | 17 | Database dengan JSONB & ltree support |
| Redis | 7 | Queue, Cache, Session driver |
| Telegram Bot SDK | 3.x | Bot API wrapper |

---

## Arsitektur

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend (React SPA)                  │
│  localhost:5173                                          │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌─────────────┐ │
│  │ Router  │ │ TanStack │ │ Zustand  │ │ shadcn/ui   │ │
│  │ (9 rute)│ │ Query    │ │ (5 store)│ │ Components  │ │
│  └─────────┘ └──────────┘ └──────────┘ └─────────────┘ │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTP (proxy /api, /web, /auth)
                       ▼
┌─────────────────────────────────────────────────────────┐
│                    Backend (Laravel Octane)               │
│  localhost:8000                                           │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌────────────┐ │
│  │ API v1   │ │ Web SPA  │ │ Auth     │ │ Middleware │ │
│  │ /api/v1/*│ │ /web/*   │ │ /auth/*  │ │ ApiKeyAuth │ │
│  └──────────┘ └──────────┘ └──────────┘ │ RateLimit  │ │
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
│  · folders │        │  · Rate    │
│  · api_keys│        │    Limit   │
│  · webhooks│        └────────────┘
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
Web SPA (Sanctum Cookie):
  GET /auth/telegram → redirect ke Telegram OAuth
  → Callback → verify hash → create/update User
  → Set session cookie (httpOnly, secure)
  → Redirect ke dashboard

AI Agent (API Key):
  Header: Authorization: Bearer ts_live_<64hex>
  → ApiKeyAuth middleware → verify Argon2 hash
  → RateLimitByKey middleware → Redis counter
```

---

## Setup Development

### Prasyarat
- Node.js 22+
- PHP 8.2+
- Composer
- PostgreSQL 17
- Redis 7
- Telegram Bot Token (dari [@BotFather](https://t.me/BotFather))

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
php artisan octane:start --server=swoole --host=localhost --port=8000
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

### Setup dengan Docker

```bash
# 1. Setup .env
cp backend/.env.example backend/.env

# 2. Generate APP_KEY
docker compose run --rm backend php artisan key:generate

# 3. Jalankan semua services
docker compose up -d

# 4. Run migrations
docker compose exec backend php artisan migrate

# 5. Akses aplikasi
# Frontend: http://localhost:5173
# Backend API: http://localhost:8000/api/v1
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
| `FRONTEND_URL` | Yes | `http://localhost:5173` | Frontend URL (CORS + redirect) |
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
| `SESSION_DRIVER` | No | `redis` | Session driver (gunakan `redis` untuk performance) |
| `SESSION_DOMAIN` | No | `localhost` | Session cookie domain |
| `SANCTUM_STATEFUL_DOMAINS` | Yes | `localhost:5173` | Domain untuk Sanctum SPA auth |
| `CORS_ALLOWED_ORIGINS` | Yes | `http://localhost:5173` | Origin yang diizinkan CORS |
| `QUEUE_CONNECTION` | No | `redis` | Queue driver (gunakan `redis` untuk async) |
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

**Web SPA:** Cookie session (Sanctum SPA) — login via Telegram OAuth
**AI Agent:** `Authorization: Bearer ts_live_<64hex>`

### Endpoints

#### Files
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `POST` | `/api/v1/files/upload` | API Key | Upload file (multipart) → return 202 |
| `GET` | `/api/v1/files` | API Key | List files (paginated, filterable) |
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

#### Auth (Web SPA)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/auth/telegram` | — | Redirect ke Telegram OAuth |
| `GET` | `/auth/telegram/callback` | — | OAuth callback |
| `POST` | `/auth/logout` | Sanctum | Logout |
| `GET` | `/web/me` | Sanctum | Current user + bots |

#### Bots (Web SPA)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/web/bots` | Sanctum | List bots |
| `POST` | `/web/bots` | Sanctum | Tambah bot |
| `DELETE` | `/web/bots/{id}` | Sanctum | Hapus bot |

#### API Keys (Web SPA)
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/web/apikeys` | Sanctum | List API keys |
| `POST` | `/web/apikeys` | Sanctum | Generate key |
| `DELETE` | `/web/apikeys/{id}` | Sanctum | Revoke key |

#### Audit
| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| `GET` | `/web/audit` | Sanctum | Audit log (paginated) |

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

### Monitoring (Horizon)

```bash
# Install & akses dashboard
composer require laravel/horizon
php artisan horizon:install
php artisan horizon
# Dashboard: /horizon
```

---

## Struktur Project

```
telegramstorage/
├── backend/                    # Laravel API
│   ├── app/
│   │   ├── Actions/            # Single-purpose action classes
│   │   ├── Data/               # DTO (Spatie)
│   │   ├── Http/
│   │   │   ├── Controllers/
│   │   │   │   ├── Api/V1/     # AI Agent API endpoints
│   │   │   │   └── Web/        # Web SPA endpoints
│   │   │   ├── Middleware/     # ApiKeyAuth, RateLimitByKey
│   │   │   └── Requests/       # FormRequest per endpoint
│   │   ├── Jobs/              # UploadFileToTelegramJob, WebhookDispatchJob
│   │   ├── Models/            # User, Bot, File, Folder, ApiKey, Webhook, AuditLog
│   │   ├── Observers/         # FileObserver, ApiKeyObserver
│   │   └── Services/          # TelegramService, ApiKeyService, StorageService
│   ├── config/                # App, Sanctum, CORS, Queue, Services
│   ├── database/
│   │   ├── migrations/        # 8 migration files
│   │   ├── seeders/
│   │   └── factories/
│   ├── routes/
│   │   ├── api.php            # API v1 routes
│   │   └── web.php            # Web SPA + Auth routes
│   └── tests/                 # Pest tests
│
├── frontend/                   # React SPA
│   ├── src/
│   │   ├── routes/            # TanStack Router (9 pages)
│   │   ├── components/
│   │   │   ├── ui/            # shadcn/ui components
│   │   │   └── layout/        # Sidebar, Topbar
│   │   ├── stores/            # Zustand (5 stores)
│   │   ├── queries/           # TanStack Query hooks
│   │   ├── lib/               # Utils, Axios instance
│   │   └── types/             # Zod schemas + TS types
│   └── tests/                 # Vitest + Playwright
│
├── docker-compose.yml         # 5 services (DB, Redis, API, Queue, Web)
└── README.md                  # ← Kamu di sini
```

---

## Development Commands

```bash
# === Backend ===
composer test              # Run Pest tests
php artisan migrate        # Run migrations
php artisan queue:work     # Process queue
php artisan horizon        # Queue dashboard
php artisan tinker         # Interactive shell

# === Frontend ===
npm run dev                # Dev server (port 5173)
npm run build              # Production build
npm run preview            # Preview production build
npm run test               # Vitest unit tests
npm run test:e2e           # Playwright E2E tests

# === Docker ===
docker compose up -d       # Start all services
docker compose down        # Stop all services
docker compose logs -f     # Follow logs
docker compose exec backend php artisan migrate   # Run migrations in container
```

---

## Deployment

### Production Checklist

- [ ] Set `APP_ENV=production` dan `APP_DEBUG=false`
- [ ] Generate strong `APP_KEY`
- [ ] Set `SESSION_DRIVER=redis` dan `SESSION_DOMAIN=.yourdomain.com`
- [ ] Set `SANCTUM_STATEFUL_DOMAINS` dengan domain production
- [ ] Set `CORS_ALLOWED_ORIGINS` dengan domain frontend
- [ ] Setup Supervisor untuk queue worker
- [ ] Setup Horizon production config
- [ ] Enable HTTPS + HSTS
- [ ] Run `php artisan optimize` untuk cache config & routes
- [ ] Run `php artisan octane:start --server=swoole` untuk production server

### Recommended Providers

| Service | Untuk |
|---------|-------|
| Railway / Render | Hosting backend + database |
| Upstash | Serverless Redis |
| Cloudflare R2 / S3 | Backup storage |
| GitHub Actions | CI/CD pipeline |

---

## License

MIT — built for the TeleStore platform.
