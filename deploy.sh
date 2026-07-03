#!/usr/bin/env bash
# =============================================================================
# TeleStore — Zero-Downtime Deploy Script (Docker Swarm)
#
# Cara pakai:
#   ./deploy.sh                    # Deploy dengan tag "latest"
#   TAG=v1.2.3 ./deploy.sh         # Deploy dengan tag spesifik
#   REGISTRY=ghcr.io ./deploy.sh   # Deploy ke registry kustom
#
# Prasyarat:
#   - Docker Swarm sudah diinisialisasi (docker swarm init)
#   - Node labels sudah di-set (lihat fungsi setup_swarm)
#   - Docker image registry sudah login (jika pakai registry eksternal)
# =============================================================================

set -euo pipefail

# ── Konfigurasi ──────────────────────────────────────────────────────────────
STACK_NAME="telestore"
REGISTRY="${REGISTRY:-localhost}"
TAG="${TAG:-latest}"
COMPOSE_FILE="docker-stack.yml"
BACKUP_DIR="./deploy-backups"

# Warna untuk output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ── Fungsi Helper ────────────────────────────────────────────────────────────

info()  { echo -e "${BLUE}[INFO]${NC}  $*"; }
ok()    { echo -e "${GREEN}[OK]${NC}    $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC}  $*"; }
err()   { echo -e "${RED}[ERROR]${NC} $*"; }

# ── Setup Swarm (pertama kali) ───────────────────────────────────────────────

setup_swarm() {
  info "Memeriksa Docker Swarm..."

  if ! docker info --format '{{.Swarm.LocalNodeState}}' 2>/dev/null | grep -q active; then
    info "Swarm belum aktif. Inisialisasi Swarm..."
    docker swarm init --advertise-addr eth0 2>/dev/null || docker swarm init
    ok "Swarm initialized"
  else
    ok "Swarm already active"
  fi

  # Set node labels untuk service placement
  local NODE=$(docker node ls --format '{{.ID}}' | head -1)
  if [ -n "$NODE" ]; then
    info "Setting node labels on $NODE..."

    docker node update --label-add telestore.db=true "$NODE" 2>/dev/null || true
    docker node update --label-add telestore.redis=true "$NODE" 2>/dev/null || true
    docker node update --label-add telestore.backend=true "$NODE" 2>/dev/null || true
    docker node update --label-add telestore.queue=true "$NODE" 2>/dev/null || true
    docker node update --label-add telestore.frontend=true "$NODE" 2>/dev/null || true

    ok "Node labels configured"
  fi
}

# ── Setup Secrets ─────────────────────────────────────────────────────────────

setup_secrets() {
  info "Memeriksa Docker Secrets..."

  local secrets_created=false

  if ! docker secret ls --format '{{.Name}}' | grep -q '^app_key$'; then
    warn "Secret 'app_key' belum ada. Membuat dari .env..."
    if [ -f backend/.env ]; then
      local key=$(grep '^APP_KEY=' backend/.env | cut -d'=' -f2-)
      if [ -n "$key" ]; then
        echo "$key" | docker secret create app_key -
        ok "Secret 'app_key' created"
        secrets_created=true
      fi
    fi
  fi

  if ! docker secret ls --format '{{.Name}}' | grep -q '^db_password$'; then
    warn "Secret 'db_password' belum ada. Membuat..."
    echo "telestore_secret" | docker secret create db_password -
    ok "Secret 'db_password' created"
    secrets_created=true
  fi

  if ! docker secret ls --format '{{.Name}}' | grep -q '^telegram_bot_token$'; then
    warn "Secret 'telegram_bot_token' belum ada. Membuat dari .env..."
    if [ -f backend/.env ]; then
      local token=$(grep '^TELEGRAM_BOT_TOKEN=' backend/.env | cut -d'=' -f2-)
      if [ -n "$token" ]; then
        echo "$token" | docker secret create telegram_bot_token -
        ok "Secret 'telegram_bot_token' created"
        secrets_created=true
      fi
    fi
  fi

  if ! docker secret ls --format '{{.Name}}' | grep -q '^telegram_bot_username$'; then
    warn "Secret 'telegram_bot_username' belum ada. Membuat dari .env..."
    if [ -f backend/.env ]; then
      local username=$(grep '^TELEGRAM_BOT_USERNAME=' backend/.env | cut -d'=' -f2-)
      if [ -n "$username" ]; then
        echo "$username" | docker secret create telegram_bot_username -
        ok "Secret 'telegram_bot_username' created"
        secrets_created=true
      fi
    fi
  fi

  if [ "$secrets_created" = false ]; then
    ok "All secrets already exist"
  fi
}

# ── Build & Push Images ──────────────────────────────────────────────────────

build_images() {
  info "Building images with tag: ${REGISTRY}/telestore-backend:${TAG}..."

  # Backend (used by both backend service & queue-worker)
  docker build \
    --target production \
    -t "${REGISTRY}/telestore-backend:${TAG}" \
    -t "${REGISTRY}/telestore-backend:latest" \
    ./backend

  ok "Backend image built"

  # Frontend
  docker build \
    -t "${REGISTRY}/telestore-frontend:${TAG}" \
    -t "${REGISTRY}/telestore-frontend:latest" \
    ./frontend

  ok "Frontend image built"

  # Push jika registry bukan localhost
  if [ "$REGISTRY" != "localhost" ]; then
    info "Pushing images to ${REGISTRY}..."
    docker push "${REGISTRY}/telestore-backend:${TAG}"
    docker push "${REGISTRY}/telestore-backend:latest"
    docker push "${REGISTRY}/telestore-frontend:${TAG}"
    docker push "${REGISTRY}/telestore-frontend:latest"
    ok "Images pushed"
  fi
}

# ── Backup Stack (sebelum deploy) ────────────────────────────────────────────

backup_stack() {
  mkdir -p "$BACKUP_DIR"

  local timestamp=$(date +%Y%m%d_%H%M%S)
  local backup_file="${BACKUP_DIR}/${STACK_NAME}-${timestamp}.json"

  if docker stack services "$STACK_NAME" 2>/dev/null | grep -q .; then
    info "Backing up current stack state to ${backup_file}..."
    docker stack services "$STACK_NAME" --format '{{json .}}' > "$backup_file" 2>/dev/null || true
    ok "Stack state backed up"
  else
    info "No existing stack to back up"
  fi
}

# ── Deploy Stack ─────────────────────────────────────────────────────────────

deploy_stack() {
  info "Deploying stack '${STACK_NAME}' with zero-downtime rolling update..."

  # Deploy dengan stack deploy (native Swarm)
  # Update_config di docker-stack.yml mengatur:
  #   - order: start-first   → container baru start dulu sebelum yg lama distop
  #   - parallelism: 1       → update 1 container per waktu
  #   - delay: 10s           → jeda 10 detik antar update
  #   - monitor: 60s         → pantau 60 detik setelah update
  #   - failure_action: rollback → rollback otomatis jika gagal
  docker stack deploy \
    --with-registry-auth \
    --resolve-image always \
    --prune \
    -c "$COMPOSE_FILE" \
    "$STACK_NAME"

  ok "Stack deployed. Waiting for services to stabilize..."

  # Tunggu hingga semua service stabil
  local timeout=120
  local elapsed=0
  while [ $elapsed -lt $timeout ]; do
    local unstable=$(docker stack services "$STACK_NAME" \
      --format '{{.Name}} {{.Replicas}}' 2>/dev/null | \
      grep -v "1/1\|2/2" | wc -l || echo 0)

    if [ "$unstable" -eq 0 ]; then
      ok "All services are stable!"
      break
    fi

    sleep 5
    elapsed=$((elapsed + 5))
  done

  if [ $elapsed -ge $timeout ]; then
    warn "Timeout waiting for services to stabilize. Check 'docker stack services ${STACK_NAME}'"
  fi
}

# ── Verifikasi Deployment ────────────────────────────────────────────────────

verify_deploy() {
  info "Verifying deployment..."

  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  TeleStore Stack: ${STACK_NAME}"
  echo "  Tag: ${TAG}"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo ""

  # Tampilkan status services
  docker stack services "$STACK_NAME" \
    --format 'table {{.Name}}\t{{.Replicas}}\t{{.Image}}'

  echo ""
  info "Graceful shutdown configuration:"
  echo "  - Queue worker: 30 menit grace period (ongoing uploads)"
  echo "  - Backend: 30 detik grace period (ongoing requests)"
  echo "  - Update order: start-first (zero downtime)"
  echo "  - Auto-rollback: enabled on failure"
  echo ""

  # Cek health
  local all_healthy=true
  for service in backend frontend queue-worker; do
    local replicas=$(docker service ls --format '{{.Replicas}}' \
      -f "name=${STACK_NAME}_${service}" 2>/dev/null | head -1 || echo "0/0")
    if echo "$replicas" | grep -q "^0/"; then
      warn "Service ${service}: not running"
      all_healthy=false
    fi
  done

  if [ "$all_healthy" = true ]; then
    ok "All services healthy!"
    echo ""
    echo "  Frontend: https://telestore.dev"
    echo "  Backend:  https://api.telestore.dev"
  else
    warn "Some services may not be healthy. Check: docker service ls"
  fi
}

# ── Rollback ─────────────────────────────────────────────────────────────────

rollback() {
  local service="${1:-all}"

  if [ "$service" = "all" ]; then
    warn "Rolling back ALL services in stack '${STACK_NAME}'..."
    docker stack rollback "$STACK_NAME"
  else
    warn "Rolling back service '${STACK_NAME}_${service}'..."
    docker service rollback "${STACK_NAME}_${service}"
  fi

  ok "Rollback initiated. Check status with: docker service ls"
}

# ── Migration ────────────────────────────────────────────────────────────────

run_migrations() {
  info "Running database migrations..."

  local container=$(docker ps --filter "name=${STACK_NAME}_backend" --format '{{.ID}}' | head -1)

  if [ -n "$container" ]; then
    docker exec "$container" php artisan migrate --force
    ok "Migrations completed"

    # Seed admin user if not exists
    local user_count=$(docker exec "$container" php artisan tinker --execute="echo App\\Models\\User::count();" 2>/dev/null | tail -1)
    if [ "$user_count" = "0" ] || [ -z "$user_count" ]; then
      info "Creating default admin user..."
      docker exec -i "$container" php artisan tinker <<'TINKER'
App\Models\User::create([
    "name" => "Admin",
    "email" => "admin@test.com",
    "password" => Illuminate\Support\Facades\Hash::make("admin123"),
    "telegram_id" => "email_admin@test.com",
    "role" => "admin"
]);
echo "Admin user created (admin@test.com / admin123)\n";
TINKER
    else
      ok "Users exist, skipping seed"
    fi
  else
    warn "No running backend container found. Skipping migrations."
  fi
}

# ── Cleanup ──────────────────────────────────────────────────────────────────

cleanup() {
  info "Cleaning up old images and unused resources..."

  # Hapus image lama (lebih dari 7 hari)
  docker image prune -a --force --filter "until=168h" 2>/dev/null || true

  # Hapus resource yang tidak dipakai
  docker system prune --force --volumes 2>/dev/null || true

  ok "Cleanup completed"
}

# ── Main ─────────────────────────────────────────────────────────────────────

main() {
  echo ""
  echo "╔══════════════════════════════════════════════╗"
  echo "║        TeleStore Zero-Downtime Deploy        ║"
  echo "╚══════════════════════════════════════════════╝"
  echo ""

  local cmd="${1:-deploy}"

  case "$cmd" in
    deploy)
      setup_swarm
      setup_secrets
      build_images
      backup_stack
      deploy_stack
      run_migrations
      verify_deploy
      ;;

    setup)
      setup_swarm
      setup_secrets
      ;;

    build)
      build_images
      ;;

    deploy-only)
      backup_stack
      deploy_stack
      run_migrations
      verify_deploy
      ;;

    rollback)
      rollback "${2:-all}"
      ;;

    migrate)
      run_migrations
      ;;

    status)
      verify_deploy
      ;;

    logs)
      local service="${2:-}"
      if [ -n "$service" ]; then
        docker service logs --tail=100 -f "${STACK_NAME}_${service}"
      else
        docker service logs --tail=50 "${STACK_NAME}_backend"
      fi
      ;;

    cleanup)
      cleanup
      ;;

    help|*)
      echo "Penggunaan: ./deploy.sh [command]"
      echo ""
      echo "Commands:"
      echo "  deploy        Full deployment: setup → build → deploy → verify"
      echo "  setup         Initialize Swarm + secrets (first time only)"
      echo "  build         Build & push Docker images"
      echo "  deploy-only   Deploy stack without build/setup"
      echo "  rollback      Rollback to previous deployment"
      echo "  migrate       Run database migrations"
      echo "  status        Check deployment status"
      echo "  logs [svc]    View service logs (backend, frontend, queue-worker)"
      echo "  cleanup       Remove old images and unused resources"
      echo "  help          Show this help"
      ;;
  esac
}

main "$@"
