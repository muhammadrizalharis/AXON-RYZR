<div align="center">

# 🧠 AXON-RYZR

### AURA Creative Studio — Platform Generative AI (Image & Video) Self-Hosted

**Self-Hosted Generative AI Platform**
Deployed on-premise — 100% On-Premise · Per-User Isolation

<br/>

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-blue)
![Frontend](https://img.shields.io/badge/frontend-Next.js%2014-black)
![Backend](https://img.shields.io/badge/backend-NestJS-e0234e)
![Database](https://img.shields.io/badge/database-PostgreSQL%2016-336791)
![AI](https://img.shields.io/badge/AI%20engine-ComfyUI-purple)
![Docker](https://img.shields.io/badge/deploy-Docker%20Compose-2496ed)

</div>

---

## 📖 Deskripsi

**AXON-RYZR** adalah platform *generative AI* untuk pembuatan **gambar** dan **video** dari teks (*text-to-image* & *text-to-video*), berjalan **sepenuhnya di server on-premise** (on-premise) tanpa ketergantungan pada layanan cloud berbayar (Cloudinary/AWS/OpenAI dsb.).

Seluruh proses inferensi AI dijalankan pada **GPU node lokal** menggunakan **ComfyUI**, sementara data pengguna, hasil generasi, dan antrean pekerjaan dikelola oleh stack aplikasi yang di-*containerize* dengan Docker. Platform dirancang untuk **50–500 pengguna** dengan **isolasi per-user** (kuota, penyimpanan, dan riwayat terpisah per akun).

> **Kode proyek:** `AXON-RYZR` · **Nama produk:** AURA Creative Studio

---

## ✨ Fitur Utama

- 🎨 **Text-to-Image** — generasi gambar dari prompt (multi-style, multi aspect-ratio, hingga 4K).
- 🎬 **Text-to-Video** — generasi video pendek (durasi & FPS dapat diatur).
- 🧩 **Creation Hub** — dashboard kreasi dengan parameter (Aspect Ratio, Style, Resolution, Duration, FPS).
- 📚 **My Gallery / Projects** — galeri & manajemen proyek per pengguna.
- ⏳ **Realtime Progress** — status render live via WebSocket (queue → rendering → complete).
- 💳 **Sistem Kredit & Kuota** — pembatasan penggunaan per user (fair-use di server bersama).
- 🔐 **Autentikasi & RBAC** — login aman, role `user` / `admin` / `super-admin`.
- 🗂️ **Prompts Library & History** — riwayat prompt dan hasil tersimpan per akun.
- 🛡️ **Isolasi Per-User** — data, storage, dan antrean terpisah antar pengguna.

---

## 🏗️ Arsitektur Sistem

Arsitektur dipilih agar **optimal untuk on-premise**: satu bahasa (TypeScript) end-to-end untuk kemudahan tim, antrean asinkron untuk beban GPU, dan storage S3-compatible yang self-hosted.

```mermaid
flowchart TD
    U["👤 Pengguna (Browser)"] -->|HTTPS| NGX["🌐 Nginx<br/>Reverse Proxy + TLS"]

    NGX --> FE["⚛️ Next.js 14 (Frontend)<br/>React + TypeScript + Tailwind"]
    NGX --> API["🧩 NestJS (Backend API)<br/>REST + WebSocket"]

    FE <-->|"REST / Socket.IO"| API

    API --> PG[("🐘 PostgreSQL 16<br/>User, Project, Job, Asset")]
    API --> RDS[("🧵 Redis 7<br/>Queue + Cache + Session")]
    API --> MIN["🪣 MinIO<br/>S3-Compatible Storage"]

    API -->|"enqueue job"| RDS
    RDS -->|"consume"| WK["⚙️ BullMQ Worker<br/>Job Orchestrator"]
    WK -->|"HTTP / WS :8188"| CUI["🎨 ComfyUI (GPU Node)<br/><IP-GPU-NODE>:8188"]
    CUI -->|"hasil (image/video)"| WK
    WK -->|"simpan aset"| MIN
    WK -->|"update status"| PG
    WK -->|"progress event"| API
    API -->|"push realtime"| FE

    subgraph CAMPUS["🏢 Server On-Premise (Docker)"]
        NGX
        FE
        API
        PG
        RDS
        MIN
        WK
    end
    subgraph GPU["🖥️ GPU Node (≥16GB VRAM)"]
        CUI
    end
```

---

## 🧰 Tech Stack (Final — Optimal untuk On-Premise)

| Layer | Teknologi | Alasan Pemilihan |
|-------|-----------|------------------|
| **Frontend** | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS · shadcn/ui | SSR/SSG, DX modern, UI konsisten, satu bahasa dengan backend |
| **State / Data** | TanStack Query · Zustand · Socket.IO Client | Caching data server & progress realtime |
| **Backend / API** | NestJS · TypeScript · Prisma ORM | Modular, terstruktur, *type-safe* end-to-end |
| **Job Queue** | BullMQ (Redis) | Antrean asinkron untuk beban GPU yang berat & panjang |
| **Realtime** | Socket.IO / WebSocket Gateway | Status render live (queue → rendering → complete) |
| **Database** | PostgreSQL 16 | Relasional, andal, cocok untuk data user & metadata aset |
| **Cache / Session** | Redis 7 | Cache, rate-limit, session, backend BullMQ |
| **Object Storage** | MinIO (S3-Compatible) | Self-hosted, menggantikan Cloudinary/S3 untuk on-premise |
| **AI Engine** | ComfyUI @ `<IP-GPU-NODE>:8188` | Inferensi image/video di GPU node lokal |
| **Autentikasi** | JWT (access + refresh) · Passport · Argon2 · RBAC | Aman, stateless, tanpa vendor eksternal |
| **Reverse Proxy** | Nginx (TLS/HTTPS) | Terminasi TLS, routing, static caching |
| **Container** | Docker · Docker Compose | Reproducible deployment di server on-premise |
| **Monitoring** *(opsional)* | Prometheus · Grafana · Loki | Observability & log terpusat |
| **CI/CD** *(opsional)* | GitHub Actions | Build, test, dan deploy otomatis |

> **Kenapa bukan Cloudinary / AWS S3 / OpenAI API?**
> Karena target deploy adalah **server on-premise**. Semua komponen dipilih agar bisa berjalan **tanpa internet keluar** dan **tanpa biaya langganan**: MinIO menggantikan S3/Cloudinary, ComfyUI menggantikan API AI berbayar, dan JWT self-hosted menggantikan Auth0/Firebase.

---

## 📂 Struktur Proyek (Monorepo)

```
AXON-RYZR/
├── backend/                  # Backend — NestJS (SEMUA backend di sini)
│   ├── src/
│   │   ├── auth/             # JWT, guards, RBAC
│   │   ├── users/            # Manajemen user & kuota
│   │   ├── generation/       # Endpoint generate image/video
│   │   ├── jobs/             # BullMQ producer/consumer
│   │   ├── comfyui/          # Integrasi ComfyUI (HTTP/WS)
│   │   ├── storage/          # MinIO service
│   │   ├── realtime/         # Socket.IO gateway
│   │   └── prisma/           # Schema & migrations
│   └── package.json
│
├── apps/
│   └── web/                  # Frontend — Next.js 14 (tim frontend)
│       ├── src/
│       │   ├── app/          # App Router (routes, layouts)
│       │   ├── components/   # Komponen UI (shadcn/ui)
│       │   ├── features/     # Fitur: creation-hub, gallery, auth
│       │   ├── lib/          # API client, socket, utils
│       │   └── store/        # Zustand stores
│       └── package.json
│
├── packages/
│   └── shared/               # Tipe & DTO bersama (dipakai frontend)
│
├── docker/
│   ├── nginx/                # Konfigurasi reverse proxy
│   └── ...
├── docker-compose.yml        # Orkestrasi seluruh service
├── .env.example              # Contoh environment variables
└── README.md
```

---

## ⚙️ Prasyarat (Server On-Premise)

- **OS:** Linux (Ubuntu 22.04 LTS direkomendasikan)
- **Docker** ≥ 24 & **Docker Compose** v2
- **GPU Node** dengan **ComfyUI** aktif di `<IP-GPU-NODE>:8188` (VRAM **≥ 16 GB**)
- Akses **Docker** untuk deploy penuh (dev bisa TANPA sudo — lihat Pengembangan lokal)
- Node.js ≥ 20 (menjalankan API)

---

## 🚀 Instalasi & Menjalankan

### 1. Clone repositori
```bash
git clone <url-repo> AXON-RYZR
cd AXON-RYZR
```

### 2. Siapkan environment
```bash
cp .env.example .env
# edit .env sesuai konfigurasi server
```

### 3. Jalankan seluruh stack (produksi)
```bash
docker compose up -d --build
```

### 4. Migrasi database
```bash
docker compose exec api npx prisma migrate deploy
```

### 5. Akses aplikasi
- **Web App:** `https://<domain-atau-ip-server>`
- **API:** `https://<domain-atau-ip-server>/api`
- **MinIO Console:** `http://<ip>:9001`

### Pengembangan lokal

Backend butuh **PostgreSQL + Redis + MinIO**. Pilih SALAH SATU cara menyalakannya:

#### Opsi 1 — Docker (infra saja, tanpa build image berat)
Untuk yang punya akses Docker (bila belum di group `docker`, awali `sudo`):
```bash
docker compose -f docker-compose.dev.yml up -d      # Postgres + Redis + MinIO saja
cd backend && npm install
npx prisma migrate deploy && npm run db:seed        # skema + super-admin
npm run start:dev                                   # API hot-reload di :4000
```

#### Opsi 2 — TANPA sudo & TANPA Docker (server on-premise)
Kalau tidak punya akses Docker/sudo, jalankan dependency di user-space (butuh conda/miniforge):
```bash
backend/scripts/dev-services.sh up     # pasang & nyalakan Postgres+Redis+MinIO (user-space)
# script mencetak blok .env siap pakai -> salin ke backend/.env
cd backend && npm install
npx prisma migrate deploy && npm run start:dev
backend/scripts/dev-services.sh down   # matikan bila selesai
```
Semua data & binari ada di `~/.axon-ryzr-dev` (di luar repo; hapus dengan `rm -rf`).

#### Frontend (tim frontend) — TIDAK perlu Docker
Frontend cukup mengarah ke URL backend yang sudah berjalan (lokal atau milik rekan):
```bash
cd apps/web && npm install
# set NEXT_PUBLIC_API_URL & NEXT_PUBLIC_SOCKET_URL di apps/web/.env ke backend
npm run dev
```

> **Model kolaborasi:** cukup SATU orang menyalakan backend + dependency (Opsi 1 atau 2),
> lalu yang mengerjakan frontend hanya `npm run dev` dan menunjuk `NEXT_PUBLIC_API_URL` ke
> backend itu. Tim frontend **tidak perlu** Docker/sudo maupun Postgres/Redis/MinIO di mesinnya.

---

## 🌐 Deploy Ringan: Backend 24/7 + URL Publik (tanpa sudo/Docker)

Agar backend **jalan terus** (auto-restart + tahan reboot) dan bisa diakses frontend/Vercel,
gunakan `systemd --user` + `ngrok`. Tidak butuh Docker maupun akses admin.

### 1) Bangun & seed (sekali)
```bash
cd backend && npm install && npm run build
backend/scripts/dev-services.sh up            # Postgres/Redis/MinIO (user-space)
npx prisma migrate deploy                     # buat tabel
npm run db:seed                               # buat super-admin (email/pass dari SEED_ADMIN_*)
```
> Password super-admin ditampilkan **sekali** saat seed — catat lalu ganti setelah login.

### 2) Tiga unit `systemd --user` (di `~/.config/systemd/user/`)
- **`axon-services.service`** — nyalakan Postgres/Redis/MinIO (bungkus `dev-services.sh up/down`).
- **`axon-api.service`** — `node dist/main.js` (`Restart=always`, `WorkingDirectory=backend`, baca `backend/.env`).
- **`axon-tunnel.service`** — `ngrok http --url=<domain-ngrok-anda> 4000`.

```bash
loginctl enable-linger "$USER"                 # tahan logout/reboot
systemctl --user daemon-reload
systemctl --user enable --now axon-services axon-api axon-tunnel
```

### 3) Kelola & pantau
```bash
systemctl --user status axon-api          # status
systemctl --user restart axon-api         # restart
journalctl --user -u axon-api -f          # log realtime
```
> Jika API `EADDRINUSE`/crash-loop: ada proses `node` lama pegang :4000 →
> `ss -ltnp | grep :4000`, `kill <PID>`, lalu `systemctl --user restart axon-api`.

---

## 🔗 Menghubungkan Frontend (Vercel) ke Backend

1. Set env (di Vercel atau `apps/web/.env`) ke URL publik backend:
   ```env
   NEXT_PUBLIC_API_URL=https://<domain-ngrok>/api
   NEXT_PUBLIC_SOCKET_URL=https://<domain-ngrok>
   ```
2. **WAJIB untuk ngrok:** frontend harus mengirim header `ngrok-skip-browser-warning: true`
   pada **setiap** request ke API. Tanpa ini, ngrok free menampilkan halaman peringatan dan
   request browser diblokir. Tambahkan di HTTP client (`apps/web/src/lib/api-client.ts`):
   ```ts
   headers: { 'ngrok-skip-browser-warning': 'true' /* , ...header lain */ }
   ```

---

## 🖼️ Serving Aset (gambar/video) di balik tunnel

Hasil generate disimpan di MinIO (privat, hanya lokal). Agar tampil untuk user remote,
backend menyediakan **proxy aset**: `GET /api/assets/*` men-stream objek lewat API (satu-satunya
port yang di-tunnel), tanpa mengekspos MinIO. Aktifkan dengan set di `backend/.env`:
```env
ASSET_PUBLIC_BASE=https://<domain-ngrok>/api
```
`storage.getUrl()` otomatis mengembalikan `.../api/assets/<key>` (key ber-UUID, tak bisa
ditebak). Kosongkan untuk memakai presigned URL lokal saat dev.

---

## ⚠️ Catatan Penting

- **ngrok free**: kuota ~1 GB/bulan + 1 sesi agent aktif. Untuk trafik gambar/video berat,
  pertimbangkan upgrade atau domain + reverse proxy sendiri.
- **`backend/.env` JANGAN di-commit** (berisi secret & URL) — sudah di `.gitignore`.
- **Ganti** password super-admin & pastikan `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` acak kuat
  (mis. `openssl rand -hex 32`) sebelum dipakai serius.
- **CORS**: `CORS_ORIGINS` kosong = izinkan semua origin (aman karena auth via JWT header,
  bukan cookie); persempit ke domain Vercel bila perlu.

---

## 🔑 Environment Variables (contoh)

```env
# ── App ──────────────────────────────
NODE_ENV=production
API_PORT=4000
CORS_ORIGINS=                 # kosong = izinkan semua origin (auth via JWT header)

# ── Database (PostgreSQL) ────────────
DATABASE_URL=postgresql://axon:secret@localhost:5432/axon_db?schema=public

# ── Redis (Queue + Cache) ────────────
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=

# ── Object Storage (MinIO) ───────────
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=xxxxxxxx
MINIO_SECRET_KEY=xxxxxxxx
MINIO_BUCKET=axon-assets
MINIO_PUBLIC_URL=             # kosong = presigned/proxy
ASSET_PUBLIC_BASE=            # https://<tunnel>/api  (proxy aset di balik tunnel)

# ── AI Engine (ComfyUI FLUX.2) ───────
COMFYUI_BASE_URL=http://<IP-GPU-NODE>:8188
COMFYUI_FLUX_UNET=flux2_dev_fp8mixed.safetensors
COMFYUI_FLUX_CLIP=mistral_3_small_flux2_fp8.safetensors
COMFYUI_FLUX_VAE=flux2-vae.safetensors
COMFYUI_FLUX_GUIDANCE=3.5
COMFYUI_FLUX_LORA=            # opsional, mis. Flux2TurboComfyv2.safetensors (cepat)

# ── Job worker ───────────────────────
JOB_CONCURRENCY=2

# ── Auth (JWT) ───────────────────────
JWT_ACCESS_SECRET=change-me   # openssl rand -hex 32
JWT_REFRESH_SECRET=change-me
JWT_ACCESS_TTL=15m
JWT_REFRESH_TTL=7d
```

> ⚠️ **Jangan pernah commit file `.env`** ke repositori. Gunakan `.env.example` sebagai template.

---

## 🔌 Ringkasan API

| Method | Endpoint | Deskripsi | Auth |
|--------|----------|-----------|------|
| `POST` | `/api/auth/register` | Registrasi pengguna baru | ❌ |
| `POST` | `/api/auth/login` | Login, terima access & refresh token | ❌ |
| `POST` | `/api/auth/refresh` | Perbarui access token | 🔄 |
| `GET`  | `/api/users/me` | Profil & kuota pengguna | ✅ |
| `POST` | `/api/generation/image` | Buat job generasi gambar | ✅ |
| `POST` | `/api/generation/video` | Buat job generasi video | ✅ |
| `GET`  | `/api/jobs/:id` | Status sebuah job | ✅ |
| `GET`  | `/api/gallery` | Daftar aset milik pengguna | ✅ |
| `GET`  | `/api/assets/*` | Stream aset (proxy MinIO agar tampil di balik tunnel) | ❌ |
| `GET`  | `/api/health` | Health check (database, redis, storage, comfyui) | ❌ |
| `WS`   | `/socket` | Event progress render realtime | ✅ |

---

## 🛡️ Keamanan & Isolasi Per-User

Sesuai dokumen **ISOLASI-PER-USER** dan persetujuan operator infrastruktur:

- 🔐 **Autentikasi JWT** (access + refresh) dengan hashing **Argon2**.
- 👥 **RBAC** — pemisahan hak akses `user`, `admin`, `super-admin`.
- 📦 **Namespace penyimpanan per-user** di MinIO (prefix per akun).
- 🎫 **Kuota & rate-limit** per pengguna (kredit generasi) untuk *fair-use* GPU.
- 🧵 **Antrean terisolasi** — job satu user tidak memblokir user lain.
- 🧹 **Validasi input & sanitasi prompt** untuk mencegah *injection*.
- 🔒 **TLS/HTTPS** via Nginx untuk seluruh trafik.
- 🚫 **Prinsип least-privilege** pada kredensial service (DB, MinIO, Redis).

---

## 🗺️ Roadmap

- [x] Scaffolding monorepo (web + api + shared)
- [x] Skema database & migrasi Prisma
- [x] Modul autentikasi (JWT + RBAC)
- [x] Integrasi ComfyUI (text-to-image) — **FLUX.2**, terverifikasi live
- [x] Job queue BullMQ + progress realtime
- [x] Integrasi MinIO (upload & serving aset + proxy publik)
- [ ] Text-to-video pipeline (butuh model video terpasang di ComfyUI)
- [x] Sistem kredit & kuota per-user
- [ ] Dashboard admin & monitoring
- [ ] Hardening keamanan & load test (50–500 user)
- [ ] Deployment produksi di server on-premise

---

## 👥 Tim & Institusi

- **Proyek:** Capstone Project
- **Infrastruktur:** Server GPU on-premise

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat berkas `LICENSE` untuk detail.

---

<div align="center">

**AXON-RYZR** · Dibangun untuk berjalan optimal di server on-premise 🏫⚡

## Contributors

- Nur Adnan Yusri

</div>
