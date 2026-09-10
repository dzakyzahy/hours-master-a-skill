# Video Call Skillo — Arsitektur, Referensi, & Rencana Eksekusi

> Dokumen ini dibuat untuk menjawab: *"backend video call itu sebenarnya kerjanya gimana, repo referensi itu apa, dan kalau mau diterapkan di Skillo harus ngapain."*
>
> Status kode saat ditulis: `src/hooks/useWebRTC.ts` (382 baris), `src/hooks/useCallSignaling.ts` (264 baris), `src/pages/MeetingRoom.tsx` (975 baris), Capacitor Android v8, Supabase `mcqdqluxprpmrgofynaa`.

---

## BAGIAN 1 — Konsep Dasar: "Backend" Video Call Itu Apa

### 1.1 Kesalahpahaman paling umum

Orang biasanya membayangkan video call seperti YouTube: video-nya naik ke server, server menyimpan/meneruskan, lalu turun ke penonton.

**Video call P2P tidak begitu.** Video dan audio **tidak pernah lewat server kamu**. Yang lewat server hanya "surat perkenalan" antar-HP. Setelah kedua HP saling kenal, mereka bicara **langsung**, HP ke HP.

Analogi: server itu seperti **operator telepon jadul**. Tugasnya cuma menyambungkan. Setelah tersambung, operator menutup telinga dan percakapannya murni antara dua penelepon.

Konsekuensinya penting untuk Skillo:
- Biaya server hampir nol untuk bandwidth video (bagus).
- Tapi kalau dua HP tidak bisa saling menemukan jalan, call gagal total dan server tidak bisa menolong (ini masalah utama kamu — lihat TURN di bawah).

### 1.2 Empat komponen yang selalu ada di sistem video call

| Komponen | Tugas | Di Skillo dipegang oleh |
|---|---|---|
| **Signaling** | Tukar "surat perkenalan" (SDP & ICE) antar peserta | Supabase Realtime Broadcast |
| **STUN** | Kasih tahu HP: "IP publik kamu itu X" | Google STUN (gratis) |
| **TURN** | Relay paksa kalau P2P gagal tembus | ❌ **BELUM ADA** |
| **Media Engine** | Encode/decode kamera & mic, kirim paket | `RTCPeerConnection` (bawaan browser/WebView) |

Mari bedah satu-satu.

---

### 1.3 Signaling — "surat perkenalan"

Sebelum dua HP bisa kirim video, mereka harus sepakat soal:
- Codec apa yang dipakai (VP8? H264? Opus?)
- Resolusi & bitrate berapa
- Kunci enkripsi apa
- **Alamat IP dan port mana yang bisa dipakai untuk saling menembak paket**

Semua itu ditulis dalam format teks bernama **SDP** (Session Description Protocol). Isinya mirip file konfigurasi panjang.

Alurnya baku dan namanya **offer/answer**:

```
HP-A                        Server Signaling                    HP-B
 |                                 |                              |
 |-- 1. OFFER (SDP-A) ------------>|-- teruskan ----------------->|
 |                                 |                              |
 |<------------- teruskan ---------|<-- 2. ANSWER (SDP-B) --------|
 |                                 |                              |
 |-- 3. ICE candidate ------------>|-- teruskan ----------------->|
 |<------------- teruskan ---------|<-- 3. ICE candidate ---------|
 |                                 |                              |
 |========== 4. VIDEO & AUDIO LANGSUNG, TANPA SERVER ============>|
```

**Poin kunci:** server signaling itu "bodoh". Dia tidak paham isi SDP, dia cuma tukang pos. Karena itu **apa pun bisa jadi server signaling** — WebSocket, socket.io, Firebase, bahkan Supabase Realtime. Ini alasan kenapa nanti saya bilang stack Skillo sudah benar dan tidak perlu diganti.

### 1.4 ICE, STUN, TURN — bagian yang paling sering bikin call gagal

Masalahnya: HP kamu tidak punya alamat publik. Dia ada di belakang router/NAT. Ibaratnya kamu tinggal di kamar 305 di sebuah apartemen — orang luar cuma tahu alamat gedungnya, tidak tahu nomor kamarmu.

**ICE (Interactive Connectivity Establishment)** adalah proses tebak-tebakan sistematis: setiap HP mengumpulkan semua kemungkinan alamat dirinya (disebut **ICE candidate**), lalu semuanya dikirim ke lawan bicara, lalu keduanya mencoba semua kombinasi sampai ada yang nyambung.

Ada tiga jenis candidate:

1. **host** — IP lokal, misal `192.168.1.5`. Cuma jalan kalau dua HP di WiFi yang sama.
2. **srflx (server reflexive)** — didapat dari **STUN**. HP tanya ke server STUN "IP publikku apa?", server jawab. Ini yang dipakai di ~70–80% kasus.
3. **relay** — didapat dari **TURN**. Ini jalur menyerah: semua paket dilempar ke server TURN, server meneruskan ke lawan. Boros bandwidth server, tapi **selalu berhasil**.

**Kapan TURN wajib?** Ketika NAT-nya *symmetric*. Ini terjadi di:
- Jaringan seluler dengan CGNAT — **Telkomsel, XL, Indosat, Tri semua begini**
- WiFi kantor/kampus dengan firewall ketat
- Beberapa ISP rumahan

**Angka kasarnya:** tanpa TURN, sekitar **20–30% panggilan akan gagal** — dan di skenario "dua-duanya pakai kuota seluler", angkanya bisa di atas 50%.

> **Ini penyebab paling mungkin dari gejala "call tersambung tapi videonya hitam / loading terus" yang biasa muncul di APK.** Signaling berhasil, ICE-nya yang gagal.

### 1.5 Mesh vs SFU — kenapa video call rame bikin HP panas

Ini menentukan berapa maksimal orang dalam satu room.

**MESH (yang dipakai Skillo, briefing, dan MiroTalk P2P):**

```
    A ─────── B
    │ ╲     ╱ │
    │   ╲ ╱   │
    │   ╱ ╲   │
    │ ╱     ╲ │
    C ─────── D
```

Setiap orang konek langsung ke setiap orang lain. Dengan N orang, tiap HP harus:
- **encode video N-1 kali** (paling berat, ini yang bikin HP panas & baterai boros)
- upload N-1 stream
- decode N-1 stream

Beban naik secara kuadratik. Realistis di HP menengah:

| Peserta | Kondisi |
|---|---|
| 2 orang | Mulus, ini use case utama |
| 3 orang | Masih oke |
| 4 orang | Mulai panas, perlu turunkan resolusi |
| 5+ orang | HP kentang mulai drop frame / crash |
| 8+ orang | Tidak realistis di mobile |

**SFU (Selective Forwarding Unit):**

```
    A ──╮       ╭── B
        ├─[SFU]─┤
    C ──╯       ╰── D
```

Tiap orang upload **satu kali saja** ke server, server yang menggandakan. Beban HP jadi konstan, bukan kuadratik. Bisa 50+ orang.

Harganya: kamu harus jalankan dan bayar server media (mediasoup / LiveKit / Janus). Bandwidth server jadi mahal.

**Keputusan untuk Skillo:** tetap mesh, batasi hard-limit **4 peserta**. Skillo itu app produktivitas/fokus bareng, bukan Zoom. Kalau nanti butuh room besar, itu proyek terpisah (lihat Bagian 6, Fase 5).

---

## BAGIAN 2 — Bedah Repo Referensi

### 2.1 `holtwick/briefing` (brie.fi/ng)

**Apa ini:** aplikasi video conference open source oleh Dirk Holtwick, fokus pada privasi. Tanpa daftar akun — buat link, bagikan, selesai.

| Aspek | Detail |
|---|---|
| Stack | Vue 3 + TypeScript + Vite |
| Signaling | Server sendiri berbasis **Zerva** (framework Node buatan penulis yang sama) |
| Topologi | Mesh, tapi v3 sudah menyiapkan jalur SFU |
| STUN/TURN | Disertakan dalam paket self-host |
| Deploy | Docker, Fly.io, Render, AWS, GCP, Azure |
| Mobile | Ada aplikasi iOS |
| Lisensi | **AGPL-3.0** + opsi lisensi komersial berbayar |

**Yang layak dipelajari untuk Skillo:**
- Model *join-by-link* tanpa akun — relevan kalau Skillo mau fitur "undang teman lewat link".
- Cara dia menata state room (siapa di dalam, siapa keluar) dengan rapi.
- Pola iframe embed + configurator — kalau nanti Skillo mau ditempel di web lain.

**Yang TIDAK relevan:** seluruh lapisan Vue-nya, dan server signaling Zerva-nya. Kamu sudah punya Supabase, tidak perlu jalankan server Node tambahan.

### 2.2 `miroslavpejic85/mirotalk` (MiroTalk P2P)

**Apa ini:** video conference P2P, vanilla JavaScript, sangat kaya fitur. Sudah lama dan sangat matang.

| Aspek | Detail |
|---|---|
| Stack | Vanilla JS + Node.js + Express + socket.io |
| Signaling | socket.io |
| Topologi | Murni mesh P2P |
| TURN | **Ada folder `/coturn` berisi konfigurasi CoTURN siap pakai** |
| Fitur | Screen share, rekaman, chat markdown, whiteboard, raise hand, room password, JWT, 133 bahasa, REST API, integrasi ChatGPT |
| Lisensi | **AGPL-3.0** + lisensi komersial via CodeCanyon |

**Yang paling berharga untuk Skillo:** folder **`/coturn`**. Itu konfigurasi TURN server yang sudah teruji produksi. Konfigurasi bukan kode — aman disalin idenya.

**Bonus:** penulis yang sama punya **MiroTalk SFU** (berbasis mediasoup). Kalau suatu hari Skillo butuh room >8 orang, itu peta jalannya.

### 2.3 `video-peers.vercel.app/room/11`

Demo mesh sederhana (room diidentifikasi angka di URL). Berguna sebagai **pembanding UX minimum**, bukan sebagai sumber arsitektur — Skillo sudah lebih kompleks dari ini.

### 2.4 ⚠️ PERINGATAN LISENSI — BACA SEBELUM COPY-PASTE

**Kedua repo referensi berlisensi AGPL-3.0.**

AGPL itu *copyleft kuat*. Kalau kamu menyalin kode dari sana ke Skillo:
- Seluruh Skillo wajib jadi AGPL-3.0
- Wajib publikasikan source code lengkap
- Kewajiban ini **berlaku juga untuk layanan lewat jaringan**, bukan cuma distribusi APK

Skillo punya `@revenuecat/purchases-capacitor` di dependencies — artinya ada rencana monetisasi. **AGPL akan menghancurkan rencana itu.**

**Aturan kerja yang harus dipegang:**

| Boleh | Tidak Boleh |
|---|---|
| Baca kodenya untuk paham konsep | Copy-paste fungsi/file |
| Contek daftar fitur | Copy struktur file yang khas |
| Contek konfigurasi CoTURN (config, bukan kode) | Copy modul signaling |
| Tulis ulang sendiri dari pemahaman | Adaptasi kode dengan ganti nama variabel |

Kalau ragu: **tutup repo-nya, tulis dari nol.** Pola WebRTC itu standar publik (spec W3C), bukan milik siapa-siapa.

---

## BAGIAN 3 — Bagaimana Skillo Bekerja Sekarang (Trace Kode Nyata)

Ini alur lengkap dari "tekan tombol call" sampai "video muncul", berdasarkan kode yang ada.

### 3.1 Dua lapis signaling yang terpisah

Skillo punya **dua channel Supabase yang berbeda fungsi** — ini penting dipahami, sering bikin bingung:

| Channel | File | Fungsi |
|---|---|---|
| `skillo_call_signals` | `useCallSignaling.ts` | **Lapis undangan.** Bunyiin dering, terima/tolak panggilan. Global, satu untuk seluruh app. |
| `room_<roomId>` | `useWebRTC.ts` | **Lapis WebRTC.** Tukar SDP & ICE. Satu channel per room. |

Analogi: channel pertama itu **bel pintu**. Channel kedua itu **percakapan setelah pintu dibuka**.

### 3.2 Alur lengkap panggilan 1-on-1

```
[ A menekan tombol call ke B ]
          |
          v
1. initiateCall()  — useCallSignaling.ts
   - Bikin roomId deterministik: dm_<idKecil>_<idBesar>
     (di-sort supaya A dan B selalu hasilkan roomId identik)
   - Broadcast CALL_INVITE ke channel 'skillo_call_signals'
          |
          v
2. HP B menerima CALL_INVITE
   - shouldProcessCallSignal() cek: ini memang untuk saya?
   - IncomingCallModal muncul
   - playIncomingRingtone() loop tiap 2.5 detik
   - showIncomingCallNotification() (notifikasi Android)
   - Timeout 35 detik -> missed call otomatis
          |
          v
3. B menekan Terima -> acceptIncomingCall()
   - Broadcast CALL_ACCEPTED
   - Navigate ke /meeting/<roomId>
   ( A juga sudah navigate ke room yang sama )
          |
          v
4. MeetingRoom.tsx mount di kedua sisi
   - getUserMedia() ambil kamera + mic
     (ada fallback bertingkat: video+audio -> audio saja -> constraint minimal)
   - Stream disimpan di useCallSessionStore
          |
          v
5. useWebRTC() jalan  — INI INTI TEKNISNYA
   - subscribe ke channel 'room_<roomId>'
   - Begitu SUBSCRIBED -> broadcast 'peer-joined'
          |
          v
6. Sisi lain menerima 'peer-joined'
   - createPeer(peerId, name, isInitiator = true)
   - new RTCPeerConnection(ICE_SERVERS)
   - addTrack() semua track lokal
   - createOffer() -> SDP dimodifikasi oleh
     enhanceOpusSdp() + enhanceVideoSdp(sdp, 1500)
   - setLocalDescription() -> broadcast 'offer'
          |
          v
7. Penerima offer
   - createPeer(..., isInitiator = false)
   - setRemoteDescription(offer)
   - flush ICE candidate yang antre di pendingCandidatesRef
   - createAnswer() -> broadcast 'answer'
          |
          v
8. Pertukaran ICE candidate dua arah
   - onicecandidate -> broadcast 'ice-candidate'
   - Kalau remoteDescription belum ada, candidate ditumpuk
     di pendingCandidatesRef, di-flush nanti
          |
          v
9. ontrack menyala -> stream masuk ke remoteParticipants[]
   -> VideoTile.tsx render <video srcObject={stream} />
          |
          v
10. Status mute/kamera/share disiarkan lewat sinyal 'status-update'
```

### 3.3 Yang sudah bagus di kode ini

Jujur saja, fondasinya solid. Ini bukan kode asal-asalan:

- ✅ **ICE candidate queueing** (`pendingCandidatesRef`) — banyak tutorial melewatkan ini dan menghasilkan bug acak. Kamu sudah benar.
- ✅ **roomId deterministik** dari sorted user ID — elegan, tidak perlu negosiasi room.
- ✅ **Singleton channel di level modul** (`activeChannel`) — dering tetap jalan walau pindah halaman. Pemikiran yang bagus.
- ✅ **Fallback getUserMedia bertingkat** — tetap jalan di HP tanpa kamera.
- ✅ **Track sync via `replaceTrack`** — cara yang benar untuk ganti kamera/screen share.
- ✅ **`BroadcastChannel`** untuk sinkronisasi antar-tab di desktop.
- ✅ **ICE restart** saat state `failed`.

### 3.4 Diagram komponen

```
┌──────────────────────────────────────────────────────┐
│                  SUPABASE (backend)                  │
│                                                      │
│  Realtime Broadcast          Postgres                │
│  ├─ skillo_call_signals      ├─ profiles             │
│  │  (undangan/dering)        ├─ friend_requests      │
│  └─ room_<id>                ├─ chat_rooms           │
│     (SDP + ICE)              └─ timer_state          │
└──────────────────────────────────────────────────────┘
         ▲                                    ▲
         │ signaling saja                     │ signaling saja
         │ (teks, ringan)                     │
    ┌────┴─────┐                        ┌─────┴────┐
    │  HP A    │◄══════════════════════►│  HP B    │
    │ Skillo   │   VIDEO + AUDIO        │ Skillo   │
    │(Capacitor│   LANGSUNG P2P         │(Capacitor│
    │ WebView) │   TERENKRIPSI (DTLS)   │ WebView) │
    └──────────┘                        └──────────┘
                        ▲
                        │ kalau jalur langsung buntu
                        ▼
                 ┌──────────────┐
                 │ TURN SERVER  │  ❌ BELUM ADA
                 │  (relay)     │     ini yang bikin gagal
                 └──────────────┘
```

---

## BAGIAN 4 — Kalau Referensi Itu Diterapkan di Skillo

### 4.1 Jawaban singkat: JANGAN ganti stack

Godaan terbesar setelah lihat repo bagus adalah "ah mending pakai punya mereka saja". **Itu keputusan salah di sini**, tiga alasan:

1. **Lisensi AGPL** membunuh monetisasi (Bagian 2.4).
2. **Arsitekturnya sudah sama.** MiroTalk P2P dan Skillo dua-duanya mesh + offer/answer + STUN/TURN. Kamu tidak akan dapat arsitektur baru, cuma pindah bahasa pemrograman.
3. **Signaling Skillo justru lebih sederhana.** MiroTalk butuh server Node + socket.io yang harus di-deploy, dimonitor, di-scale. Skillo pakai Supabase Realtime — **nol server tambahan**. Itu keunggulan, bukan kekurangan.

### 4.2 Yang benar-benar diambil dari referensi

| Dari | Yang diambil | Cara |
|---|---|---|
| MiroTalk | Konfigurasi CoTURN | Baca `/coturn/turnserver.conf`, tulis config sendiri |
| MiroTalk | Checklist fitur (raise hand, room lock, dsb) | Jadikan backlog, implementasi sendiri |
| MiroTalk SFU | Peta jalan kalau butuh room besar | Referensi masa depan |
| briefing | Pola join-by-link tanpa akun | Rancang sendiri untuk Skillo |
| briefing | Pemikiran mesh→SFU | Referensi masa depan |

### 4.3 Gap analysis — 9 hal yang kurang

Diurutkan berdasarkan dampak nyata ke pengguna.

---

**🔴 GAP-1 — TURN server belum ada (KRITIS)**

Di `useWebRTC.ts` baris 20–29, TURN hanya aktif kalau `VITE_TURN_URL` ada. Dan di `.env.example`, variabel itu **tidak dicantumkan sama sekali** — artinya kemungkinan besar belum pernah di-set. Praktis Skillo jalan dengan STUN saja.

*Dampak:* 20–30% panggilan gagal. Di jaringan seluler bisa >50%. Gejala: "nyambung tapi videonya hitam".

*Solusi:* deploy CoTURN di VPS (~Rp 50rb/bulan) atau pakai layanan managed (Metered.ca punya free tier 500MB, Twilio pay-as-you-go). Ini **pekerjaan nomor satu**, di atas semua yang lain.

---

**🔴 GAP-2 — Tidak ada perfect negotiation (glare)**

Di `useWebRTC.ts`, saat renegosiasi (baris ~66–100) dan saat `peer-joined`, kedua sisi bisa memanggil `createOffer()` bersamaan. Kalau itu terjadi, `setRemoteDescription()` dipanggil saat `signalingState` bukan `stable` → **exception, koneksi mati permanen**.

*Kapan terpicu:* dua orang join dalam selang <1 detik, atau dua orang nyalakan kamera bersamaan, atau dua orang mulai screen share bersamaan.

*Solusi:* pola **polite/impolite peer** — bandingkan `localUserId` sebagai string, yang lebih kecil jadi "polite". Polite mengalah (rollback) saat tabrakan, impolite jalan terus.

---

**🔴 GAP-3 — State `disconnected` langsung membuang peserta**

`useWebRTC.ts` baris ~172–175: `disconnected` diperlakukan sama dengan `closed` → peserta langsung dihapus dan peer di-close.

Padahal di mobile, `disconnected` itu **normal dan sering sementara**: pindah WiFi ke seluler, ganti tower BTS, sinyal lemah 3 detik. WebRTC biasanya pulih sendiri.

*Dampak:* call putus terus-menerus saat jalan/naik kendaraan. Ini bug yang sangat terasa di pengguna.

*Solusi:* beri masa tenggang 8 detik. Kalau dalam 8 detik kembali ke `connected`, batalkan penghapusan. Kalau tidak, baru ICE restart, baru drop.

---

**🟠 GAP-4 — Screen share tidak jalan di APK**

`MeetingRoom.tsx` baris 199 cek `navigator.mediaDevices?.getDisplayMedia`. **API ini tidak ada di Android WebView.** Jadi di APK, tombol screen share akan gagal diam-diam atau lempar error.

*Solusi jangka pendek:* deteksi platform (`Capacitor.isNativePlatform()`), sembunyikan tombolnya di Android. Jujur ke pengguna lebih baik daripada tombol rusak.
*Solusi jangka panjang:* plugin MediaProjection native (pekerjaan besar, tunda).

---

**🟠 GAP-5 — Tidak ada foreground service**

`AndroidManifest.xml` tidak punya `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CAMERA`, atau `FOREGROUND_SERVICE_MICROPHONE`, dan tidak ada `<service>` yang dideklarasikan.

*Dampak:* begitu pengguna menekan Home atau membuka app lain, Android akan mematikan kamera/mic dalam hitungan detik (kebijakan ini makin ketat sejak Android 12+, dan wajib sejak Android 14).

*Solusi:* foreground service dengan notifikasi persisten "Skillo — panggilan berlangsung". Wajib juga kalau mau lolos review Play Store.

---

**🟠 GAP-6 — Bitrate 1500 kbps hardcoded via SDP munging**

`useWebRTC.ts` memanggil `enhanceVideoSdp(sdp, 1500)` di 4 tempat.

Dua masalah:
1. **SDP munging itu rapuh.** Mengedit string SDP dengan regex bisa pecah kalau format berubah antar-versi browser.
2. **1500 kbps kebesaran untuk mesh mobile.** Di room 4 orang, tiap HP upload 3 × 1500 = 4.5 Mbps. Jaringan seluler Indonesia jarang sanggup.

*Solusi:* pakai `RTCRtpSender.setParameters({ encodings: [{ maxBitrate }] })` — API resmi, tidak menyentuh SDP. Bitrate adaptif: 2 orang 800 kbps, 3 orang 500, 4 orang 350.

---

**🟡 GAP-7 — `simple-peer` masih terpasang tapi tidak dipakai**

`package.json` punya `simple-peer` + `@types/simple-peer`, tapi `useWebRTC.ts` pakai `RTCPeerConnection` mentah. Library ini sudah tidak dimaintain dan menambah ukuran bundle.

*Solusi:* `npm uninstall simple-peer @types/simple-peer`.

---

**🟡 GAP-8 — Tidak ada batas peserta**

`MeetingRoomConfig` punya field `maxParticipants?`, tapi opsional dan tidak dipaksakan di `useWebRTC.ts`. Kalau 8 orang masuk, HP kentang akan crash.

*Solusi:* hard limit 4, tolak peserta ke-5 dengan pesan yang jelas.

---

**🟡 GAP-9 — Tidak ada indikator kualitas koneksi**

Tidak ada polling `getStats()`. Pengguna tidak tahu kenapa video-nya jelek — mereka akan menyalahkan aplikasi.

*Solusi:* polling `getStats()` tiap 3 detik, tampilkan ikon 3-bar di tiap `VideoTile`.

---

## BAGIAN 5 — Cara Kerja sebagai Mobile Developer

Bagian ini soal **pola pikir**, bukan kode. Ini yang membedakan app video call yang "jalan di laptop developer" dengan yang "jalan di HP orang".

### 5.1 Tujuh prinsip

**1. Mobile itu bukan desktop yang lebih kecil. Mobile itu lingkungan yang bermusuhan.**

Di desktop: jaringan stabil, listrik tak terbatas, CPU dingin, app tidak pernah dibunuh OS.
Di mobile: jaringan berganti-ganti, baterai habis, HP panas lalu throttling, OS membunuh app kapan saja.

Setiap fitur harus dirancang dengan asumsi **semuanya bisa hilang tiba-tiba**.

**2. Uji di HP kentang, bukan di flagship.**

Kalau lancar di Redmi 4GB RAM di jaringan 4G lemah, dia akan lancar di mana saja. Kebalikannya tidak berlaku. Beli/pinjam satu HP entry-level khusus untuk testing.

**3. Jangan pernah percaya `localhost` atau `npm run dev`.**

WebRTC di `localhost` **selalu berhasil** — dua proses di mesin yang sama, tidak ada NAT. Ini menciptakan rasa aman palsu. **Semua tes WebRTC yang berarti harus dilakukan dari dua perangkat fisik terpisah di jaringan berbeda** (satu WiFi, satu kuota seluler).

**4. Kegagalan harus punya suara.**

Yang paling menyiksa pengguna bukan error, tapi **diam**. Layar hitam tanpa penjelasan. Setiap kegagalan harus punya pesan yang bisa ditindaklanjuti:

- ❌ "Terjadi kesalahan"
- ✅ "Tidak bisa mengakses kamera. Buka Pengaturan → Aplikasi → Skillo → Izin → aktifkan Kamera."

**5. Izin diminta saat dibutuhkan, dengan penjelasan dulu.**

Jangan minta semua izin saat app pertama dibuka — tingkat penolakan tinggi. Minta izin kamera **tepat saat** pengguna menekan tombol call, dan tampilkan satu layar penjelasan sebelum dialog sistem muncul.

**6. Baterai dan panas itu fitur.**

Video call adalah salah satu hal terberat yang bisa dilakukan HP. Kalau HP jadi panas setelah 5 menit, pengguna berhenti memakai app-mu — dan mereka tidak akan lapor bug, mereka cuma uninstall.

Ukur: `adb shell dumpsys battery`, dan pantau suhu selama call 15 menit.

**7. Rilis kecil, sering, dan bisa di-rollback.**

Skillo sudah punya `@capgo/capacitor-updater` — manfaatkan. Perubahan yang murni JS/CSS bisa dikirim OTA tanpa lewat Play Store. Tapi **perubahan native (manifest, plugin, gradle) tetap butuh build APK baru** — jangan tertukar, ini sumber bug yang membingungkan.

### 5.2 Aturan khusus WebRTC yang harus dihafal

| Aturan | Alasan |
|---|---|
| Jangan pernah `setRemoteDescription` tanpa cek `signalingState` | Sumber utama crash koneksi |
| Selalu antre ICE candidate sebelum remote description siap | Kamu sudah benar — pertahankan |
| `disconnected` ≠ `failed`. Beri waktu pulih | Mobile sering `disconnected` sementara |
| Selalu `stop()` semua track saat keluar room | Kalau tidak, lampu kamera tetap menyala — pengguna panik |
| Pakai `replaceTrack`, bukan remove+add | Remove+add memicu renegosiasi penuh yang mahal |
| TURN itu wajib, bukan opsional | ~30% pengguna kamu tidak bisa P2P langsung |
| Jangan munging SDP kalau ada API resmi | `setParameters()` > regex ke string SDP |

### 5.3 Cara debug WebRTC (karena ini beda dari debug biasa)

Bug WebRTC sering **tidak muncul di console**. Perkakasnya:

1. **`chrome://webrtc-internals`** — di Chrome desktop. Grafik lengkap: ICE state, bitrate, packet loss, RTT. Ini alat nomor satu.
2. **`adb logcat | grep -i webrtc`** — untuk sisi Android.
3. **Remote debugging WebView:** hubungkan HP via USB, buka `chrome://inspect` di Chrome desktop → bisa inspect WebView di dalam APK persis seperti tab biasa. **Wajib dikuasai.**
4. **`getStats()`** — dipanggil dari kode, satu-satunya cara tahu kualitas saat runtime di produksi.
5. **Logging ICE state ke Supabase** — supaya bisa lihat kegagalan pengguna nyata, bukan cuma di HP sendiri.

---

## BAGIAN 6 — Workflow Plan: Rencana Tugas yang Akan Dieksekusi

Enam fase, diurutkan berdasarkan **dampak ke pengguna dibagi usaha**. Kerjakan berurutan — jangan lompat.

---

### FASE 0 — Baseline & Instrumentasi (½ hari)

*Tidak boleh memperbaiki apa pun sebelum tahu kondisi awal.*

| # | Tugas | Selesai kalau |
|---|---|---|
| 0.1 | Tes call 2 HP fisik, jaringan berbeda, catat hasil | Ada catatan: berhasil/gagal, di ICE state mana |
| 0.2 | Tambah logging `iceConnectionState` + `connectionState` di tiap transisi | Console menunjukkan seluruh jalur state |
| 0.3 | Catat hasil `getStats()` mentah selama call 2 menit | Punya angka baseline: bitrate, packet loss, RTT |
| 0.4 | Buat `docs/testing_matrix.md` | Matriks kombinasi perangkat × jaringan terdokumentasi |

**Output:** dokumen baseline. Semua klaim "sudah lebih baik" nanti diukur terhadap ini.

---

### FASE 1 — TURN Server 🔴 (1 hari) — PRIORITAS TERTINGGI

*Satu perubahan ini akan memperbaiki lebih banyak masalah daripada semua fase lain digabung.*

| # | Tugas | Selesai kalau |
|---|---|---|
| 1.1 | Pilih penyedia: CoTURN self-host di VPS **atau** Metered.ca (ada free tier) | Kredensial di tangan |
| 1.2 | Deploy & buka port: 3478 TCP/UDP, 5349 TLS, range relay 49152–65535 UDP | Server merespons |
| 1.3 | Verifikasi di `webrtc.github.io/samples/src/content/peerconnection/trickle-ice/` | Muncul candidate bertipe **`relay`** |
| 1.4 | Tambahkan `VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` ke `.env.example` + GitHub Secrets | Build CI membawa kredensial |
| 1.5 | Tambah peringatan konsol kalau TURN tidak terkonfigurasi | Developer berikutnya tidak mengulang kesalahan ini |
| 1.6 | Tes paksa relay: set `iceTransportPolicy: 'relay'`, pastikan call tetap jalan | Call berhasil murni lewat TURN |
| 1.7 | Tes nyata: 2 HP, dua-duanya kuota seluler, operator berbeda | Video muncul di kedua sisi |

**Kriteria selesai:** panggilan berhasil ketika kedua peserta memakai kuota seluler berbeda operator. Ini tes yang sebelumnya kemungkinan besar gagal.

> Catatan credential: untuk produksi, jangan pakai username/password statis. Pakai TURN REST API (HMAC time-limited) — kredensial dibuat server-side dan kedaluwarsa dalam beberapa jam. Statis dulu boleh untuk validasi, tapi catat sebagai utang teknis.

---

### FASE 2 — Kestabilan Koneksi 🔴 (2 hari)

| # | Tugas | File | Selesai kalau |
|---|---|---|---|
| 2.1 | Implementasi polite/impolite peer (bandingkan `localUserId` sebagai string) | `useWebRTC.ts` | Dua peserta join bersamaan tetap tersambung, 10× berturut-turut |
| 2.2 | Pindah ke `onnegotiationneeded`, hapus renegosiasi manual di effect | `useWebRTC.ts` | Tidak ada lagi `createOffer()` liar |
| 2.3 | `makingOffer` flag + rollback saat tabrakan | `useWebRTC.ts` | Tidak ada exception `InvalidStateError` |
| 2.4 | Masa tenggang 8 detik untuk `disconnected` | `useWebRTC.ts` | Matikan WiFi 5 detik lalu nyalakan → call pulih sendiri |
| 2.5 | ICE restart dua arah (bukan hanya initiator) | `useWebRTC.ts` | Kedua sisi bisa memulai pemulihan |
| 2.6 | Ganti SDP munging bitrate → `sender.setParameters()` | `useWebRTC.ts`, `callQuality.ts` | Bitrate terkontrol, tidak ada regex ke SDP |
| 2.7 | Bitrate adaptif berdasar jumlah peserta (2→800, 3→500, 4→350 kbps) | `useWebRTC.ts` | Bitrate turun otomatis saat peserta bertambah |
| 2.8 | Hard limit 4 peserta + pesan penolakan yang jelas | `useWebRTC.ts` | Peserta ke-5 ditolak dengan sopan |

**Kriteria selesai:** call 10 menit sambil berpindah WiFi↔seluler dua kali, tidak putus permanen.

---

### FASE 3 — Kelayakan Mobile 🟠 (2–3 hari)

| # | Tugas | File | Selesai kalau |
|---|---|---|---|
| 3.1 | Tambah `FOREGROUND_SERVICE`, `FOREGROUND_SERVICE_CAMERA`, `FOREGROUND_SERVICE_MICROPHONE` | `AndroidManifest.xml` | Manifest lolos build |
| 3.2 | Implementasi foreground service + notifikasi persisten | native Android | Tekan Home, call tetap hidup 5 menit |
| 3.3 | Audio focus + pemilihan rute (earpiece/speaker/bluetooth) | native + `native.ts` | Tombol speaker berfungsi, tidak bentrok dengan app musik |
| 3.4 | Sensor proximity — matikan layar saat HP di telinga | native | Layar mati saat ditempel telinga |
| 3.5 | Sembunyikan tombol screen share di platform native | `MeetingControls.tsx` | Tidak ada tombol rusak di APK |
| 3.6 | Layar penjelasan izin sebelum dialog sistem | `MeetingRoom.tsx` | Ada konteks sebelum dialog Android muncul |
| 3.7 | Pesan error kamera/mic yang bisa ditindaklanjuti | `MeetingRoom.tsx` | Tidak ada lagi "terjadi kesalahan" generik |
| 3.8 | Aktifkan `keep-awake` selama call, matikan setelah selesai | `MeetingRoom.tsx` | Layar tidak mati sendiri saat call |
| 3.9 | Bersihkan semua track saat unmount / back / app dibunuh | `MeetingRoom.tsx`, `callSession.ts` | Lampu kamera padam 100% setiap keluar room |

**Kriteria selesai:** call bertahan saat app di-background 5 menit, lampu kamera selalu padam setelah keluar.

---

### FASE 4 — Kualitas & Kejelasan 🟡 (1–2 hari)

| # | Tugas | Selesai kalau |
|---|---|---|
| 4.1 | Polling `getStats()` tiap 3 detik | Metrik tersedia di state |
| 4.2 | Indikator kualitas 3-bar di tiap `VideoTile` | Kualitas turun → ikon berubah dalam <5 detik |
| 4.3 | Banner "Koneksi tidak stabil" saat packet loss >5% | Pengguna tahu penyebabnya |
| 4.4 | Degradasi otomatis: matikan video, pertahankan audio saat bitrate kritis | Audio bertahan di jaringan buruk |
| 4.5 | `npm uninstall simple-peer @types/simple-peer` | Bundle mengecil, build tetap hijau |
| 4.6 | Deteksi speaking (Web Audio API) untuk highlight tile | Tile bicara ter-highlight |
| 4.7 | Kirim event kegagalan ICE ke tabel Supabase | Bisa lihat tingkat kegagalan pengguna nyata |

---

### FASE 5 — Backlog (belum dijadwalkan)

Jangan kerjakan sebelum Fase 0–4 selesai dan stabil di produksi.

- Screen share native Android via MediaProjection
- Rekaman panggilan
- Room >4 orang via SFU (mediasoup / LiveKit) — proyek terpisah
- Undang lewat link tanpa akun (pola briefing)
- Virtual background / blur
- Chat teks di dalam room
- Raise hand, room lock, room password
- TURN REST API credential (HMAC time-limited)

---

### 6.1 Ringkasan linimasa

```
Fase 0  ▓░░░░░░░░░░░░░░  ½ hari    Baseline
Fase 1  ▓▓░░░░░░░░░░░░░  1 hari    TURN          🔴 tanpa ini sisanya percuma
Fase 2  ▓▓▓▓░░░░░░░░░░░  2 hari    Stabilitas    🔴
Fase 3  ▓▓▓▓▓▓░░░░░░░░░  3 hari    Mobile        🟠
Fase 4  ▓▓▓▓░░░░░░░░░░░  2 hari    Kualitas      🟡
                                   ─────────
                                   ~8.5 hari kerja
```

**Kalau waktu cuma 1 hari:** kerjakan Fase 1 saja. Dampaknya paling besar.
**Kalau waktu 3 hari:** Fase 1 + 2. Ini sudah bikin app terasa "beres".

---

## BAGIAN 7 — Handling Scope

### 7.1 Definisi scope yang tegas

**MASUK scope proyek ini:**
- Panggilan 1-on-1 dan grup kecil (maks 4) yang andal
- Berfungsi di Android APK dan web
- Audio, video, mute, ganti kamera
- Dering, terima, tolak, missed call
- Pemulihan koneksi di jaringan mobile

**KELUAR scope (tolak dengan sopan, catat di backlog):**
- Room >4 orang
- Rekaman
- Virtual background
- iOS (belum ada target build)
- Screen share di Android native
- Transkripsi / AI notulen

### 7.2 Aturan menghadapi permintaan baru di tengah jalan

Ini yang paling sering menghancurkan proyek. Pakai aturan ini:

```
Ada permintaan fitur baru masuk
          │
          ▼
Apakah ini memperbaiki call yang GAGAL?
   ├─ YA  → masuk fase berjalan, kerjakan
   └─ TIDAK
          ▼
   Apakah ini bikin call yang berhasil jadi LEBIH BAIK?
   ├─ YA  → masuk Fase 4, jangan sekarang
   └─ TIDAK → Fase 5 backlog, tulis, lalu LUPAKAN
```

**Kalimat yang dipakai untuk menunda:** *"Ini bagus, saya catat ke backlog Fase 5. Tapi kalau saya kerjakan sekarang, TURN mundur sehari dan 30% panggilan tetap gagal. Setuju kita selesaikan TURN dulu?"*

Menolak dengan **alasan berbasis dampak** jauh lebih diterima daripada menolak dengan "tidak sempat".

### 7.3 Definition of Done — satu tugas dianggap selesai kalau

Semua enam terpenuhi. Kalau ada satu yang tidak, tugas belum selesai.

1. ✅ Berfungsi di **dua perangkat fisik**, jaringan berbeda (bukan localhost)
2. ✅ `npm run build` hijau — ingat `tsc -b` di Skillo galak, tidak boleh ada variabel/import tak terpakai (lihat `source_of_truth.md`)
3. ✅ `npm run lint` bersih
4. ✅ Sudah dites di **APK debug**, bukan cuma browser desktop
5. ✅ Tidak ada regresi di alur inti (call → terima → bicara → tutup)
6. ✅ Perubahan tercatat di `source_of_truth.md` kalau menyentuh arsitektur

### 7.4 Koordinasi multi-developer

`source_of_truth.md` menyebut ada developer lain (Diky) di repo ini, dan pernah terjadi konflik merge saat penambahan Capacitor.

Aturan:
- **`git fetch && git pull` sebelum mulai kerja, selalu.**
- Satu fase = satu branch: `feat/turn-server`, `feat/perfect-negotiation`
- **Jangan dua orang menyentuh `useWebRTC.ts` bersamaan.** File ini padat dan konfliknya berbahaya — konflik di logika signaling menghasilkan bug yang tidak kelihatan sampai runtime.
- Perubahan arsitektural diumumkan **sebelum** dikerjakan, bukan sesudah.
- `source_of_truth.md` diperbarui di PR yang sama, bukan "nanti".

---

## BAGIAN 8 — Handling Bug

### 8.1 Klasifikasi severity

| Level | Definisi | Target respons | Contoh |
|---|---|---|---|
| **S1 Blocker** | Fitur inti mati total | Perbaiki hari itu, hentikan pekerjaan lain | Call tidak pernah tersambung; app crash saat join |
| **S2 Major** | Sering gagal / rusak parah tapi ada jalan lain | Dalam sprint berjalan | Call putus saat ganti jaringan; kamera tidak mati saat keluar |
| **S3 Minor** | Mengganggu, tidak memblokir | Sprint berikutnya | Nama peserta salah tampil; ikon mute telat update |
| **S4 Cosmetic** | Estetika | Backlog | Padding tile tidak rata |

**Aturan:** bug yang menyebabkan **lampu kamera tetap menyala setelah call selesai** otomatis **S1**, bukan S2. Itu masalah privasi, dan pengguna akan uninstall.

### 8.2 Template laporan bug wajib

Laporan tanpa informasi ini **ditolak, minta dilengkapi**. WebRTC tidak bisa didebug tanpa konteks jaringan.

```markdown
### Judul
[Satu kalimat, spesifik]

### Perangkat & Lingkungan
- Perangkat A: [merk/model, Android versi]
- Perangkat B: [merk/model, Android versi]
- Jaringan A: [WiFi / Telkomsel / XL / ...]
- Jaringan B: [WiFi / Telkomsel / XL / ...]
- Build: [APK v1.1.0 / web vercel / dev localhost]

### Langkah Reproduksi
1.
2.
3.

### Hasil yang Diharapkan
### Hasil Aktual

### Bukti
- ICE connection state terakhir: [new/checking/connected/failed/disconnected]
- Log console (khususnya baris [useWebRTC])
- Screenshot / rekaman layar
- Screenshot chrome://webrtc-internals kalau ada

### Frekuensi
[Selalu / Sering / Kadang / Sekali]
```

**Kolom "Jaringan" itu yang paling penting** dan yang paling sering dilupakan orang. Sebagian besar bug WebRTC sebenarnya bug NAT traversal yang menyamar.

### 8.3 Pohon diagnosis — dari gejala ke akar masalah

```
Call gagal
    │
    ├─ Modal dering tidak muncul di sisi penerima?
    │     └─ Masalah di LAPIS SIGNALING (useCallSignaling.ts)
    │        Cek: channel 'skillo_call_signals' SUBSCRIBED?
    │              shouldProcessCallSignal() return true?
    │              userId/username sudah terisi di store?
    │
    ├─ Dering muncul, tapi setelah terima layar hitam?
    │     └─ Masalah di MEDIA (getUserMedia)
    │        Cek: izin kamera/mic diberikan?
    │              stream punya track? stream.getTracks().length
    │              di APK: izin Android sudah granted?
    │
    ├─ Kedua sisi lihat video sendiri, tidak lihat lawan?
    │     └─ Masalah di ICE / NAT  ← PALING SERING
    │        Cek: iceConnectionState nyangkut di 'checking'?
    │              TURN terkonfigurasi? ada candidate tipe 'relay'?
    │              → 90% kasus ini: TURN belum ada. Lihat GAP-1.
    │
    ├─ Tersambung lalu putus dalam beberapa detik?
    │     └─ Masalah GLARE atau grace period
    │        Cek: ada InvalidStateError di console?
    │              signalingState saat error apa?
    │              → Lihat GAP-2 & GAP-3
    │
    ├─ Video patah-patah / buram?
    │     └─ Masalah BANDWIDTH
    │        Cek: getStats() packet loss & available bitrate
    │              berapa peserta di room?
    │              → Lihat GAP-6, bitrate 1500 kebesaran
    │
    └─ Jalan di browser, gagal di APK?
          └─ Masalah PLATFORM/WEBVIEW
             Cek: getDisplayMedia (tidak ada di WebView — GAP-4)
                   izin di AndroidManifest
                   app di-background? (GAP-5)
```

### 8.4 Alur penanganan bug

```
Bug dilaporkan
    │
    ▼
1. TRIASE (maks 30 menit)
   Tentukan severity. Cek duplikat. Kalau info kurang → minta lengkapi, stop.
    │
    ▼
2. REPRODUKSI (wajib, jangan dilewati)
   Bisa direproduksi konsisten?
   ├─ TIDAK → tambah logging, tutup sebagai "butuh info", jangan tebak-tebak perbaikan
   └─ YA → lanjut
    │
    ▼
3. ISOLASI
   Pakai pohon diagnosis 8.3. Tentukan lapisannya:
   signaling / media / ICE / renegosiasi / platform
    │
    ▼
4. PERBAIKI
   Satu bug = satu commit. Jangan gabung beberapa perbaikan.
   Kalau menyentuh useWebRTC.ts, baca ulang seluruh alur state dulu.
    │
    ▼
5. VERIFIKASI
   Uji di 2 perangkat fisik, jaringan berbeda.
   Uji juga kasus yang berdekatan (perbaikan WebRTC sering menimbulkan regresi).
    │
    ▼
6. CEGAH BERULANG
   Tambah ke matriks tes regresi.
   Kalau ini jebakan arsitektural → tulis di source_of_truth.md bagian "Gotchas"
```

### 8.5 Aturan main saat memperbaiki bug

1. **Jangan perbaiki yang tidak bisa direproduksi.** Tambah logging, rilis, tunggu data. Menebak di WebRTC hampir selalu menghasilkan dua bug baru.
2. **Satu perubahan per iterasi tes.** Kalau ubah tiga hal lalu membaik, kamu tidak tahu mana yang bekerja — dan tidak bisa mengulanginya.
3. **`console.log` di WebRTC itu murah, pakai banyak.** Log setiap transisi state. Nanti dibersihkan sebelum rilis.
4. **Bug yang hilang sendiri biasanya race condition,** bukan sembuh. Cari penyebabnya.
5. **Bug yang cuma muncul di APK:** langsung `chrome://inspect` remote debug. Jangan menebak dari luar.
6. **Setelah memperbaiki bug WebRTC, tes ulang alur inti secara utuh.** Sistem ini punya state yang sangat berkaitan; perbaikan di satu tempat gampang merusak tempat lain.
7. **Bug yang sama muncul dua kali = masalah arsitektur,** bukan bug. Berhenti menambal, rancang ulang bagian itu.

### 8.6 Matriks tes regresi

Jalankan **setiap kali** `useWebRTC.ts` atau `useCallSignaling.ts` disentuh.

| # | Skenario | A | B | Hasil diharapkan |
|---|---|---|---|---|
| 1 | Call 1-on-1 dasar | WiFi | WiFi sama | Tersambung <5 detik |
| 2 | Beda jaringan | WiFi | Seluler | Tersambung <8 detik |
| 3 | **Dua-duanya seluler** | Seluler | Seluler beda operator | Tersambung (butuh TURN) |
| 4 | Tolak panggilan | — | — | Dering berhenti, tidak masuk room |
| 5 | Missed call | — | — | Setelah 35 detik → notifikasi missed |
| 6 | Mute/unmute | — | — | Ikon berubah di kedua sisi <2 detik |
| 7 | Kamera on/off | — | — | Tile berubah di kedua sisi |
| 8 | Ganti jaringan di tengah call | WiFi→Seluler | tetap | Pulih dalam <10 detik |
| 9 | App di-background 2 menit | — | — | Call tetap hidup (setelah Fase 3) |
| 10 | Keluar room | — | — | **Lampu kamera padam** |
| 11 | Join bersamaan | — | — | Keduanya tersambung, tidak ada glare |
| 12 | Room 3 orang | — | — | Semua saling lihat |
| 13 | Room 4 orang | — | — | Semua saling lihat, tidak crash |
| 14 | Peserta ke-5 masuk | — | — | Ditolak dengan pesan jelas |
| 15 | Web ↔ APK | Browser | APK | Interoperabilitas jalan |

Skenario **#3** adalah tes paling penting dan paling sering dilewatkan. Itu tes yang membuktikan TURN bekerja.

---

## BAGIAN 9 — Rangkuman Keputusan

| Pertanyaan | Keputusan | Alasan |
|---|---|---|
| Ganti stack ke briefing/MiroTalk? | **Tidak** | AGPL membunuh monetisasi; arsitektur sudah sama |
| Ganti Supabase ke socket.io? | **Tidak** | Supabase lebih sederhana, nol server tambahan |
| Mesh atau SFU? | **Mesh, maks 4** | Skillo bukan Zoom; SFU biayanya besar |
| TURN itu opsional? | **WAJIB** | Ini penyebab utama kegagalan panggilan |
| Copy kode dari referensi? | **Tidak** | Baca, pahami, tulis ulang sendiri |
| Kerjakan apa duluan? | **TURN (Fase 1)** | Dampak terbesar per satuan usaha |
| Screen share di Android? | **Tunda, sembunyikan tombolnya** | Butuh plugin native, effort besar |
| `simple-peer`? | **Hapus** | Tidak dipakai, tidak dimaintain |

### Tiga hal kalau cuma sempat baca satu bagian

1. **Deploy TURN server.** Tanpa itu, ~30% panggilan gagal dan tidak ada perbaikan kode yang bisa menolong.
2. **Perbaiki glare (perfect negotiation) dan grace period `disconnected`.** Dua bug ini yang bikin call "kadang jalan kadang tidak".
3. **Selalu uji di dua HP fisik dengan jaringan berbeda.** Localhost berbohong.

---

*Dokumen ini bagian dari `docs/`. Kalau ada perubahan arsitektural pada `useWebRTC.ts` atau `useCallSignaling.ts`, perbarui dokumen ini dan `source_of_truth.md` di PR yang sama.*
