<div align="center">

# 🧠 AXON-RYZR

### AURA Creative Studio — Platform Generative AI (Image & Video) Self-Hosted

**Capstone Project · Universitas Muhammadiyah Makassar (UNISMUH)**
Deployed on **UNISMUH ComputeHub** — 100% On-Premise · Per-User Isolation

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

**AXON-RYZR** adalah platform *generative AI* untuk pembuatan **gambar** dan **video** dari teks (*text-to-image* & *text-to-video*), berjalan **sepenuhnya di server kampus** (on-premise) tanpa ketergantungan pada layanan cloud berbayar (Cloudinary/AWS/OpenAI dsb.).

Seluruh proses inferensi AI dijalankan pada **GPU node kampus** menggunakan **ComfyUI**, sementara data pengguna, hasil generasi, dan antrean pekerjaan dikelola oleh stack aplikasi yang di-*containerize* dengan Docker. Platform dirancang untuk **50–500 pengguna** dengan **isolasi per-user** (kuota, penyimpanan, dan riwayat terpisah per akun).

> **Kode proyek:** `AXON-RYZR` · **Nama produk:** AURA Creative Studio

---

## ✨ Fitur Utama

- 🎨 **Text-to-Image** — generasi gambar dari prompt (multi-style, multi aspect-ratio, hingga 4K).
- 🎬 **Text-to-Video** — generasi video pendek (durasi & FPS dapat diatur).
- 🧩 **Creation Hub** — dashboard kreasi dengan parameter (Aspect Ratio, Style, Resolution, Duration, FPS).
- 📚 **My Gallery / Projects** — galeri & manajemen proyek per pengguna.
- ⏳ **Realtime Progress** — status render live via WebSocket (queue → rendering → complete).
- 💳 **Sistem Kredit & Kuota** — pembatasan penggunaan per user (fair-use di server kampus).
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
    WK -->|"HTTP / WS :8188"| CUI["🎨 ComfyUI (GPU Node)<br/>127.0.0.1:8188"]
    CUI -->|"hasil (image/video)"| WK
    WK -->|"simpan aset"| MIN
    WK -->|"update status"| PG
    WK -->|"progress event"| API
    API -->|"push realtime"| FE

    subgraph CAMPUS["🏫 UNISMUH ComputeHub (On-Premise, Docker)"]
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
| **AI Engine** | ComfyUI @ `127.0.0.1:8188` | Inferensi image/video di GPU node kampus |
| **Autentikasi** | JWT (access + refresh) · Passport · Argon2 · RBAC | Aman, stateless, tanpa vendor eksternal |
| **Reverse Proxy** | Nginx (TLS/HTTPS) | Terminasi TLS, routing, static caching |
| **Container** | Docker · Docker Compose | Reproducible deployment di server kampus |
| **Monitoring** *(opsional)* | Prometheus · Grafana · Loki | Observability & log terpusat |
| **CI/CD** *(opsional)* | GitHub Actions | Build, test, dan deploy otomatis |

> **Kenapa bukan Cloudinary / AWS S3 / OpenAI API?**
> Karena target deploy adalah **server kampus (on-premise)**. Semua komponen dipilih agar bisa berjalan **tanpa internet keluar** dan **tanpa biaya langganan**: MinIO menggantikan S3/Cloudinary, ComfyUI menggantikan API AI berbayar, dan JWT self-hosted menggantikan Auth0/Firebase.

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

## ⚙️ Prasyarat (Server Kampus)

- **OS:** Linux (Ubuntu 22.04 LTS direkomendasikan)
- **Docker** ≥ 24 & **Docker Compose** v2
- **GPU Node** dengan **ComfyUI** aktif di `127.0.0.1:8188` (VRAM **≥ 16 GB**)
- Akses **root** / sudo pada host
- Node.js ≥ 20 (untuk pengembangan lokal)

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
# edit .env sesuai konfigurasi server kampus
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
- **Web App:** `https://<domain-atau-ip-kampus>`
- **API:** `https://<domain-atau-ip-kampus>/api`
- **MinIO Console:** `http://<ip>:9001`

### Pengembangan lokal
```bash
# Frontend
cd apps/web && npm install && npm run dev

# Backend
cd backend && npm install && npm run start:dev
```

---

## 🔑 Environment Variables (contoh)

```env
# ── App ──────────────────────────────
NODE_ENV=production
API_PORT=4000
WEB_URL=https://axon.unismuh.local

# ── Database (PostgreSQL) ────────────
DATABASE_URL=postgresql://axon:secret@postgres:5432/axon_db

# ── Redis (Queue + Cache) ────────────
REDIS_URL=redis://redis:6379

# ── Object Storage (MinIO) ───────────
MINIO_ENDPOINT=minio
MINIO_PORT=9000
MINIO_ACCESS_KEY=xxxxxxxx
MINIO_SECRET_KEY=xxxxxxxx
MINIO_BUCKET=axon-assets

# ── AI Engine (ComfyUI GPU Node) ─────
COMFYUI_BASE_URL=http://127.0.0.1:8188

# ── Auth (JWT) ───────────────────────
JWT_ACCESS_SECRET=change-me
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
| `WS`   | `/socket` | Event progress render realtime | ✅ |

---

## 🛡️ Keamanan & Isolasi Per-User

Sesuai dokumen **ISOLASI-PER-USER** dan persetujuan **UNISMUH ComputeHub**:

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

- [ ] Scaffolding monorepo (web + api + shared)
- [ ] Skema database & migrasi Prisma
- [ ] Modul autentikasi (JWT + RBAC)
- [ ] Integrasi ComfyUI (text-to-image)
- [ ] Job queue BullMQ + progress realtime
- [ ] Integrasi MinIO (upload & serving aset)
- [ ] Text-to-video pipeline
- [ ] Sistem kredit & kuota per-user
- [ ] Dashboard admin & monitoring
- [ ] Hardening keamanan & load test (50–500 user)
- [ ] Deployment produksi di UNISMUH ComputeHub

---

## 👥 Tim & Institusi

- **Proyek:** Capstone Project
- **Institusi:** Universitas Muhammadiyah Makassar (UNISMUH)
- **Infrastruktur:** UNISMUH ComputeHub (On-Premise GPU Server)

---

## 📄 Lisensi

Proyek ini dilisensikan di bawah **MIT License**. Lihat berkas `LICENSE` untuk detail.

---

<div align="center">

**AXON-RYZR** · Dibangun untuk berjalan optimal di server kampus 🏫⚡

## Contributors

- Nur Adnan Yusri

</div>
