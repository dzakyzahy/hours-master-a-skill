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

---

## Mulai Cepat

```bash
# 1. Install dependensi
npm install

# 2. Jalankan mode Web Development
npm run dev

# 3. Jalankan mode Desktop (Electron)
npm run dev:electron

# 4. Build Android Debug APK
npm run build:apk
```

File APK hasil build lokal akan tersimpan di [`Skillo-debug.apk`](./Skillo-debug.apk).

---

## Dokumentasi Lengkap

Dokumentasi pengembangan, pembagian tugas, dan panduan teknis tersimpan di dalam folder [`docs/`](./docs/):

- [Indeks Dokumentasi (`docs/README.md`)](./docs/README.md)
- [Panduan Pengembangan & Build (`docs/development_guide.md`)](./docs/development_guide.md)
- [Pembagian Tugas Tim (`docs/division_of_work.md`)](./docs/division_of_work.md)
- [Brainstorming & Roadmap Upgrade Khusus Diky (`docs/diky_upgrade_roadmap.md`)](./docs/diky_upgrade_roadmap.md)
