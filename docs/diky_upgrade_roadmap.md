# Brainstorming & Roadmap Upgrade Khusus Diky

Dokumen ini menyajikan evaluasi mendalam terhadap langkah-langkah yang telah diselesaikan pada proyek **Skillo**, serta memetakan rencana aksi (*actionable roadmap*) peningkatan mutu khusus untuk **Diky** (fokus: UI/UX Sophistication, Mobile Polish, dan Frontend Performance).

---

## 1. Evaluasi & Rekapitulasi Langkah Sebelumnya

### A. Pencapaian Utama yang Sudah Berjalan
1. **Identitas Visual & Anti-AI Slop**:
   - Nama resmi aplikasi: **Skillo**.
   - Logo custom bernuansa jam pasir/kompas modern (`icon.png`) telah diterapkan secara konsisten di seluruh platform: Favicon Web, Android Res (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi), dan icon Desktop Electron.
   - Penataan tema *deep dark* dengan aksen cyan-indigo yang tactile dan anti-slop.
2. **Arsitektur Meeting Room & WebRTC**:
   - Implementasi grid video dinamis, kontrol mic, kamera, dan *screen sharing*.
   - Pembersihan sumber daya media (`stream.getTracks().forEach(track => track.stop())`) saat keluar ruangan agar lampu indikator kamera hardware tidak terus menyala.
   - Penyediaan **Dev Tools Drawer** untuk mempermudah simulasi banyak peserta (*mock participants*) tanpa memerlukan koneksi server signaling aktif.
3. **Infrastruktur Android & Local Build Pipeline**:
   - Migrasi ke Capacitor 8 dengan konfigurasi Android SDK 36.
   - Mengatasi kendala kompatibilitas runtime Java (Java 25 JBR digantikan dengan Microsoft OpenJDK 21 LTS).
   - Sukses memproduksi file binary lokal: [`Skillo-debug.apk`](file:///c:/Users/o_o/Documents/Skillo/Skillo-debug.apk) dengan ukuran ringkas **~5.5 MB**, 0 kompilasi error, dan izin hardware (`CAMERA`, `RECORD_AUDIO`, `INTERNET`).
4. **Audit Stabilitas & Pencegahan Memory Leak**:
   - Pembaruan timer dashboard menggunakan functional updater (`setTimerSeconds(s => ...)`) guna mencegah re-kreasi interval berkala dan *clock drift*.
   - Memoization subscription Supabase Realtime di modul Chat untuk menghindari kebocoran koneksi WebSocket.
   - Akun developer offline (`diky` / `123`) aktif di `src/store.ts`.

---

## 2. Status Pelaksanaan Upgrade Khusus Diky

```
[Fondasi Inti]
  - Backend & WebRTC: Siap & Stabil
  - APK Build Toolchain: Sukses & Otomatis (~5.5 MB)
          ↓
[Eksekusi Roadmap Diky]
  Sprint D-1: Native Mobile Feel & Hardware Integration [SELESAI]
  Sprint D-2: UI Sophistication & Micro-Interactions   [SELESAI]
  Sprint D-3: Frontend Performance & Code Splitting     [SELESAI]
  Sprint D-4: Device Testing & Real-World QA            [SIAP DIUJI]
```

### Sprint D-1: Integrasi Native Mobile (Capacitor & Hardware) — [SELESAI]
- [x] **Android Hardware Back Button Handling**:
  - Listener `@capacitor/app` `backButton` terpasang di `src/App.tsx`.
  - Jika pengguna berada di sub-halaman (`/dashboard`, `/meeting`, `/chat`, `/profile`), tombol fisik Back Android akan melakukan navigasi mundur (`history.back()`). Jika di halaman root (`/`), aplikasi akan keluar secara tertib.
- [x] **Safe-Area Inset Styling**:
  - `html, body` dan container navigasi mobile mengadopsi `env(safe-area-inset-top)` & `env(safe-area-inset-bottom)` agar tidak tertutup notch atau *gesture pill*.
- [x] **Status Bar & Navigation Bar Sync**:
  - Plugin `@capacitor/status-bar` disinkronkan di `src/App.tsx`. Warna status bar Android otomatis mengikuti tema aktif (`#090d16` pada dark mode dan `#f8fafc` pada light mode).

---

### Sprint D-2: UI/UX Sophistication (Anti-Slop Polish) — [SELESAI]
- [x] **Animasi Cincin & Breathing Effect pada Timer**:
  - Class `.timer-active-pulse` dan keyframe `timerGlow` aktif saat timer berjalan di Dashboard.
  - Badge `Focus Active` berdenyut lembut dengan indikator status hijau neon.
- [x] **Speaking Indicator di Video Tile Meeting**:
  - Animasi bar equalizer `.sound-bar` (gelombang suara 3-bar animasi vertikal) tampil di sebelah nama peserta yang sedang berbicara, baik pada avatar maupun video aktif.
- [x] **Mobile Bottom Navigation Bar**:
  - Pada layar smartphone (< 640px), navigasi atas yang padat beralih otomatis menjadi *Floating Bottom Navigation Bar* (Projects, Focus, Add, Chat, Profile) yang nyaman dijangkau jempol.

---

### Sprint D-3: Optimalisasi Performa & Code Splitting — [SELESAI]
- [x] **Dynamic Lazy Loading (`React.lazy`)**:
  - Halaman `Dashboard`, `MeetingRoom`, `Chat`, dan `Profile` dimuat secara on-demand dengan chunk terpisah:
    - `dist/assets/MeetingRoom-*.js` (~13.5 KB)
    - `dist/assets/Chat-*.js` (~14.2 KB)
    - `dist/assets/Dashboard-*.js` (~11.1 KB)
    - `dist/assets/Profile-*.js` (~4.0 KB)
  - Initial HTML bundle tetap sangat ringan (~1.06 KB) untuk start-up instan di ponsel.

---

### Sprint D-4: Pengujian & QA di Perangkat Fisik — [TAHAP BERIKUTNYA]
- [ ] **Tes Manual APK di Smartphone Android**:
  - Salin file [`Skillo-debug.apk`](file:///c:/Users/o_o/Documents/Skillo/Skillo-debug.apk) ke smartphone Android dan pasang (sideload).
  - Verifikasi responsivitas tombol hardware back saat berada di Focus Room atau Chat.
  - Cek kenyamanan *Mobile Bottom Navigation* di satu tangan.
- [ ] **Simulasi Peserta Meeting**:
  - Buka Focus Room, buka Drawer Dev Tools di bawah, klik *"Tambah Peserta Simulasi"*, lalu klik *"Bicara/Mute"* untuk melihat animasi soundwave equalizer secara langsung.

---

## 3. Referensi & Perintah Cepat untuk Diky

| Kebutuhan | Perintah / Lokasi |
| :--- | :--- |
| **Kompilasi APK Lokal Terbaru** | `npm run build:apk` |
| **Buka di Android Studio** | `npx cap open android` |
| **Mode Dev Web Cepat** | `npm run dev` |
| **File APK Terbaru** | [`Skillo-debug.apk`](file:///c:/Users/o_o/Documents/Skillo/Skillo-debug.apk) |
| **Akun Testing Offline** | Username: `diky`, Password: `123` |
| **Panduan Lingkungan** | [`docs/development_guide.md`](file:///c:/Users/o_o/Documents/Skillo/docs/development_guide.md) |
