# Brainstorming & Roadmap Upgrade Khusus Diky

Dokumen ini menyajikan evaluasi mendalam terhadap langkah-langkah yang telah diselesaikan pada proyek **Hours Master**, serta memetakan rencana aksi (*actionable roadmap*) peningkatan mutu khusus untuk **Diky** (fokus: UI/UX Sophistication, Mobile Polish, dan Frontend Performance).

---

## 1. Evaluasi & Rekapitulasi Langkah Sebelumnya

### A. Pencapaian Utama yang Sudah Berjalan
1. **Identitas Visual & Anti-AI Slop (Fase 1)**:
   - Logo custom bernuansa jam pasir/kompas modern (`icon.png`) telah diterapkan secara konsisten di seluruh platform: Favicon Web, Android Res (hdpi, mdpi, xhdpi, xxhdpi, xxxhdpi), dan icon Desktop Electron.
   - Penataan tema *deep dark* dengan aksen indigo-violet yang nyaman di mata.
2. **Arsitektur Meeting Room & WebRTC (Fase 2)**:
   - Implementasi grid video dinamis, kontrol mic, kamera, dan *screen sharing*.
   - Pembersihan sumber daya media (`stream.getTracks().forEach(track => track.stop())`) saat keluar ruangan agar lampu indikator kamera hardware tidak terus menyala.
   - Penyediaan **Dev Tools Drawer** untuk mempermudah simulasi banyak peserta (*mock participants*) tanpa memerlukan koneksi server signaling aktif.
3. **Infrastruktur Android & Local Build Pipeline (Fase 3)**:
   - Migrasi ke Capacitor 8 dengan konfigurasi Android SDK 36.
   - Mengatasi kendala kompatibilitas runtime Java (Java 25 JBR digantikan dengan Microsoft OpenJDK 21 LTS).
   - Sukses memproduksi file binary lokal: [`HoursMaster-debug.apk`](file:///c:/Users/o_o/Documents/Skillo/HoursMaster-debug.apk) dengan ukuran ringkas **~5.31 MB**, 0 kompilasi error, dan izin hardware (`CAMERA`, `RECORD_AUDIO`, `INTERNET`) yang tepat.
4. **Audit Stabilitas & Pencegahan Memory Leak**:
   - Pembaruan timer dashboard menggunakan functional updater (`setTimerSeconds(s => ...)`) guna mencegah re-kreasi interval berkala dan *clock drift*.
   - Memoization subscription Supabase Realtime di modul Chat untuk menghindari kebocoran koneksi WebSocket.
   - Akun developer offline (`diky` / `123`) aktif di `src/store.ts`.

---

## 2. Brainstorming: Titik Kritis & Peluang Peningkatan

Meskipun fondasi fungsional dan APK Android sudah berjalan stabil, masih terdapat aspek antarmuka dan interaksi yang perlu diangkat dari level *"web yang dibungkus webview"* menjadi *"aplikasi native yang refined dan responsif"*.

Berikut area yang menjadi ranah utama Diky:

```
[Evaluasi Fondasi]
  - Backend & WebRTC: Siap & Stabil
  - APK Build Toolchain: Sukses & Otomatis (~5.3 MB)
          ↓
[Tantangan Tampilan & Interaksi di Mobile]
  1. Safe-Area Insets (Notch & Gesture Bar)
  2. Android Hardware Back Button (Mencegah accidental app exit)
  3. Micro-interactions & Haptic Touch
  4. Mobile Responsive Layout di Layar Vertikal
          ↓
[Eksekusi Roadmap Diky]
  Sprint 1: Native Mobile Feel & Hardware Integration
  Sprint 2: UI Sophistication & Micro-Interactions
  Sprint 3: Frontend Performance & Code Splitting
  Sprint 4: Device Testing & Polishing
```

---

## 3. Rencana Aksi Spesifik (Actionable Roadmap) untuk Diky

### Sprint D-1: Integrasi Native Mobile (Capacitor & Hardware)
Tujuan: Membuat aplikasi terasa menyatu dengan OS Android.

- [ ] **Android Hardware Back Button Handling**:
  - Pasang listener `@capacitor/app` `backButton`.
  - Jika modal (misal: Edit Project Modal, AI Generator Modal, atau Dev Drawer) sedang terbuka, tombol *Back* fisik harus menutup modal tersebut terlebih dahulu, bukan langsung menutup aplikasi.
- [ ] **Safe-Area Inset Styling**:
  - Tambahkan utilitas padding di CSS root untuk perangkat yang memiliki *notch* kamera atas atau *pill gesture* bawah:
    ```css
    padding-top: max(env(safe-area-inset-top), 16px);
    padding-bottom: max(env(safe-area-inset-bottom), 16px);
    ```
- [ ] **Status Bar & Navigation Bar Sync**:
  - Gunakan plugin `@capacitor/status-bar` agar warna status bar Android menyatu dengan tema gelap `#0f172a` (gelap konsisten, icon putih).

---

### Sprint D-2: UI/UX Sophistication (Anti-Slop Polish)
Tujuan: Menghilangkan kesan kaku dan memberikan umpan balik visual yang memanjakan pengguna.

- [ ] **Animasi Cincin Timer & Breathing Effect**:
  - Pada halaman Dashboard, berikan transisi SVG *stroke-dashoffset* yang halus pada lingkaran timer ketika berjalan.
  - Tambahkan efek *glow pulse* lembut pada warna aksen saat timer dalam status aktif.
- [ ] **Speaking Indicator di Meeting Room**:
  - Berikan animasi visual gelombang suara atau cincin hijau neon di sekeliling kartu peserta video yang sedang bersuara (*audio speaking detection*).
- [ ] **Bottom Navigation Bar untuk Layar Mobile**:
  - Di layar smartphone (lebar < 768px), ubah sidebar navigasi menjadi *floating bottom navigation bar* modern agar tombol mudah dijangkau satu jempol.

---

### Sprint D-3: Optimalisasi Performa & Code Splitting
Tujuan: Memastikan aplikasi langsung terbuka dalam hitungan milidetik di perangkat berspesifikasi menengah.

- [ ] **Dynamic Lazy Loading (`React.lazy`)**:
  - Pisahkan halaman besar yang tidak langsung dibuka pengguna saat pertama kali masuk (misal: `MeetingRoom.tsx`, `AiGenerator.tsx`, `Chat.tsx`).
  - Bungkus dengan `<Suspense fallback={<LoadingSkeleton />}>`.
- [ ] **Virtualisasi List Pesan & Proyek**:
  - Pastikan daftar pesan chat atau proyek yang berjumlah puluhan tidak memperlambat scrolling di Android dengan memanfaatkan *CSS content-visibility: auto* atau *virtualized list*.

---

### Sprint D-4: Pengujian & QA di Perangkat Fisik
Tujuan: Memvalidasi kenyamanan pakai di dunia nyata.

- [ ] **Tes Manual APK di Smartphone Android**:
  - Install `HoursMaster-debug.apk` di smartphone fisik.
  - Uji orientasi (portrait vs landscape) di halaman *Meeting Room*.
  - Periksa apakah tombol kamera dan mikrofon berfungsi dengan izin runtime Android.
- [ ] **Uji Coba Mock Data Peserta**:
  - Buka Drawer Dev Tools di Meeting Room, klik *"Tambah Peserta Simulasi"*, dan amati apakah grid 1, 2, 3, hingga 4 peserta tertata rapi tanpa glitch visual.

---

## 4. Referensi & Shortcut Penting untuk Diky

| Kebutuhan | Perintah / Lokasi |
| :--- | :--- |
| **Kompilasi APK Lokal** | `npm run build:apk` |
| **Buka di Android Studio** | `npx cap open android` |
| **Mode Dev Web Cepat** | `npm run dev` |
| **File APK Siap Pakai** | [`HoursMaster-debug.apk`](file:///c:/Users/o_o/Documents/Skillo/HoursMaster-debug.apk) |
| **Akun Testing Offline** | Username: `diky`, Password: `123` |
| **Panduan Lingkungan** | [`docs/development_guide.md`](file:///c:/Users/o_o/Documents/Skillo/docs/development_guide.md) |
