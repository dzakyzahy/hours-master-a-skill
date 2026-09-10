# Panduan Tes Manual — Skillo Fase 1–4 + Foto Profil

Dokumen ini untuk kamu jalankan sendiri, berurutan. Setiap langkah punya **hasil yang diharapkan** dan **artinya kalau gagal**.

- APK yang diuji: **`Skillo-fase4-debug.apk`** (bukan `Skillo-fase3-debug.apk`, itu sudah usang — hapus saja)
- Ditandatangani dengan `debug.keystore` kamu, jadi bisa install di atas yang lama tanpa uninstall
- Perkiraan waktu: **35–45 menit** kalau semua lancar

**Sudah saya verifikasi langsung di SM-A155F (Android 16)** — boleh kamu lewati kalau percaya: foreground service start/background 75 detik, service type `0xC0`, audio `MODE_IN_COMMUNICATION` + speaker, tombol screen share hilang, counter 1/4, peringatan TURN, pembersihan service saat boot, minimize tidak mematikan panggilan.

---

## BAGIAN 0 — Persiapan (WAJIB, 10 menit)

Tanpa ini sebagian besar tes di bawah akan gagal, dan gagalnya bukan karena bug.

### 0.1 Jalankan migrasi database 🔴

Supabase Dashboard → SQL Editor → tempel → Run:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio        TEXT;
```

**Verifikasi:** jalankan `SELECT avatar_url, title, bio FROM profiles LIMIT 1;` — harus balik tanpa error.

Tanpa ini: foto profil hanya tersimpan di HP dan hilang saat login di perangkat lain.

### 0.2 Deploy TURN server 🔴

Pilih salah satu:
- **Cepat:** daftar di [metered.ca](https://metered.ca) (ada free tier), ambil kredensial TURN
- **Sendiri:** CoTURN di VPS, buka port 3478 TCP/UDP, 5349 TLS, 49152–65535 UDP

Isi di `.env`:
```
VITE_TURN_URL=turn:host:3478,turns:host:5349
VITE_TURN_USERNAME=...
VITE_TURN_CREDENTIAL=...
```

Tambahkan juga sebagai GitHub Secrets kalau APK dibangun lewat CI.

**Verifikasi:** buka [Trickle ICE](https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/), masukkan kredensialmu, klik Gather. **Harus muncul baris bertipe `relay`.** Kalau hanya ada `host` dan `srflx`, TURN belum jalan — jangan lanjut ke tes 3.3.

Tanpa ini: 20–30% panggilan gagal, dan tes 3.3 pasti gagal.

### 0.3 Build ulang & pasang

```
npm install          # kembalikan binding Windows setelah simple-peer dihapus
npm run lint         # harus 0 error
npm test             # harus 46/46
npm run build:apk
```

Pasang APK ke **dua** HP. Tes berpasangan butuh dua perangkat — satu HP tidak cukup.

---

## BAGIAN 1 — Foto Profil (8 menit, 1 HP)

| # | Langkah | Hasil yang diharapkan | Kalau gagal |
|---|---|---|---|
| 1.1 | Profile → **Unggah Foto dari Galeri** | Galeri terbuka | `<input type="file">` diblokir WebView |
| 1.2 | Pilih foto besar (>3 MB) | Tombol jadi "Memproses foto...", lalu pesan **"Foto siap. Tekan Simpan untuk menerapkannya."** | Lihat console: kemungkinan `createImageBitmap` gagal |
| 1.3 | Lihat pratinjau avatar di atas form | Foto tampil, **tidak miring** | EXIF tidak terbaca — cek `imageOrientation` di `avatarUpload.ts` |
| 1.4 | Tekan **Simpan** | Pesan "Profil & personalisasi berhasil disimpan!" | Kalau muncul "Server menolak: ..." → migrasi 0.1 belum jalan |
| 1.5 | Buka **Home** | Foto tampil di avatar pojok atas | `getAvatarDisplay` tidak menerima nilainya |
| 1.6 | Pilih tema preset mana saja lalu Simpan | Foto diganti gradasi + inisial | — |
| 1.7 | Unggah foto lagi, Simpan, lalu **force-close app dan buka lagi** | Foto masih ada | zustand persist bermasalah |
| 1.8 | **Login akun sama di HP kedua** | Foto ikut terbawa | Migrasi 0.1 belum jalan, atau login tidak menarik `avatar_url` |

### 1.9 Foto teman (butuh 2 akun berteman)

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| a | HP-A unggah foto & simpan | — |
| b | HP-B buka **Chat → tab Teman** | Foto A muncul di kartu teman, bukan inisial |
| c | HP-B buka daftar chat | Foto A muncul di baris lobi, **titik online tetap terlihat** di atas foto |
| d | HP-B masuk ke ruang chat dengan A | Foto A muncul di header |

Kalau titik online hilang tertutup foto: `overflow` di komponen `Avatar` salah.

---

## BAGIAN 2 — Panggilan Dasar (10 menit, 2 HP, WiFi sama)

| # | Langkah | Hasil yang diharapkan | Kalau gagal |
|---|---|---|---|
| 2.1 | HP-A telepon HP-B | HP-B berdering <5 detik, modal panggilan masuk | Channel `skillo_call_signals` tidak tersambung |
| 2.2 | HP-B **Tolak** | Dering berhenti, tidak masuk room | — |
| 2.3 | HP-A telepon lagi, HP-B **diamkan 35 detik** | Muncul notifikasi missed call | — |
| 2.4 | HP-A telepon, HP-B **Terima** | Kedua sisi saling melihat video **<8 detik** | 🔴 Cek ICE state; kalau nyangkut di `checking` → masalah NAT |
| 2.5 | Mute di HP-A | Ikon mute berubah di HP-B **<2 detik** | Sinyal `status-update` tidak sampai |
| 2.6 | Matikan kamera di HP-A | HP-B melihat **foto profil A**, bukan inisial | `avatar` tidak diteruskan ke `Participant` |
| 2.7 | Tutup panggilan dari HP-A | Kedua sisi keluar bersih | — |
| 2.8 | **Cek lampu/indikator kamera di kedua HP** | 🔴 **Harus padam** | Track tidak di-`stop()` — ini isu privasi, prioritas tertinggi |

---

## BAGIAN 3 — Jaringan (10 menit, 2 HP) — bagian terpenting

### 3.1 Beda jaringan
HP-A di WiFi, HP-B pakai kuota seluler. **Harapan:** tersambung <8 detik.

### 3.2 Pindah jaringan di tengah panggilan
Saat panggilan berjalan, matikan WiFi di HP-A supaya pindah ke seluler.

**Harapan:** video beku beberapa detik lalu **pulih sendiri dalam <10 detik**, panggilan **tidak** putus.

Ini menguji masa tenggang 8 detik untuk state `disconnected`. Sebelum perbaikan Fase 2, panggilan langsung putus di sini.

### 3.3 Dua-duanya seluler, beda operator 🔴
HP-A pakai Telkomsel, HP-B pakai XL/Indosat (jangan operator yang sama).

**Harapan:** tersambung dan video muncul di kedua sisi.

**Ini tes paling penting di seluruh dokumen.** Inilah yang membuktikan TURN bekerja. Kalau gagal di sini tapi 3.1 dan 3.2 lolos, TURN-mu belum benar — kembali ke langkah 0.2 dan pastikan candidate `relay` muncul.

### 3.4 Join bersamaan
Dua orang masuk room yang sama dalam selang <1 detik (hitung mundur bersama). Ulangi **5 kali**.

**Harapan:** keduanya tersambung setiap kali, tidak ada yang layar hitam.

Ini menguji perfect negotiation. Sebelum Fase 2, tabrakan offer di sini mematikan koneksi permanen.

---

## BAGIAN 4 — Perilaku Mobile (8 menit)

| # | Langkah | Hasil yang diharapkan | Kalau gagal |
|---|---|---|---|
| 4.1 | Dalam panggilan, tekan **Home**, tunggu **2 menit** | Notifikasi **"Panggilan sedang berlangsung"** ada di panel; audio tetap jalan | Foreground service tidak start |
| 4.2 | Ketuk notifikasi itu | Kembali ke aplikasi, panggilan masih hidup | PendingIntent salah |
| 4.3 | Tekan **Back** untuk minimize | Bar hijau muncul, panggilan **tetap hidup** | Lifecycle diikat ke komponen lagi |
| 4.4 | Tekan tombol merah di bar hijau | Panggilan berakhir, **notifikasi hilang**, mikrofon lepas | Sudah saya verifikasi lewat tombol "Leave room" di dalam room; lewat bar hijau belum |
| 4.5 | Mulai panggilan lalu **geser app dari recents** | 🟠 Notifikasi hilang dalam beberapa detik | **Belum terverifikasi** — gestur recents tidak bisa saya lakukan dari jarak jauh. Kalau gagal, `onTaskRemoved` di `CallService.java` tidak terpanggil; jaring pengamannya adalah pembersihan saat boot (4.6), yang sudah terbukti jalan |
| 4.6 | Buka aplikasi lagi setelah 4.5 | Tidak ada notifikasi panggilan tersisa | Pembersihan service saat boot gagal |
| 4.7 | Cek suara panggilan | Keluar dari **speaker**, bukan earpiece | Audio routing gagal |
| 4.8 | Putar musik, lalu mulai panggilan | Musik berhenti/mengecil (audio focus) | — |
| 4.9 | Lihat control bar dalam panggilan | **Tidak ada tombol screen share** | `canScreenShare` salah |
| 4.10 | Panggilan 15 menit, pegang HP | HP hangat wajar, tidak panas menyengat | Bitrate terlalu tinggi |

**Catatan untuk 4.5:** hanya langkah ini yang belum terverifikasi. Menggeser kartu dari recents adalah gestur yang tidak bisa saya lakukan andal dari jarak jauh — percobaan saya tidak pernah benar-benar menghapus task, jadi `onTaskRemoved` tidak pernah terpicu. Kalau notifikasi tetap tertinggal setelah swipe, buka aplikasi lagi: notifikasi harus hilang saat itu (pembersihan boot, langkah 4.6). Itu jaring pengaman keduanya.

---

## BAGIAN 5 — Kualitas & Batas Peserta (7 menit)

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| 5.1 | Panggilan 2 orang, jaringan bagus | Meter sinyal 3 batang **hijau** di pojok kanan atas tile lawan |
| 5.2 | Jauhkan satu HP dari router sampai sinyal lemah | Meter berubah **kuning**, lalu **merah** dalam <10 detik |
| 5.3 | Pertahankan koneksi buruk ~10 detik | Toast **"Koneksi tidak stabil. Video dimatikan sementara agar suara tetap jernih."** Video mati, **suara tetap jalan** |
| 5.4 | Dekatkan lagi ke router | Toast **"Koneksi membaik. Video dinyalakan kembali."** Video hidup lagi |
| 5.5 | Setelah 5.4, cek tombol kamera | Masih dalam posisi **nyala** — degradasi tidak boleh mengubah status tombol |
| 5.6 | Masuk room 3 orang | Semua saling melihat, counter **3/4** |
| 5.7 | Masuk room 4 orang | Semua saling melihat, counter **4/4**, tidak crash |
| 5.8 | Orang ke-5 mencoba masuk | Ditolak dengan toast **"Room penuh (maksimal 4 peserta)"**, dilempar keluar |

Kalau 5.2 tidak pernah berubah warna, `getStats()` tidak jalan. Kalau langsung merah padahal jaringan bagus, ambang batas di `callStats.ts` perlu disetel.

---

## BAGIAN 6 — Interoperabilitas (3 menit)

| # | Langkah | Hasil yang diharapkan |
|---|---|---|
| 6.1 | HP (APK) telepon browser desktop | Tersambung dua arah |
| 6.2 | Di browser desktop, cek control bar | Tombol screen share **ada** (kebalikan dari APK) |
| 6.3 | Share screen dari desktop ke HP | HP melihat layar desktop |

---

## Cara membaca kegagalan

Kalau ada yang gagal, jangan langsung tebak. Sambungkan HP via USB, buka `chrome://inspect` di Chrome desktop, pilih WebView Skillo — kamu dapat DevTools penuh persis seperti tab browser biasa.

Lalu ikuti pohon ini:

```
Dering tidak muncul          → lapis signaling (useCallSignaling.ts)
Dering muncul, layar hitam   → getUserMedia / izin Android
Lihat diri sendiri saja      → ICE/NAT — 90% karena TURN. Cek langkah 0.2
Nyambung lalu putus          → cari InvalidStateError di console
Video patah-patah            → bandwidth; lihat meter sinyal
Jalan di browser, gagal APK  → platform/WebView
```

Laporan bug yang berguna **wajib** menyebut jaringan tiap perangkat (WiFi / Telkomsel / XL). Sebagian besar bug WebRTC sebenarnya bug NAT traversal yang menyamar, dan tanpa info itu tidak bisa didiagnosis. Template lengkapnya ada di `docs/video_call_architecture_and_plan.md` bagian 8.2.

---

## Prioritas kalau waktumu sedikit

Kalau cuma sempat 10 menit, jalankan **3.3**, **4.4**, dan **2.8**. Tiga itu yang paling mungkin menyembunyikan masalah serius: TURN yang tidak jalan, service yang menggantung menahan mikrofon, dan kamera yang tidak pernah dilepas.
