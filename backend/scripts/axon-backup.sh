#!/usr/bin/env bash
# =============================================================================
# AXON-RYZR nightly backup
# -----------------------------------------------------------------------------
# Bundles:  Postgres dump (pg_dump) + MinIO object data + backend/.env
# Output :  ~/axon-backups/axon-<timestamp>.tar.enc  (AES-256, pbkdf2)
# Offsite:  rclone sync -> gdrive:AXON-Backups (best-effort)
# Retensi:  14 hari lokal (Drive mengikuti via sync)
#
# Passphrase: ~/.axon-ryzr-dev/backup.pass (dibuat otomatis saat run pertama,
#             chmod 600). SIMPAN SALINANNYA di tempat lain — tanpa file ini
#             arsip tidak bisa dibuka.
#
# RESTORE:
#   openssl enc -d -aes-256-cbc -pbkdf2 -pass file:~/.axon-ryzr-dev/backup.pass \
#     -in axon-<ts>.tar.enc | tar -xf - -C /tmp/axon-restore
#   # db  : psql "$DATABASE_URL" < /tmp/axon-restore/db.sql   (DB kosong/baru)
#   # minio: tar -xzf /tmp/axon-restore/miniodata.tar.gz -C ~/.axon-ryzr-dev/
#   # env : salin env.backup -> backend/.env
# =============================================================================
set -euo pipefail

BASE="$HOME/.axon-ryzr-dev"
OUT="$HOME/axon-backups"
ENVFILE="$HOME/DATA_ICAL/AXON-RYZR/backend/.env"
PASSFILE="$BASE/backup.pass"
PGDUMP="$BASE/conda-env/bin/pg_dump"
RCLONE="$HOME/bin/rclone"
REMOTE="gdrive:AXON-Backups"
KEEP_DAYS=14

mkdir -p "$OUT"

# Passphrase (sekali buat).
if [[ ! -f "$PASSFILE" ]]; then
  umask 077
  openssl rand -base64 32 > "$PASSFILE"
  echo "[backup] passphrase baru dibuat di $PASSFILE — SIMPAN SALINANNYA!"
fi

# Ambil DATABASE_URL dari backend/.env tanpa mengekspor variabel lain.
DATABASE_URL="$(grep -E '^DATABASE_URL=' "$ENVFILE" | head -1 | cut -d= -f2- | tr -d '"')"
# pg_dump tidak mengenal parameter Prisma seperti ?schema=public — buang query string.
DATABASE_URL="${DATABASE_URL%%\?*}"
if [[ -z "$DATABASE_URL" ]]; then
  echo "[backup] DATABASE_URL tidak ditemukan di $ENVFILE" >&2
  exit 1
fi

TS="$(date +%Y%m%d-%H%M%S)"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

echo "[backup] pg_dump…"
"$PGDUMP" "$DATABASE_URL" > "$WORK/db.sql"

echo "[backup] arsip miniodata…"
tar -C "$BASE" -czf "$WORK/miniodata.tar.gz" miniodata

cp "$ENVFILE" "$WORK/env.backup"

echo "[backup] enkripsi…"
tar -C "$WORK" -cf - db.sql miniodata.tar.gz env.backup \
  | openssl enc -aes-256-cbc -pbkdf2 -salt -pass "file:$PASSFILE" \
      -out "$OUT/axon-$TS.tar.enc"

# Retensi lokal.
find "$OUT" -name 'axon-*.tar.enc' -mtime +"$KEEP_DAYS" -delete

# Offsite (best-effort — jangan gagalkan backup lokal bila Drive bermasalah).
if [[ -x "$RCLONE" ]]; then
  echo "[backup] sync ke $REMOTE…"
  "$RCLONE" sync "$OUT" "$REMOTE" --quiet || \
    echo "[backup] WARN: upload offsite gagal (lokal tetap aman)" >&2
fi

SIZE="$(du -h "$OUT/axon-$TS.tar.enc" | cut -f1)"
echo "[backup] SELESAI: axon-$TS.tar.enc ($SIZE)"
