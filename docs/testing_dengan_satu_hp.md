# Menguji Video Call dengan Satu HP

Kamu punya satu HP dan tidak ada orang kedua. Itu bukan penghalang — **browser di PC adalah peserta yang sah**. Kodenya sama persis (Skillo web dan APK dibangun dari sumber yang sama), jadi panggilan HP ↔ browser adalah panggilan WebRTC dua-peer yang nyata, bukan simulasi.

Kamu sudah punya 3 akun: `zahy`, `diky`, `gg442`.

---

## Susunan dasar: HP + browser PC

1. Di PC, buka Skillo (URL Vercel produksi, atau `npm run dev` lalu buka dari IP LAN)
2. Login sebagai akun **berbeda** dari yang di HP
3. HP telepon akun itu, atau dua-duanya buka room yang sama

Ini sudah menutup **Bagian 1, 2, 5, dan 6** dari checklist.

**Penting:** kalau PC memakai `localhost` atau `npm run dev`, jangan percaya hasil koneksinya. Di localhost WebRTC hampir selalu berhasil karena tidak melewati NAT sama sekali. Untuk tes jaringan, pakai URL produksi dan **HP pakai kuota seluler, bukan WiFi yang sama**.

---

## Menambah peserta ke-3 dan ke-4 (tes 5.6–5.8)

Setiap tab browser bisa jadi peserta, asal sesi login-nya terpisah. Cara mendapat 4 sesi berbeda di satu PC:

| Peserta | Di mana |
|---|---|
| 1 | HP (APK) — akun `zahy` |
| 2 | Chrome biasa — akun `diky` |
| 3 | Chrome **Incognito** — akun `gg442` |
| 4 | Firefox atau Edge — daftar akun baru |

Jendela Incognito Chrome berbagi satu sesi, jadi dua tab incognito tetap dihitung satu akun. Gunakan browser berbeda untuk sesi ke-4.

Tes 5.8 (peserta ke-5 ditolak) tinggal buka satu browser lagi.

**Peringatan:** empat peserta di satu PC berarti PC-mu meng-encode 3 stream per tab. Kipas akan berisik dan framerate turun. Itu **normal dan bukan bug** — beban itu memang sifat topologi mesh. Yang diuji di sini cuma "semua saling terlihat" dan "counter menunjukkan 4/4".

---

## Tes 3.1 — beda jaringan (bisa)

- HP: **matikan WiFi**, pakai kuota seluler
- PC: tetap di WiFi/kabel

Ini sudah dua jaringan yang benar-benar berbeda dan menempuh jalur NAT sungguhan. **Harapan: tersambung <8 detik.**

## Tes 3.2 — pindah jaringan di tengah panggilan (bisa)

Saat panggilan HP ↔ PC berjalan, matikan WiFi di HP supaya berpindah ke seluler.

**Harapan: video beku beberapa detik, lalu pulih sendiri <10 detik, panggilan tidak putus.**

Ini menguji masa tenggang 8 detik untuk state `disconnected`.

## Tes 3.3 — membuktikan TURN, tanpa dua HP ✅

Tes aslinya butuh dua perangkat di dua jaringan seluler berbeda, supaya kedua sisi terkurung symmetric NAT dan terpaksa memakai relay.

Kamu bisa memaksa kondisi itu langsung. Di `.env`:

```
VITE_FORCE_TURN_RELAY=true
```

Lalu `npm run build:apk` dan build ulang web-nya.

Saklar ini memasang `iceTransportPolicy: 'relay'`, yang **membuang semua kandidat langsung** dan hanya menyisakan jalur TURN — persis batasan yang dialami peer di jaringan seluler. Kalau panggilan tetap tersambung dengan saklar ini menyala, TURN server-mu terbukti bekerja.

Kalau gagal tersambung padahal tanpa saklar berhasil, berarti **TURN-mu yang bermasalah**, bukan aplikasinya. Itu justru temuan yang kamu cari.

> **Kembalikan ke kosong setelah selesai menguji.** Kalau tertinggal `true`, semua panggilan dipaksa lewat relay: latensi naik dan tagihan bandwidth membengkak.

### Memastikan relay benar-benar dipakai

Di Chrome PC, buka `chrome://webrtc-internals` saat panggilan berjalan. Cari bagian **`candidate-pair (succeeded)`** dan lihat kolom tipe kandidat lokal/remote. Harus tertulis **`relay`**.

Ini bukti langsung, bukan tebakan.

---

## Yang tetap tidak bisa diuji sendirian

Jujur saja, tiga hal ini tidak punya penggantinya:

1. **Dua jaringan seluler berbeda operator sungguhan.** Saklar force-relay membuktikan TURN berfungsi, tapi tidak membuktikan perilaku di CGNAT Telkomsel vs XL yang sebenarnya. Pinjam HP siapa pun 5 menit — cukup satu panggilan.
2. **Join bersamaan (tes 3.4).** Butuh dua orang menekan tombol dalam selang <1 detik. Bisa didekati: buka dua tab browser lalu tekan Join bergantian secepat mungkin, atau pakai dua jendela berdampingan. Tidak sempurna, tapi cukup untuk memicu tabrakan offer.
3. **Panas dan baterai selama 15 menit (tes 4.10).** Ini murni soal HP, dan HP-mu memang satu — jadi ini justru bisa kamu lakukan sendiri. Tidak ada masalah di sini.

---

## Urutan yang saya sarankan

1. Jalankan migrasi SQL, uji **Bagian 1** (foto profil) di HP saja — tidak butuh peserta kedua sama sekali kecuali langkah 1.8 dan 1.9, pakai browser PC untuk itu
2. Pasang TURN, verifikasi lewat Trickle ICE
3. HP (seluler) ↔ browser PC (WiFi) → **Bagian 2** dan **tes 3.1, 3.2**
4. Nyalakan `VITE_FORCE_TURN_RELAY=true`, build ulang, ulangi satu panggilan → **membuktikan 3.3**. Matikan lagi setelahnya
5. Tambah tab browser → **Bagian 5** (kualitas dan batas peserta)
6. **Bagian 4** (perilaku mobile) murni di HP, tidak butuh peserta kedua untuk 4.1–4.9

Hanya langkah 3.4 dan verifikasi CGNAT sungguhan yang benar-benar menunggu orang kedua. Sisanya bisa kamu selesaikan sendiri malam ini.

---

## Kalau web-nya belum ter-deploy (kondisi saat ini)

Per 9 Sep 2026: **belum ada deployment web yang hidup.** GitHub Pages belum diaktifkan di repo, dan semua run workflow `deploy-web.yml` gagal. `https://skillo.app` yang tertulis di `VITE_APP_URL` adalah **situs milik orang lain**, bukan Skillo — kalau kamu mencoba login di sana, wajar saja gagal.

Database sendiri sehat: 3 profil (`zahy`, `diky`, `gg442`) terbaca normal, dan endpoint auth membalas `invalid_credentials` (artinya berfungsi, bukan salah konfigurasi).

### Jalan tercepat: dev server + tunnel

```bash
npm run dev -- --host
```

HP di WiFi yang sama bisa langsung membuka `http://<IP-PC>:5173`. Cukup untuk Bagian 1, 2, dan 5.

Untuk tes jaringan (3.1, 3.2, 3.3) HP harus pakai kuota seluler, dan IP LAN tidak bisa dijangkau dari sana. Butuh URL publik. Di terminal kedua:

```bash
npx cloudflared tunnel --url http://localhost:5173
```

Keluar URL `https://xxx.trycloudflare.com` — publik, HTTPS, tanpa akun. HTTPS-nya penting: `getUserMedia` tidak jalan di HTTP non-localhost.

`vite.config.ts` sudah disetel menerima host `.trycloudflare.com`, `.loca.lt`, dan `.ngrok-free.app`. Tanpa itu Vite menolak request dengan "Blocked request".

### Perbaikan sebenarnya

1. **Aktifkan GitHub Pages:** repo → Settings → Pages → Source: **GitHub Actions**. Lalu jalankan ulang workflow `deploy-web.yml`. URL-nya nanti `https://dzakyzahy.github.io/skillo/`.
2. **Perbaiki `VITE_APP_URL`** agar menunjuk ke URL itu, bukan `skillo.app`. Nilai sekarang membuat tautan undangan mengarah ke situs orang lain.
3. **Periksa `AndroidManifest.xml`** — masih ada App Link `android:host="skillo.app"`. Ganti dengan domain yang benar-benar kamu miliki, atau hapus.
