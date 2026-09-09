# Skillo

Aplikasi produktivitas cross-platform (Web, Desktop Windows, dan Mobile Android) yang menggabungkan manajemen proyek, pelacak waktu (pomodoro/stopwatch), video meeting real-time (WebRTC), chat tim, dan generator tugas berbasis AI.

---

## Fitur Utama

- **Real-Time Video Meeting**: Panggilan video/audio peer-to-peer dan *screen sharing* berbasis WebRTC dengan integrasi signaling Supabase Realtime serta equalizer soundbar.
- **Manajemen Waktu & Proyek**: Timer presisi tanpa drift, animasi breathing ring saat aktif, status proyek, dan pelacak jam kerja.
- **Mobile First Experience**: Mobile bottom navigation bar, penanganan hardware back button Android, dan sinkronisasi native status bar.
- **Team Collaboration**: Direct message, chat grup tim, dan sinkronisasi status kehadiran.
- **AI Task Generator**: Pembuatan rincian tugas cerdas memanfaatkan Google Gemini AI.
- **Multiplatform**: Berjalan mulus di Browser Web, Desktop (Electron), dan Android (Capacitor 8).

### 🚀 Integrasi & Backend Lanjutan (Terbaru)
- **Sistem Pembayaran / Monetisasi (RevenueCat)**: Dukungan *In-App Purchases* untuk token AI menggunakan plugin `@revenuecat/purchases-capacitor`. Validasi pembelian diwajibkan menggunakan sistem Webhook ke backend (Supabase Edge Functions) demi keamanan.
- **OTA Updates (Over-The-Air)**: Pembaruan aplikasi *background* tanpa harus lewat Play Store menggunakan `@capgo/capacitor-updater`.
- **Autentikasi (Google OAuth)**: Menggunakan `@codetrix-studio/capacitor-google-auth` untuk Android Native.
- **Offline Storage & Backup**: Penyimpanan chat dan progress proyek di lokal (menggunakan *LocalForage*) yang bisa di-*backup* dan di-*restore* secara berkala ke Google Drive.
- **CI/CD Automation**: Konfigurasi GitHub Actions untuk *build* APK Android secara otomatis (`.github/workflows/android-build.yml`).

---

## Mulai Cepat

```bash
# 1. Install dependensi
npm install

# 2. Jalankan mode Web Development
npm run dev

# 3. Jalankan mode Desktop (Electron)
npm run dev:electron

# 4. Build Android Debug APK (via Lokal atau GitHub Actions)
npm run build
npx cap sync android
```
*(Untuk mem-build APK secara lokal, gunakan Android Studio dengan membuka folder `android`, atau *push* kode ke GitHub untuk memicu GitHub Actions).*

---

## Dokumentasi Lengkap

Dokumentasi pengembangan, arsitektur, dan panduan teknis tersimpan di dalam folder [`docs/`](./docs/) serta file Markdown di *root*:

- [**Arsitektur Multi-Platform (`PLATFORMS.md`)**](./PLATFORMS.md) *(Wajib dibaca untuk memahami pemisahan Web, Electron, dan Capacitor!)*
- [Indeks Dokumentasi (`docs/README.md`)](./docs/README.md)
- [Panduan Pengembangan & Build (`docs/development_guide.md`)](./docs/development_guide.md)
- [Pembagian Tugas Tim (`docs/division_of_work.md`)](./docs/division_of_work.md)
- [Brainstorming & Roadmap Khusus (`docs/diky_upgrade_roadmap.md`)](./docs/diky_upgrade_roadmap.md)
