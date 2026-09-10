# Aturan Rilis & Standar Produksi APK Android (Skillo)

Setiap agen AI dan developer yang menangani update aplikasi mobile Skillo WAJIB mematuhi aturan standar rilis APK berikut:

## 1. Skema Penomoran Versi (Semantic Versioning & Android Standards)
- **Fase Early Access / Alpha / Beta**: Gunakan format 0.x.y (dimulai dari 0.1.0 untuk rilis stabil pertama fondasi core WebRTC & Chat).
- **Semver Alignment**:
  - package.json -> version: 0.1.0
  - android/app/build.gradle -> versionName 0.1.0, versionCode bilangan bulat yang selalu naik (+1 di setiap rilis build APK baru).
  - Tampilan UI Profil (src/pages/Profile.tsx) harus mencerminkan versi yang sama persis.

## 2. Kebersihan Workspace (Zero Clutter Policy)
- DILARANG meninggalkan file APK sisa debug atau eksperimental seperti *-faseX-debug.apk di root direktori workspace.
- Format nama file output APK rilis:
  - Skillo-v{versionName}.apk (contoh: Skillo-v0.1.0.apk)
  - Simpan build master di android/app/build/outputs/apk/debug/app-debug.apk dan buat copy resmi berlabel Skillo-v{versionName}.apk di root.
- Seluruh file *.apk di root telah diabaikan oleh .gitignore agar tidak mengotori riwayat commit git.

## 3. Alur Build Produksi APK
Setiap kali ada update fitur yang siap didistribusikan ke HP pengguna:
1. Jalankan unit test untuk memastikan stabilitas: npm test.
2. Lakukan compile web production bundle: npm run build.
3. Sinkronisasikan aset ke native platform: npx cap sync android.
4. Eksekusi build APK: cd android && gradlew.bat assembleDebug (atau npm run build:apk).
5. Validasi ukuran dan tanggal pembuatan APK.
