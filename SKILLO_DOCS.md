# Panduan Konfigurasi Skillo App

Dokumen ini menjelaskan integrasi fitur-fitur native mobile yang telah ditambahkan ke dalam web Skillo agar berjalan optimal ketika di-*build* menjadi APK melalui Capacitor.

## 1. Integrasi Login Biometrik (Sidik Jari / Face ID)

Fitur biometrik tidak lagi menggunakan standar `WebAuthn` (yang terbatas pada WebView Android), melainkan langsung menembak sensor biometrik bawaan HP menggunakan plugin **Capacitor Native Biometric** (`capacitor-native-biometric`).

**Alur Kerja:**
1. Pengguna masuk pertama kali menggunakan Email dan Kata Sandi secara manual.
2. Saat berhasil, sistem secara diam-diam (jika berjalan di HP) akan menyimpan kredensial tersebut ke dalam penyimpanan aman perangkat menggunakan `@capacitor/preferences`.
3. Pada saat aplikasi ditutup dan pengguna mencoba membuka ulang menggunakan tombol **Masuk dengan Sidik Jari**, sistem akan memanggil sensor HP.
4. Jika sidik jari atau wajah terdeteksi valid oleh Android/iOS, kredensial yang tersimpan akan dikirimkan ke Supabase untuk melakukan otentikasi.
5. Pengguna akan langsung masuk ke halaman *Dashboard* / *Workspace* tanpa menginput ulang apapun.

*Catatan untuk Pengembang:* 
Kredensial disimpan lokal di HP. Jika pengguna belum pernah *login manual* di perangkat tersebut, atau sesi dibersihkan, maka mereka wajib login manual 1x agar biometrik bisa di-set otomatis.

---

## 2. Deep Linking (Buka Aplikasi Langsung via Tautan WhatsApp/Web)

Saat ini fitur **Salin Link** pada *Meeting Room* akan menghasilkan tautan seperti `https://hours-master-a-skill.vercel.app/#/meeting/focus-community?type=focus`.

Di dalam file konfigurasi Android (`AndroidManifest.xml`), kita sudah menambahkan interceptor bawaan:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="hours-master-a-skill.vercel.app" />
    <data android:scheme="https" android:host="skillo.app" />
    <data android:scheme="https" android:host="*.vercel.app" />
</intent-filter>
```

Serta Custom Scheme:
```xml
<intent-filter>
    ...
    <data android:scheme="skillo" />
</intent-filter>
```

### Mengapa saat link diklik masih membuka Browser (Chrome) dan bukan Aplikasi?
Agar tautan berbasis `https://` (seperti `https://hours-master-a-skill.vercel.app`) dapat **langsung dipaksa** membuka aplikasi Android tanpa melalui browser, Google mewajibkan Anda untuk memverifikasi kepemilikan domain web tersebut. Proses ini disebut **Android App Links**.

**Cara Memperbaikinya agar Link Langsung Masuk ke App:**
1. Domain web yang digunakan adalah `https://hours-master-a-skill.vercel.app`.
2. Buat file bernama `assetlinks.json` yang berisi detail aplikasi Anda beserta *SHA256 Fingerprint* dari *Keystore* Android Anda. Formatnya:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.hoursmaster.app",
       "sha256_cert_fingerprints": ["FA:C6:17:45:DC:09:03:78:6F..."]
     }
   }]
   ```
3. Letakkan file tersebut di domain web Anda dengan path:
   `https://domain-anda.com/.well-known/assetlinks.json`
4. Setelah file ini tayang di web, Android akan secara otomatis mengeceknya saat instalasi aplikasi. Tautan `https://` apa pun dari domain tersebut otomatis melempar Anda ke Panggilan P2P di dalam aplikasi Skillo tanpa harus melewati browser.

**Solusi Alternatif (Tanpa Verifikasi Web):**
Gunakan skema kustom `skillo://` daripada `https://`. Jika seseorang mengklik link `skillo://meeting/focus-community`, Android akan langsung membuka aplikasi Skillo, karena itu adalah Custom Scheme eksklusif aplikasi Anda. 

Untuk saat ini, kode `App.tsx` sudah siap 100% mendengarkan (`appUrlOpen`) baik link `https://` maupun `skillo://` dan akan otomatis melakukan proses *routing* ke dalam *Meeting Room* P2P asalkan Android meneruskannya ke aplikasi.

---

## 3. Kompatibilitas Build Web
Semua plugin *Native* yang dipasang untuk mobile (Capacitor) sudah dilindungi oleh fungsi pendeteksi bawaan `Capacitor.isNativePlatform()`. Jika Anda menjalankan `npm run build` untuk mendeploy versi web murni, fungsi biometrik sidik jari HP tidak akan menyebabkan *crash*, dan akan dialihkan ke metode standar *WebAuthn* untuk PC/Laptop. Web dan aplikasi berjalan sejalan pada satu basis kode (Codebase).

---

## 4. Picture-in-Picture (PiP) Mobile Call — Masalah Tampilan Zoom & Solusinya

### Gejala Masalah / Error:
Saat masuk ke mode PiP (layar mengambang / floating window) di HP:
1. Layar PiP bukannya menampilkan wajah peserta secara penuh, melainkan tombol **Exit** merah di header, judul room, dan tombol-tombol kontrol bawah tampak berantakan, menumpuk, dan ter-zoom memenuhi jendela kecil.
2. Ketika tombol *Minimize* ditekan, tampilan video malah hilang atau berganti ke halaman Dashboard.

### Akar Masalah (Root Cause):
1. **Activity-wide WebView Scaling:**
   Pada Android, saat aplikasi masuk mode PiP (`enterPictureInPictureMode`), sistem mengecilkan seluruh Activity beserta WebView menjadi jendela kecil berasio 9:16 (sekitar 150px × 266px). 
   Karena WebView sebelumnya tidak memiliki deteksi khusus mode PiP, halaman `MeetingRoom` tetap merender seluruh elemen web desktop/mobile:
   - Header atas (tombol `Exit`, `Minimize`, `P2P Live`, `24ms`).
   - Banner teks (*"Menunggu peserta lain bergabung..."*).
   - Footer kontrol panggilan (*mic, camera, hang up*).
   Elemen-elemen ini memiliki ukuran font dan padding tetap, sehingga mengambil lebih dari 70% area jendela kecil, mengaburkan dan menjepit video kamera.
2. **Navigasi Ganda (`navigate('/')`):**
   Tombol *Minimize* sebelumnya mengeksekusi `enterCallPiP()` sekaligus `navigate('/')`. Hal ini menyebabkan React berpindah halaman ke rute utama/dashboard sehingga tampilan panggilan video tertutup oleh halaman dashboard.

### Solusi & Implementasi:
1. **Android Lifecycle Callback (`MainActivity.java` & `CallPlugin.java`):**
   - Meng-override method `onPictureInPictureModeChanged(boolean isInPictureInPictureMode, Configuration newConfig)` di `MainActivity.java`.
   - Mengirim event `pipModeChanged` secara real-time ke JavaScript WebView serta otomatis menambah/menghapus class CSS `document.body.classList.add('pip-mode')`.
   - Menambahkan dukungan `setAutoEnterEnabled(true)` untuk Android 12+ (API 31+).
2. **Dedicated Video-Only Arena (`MeetingRoom.tsx`):**
   - Mendeteksi state `isInPiP` melalui `addPiPListener`.
   - Ketika `isInPiP === true`, aplikasi tidak lagi merender `<header>`, `<footer>`, maupun banner teks.
   - Mengaktifkan tampilan video bersih (*pure video*):
     - Jika sedang melakukan panggilan (2 orang), video peserta remote tampil 100% penuh dengan `object-fit: cover` dan inset kamera lokal kecil di sudut kanan bawah.
     - Jika sedang sendirian di room, kamera lokal tampil 100% penuh.
3. **Pembersihan Badges pada Video (`VideoTile.tsx`):**
   - Menambahkan prop `isPiP={true}` yang secara otomatis menghilangkan *quality meter*, *screen share badge*, *speaking pulse*, dan *name tag* agar fokus visual 100% pada wajah tanpa terganggu teks/badge.
4. **Perbaikan Tombol Minimize:**
   - Pada aplikasi native, tombol PiP hanya memanggil `enterCallPiP()` agar jendela langsung mengecil tanpa meninggalkan room panggilan. Navigasi ke `'/'` hanya dijalankan pada platform web browser biasa.

