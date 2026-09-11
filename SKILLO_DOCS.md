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

Saat ini fitur **Salin Link** pada *Meeting Room* akan menghasilkan tautan seperti `https://skillo.vercel.app/#/meeting/focus-community?type=focus`.

Di dalam file konfigurasi Android (`AndroidManifest.xml`), kita sudah menambahkan interceptor bawaan:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
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
Agar tautan berbasis `https://` (seperti `https://skillo.vercel.app`) dapat **langsung dipaksa** membuka aplikasi Android tanpa melalui browser, Google mewajibkan Anda untuk memverifikasi kepemilikan domain web tersebut. Proses ini disebut **Android App Links**.

**Cara Memperbaikinya agar Link Langsung Masuk ke App:**
1. Anda harus mempublikasikan web Skillo secara online (misal menggunakan Vercel/Netlify dengan domain `skillo.vercel.app` atau `skillo.app`).
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
