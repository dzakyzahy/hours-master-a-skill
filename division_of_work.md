# Pembagian Tugas (Division of Work)

Dokumen ini berisi pembagian kerja antara **Tim Inti (Zahy & AI)** dan **Diky**.

## Tim Inti (Zahy & AI)
Tugas-tugas ini berfokus pada infrastruktur *backend*, logika *core*, dan integrasi fitur-fitur kompleks.

1. **Sistem Database & Keamanan (Supabase)**
   - Merancang skema tabel SQL (Profil, Chat, Permintaan Pertemanan, Recycle Bin).
   - Menerapkan kebijakan *Row Level Security* (RLS) di semua tabel.
2. **Real-time Sync & WebRTC (Zoom-like)**
   - Membuat arsitektur WebRTC untuk panggilan video/audio dan *Share Screen* (maksimal 4 orang).
   - Menghubungkan *Supabase Realtime* sebagai *signaling server* untuk pertukaran koneksi.
3. **Core Features (Manajemen Proyek & Chat)**
   - Sistem tambah teman (dengan *approval*).
   - Sistem *Direct Message* (DM) dan Grup Chat.
   - Sinkronisasi Pewaktu (Timer) secara *live* di seluruh perangkat.
   - Manajemen *Recycle Bin* (retensi 30 hari & *restore*).

---

## Fokus Tugas Diky
Tugas-tugas ini sangat krusial untuk membuat aplikasi siap dirilis ke publik dengan standar industri.

1. **UI/UX Sophistication (Tampilan Kelas Atas)**
   - Memoles antarmuka pengguna (UI) agar memiliki animasi transisi yang mulus (*Framer Motion* / CSS Animations).
   - Menyempurnakan tema *Dark Mode* dan *Light Mode* (konsistensi kontras, aksen neon, *glassmorphism*).
   - Merapikan tata letak *Meeting Room* (Grid video, kontrol tombol mic/kamera).
2. **Mobile Deployment (Build APK)**
   - Menyiapkan infrastruktur *Capacitor* untuk mengubah proyek web ini menjadi aplikasi Android (APK).
   - Menulis alur kerja CI/CD (GitHub Actions) untuk mem-build APK secara otomatis.
3. **Performance Optimization (Optimalisasi Performa)**
   - Memastikan tidak ada *memory leak* (kebocoran RAM) saat *Share Screen* berjalan lama.
   - Memisahkan *bundle* kode (Code Splitting) untuk mempercepat waktu muat awal (*load time*).
   - Memanfaatkan *Web Workers* atau optimasi *Zustand* agar *re-render* komponen tidak berlebihan.
