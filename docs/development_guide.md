# Panduan Pengembangan & Build (Untuk Diky & Tim)

Dokumen ini berisi panduan lengkap untuk menjalankan, mengembangkan, dan mem-build aplikasi **Skillo** di berbagai platform (Web, Desktop Windows, dan Mobile Android).

---

## 1. Persiapan Awal (Prerequisites)

Pastikan lingkungan lokal sudah memiliki:
- **Node.js**: Versi 18 LTS atau 20+ LTS
- **Git**
- **Code Editor**: VS Code (direkomendasikan)
- **Java**: OpenJDK 21 LTS (wajib untuk build Android Capacitor 8)
- **Android SDK**: API 36 Platform & Build-Tools 35/36 (terpasang di `C:\Users\<user>\AppData\Local\Android\Sdk`)

---

## 2. Membuat Akun Developer & Mode Development

### A. Setup Akun Baru (Wajib, sekali saja)
Gunakan script `setup-users.mjs` untuk membuat akun developer Anda sendiri:

```bash
# Opsi 1 — CLI langsung:
node setup-users.mjs --email=akun_kamu@email.com --password=password_kamu --name=namauser

# Opsi 2 — Interaktif (ikuti petunjuk di terminal):
node setup-users.mjs
```

> ⚠️ **Catatan Keamanan**: JANGAN gunakan password yang sama dengan akun lain. Gunakan password unik minimal 8 karakter.

### B. Mode Offline / Dev Tanpa Supabase
Jika ingin bekerja offline (tanpa koneksi database), tambahkan ke `.env`:

```env
# Hanya untuk development lokal — HAPUS sebelum build production!
VITE_DEV_EMAIL=akun_dev_kamu@email.com
VITE_DEV_PASSWORD=password_dev_kamu
```

Kemudian login dengan email dan password yang sama persis dengan env di atas.

### C. Konfigurasi Backend (Wajib untuk fitur online)
Pastikan file `.env` di root sudah berisi:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

Lihat panduan lengkap di [`docs/env_setup_guide.md`](./env_setup_guide.md)

---

## 3. Menjalankan Aplikasi Secara Lokal

### A. Mode Web (Paling Cepat untuk Desain UI)
```bash
# Install dependensi (jika baru pertama kali atau setelah pull)
npm install

# Jalankan dev server Vite
npm run dev
```
Buka browser di `http://localhost:5173`.

### B. Mode Desktop (Electron)
```bash
# Jalankan aplikasi Desktop dengan Hot-Reload
npm run dev:electron
```
Jendela aplikasi desktop akan terbuka otomatis dan langsung memperbarui tampilan saat file kode disimpan.

---

## 4. Cara Membangun (Build) Hasil Akhir

### A. Build Android APK
Telah disiapkan single script yang otomatis melakukan kompilasi web, sinkronisasi Capacitor, dan pembuatan APK:
```bash
npm run build:apk
```
Hasil APK debug akan berada di:
- `android/app/build/outputs/apk/debug/app-debug.apk`
- Salinan root: `Skillo-debug.apk` (~5.5 MB)

Jika ingin membuka proyek Android di **Android Studio**:
```bash
npx cap open android
```

### B. Build Desktop Windows (.exe)
```bash
npm run build:electron
```
Hasil file installer `.exe` akan berada di dalam folder `dist_electron/`.

---

## 5. Tips Debugging & Testing Khusus Diky

1. **Simulasi Meeting Room**:
   Di halaman *Focus Room* (`/meeting`), sudah disediakan panel **Dev Tools Drawer** (di bagian bawah). Diky bisa menambah simulasi peserta (*mock participants*) seperti Zahy dan Sarah untuk menguji layout grid video, animasi equalizing soundbar, tombol mute/video, dan tampilan mobile tanpa butuh 2 laptop atau akun lain.
2. **Device Emulation**:
   Gunakan inspect element browser (F12) → klik ikon *Toggle device toolbar* (Ctrl + Shift + M) untuk menguji tampilan di layar ponsel (iPhone 14, Pixel 7, Samsung Galaxy) secara langsung sebelum build APK.
