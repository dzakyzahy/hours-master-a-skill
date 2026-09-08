# Riset & Analisis Komparasi: Capacitor vs Expo untuk Skillo

Dokumen ini menyajikan perbandingan objektif antara **Capacitor Live Reload** vs **Expo**, serta kurasi **repositori open source terbaik** yang dapat langsung meningkatkan kualitas aplikasi mobile Skillo ke standar produksi.

---

## 1. Komparasi Mendalam: Capacitor Live Reload vs Expo

| Aspek Evaluasi | Capacitor + Vite Live Reload (Arsitektur Skillo Saat Ini) | Expo (React Native Ecosystem) |
| :--- | :--- | :--- |
| **Arsitektur Dasar** | **Web-First (Chromium/WebView)**: Menjalankan kode standar HTML5, CSS3, DOM, dan React 19. | **Native-First (JSX to Native Views)**: Tidak ada DOM/HTML, kode dikompilasi ke view asli Android/iOS. |
| **Efisiensi Codebase (Multi-Platform)** | ⭐⭐⭐⭐⭐ **Maksimal**: 1 kali tulis jalan di **Web Browser**, **Desktop (Electron)**, dan **Mobile Android/iOS (Capacitor)** tanpa duplikasi kode. | ⭐⭐ **Terpisah**: Harus menulis ulang tampilan untuk mobile, atau menggunakan `react-native-web` yang sering kali membatasi fitur web/desktop. |
| **Kecepatan Live Reload (HMR)** | **Sangat Cepat (<50ms)**: Ditenagai oleh **Vite**, perubahan CSS/komponen langsung ter-patch via WebSocket tanpa reload halaman penuh. | **Cepat (100–300ms)**: Ditenagai **Metro Bundler**, performa reload bagus namun parsing AST native membutuhkan waktu lebih lama. |
| **Setup Live Testing Tanpa Kabel** | Menghubungkan HP & Laptop ke 1 Wi-Fi, lalu mengarahkan `server.url` di config ke IP lokal laptop. | Install aplikasi **Expo Go** dari Google Play Store, lalu scan QR code dari terminal. |
| **Akses Hardware HP** | Lewat Capacitor Official & Community Plugins (`@capacitor/haptics`, `@capacitor/local-notifications`, dll). | Lewat Expo Modules (`expo-haptics`, `expo-notifications`, dll). |
| **Kekurangan Utama** | Performa scroll/gesture animasi kompleks sangat bergantung pada performa WebView perangkat. | **Vendor Lock-in**: Memerlukan rewrite 100% jika migrasi dari React Web yang sudah ada. |

### Kesimpulan Efisiensi & Efektivitas:
- Untuk project **Skillo** yang sudah berjalan dengan **Web + Electron + Supabase + WebRTC**, **Capacitor Live Reload 1000% lebih efisien dan efektif**. Migrasi ke Expo akan membuang ratusan jam kerja hanya untuk menulis ulang komponen yang sudah berfungsi.
- Expo sangat efektif jika Anda memulai project **baru dari nol yang targetnya murni 100% hanya untuk mobile HP**, bukan untuk web/desktop terpadu.

---

## 2. Kurasi Repo Open Source Terbaik untuk Project Skillo

Berdasarkan arsitektur Skillo saat ini (React + TypeScript + Vite + Capacitor), berikut repositori open source terbaik di dunia yang paling berguna dan dapat langsung diintegrasikan:

### Kategori A: Mobile Gesture, Drawer & Haptic (Mendongkrak Rasa Native)

1. **`vaul` (emilkowalski/vaul)** — *GitHub Stars: >6.5k*
   - **Fungsi**: Komponen **Drawer / Bottom Sheet** interaktif berbasis gesture swipe sentuhan jari.
   - **Relevansi untuk Skillo**: Ideal untuk menggantikan modal dialog desktop (seperti Modal Tambah Jam, Detail Phase, atau Filter) menjadi bottom sheet yang bisa di-swipe ke bawah dengan jempol seperti aplikasi iOS/Android native.
   - **Install**: `npm i vaul`

2. **`motion` / `framer-motion`** — *GitHub Stars: >25k*
   - **Fungsi**: Library animasi dan gesture sentuhan terpopuler di ekosistem React.
   - **Relevansi untuk Skillo**: Transisi perpindahan halaman tab mobile yang mulus, feedback tombol saat ditekan (*press micro-interactions*), dan animasi list kartu proyek.
   - **Install**: `npm i motion`

3. **`@capacitor/haptics`** — *Capacitor Official*
   - **Fungsi**: Memberikan getaran fisik mikro (*tactile haptic feedback*) ke mesin getar HP Android/iOS.
   - **Relevansi untuk Skillo**: Getaran halus saat tombol "Mulai Fokus" ditekan, saat switch tema, atau saat menyelesaikan sesi jam belajar (*satisfying feedback*).
   - **Install**: `npm i @capacitor/haptics`

---

### Kategori B: Manajemen Sesi Belajar & Layar HP (Timer & Focus)

1. **`@capacitor-community/keep-awake`** — *Capacitor Community*
   - **Fungsi**: Mencegah layar HP mati/terkunci secara otomatis saat aplikasi dibuka.
   - **Relevansi untuk Skillo**: Sangat krusial! Saat pengguna sedang belajar dan menyalakan timer fokus (Pomodoro), layar HP tidak boleh sleep agar timer tetap terlihat di meja belajar.
   - **Install**: `npm i @capacitor-community/keep-awake`

2. **`@capacitor/local-notifications`** — *Capacitor Official*
   - **Fungsi**: Memunculkan notifikasi sistem Android/iOS lokal tanpa butuh server push.
   - **Relevansi untuk Skillo**: Mengirimkan alarm/notifikasi suara: *"Sesi Fokus 25 menit Anda telah selesai! Istirahat sejenak."* meskipun pengguna me-minimize aplikasi.
   - **Install**: `npm i @capacitor/local-notifications`

---

### Kategori C: Ikonografi & Visual Modern

1. **`lucide-react`** — *GitHub Stars: >15k*
   - **Fungsi**: Koleksi ikon SVG modern berbobot ringan, konsisten, dan sangat populer di desain mobile 2026.
   - **Relevansi untuk Skillo**: Menggantikan sebagian FontAwesome yang bundle size-nya berat, menghasilkan tampilan UI yang lebih tajam dan modern di layar AMOLED HP.
   - **Install**: `npm i lucide-react`
