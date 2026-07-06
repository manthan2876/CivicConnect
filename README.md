# CivicConnect 🏙️ **Neon Onyx Edition**

**CivicConnect** is an enterprise-grade platform designed to automate civic engagement and urban management. It provides a multi-tenant solution for citizens to report issues and for authorities to track, manage, and resolve them efficiently with AI-backed verification.

---

## 🚀 Key Features

- **Multi-Tenancy**: Strict data isolation using **Supabase Row Level Security (RLS)**.
- **Intelligent Reporting**: Citizens report civic issues with **GPS verification** and image capture.
- **AI Fusion Engine**: Multimodal AI fusion (Computer Vision + LLM) for automated data-driven priority scoring.
- **Neon Onyx Dashboard**: High-fidelity glassmorphic interface featuring **Bento Grids**, theme-aware **Bar Charts**, and pulse-glow indicators.
- **Animated Mobile Experience**: Premium shimmering logo transitions and pulsing splash sequences powered by `flutter_animate`.
- **Automated Storage Integrity**: Intelligent **MinIO Media Purging** that synchronizes physical storage deletion with database record removal.
- **Spatial Intelligence**: Automated nightly deduplication jobs using **PostGIS** to cluster and resolve redundant reports.
- **Gamification**: Green Credits and XP-based leaderboard for citizen engagement.
- **Real-time Notifications**: Custom broadcast channels for live updates on issues.

---

## 🏗️ Architecture & Tech Stack

The architecture is highly modular, separating concerns into four core areas:

1.  **Backend**: Node.js + Express + TypeScript + **Sequelize (PostgreSQL)** + **MinIO S3 Storage**
2.  **Admin Dashboard**: React + Vite + Vanilla CSS (Glassmorphism) + Lucide Icons
3.  **Mobile App**: Flutter (Dart) with **High-Parity Light/Dark Theme** support
4.  **AI Service**: Python + FastAPI + Groq (Llama 3.1) + MobileNetV2

---

## 📋 Prerequisites
Ensure the following are installed:
1. **Git** (for version control)
2. **Node.js** (v18+) & **npm**
3. **Flutter SDK** (Android Studio / VS Code)
4. **Python 3.10+** (for AI services)
5. **PostgreSQL** (Port 5432) or access to the **Supabase Cloud** project
6. **Docker Desktop** (for MinIO Object Storage)

---

## 📂 1. Repository Setup
```bash
git clone https://github.com/kunj2210/CivicConnect.git
cd CivicConnect
git checkout main
```

### 🌐 Networking & IP Discovery
For the mobile app to communicate with the backend, you must use your machine's **Local IP Address**, not `localhost`.

1. **Find your IP**: Open Terminal/PowerShell and type `ipconfig`. Look for "IPv4 Address" (e.g., `192.168.1.5`).
2. **Set Backend BASE_URL**: In `backend/.env`, set `BASE_URL=http://192.168.1.5:5000`.
3. **Set Mobile API_BASE_URL**: In `mobile/.env`, set `API_BASE_URL=http://192.168.1.5:5000/api`.
4. **Set AWS_ENDPOINT**: In `backend/.env`, set `AWS_ENDPOINT=192.168.1.5`.

---

## 🛠️ 2. Environment Configuration
You must create `.env` files for each component by copying the `.env.example` templates.

### Backend (`/backend/.env`)
```bash
cp .env.example .env
# Edit .env with your Supabase credentials, Groq API Key, and Machine IP
```

### Admin Dashboard (`/admin-dashboard/.env`)
```bash
cp .env.example .env
# Edit .env with your Supabase credentials and Local API URL
```

### Mobile App (`/mobile/.env`)
```bash
cp .env.example .env
# Set API_BASE_URL to your Machine's Local IP
```

---

## ⚙️ 3. Detailed Component Setup

### ✅ Backend (Node.js)
```bash
cd backend
npm install
npm run dev
```
For seed the database:
```bash
npm run seed:users
```

### ✅ AI Microservice (Python)
```bash
cd ai_service
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
python main.py
```

### ✅ MinIO Object Storage (Docker Desktop)
1. Open **Docker Desktop**.
2. Run the MinIO container:
```powershell
docker run -p 9000:9000 -p 9001:9001 `
  --name minio `
  -e "MINIO_ROOT_USER=admin" `
  -e "MINIO_ROOT_PASSWORD=M@nthan1528" `
  -v D:\minio_data:/data `
  minio/minio server /data --console-address ":9001"
```

### ✅ Admin Dashboard (React)
```bash
cd admin-dashboard
npm install
npm run dev
```

### ✅ Mobile App (Flutter)
```bash
cd mobile
flutter pub get
flutter run
```

---

## 🛠️ Stability & Performance Fixes (May 2026)

- **Standardized Geolocation**: Migrated the mobile app to `geolocator` for robust cross-platform location fetching (Web + Android).
- **Gradle Stabilization**: Optimized for **AGP 8.2.1**, **Kotlin 1.9.22**, and **Gradle 8.7** to resolve cryptic build failures.
- **Enhanced Error Handling**: Improved startup reliability with global `try-catch` blocks and web-specific guards.

## ❓ Troubleshooting

- **Android "26" Error**: Run `flutter clean` and ensure `minSdkVersion=21` in `local.properties`.
- **Chrome Exit**: Verify `.env` credentials; mobile notifications are now gated for web.
- **Symlink Error**: Move project to the same drive as Flutter SDK or run as Admin.

---

**Project is now ready for launch!** 🚀
