#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# AXON-RYZR — dev services TANPA sudo / TANPA Docker.
#
# Menyalakan PostgreSQL + Redis + MinIO di USER-SPACE (via conda-forge + binary
# MinIO). Cocok untuk server kampus di mana user TIDAK punya akses Docker/sudo.
# Tidak menyentuh sistem, tidak butuh root, tidak mengganggu layanan lain.
#
#   ./dev-services.sh up      # nyalakan semua service (idempoten; instalasi 1x)
#   ./dev-services.sh down    # matikan semua service
#   ./dev-services.sh status  # lihat status
#   ./dev-services.sh env     # cetak baris .env untuk backend/
#
# Semua data & binari disimpan DI LUAR repo: ${AXON_DEV_HOME:-$HOME/.axon-ryzr-dev}
# Hapus total dengan: ./dev-services.sh down && rm -rf ~/.axon-ryzr-dev
# ──────────────────────────────────────────────────────────────────────────────
set -euo pipefail

BASE="${AXON_DEV_HOME:-$HOME/.axon-ryzr-dev}"
ENV_PREFIX="$BASE/conda-env"
BIN_DIR="$BASE/bin"
PGDATA="$BASE/pgdata"
REDISDATA="$BASE/redisdata"
MINIODATA="$BASE/miniodata"
RUN="$BASE/run"

# Ports (override lewat environment bila perlu).
PG_PORT="${AXON_PG_PORT:-55432}"
REDIS_PORT="${AXON_REDIS_PORT:-56379}"
MINIO_PORT="${AXON_MINIO_PORT:-59000}"
MINIO_CONSOLE_PORT="${AXON_MINIO_CONSOLE_PORT:-59001}"

# Kredensial dev (lokal saja, JANGAN dipakai produksi).
PG_USER="axon"; PG_PW="axon_dev_pw"; PG_DB="axon_db"
MINIO_USER="axon-minio"; MINIO_PW="axon-minio-dev"; MINIO_BUCKET="axon-assets"

log() { printf '\033[36m[axon-dev]\033[0m %s\n' "$*"; }
err() { printf '\033[31m[axon-dev] ERROR:\033[0m %s\n' "$*" >&2; }

detect_conda() {
  if [[ -n "${CONDA_EXE:-}" && -x "${CONDA_EXE}" ]]; then echo "$CONDA_EXE"; return 0; fi
  if command -v conda >/dev/null 2>&1; then command -v conda; return 0; fi
  local c
  for c in "$HOME/miniforge3/bin/conda" "$HOME/miniconda3/bin/conda" \
           "$HOME/anaconda3/bin/conda"; do
    [[ -x "$c" ]] && { echo "$c"; return 0; }
  done
  return 1
}

ensure_dirs() { mkdir -p "$BASE" "$BIN_DIR" "$RUN" "$REDISDATA" "$MINIODATA"; }

ensure_conda_env() {
  if [[ -x "$ENV_PREFIX/bin/postgres" && -x "$ENV_PREFIX/bin/redis-server" ]]; then
    return 0
  fi
  local conda
  conda="$(detect_conda)" || { err "conda tidak ditemukan (miniforge/miniconda). Pasang dulu atau set CONDA_EXE."; exit 1; }
  log "Membuat conda env (postgresql + redis-server) di $ENV_PREFIX ... (sekali saja)"
  "$conda" create -y -p "$ENV_PREFIX" -c conda-forge postgresql redis-server >/dev/null
  log "conda env siap."
}

ensure_minio() {
  if [[ ! -x "$BIN_DIR/minio" ]]; then
    log "Mengunduh MinIO server ..."
    curl -fsSL https://dl.min.io/server/minio/release/linux-amd64/minio -o "$BIN_DIR/minio"
    chmod +x "$BIN_DIR/minio"
  fi
  if [[ ! -x "$BIN_DIR/mc" ]]; then
    log "Mengunduh MinIO client (mc) ..."
    curl -fsSL https://dl.min.io/client/mc/release/linux-amd64/mc -o "$BIN_DIR/mc"
    chmod +x "$BIN_DIR/mc"
  fi
}

start_postgres() {
  if [[ ! -f "$PGDATA/PG_VERSION" ]]; then
    log "initdb PostgreSQL ..."
    "$ENV_PREFIX/bin/initdb" -D "$PGDATA" -U "$PG_USER" \
      --auth-local=trust --auth-host=trust >/dev/null
  fi
  if "$ENV_PREFIX/bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    log "PostgreSQL sudah jalan."
  else
    log "Menyalakan PostgreSQL di 127.0.0.1:$PG_PORT ..."
    "$ENV_PREFIX/bin/pg_ctl" -D "$PGDATA" -l "$RUN/postgres.log" \
      -o "-p $PG_PORT -k $RUN -h 127.0.0.1" -w start >/dev/null
  fi
  if ! "$ENV_PREFIX/bin/psql" -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" -d postgres -tAc \
       "SELECT 1 FROM pg_database WHERE datname='$PG_DB'" | grep -q 1; then
    "$ENV_PREFIX/bin/createdb" -h 127.0.0.1 -p "$PG_PORT" -U "$PG_USER" "$PG_DB"
    log "Database '$PG_DB' dibuat."
  fi
}

start_redis() {
  if [[ -f "$RUN/redis.pid" ]] && kill -0 "$(cat "$RUN/redis.pid")" 2>/dev/null; then
    log "Redis sudah jalan."
  else
    log "Menyalakan Redis di 127.0.0.1:$REDIS_PORT ..."
    "$ENV_PREFIX/bin/redis-server" --port "$REDIS_PORT" --bind 127.0.0.1 \
      --dir "$REDISDATA" --daemonize yes \
      --pidfile "$RUN/redis.pid" --logfile "$RUN/redis.log" --appendonly yes
  fi
}

start_minio() {
  if [[ -f "$RUN/minio.pid" ]] && kill -0 "$(cat "$RUN/minio.pid")" 2>/dev/null; then
    log "MinIO sudah jalan."
  else
    log "Menyalakan MinIO di 127.0.0.1:$MINIO_PORT (console :$MINIO_CONSOLE_PORT) ..."
    MINIO_ROOT_USER="$MINIO_USER" MINIO_ROOT_PASSWORD="$MINIO_PW" \
      nohup "$BIN_DIR/minio" server "$MINIODATA" \
      --address "127.0.0.1:$MINIO_PORT" \
      --console-address "127.0.0.1:$MINIO_CONSOLE_PORT" \
      >"$RUN/minio.log" 2>&1 &
    echo $! >"$RUN/minio.pid"
  fi
  # Tunggu MinIO siap lalu buat bucket (idempoten).
  local i
  for i in $(seq 1 15); do
    if "$BIN_DIR/mc" alias set axondev "http://127.0.0.1:$MINIO_PORT" \
         "$MINIO_USER" "$MINIO_PW" >/dev/null 2>&1; then
      break
    fi
    sleep 1
  done
  "$BIN_DIR/mc" mb --ignore-existing "axondev/$MINIO_BUCKET" >/dev/null 2>&1 || true
}

print_env() {
  cat <<EOF
# ── AXON dev services (TANPA sudo) — salin ke backend/.env ──
NODE_ENV=development
API_PORT=4000
DATABASE_URL=postgresql://$PG_USER:$PG_PW@127.0.0.1:$PG_PORT/$PG_DB?schema=public
REDIS_HOST=127.0.0.1
REDIS_PORT=$REDIS_PORT
REDIS_PASSWORD=
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=$MINIO_PORT
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=$MINIO_USER
MINIO_SECRET_KEY=$MINIO_PW
MINIO_BUCKET=$MINIO_BUCKET
MINIO_PUBLIC_URL=
COMFYUI_BASE_URL=http://127.0.0.1:8188
JWT_ACCESS_SECRET=dev-access-secret-change-me-0001
JWT_REFRESH_SECRET=dev-refresh-secret-change-me-0002
EOF
}

cmd_up() {
  ensure_dirs
  ensure_conda_env
  ensure_minio
  start_postgres
  start_redis
  start_minio
  log "Semua service dev SIAP (Postgres/Redis/MinIO)."
  echo
  print_env
  echo
  log "Langkah berikut:"
  log "  1) Salin blok .env di atas ke backend/.env"
  log "  2) cd backend && npx prisma migrate deploy && npm run start:dev"
  log "  3) Cek: curl http://localhost:4000/api/health"
}

cmd_down() {
  if [[ -f "$RUN/minio.pid" ]]; then
    kill "$(cat "$RUN/minio.pid")" 2>/dev/null || true
    rm -f "$RUN/minio.pid"; log "MinIO dimatikan."
  fi
  if [[ -f "$RUN/redis.pid" ]] && kill -0 "$(cat "$RUN/redis.pid")" 2>/dev/null; then
    "$ENV_PREFIX/bin/redis-cli" -p "$REDIS_PORT" shutdown nosave 2>/dev/null \
      || kill "$(cat "$RUN/redis.pid")" 2>/dev/null || true
    rm -f "$RUN/redis.pid"; log "Redis dimatikan."
  fi
  if "$ENV_PREFIX/bin/pg_ctl" -D "$PGDATA" -m fast stop >/dev/null 2>&1; then
    log "PostgreSQL dimatikan."
  fi
}

cmd_status() {
  echo "Base dir: $BASE"
  if "$ENV_PREFIX/bin/pg_ctl" -D "$PGDATA" status >/dev/null 2>&1; then
    echo "PostgreSQL : jalan (127.0.0.1:$PG_PORT)"
  else
    echo "PostgreSQL : mati"
  fi
  if [[ -f "$RUN/redis.pid" ]] && kill -0 "$(cat "$RUN/redis.pid")" 2>/dev/null; then
    echo "Redis      : jalan (127.0.0.1:$REDIS_PORT)"
  else
    echo "Redis      : mati"
  fi
  if [[ -f "$RUN/minio.pid" ]] && kill -0 "$(cat "$RUN/minio.pid")" 2>/dev/null; then
    echo "MinIO      : jalan (127.0.0.1:$MINIO_PORT, console :$MINIO_CONSOLE_PORT)"
  else
    echo "MinIO      : mati"
  fi
}

case "${1:-}" in
  up) cmd_up ;;
  down) cmd_down ;;
  status) cmd_status ;;
  env) print_env ;;
  *) echo "Penggunaan: $0 {up|down|status|env}"; exit 1 ;;
esac
