# Skillo App: Arsitektur Platform & Panduan Setup

Aplikasi Skillo dibangun dengan basis **Single Codebase** menggunakan *React*, *Vite*, dan *Capacitor/Electron*. Namun, karena kita menargetkan 3 platform yang berbeda (Web, Mobile, Desktop), terdapat perbedaan mendasar pada kapabilitas fitur, akses sistem, dan cara pengujian.

---

## 📱 Mobile (Android & iOS)
Dibangun menggunakan **Capacitor**. Ini adalah platform utama (*Mobile-First*) kita.

- **Kelebihan & Kapabilitas:**
  - Punya akses penuh ke *Native API* (Kamera, Biometrik, File System).
  - Menggunakan **Capacitor SQLite** untuk penyimpanan *database* lokal yang sangat cepat dan persisten.
  - Pembelian dalam aplikasi (*In-App Purchases*) terintegrasi langsung dengan App Store dan Google Play melalui **RevenueCat**.
  - Mendukung pembaruan *Over-The-Air* (OTA) menggunakan `@capgo/capacitor-updater` tanpa perlu review App Store/Play Store setiap ada perubahan UI/logika.
  - Notifikasi *push* (Heads-up) didukung secara *native*.
- **Keterbatasan:**
  - Aturan *background task* sangat ketat oleh OS. WebRTC (*Call*) di latar belakang mungkin dimatikan OS jika tidak dikonfigurasi dengan *Foreground Service*.
- **Cara Build & Run:**
  ```bash
  npm run cap:android
  ```

## 🌐 Web (PWA / Browser)
Dibangun menggunakan **Vite** murni. Ini berguna untuk akses instan dan *sharing link*.

- **Kelebihan & Kapabilitas:**
  - Tidak perlu instalasi. Langsung jalan di *browser*.
  - Sangat mudah di-debug melalui Chrome DevTools.
- **Keterbatasan:**
  - Tidak bisa menggunakan *In-App Purchases* RevenueCat. Pembayaran di web biasanya dialihkan ke gerbang pembayaran standar (Midtrans Web / Stripe Checkout).
  - Database lokal menggunakan **IndexedDB (LocalForage)** karena SQLite *native* tidak tersedia di browser.
  - Terbatasnya akses notifikasi latar belakang dan pengenalan wajah/sidik jari (*Biometrics*) kecuali browser mendukung *WebAuthn*.
- **Cara Build & Run:**
  ```bash
  npm run dev
  ```

## 💻 Desktop (Windows, macOS, Linux)
Dibangun menggunakan **Electron**. Membungkus *build* Web menjadi aplikasi *desktop native*.

- **Kelebihan & Kapabilitas:**
  - Memiliki akses tak terbatas ke *File System* OS komputer.
  - Sangat ideal untuk berjalan di latar belakang (seperti *Discord* atau *WhatsApp Desktop*) dengan dukungan *System Tray*.
  - Proses *update* otomatis di-handle menggunakan `electron-updater` yang menarik *release* dari GitHub.
- **Keterbatasan:**
  - Ukuran file *installer* cukup besar dibandingkan Mobile/Web.
  - Capacitor *plugins* (seperti Google Auth Capacitor atau RevenueCat Mobile) tidak berjalan di Electron. Kita harus menggunakan API alternatif (seperti Electron IPC untuk login Google).
- **Cara Build & Run:**
  ```bash
  npm run dev:electron
  npm run build:electron
  ```

---

## 🔐 Keamanan Pembayaran & Logika Server

**SANGAT PENTING DIBACA:** 
Saat menangani pembelian Token, langganan Cloud, atau saldo, **JANGAN PERNAH** memanipulasi nilainya hanya dengan *logic frontend* (client-side). Frontend selalu bisa di-hack/dimodifikasi oleh pengguna nakal.

**Alur Pembayaran yang Aman (Menggunakan RevenueCat Webhooks):**
1. **Frontend (Mobile):** User menekan tombol beli. *Capacitor RevenueCat* memproses pembayaran ke Google/Apple.
2. **Server Apple/Google:** Menyatakan pembayaran berhasil ke *Server RevenueCat*.
3. **RevenueCat:** Mengirimkan data rahasia (Webhook) ke **Supabase Edge Function** milik kita.
4. **Backend (Supabase Edge Function):** Membaca Webhook, mengecek keabsahan dari RevenueCat, lalu secara diam-diam (backend-to-backend) menambahkan Token/Saldo ke tabel `profiles` user.
5. **Frontend:** Menunggu perubahan dari database dan memperbarui UI.

Dengan begini, meskipun *hacker* mencoba menembak API frontend kita dengan pesan *"Pembayaran Berhasil"*, saldo mereka tidak akan bertambah karena *database* hanya menerima instruksi dari Webhook asli RevenueCat.

---

## ⚙️ Variabel Lingkungan (.env) & Setup Kunci Rahasia

Agar semua *service* yang kita bangun bisa berjalan, kamu wajib menambahkan/memasukkan *Environment Variables* (Variabel Lingkungan) ke dalam file `.env` di *root directory*.

Buat file baru bernama `.env` jika belum ada, dan isi dengan format berikut:

```env
# ==========================================
# 1. SUPABASE (Database & Realtime Presence)
# ==========================================
VITE_SUPABASE_URL=https://[PROJECT_ID].supabase.co
VITE_SUPABASE_ANON_KEY=[KODE_ANON_KEY_KAMU]

# ==========================================
# 2. GEMINI AI (Modul Kelas AI)
# ==========================================
# Bisa diisi di .env atau diinput via UI Profil
VITE_GEMINI_API_KEY=[API_KEY_GOOGLE_AI_STUDIO_KAMU]

# ==========================================
# 3. GOOGLE DRIVE SYNC (Google Cloud Console)
# ==========================================
# Client ID untuk platform Web/Android (Gratis, buat di Google Cloud Console)
VITE_GOOGLE_CLIENT_ID=[CLIENT_ID].apps.googleusercontent.com

# ==========================================
# 4. REVENUECAT (Sistem Pembayaran / Token)
# ==========================================
# Buat project di app.revenuecat.com
VITE_RC_APPLE_API_KEY=appl_[KODE_APPLE]
VITE_RC_GOOGLE_API_KEY=goog_[KODE_GOOGLE]
```

### Langkah Selanjutnya Jika Menambahkan Variabel Baru:
1. Pastikan setiap variabel rahasia yang diakses Frontend React (Vite) menggunakan awalan `VITE_`.
2. Jangan pernah meng-commit file `.env` ke GitHub (pastikan masuk dalam `.gitignore`).
3. Ganti referensi kode *hardcoded* di `PaymentService.ts` dan `BackupService.ts` untuk memanggil `import.meta.env.VITE_...` agar dinamis.
