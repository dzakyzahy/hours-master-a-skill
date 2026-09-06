# Pembagian Tugas (Division of Work)

Dokumen ini memetakan pembagian tanggung jawab antara **Tim Inti (Zahy & AI)** dan **Diky** untuk menjaga modularitas, mencegah konflik kode (*merge conflicts*), dan mempercepat rilis aplikasi.

---

## 1. Tim Inti (Zahy & AI)
Fokus pada infrastruktur *backend*, integritas data, keamanan, dan protokol komunikasi real-time.

1. **Sistem Database & Keamanan (Supabase)**
   - Perancangan skema SQL (User Profiles, Projects, Tasks, Messages, Friends, Recycle Bin).
   - Penegakan kebijakan *Row Level Security* (RLS) di seluruh tabel.
   - Migrasi dan *edge functions* jika diperlukan.
2. **Real-time Sync & WebRTC (Meeting Engine)**
   - Arsitektur peer-to-peer WebRTC untuk video/audio dan *Screen Sharing*.
   - Integrasi *Supabase Realtime channels* sebagai *signaling layer*.
   - Penanganan *lifecycle* media stream (mencegah *hardware camera lock* dan kebocoran memori).
3. **Core State & Logic**
   - Manajemen *global state* (Zustand: Auth, Timer, Projects, Chat, Settings).
   - Sinkronisasi timer presisi (mencegah *drift* interval).
   - Integrasi AI Task Generation (Google Gemini 2.5 Flash).

---

## 2. Fokus Khusus Diky
Fokus pada aspek pengalaman pengguna (*User Experience*), tampilan visual kelas atas (*Anti-Slop UI*), integrasi native mobile (Capacitor Android), dan optimalisasi performa frontend.

1. **UI/UX Sophistication & Mobile Polish**
   - Penyempurnaan responsivitas mobile (handling *safe-area insets*, layout *bottom sheet*, *bottom navigation*).
   - Animasi transisi antar-halaman dan mikro-interaksi tombol (*tactile feedback*, *smooth easing*).
   - Konsistensi tema *Dark Mode* dan *Light Mode* (menghilangkan border kasar atau kontras yang janggal).
   - Polish tata letak *Meeting Room* saat layar vertikal di smartphone.
2. **Mobile App Native Integration (Capacitor & Android)**
   - Penanganan tombol *Hardware Back* Android agar modal/drawer tertutup terlebih dahulu sebelum keluar aplikasi.
   - Penyesuaian tema Status Bar dan Navigation Bar Android.
   - Pengujian manual APK pada perangkat Android fisik.
3. **Performance & Frontend Optimization**
   - Pemecahan *bundle* kode (*code splitting* & *lazy loading* untuk rute berat).
   - Pengurangan *re-render* yang tidak perlu pada daftar chat dan grid project.
   - Pemanfaatan *Dev Tools Drawer* di Meeting Room untuk validasi UI tanpa bergantung pada server signaling live.

---

## 3. Matriks Alur Kerja (Workflow Alignment)

- **Zahy / AI**: Mengembangkan fungsionalitas logika → Menyediakan *harness* & mock data → Update skema & backend.
- **Diky**: Mengambil fungsionalitas yang ada → Memoles tampilan & animasi → Menguji pada mobile/desktop → Melakukan *benchmarking* performa & kepuasan visual.
