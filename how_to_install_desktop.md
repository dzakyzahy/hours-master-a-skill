# Panduan Instalasi & Development Desktop App (Untuk Diky)

Halo Diky! Dokumen ini dibuat agar kamu bisa dengan mudah menjalankan, mengembangkan, dan mem-build aplikasi Desktop **Hours Master** secara lokal di laptop kamu.

## 1. Persiapan Awal (Prerequisites)
Pastikan laptop kamu sudah terpasang:
- **Node.js** (Minimal versi 18 LTS)
- **Git**
- Code Editor (Direkomendasikan **VS Code**)

## 2. Cara Clone & Menjalankan Mode Development
Buka Terminal / Command Prompt, lalu jalankan perintah berikut secara berurutan:

```bash
# 1. Clone repositori ini
git clone https://github.com/dzakyzahy/hours-master-a-skill.git

# 2. Masuk ke dalam folder proyek
cd hours-master-a-skill

# 3. Install semua dependensi
npm install

# 4. Buat file .env
# Minta isi file .env (berisi kunci API Supabase & Gemini) dari Zahy dan letakkan di root folder.

# 5. Jalankan aplikasi di mode Development (Hot-Reload)
npm run dev:electron
```
Jika berhasil, jendela aplikasi Desktop Electron akan otomatis terbuka dan akan langsung ter-update (hot-reload) setiap kali kamu menyimpan perubahan kode di VS Code!

## 3. Cara Membangun (Build) File .exe / .apk
Jika kamu bertugas untuk meracik UI yang *sophisticated* dan ingin mencoba hasil akhirnya menjadi file `.exe` yang siap didistribusikan:

```bash
# Build untuk Windows (.exe)
npm run build:electron
```
Hasil file `.exe` instalasinya akan muncul di dalam folder `dist_electron/`.

*(Catatan: Untuk build APK, dokumentasi terpisah menggunakan Capacitor akan kita buatkan nanti setelah UI Web stabil).*

## 4. Pembagian Tugas
Ingat, fokus kamu ada di **UI Sophistication, Mobile Deployment (APK), dan Performance**. Untuk hal-hal terkait Database Supabase, WebRTC Meeting, dan Logika Inti, Zahy & Tim AI yang akan menanganinya agar pekerjaan kita tidak saling bentrok.

Selamat ngoding! 🚀
