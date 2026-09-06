# Panduan Pengembangan & Build (Untuk Diky & Tim)

Dokumen ini berisi panduan lengkap untuk menjalankan, mengembangkan, dan mem-build aplikasi **Hours Master** di berbagai platform (Web, Desktop Windows, dan Mobile Android).

---

## 1. Persiapan Awal (Prerequisites)

Pastikan lingkungan lokal sudah memiliki:
- **Node.js**: Versi 18 LTS atau 20+ LTS
- **Git**
- **Code Editor**: VS Code (direkomendasikan)
- **Java**: OpenJDK 21 LTS (wajib untuk build Android Capacitor 8)
- **Android SDK**: API 36 Platform & Build-Tools 35/36 (terpasang di `C:\Users\<user>\AppData\Local\Android\Sdk`)

---

## 2. Kredensial & Mode Development (Offline / Online)

Aplikasi memiliki built-in offline fallback untuk kemudahan Diky saat mendesain UI tanpa perlu koneksi database live:
- **Username**: `diky`
- **Password**: `123` atau `diky123hours`
- **Email**: `dikydwi442@gmail.com`

Jika ingin koneksi live ke backend Supabase dan fitur AI Gemini, pastikan file `.env` di root sudah berisi:
```env
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
VITE_GEMINI_API_KEY=<gemini-key>
```

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
- Salinan root: `HoursMaster-debug.apk` (~5.3 MB)

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
   Di halaman *Meeting Room*, sudah disediakan panel **Dev Tools Drawer** (di bagian bawah). Diky bisa menambah simulasi peserta (*mock participants*) seperti Zahy dan Sarah untuk menguji layout grid video, tombol mute/video, dan tampilan mobile tanpa butuh 2 laptop atau akun lain.
2. **Device Emulation**:
   Gunakan inspect element browser (F12) → klik ikon *Toggle device toolbar* (Ctrl + Shift + M) untuk menguji tampilan di layar ponsel (iPhone 14, Pixel 7, Samsung Galaxy) secara langsung sebelum build APK.
