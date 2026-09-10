# Skillo - Source of Truth

This document serves as the central source of truth for AI agents and developers working on the Skillo project. Please read this entirely before making modifications.

## 1. Project Overview
**Skillo** is a cross-platform time tracking and mastery app (Web, Desktop via Electron, Mobile via Capacitor). 
- **Tech Stack**: React 18, TypeScript, Vite, Zustand (State Management), Tailwind CSS, Supabase (PostgreSQL, Realtime, Auth), WebRTC (for meetings), Electron, Capacitor (Android).

## 2. Completed Milestones (Tahap 1-7)
The core functionalities have been implemented:
1. **Repository & Electron Setup**: Vite + Electron builder.
2. **Multi-User Auth & Profiles**: Simple username-based fallback for local dev, plus Supabase integration.
3. **Database Schema**: Chat, Friends, Recycle Bin (`timer_state` and `projects` etc).
4. **Chat & Friends UI**: Live messaging and user search.
5. **Meeting Room**: WebRTC Peer-to-Peer video, audio, and screen sharing. (Recently refactored by Diky into `MeetingControls.tsx` and `VideoTile.tsx`).
6. **Project Management & Recycle Bin**: Ability to edit project phases, add manual time, soft delete projects, and restore them from the Recycle Bin in the Home page.
7. **Live Timer Sync**: Timer state is pushed to Supabase `timer_state` so Web and Desktop users see the timer running simultaneously.

## 3. Past Mistakes & "Gotchas" to Avoid
When modifying the codebase, please learn from these past mistakes:
- **TypeScript Strictness during Electron Build**: The `npm run build:electron` command enforces very strict TypeScript checks (via `tsc -b`). Do **not** leave unused variables (e.g., `import { X, Trash2 }` where `Trash2` is unused, or destructured variables like `const { activeProjectId } = useStore()` that are never used). It will break the build.
- **Modal Component Overwrites**: When fixing TS errors, do not aggressively remove modals (like `<EditProjectModal />` or `<ManualProjectModal />`) from the `return ()` statement just because the variables seem "unused". Modals depend on state (e.g., `editProject !== null`). Ensure `isOpen` props are passed and handled correctly.
- **Git Conflicts**: Multiple agents/developers (e.g., Diky) are working on this repository. Always do a `git fetch` and `git pull` (or stash and pop) before making large architectural changes. Recently, Diky added Capacitor and refactored WebRTC, which caused merge conflicts.
- **Electron .exe Updates**: If you make a UI change, the user running the installed `.exe` on Desktop will **not** see it unless you rebuild the executable (`npm run build:electron`) and distribute it.
- **Ghost Sessions (Auth)**: The `logout` function MUST call `await supabase.auth.signOut()`. Previously, it only cleared local Zustand state, leaving a "ghost session" in Supabase. This caused the app to fetch the wrong user's profile (`dzakyzr3`) when logging in as another user (`diky`) if the new sign-in failed.
- **Database Environments**: The correct, primary Supabase project is `mcqdqluxprpmrgofynaa`. The database connection string is `postgresql://postgres.mcqdqluxprpmrgofynaa:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres`. Do not confuse this with the old abandoned project (`ovxx...`). If spinning up a new environment, ensure all schema tables (`profiles`, `friend_requests`, `chat_rooms`, etc.) and Realtime publications are manually recreated, as Supabase projects start empty.


## 4. Current State & Pending Tasks
Diky recently updated the repository with:
- Android Configurations (Capacitor/Gradle).
- Extracted documentation into the `docs/` folder.
- Refactored `MeetingRoom.tsx` into smaller components.

### Next Steps for the AI Agent:
1. **Review Diky's Roadmap**: Check `docs/diky_upgrade_roadmap.md` and `docs/development_guide.md` for the latest architectural plans.
2. **UI Sophistication**: Enhance the visual design to be more premium (Glassmorphism, animations, responsive design).
3. **Android APK Deployment**: Finalize the GitHub Actions workflow to build and release the APK automatically.
4. **Auto-updater Testing**: Ensure the desktop app can pull the latest `.exe` from GitHub Releases.

## 5. WebRTC Negotiation (diperbarui 9 Sep 2026 — Fase 1 & 2)

`useWebRTC.ts` ditulis ulang memakai **perfect negotiation**. Aturan yang WAJIB dijaga:

- **Jangan pernah panggil `createOffer()` manual.** Renegosiasi hanya lewat `onnegotiationneeded`. Menambah `createOffer()` manual mengembalikan bug glare (dua sisi menawar bersamaan -> `InvalidStateError` -> koneksi mati permanen).
- **Sisi polite ditentukan `isPolite(localUserId, peerId)`** di `src/utils/webrtcNegotiation.ts` (perbandingan string). Deterministik, tidak butuh round-trip. Jangan diganti jadi random atau timestamp.
- **`disconnected` BUKAN `failed`.** State `disconnected` normal di mobile (handover wifi<->seluler) dan biasanya pulih sendiri. Ada masa tenggang 8 detik sebelum peserta dibuang. Jangan kembalikan ke penghapusan langsung.
- **Bitrate video lewat `sender.setParameters()`, bukan SDP munging.** `enhanceVideoSdp()` sudah DIHAPUS dari `callQuality.ts`. Jangan hidupkan lagi — regex ke string SDP rapuh antar-versi browser.
- **Batas 4 peserta** (`MAX_PARTICIPANTS`) dipaksakan di sisi penerima: peserta ke-5 dikirimi sinyal `room-full`, lalu `MeetingRoom` melemparnya keluar dengan toast.
- **TURN wajib.** `VITE_TURN_URL` / `VITE_TURN_USERNAME` / `VITE_TURN_CREDENTIAL`. Kalau kosong, konsol memperingatkan dan ~20-30% panggilan akan gagal (symmetric NAT / CGNAT operator seluler). Deploy CoTURN atau layanan managed sebelum rilis.
- Logika murni ada di `src/utils/webrtcNegotiation.ts` dan ditutup tes `test/webrtcNegotiation.test.ts`. Ubah kebijakan di situ, bukan disebar di dalam hook.

Detail lengkap, rencana fase, matriks tes, dan alur handling bug: `docs/video_call_architecture_and_plan.md`.

### Utang teknis yang tercatat
- `simple-peer` + `@types/simple-peer` masih di `package.json` tapi TIDAK dipakai. Hapus dengan `npm uninstall simple-peer @types/simple-peer` (butuh akses registry).
- Repo saat ini menunjukkan seluruh file "modified" di `git status` karena beda line ending (CRLF vs LF), bukan perubahan isi. Jalankan `git config core.autocrlf true` lalu re-checkout supaya diff kembali terbaca.

## 6. Call Lifecycle di Android (Fase 3 — 9 Sep 2026)

- **`CallService.java`** = foreground service. Tanpa ini Android mematikan mic/kamera beberapa detik setelah app di-background (wajib sejak API 34; `targetSdk` kita 36).
- **Service type dihitung runtime.** Kalau panggilan audio-only, hanya `microphone` yang diklaim. Mengklaim `camera` tanpa izin kamera = `SecurityException` di API 34+. Jangan hardcode jadi `camera|microphone` di sisi Java.
- **Service HANYA boleh distart setelah `getUserMedia()` berhasil** dan saat app masih foreground. Gate-nya `hasJoined && localStream` di `MeetingRoom.tsx`.
- **Pemilik lifecycle = `useCallSessionStore`, BUKAN `MeetingRoom`.** Ini dikoreksi setelah pengujian di SM-A155F: panggilan sengaja hidup lebih lama dari `MeetingRoom` (floating call bar), jadi mengikat service ke mount komponen akan mematikan panggilan saat diminimize. Lifecycle sekarang satu `subscribe` di `src/main.tsx`. Jangan pindahkan kembali ke komponen.
- **`callSession.ts` wajib tetap murni** (tanpa import `native.ts`). Sempat dimasukkan ke sana dan langsung mematahkan `test/callSession.test.ts` — @capacitor/core tidak bisa di-load di node test runner.
- **`handleEndCall` WAJIB memanggil `setHasJoined(false)` SEBELUM `endSession()`.** `effectiveRoomId` dan `targetFriend` (MeetingRoom baris 58 & 63) diturunkan dari `session`, dan keduanya ada di dependency array efek "Sync active call session". Menghapus session mengubah dep tersebut -> efek jalan lagi -> `startSession()` dipanggil -> panggilan hidup kembali sedetik setelah diakhiri. Terbukti di perangkat lewat urutan bridge `stop, start`. Guard `if (hasJoined)` yang menghentikannya. Jangan hapus baris itu.
- **Service yatim.** Konteks JS baru tidak mungkin memiliki panggilan, jadi `main.tsx` memanggil `stopCallForeground()` saat boot (terverifikasi jalan di perangkat). `CallService.onTaskRemoved()` menutup jalur swipe-away.
- **Audio** disetel `MODE_IN_COMMUNICATION` + speakerphone ON saat service start, dikembalikan ke nilai semula di `onDestroy`. Ini yang mengaktifkan echo canceller platform.
- **Screen share disembunyikan di native** lewat `canScreenShare` (`src/utils/native.ts`). Android WebView tidak punya `getDisplayMedia`. Jangan tampilkan tombolnya lagi sebelum ada plugin MediaProjection.
- **Plugin native baru wajib didaftarkan** di `MainActivity.onCreate()` SEBELUM `super.onCreate()`.
- Perubahan native (manifest, Java, plugin) TIDAK terkirim lewat `@capgo/capacitor-updater` OTA — wajib build APK baru.

### Belum dikerjakan (sadar, bukan lupa)
- Sensor proximity (layar mati saat HP di telinga).
- Layar penjelasan izin sebelum dialog sistem Android.
- Pemilih output audio (earpiece/bluetooth) — butuh `setCommunicationDevice` + UI.
- Screen share native via MediaProjection.

## 7. Foto Profil (9 Sep 2026)

- **Kolom `avatar_url`, `title`, `bio` sebelumnya TIDAK ADA di database live.** `Profile.tsx` sudah menulis ke sana sejak lama, dibungkus `try/catch` — padahal supabase-js **mengembalikan `{ error }`, tidak melempar**, jadi kegagalannya tidak pernah terlihat dan profil cuma tersimpan di perangkat. Migrasi: `supabase/2026-09-09_profile_avatar.sql`.
- **Jangan bungkus panggilan supabase-js dengan `try/catch` lalu diamkan.** Selalu baca `{ error }`. Pola ini kemungkinan masih ada di tempat lain — periksa saat menyentuh kode Supabase.
- **Format avatar: satu kolom TEXT, tiga bentuk.** Bisa id preset (`cyber-neon`), data URL (`data:image/jpeg;base64,...`), atau URL http(s). `getAvatarDisplay()` di `src/utils/profilePresets.ts` yang membedakan — jadi menambah sumber avatar baru cukup di satu fungsi itu.
- **Foto dikecilkan ke 256px JPEG q0.8** oleh `src/utils/avatarUpload.ts` (~20 KB) sebelum disimpan. `createImageBitmap(file, { imageOrientation: 'from-image' })` wajib — tanpa itu foto kamera HP muncul miring karena EXIF.
- **Batas pendekatan ini:** avatar ikut terbawa di setiap baris `profiles` yang di-SELECT. Aman untuk puluhan sampai ratusan user. Pindah ke Supabase Storage kalau daftar profil sudah cukup besar sampai 20 KB per baris terasa.
- **Titik render avatar:** Home, Profile, ClashPinnedCard, VideoTile. Semuanya lewat `getAvatarDisplay()`. `Chat.tsx` masih memakai inisial polos di `.friend-avatar` / `.community-avatar` — belum dikerjakan.
- Avatar dihidrasi dari server saat login (`store.ts`, select `avatar_url, title, bio`) dan `fetchFriends` ikut mengambil `avatar_url`, jadi foto teman juga tersedia begitu tempat render-nya disiapkan.

## 8. Kualitas Panggilan (Fase 4 — 9 Sep 2026)

- **`getStats()` di-poll tiap 3 detik di dalam `useWebRTC`**, bukan di hook terpisah — hook itu yang memegang `peersRef`, jadi menaruhnya di tempat lain berarti membocorkan `RTCPeerConnection` ke luar.
- **Packet loss dihitung per interval, bukan kumulatif** (`deltaLossFraction` di `src/utils/callStats.ts`). Kalau memakai angka kumulatif, satu gangguan di menit pertama membuat panggilan tertandai "buruk" selamanya.
- **Ambang batas:** ≥5% loss atau ≥400ms RTT = buruk; ≥2% atau ≥200ms = sedang. Logika murni dan diuji di `test/callStats.test.ts` — ubah ambangnya di situ, bukan disebar di dalam hook.
- **Degradasi otomatis memakai `encodings[0].active = false`, BUKAN `track.enabled`.** Ini menjeda transport tanpa menyentuh tombol kamera pengguna, jadi status tombolnya tidak ikut berubah dan pulih bersih. Butuh 2 sampel buruk berturut-turut sebelum bertindak.
- `simple-peer` dan `@types/simple-peer` sudah dihapus dari dependencies.

### Belum dikerjakan (sadar)
- Deteksi siapa yang sedang bicara (highlight tile).
- Kirim event kegagalan ICE ke Supabase untuk memantau tingkat kegagalan pengguna nyata — butuh tabel baru.
- Banner permanen saat degradasi; sekarang memakai toast saat transisi + meter sinyal di tiap tile.
