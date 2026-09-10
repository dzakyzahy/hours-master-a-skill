# Cara Menjalankan Migrasi SQL & Memasang TURN Server

Dua prasyarat di Bagian 0 `docs/manual_test_checklist.md`. Tanpa keduanya sebagian besar tes akan gagal, dan gagalnya bukan karena bug.

---

## BAGIAN A — Migrasi SQL (5 menit)

### Kenapa perlu

Tabel `profiles` di database live (`mcqdqluxprpmrgofynaa`) saat ini hanya punya:

```
id, username, email, total_hours, current_skill
```

Sementara `src/pages/Profile.tsx` sudah menulis ke `avatar_url`, `title`, dan `bio`. Karena kolomnya tidak ada, setiap penyimpanan ditolak Postgres — dan dulu kegagalannya ditelan `try/catch`, jadi tidak pernah terlihat. Akibatnya foto profil hanya hidup di HP tempat diunggah.

### Langkahnya

1. Buka https://supabase.com/dashboard
2. Pilih project **`mcqdqluxprpmrgofynaa`**
3. Sidebar kiri → **SQL Editor**
4. Klik **New query**
5. Tempel ini:

```sql
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio        TEXT;
```

6. **Run** (atau Ctrl+Enter)

Harus muncul "Success. No rows returned". `IF NOT EXISTS` membuatnya aman dijalankan berulang kali.

### Verifikasi

Di SQL Editor yang sama:

```sql
SELECT avatar_url, title, bio FROM profiles LIMIT 1;
```

Kalau balik tanpa error (isinya `null` tidak apa-apa), migrasi berhasil.

Atau dari terminal mana pun:

```bash
curl -s "https://mcqdqluxprpmrgofynaa.supabase.co/rest/v1/profiles?select=avatar_url&limit=1" \
  -H "apikey: <VITE_SUPABASE_ANON_KEY dari .env>"
```

- Berhasil → `[{"avatar_url":null}]`
- Belum → `{"code":"42703", ... "column profiles.avatar_url does not exist"}`

### Catatan RLS

Kolom baru ikut policy `profiles` yang sudah ada — tidak perlu policy tambahan. Kalau setelah migrasi penyimpanan masih ditolak, berarti masalahnya di policy UPDATE, bukan di kolom. Cek: user harus boleh `UPDATE` baris dengan `id = auth.uid()`.

---

## BAGIAN B — TURN Server

### Kenapa wajib, bukan opsional

HP tidak punya alamat publik. Untuk menembus NAT, WebRTC mencoba tiga jalur berurutan: alamat lokal (`host`), alamat publik hasil STUN (`srflx`), dan terakhir relay lewat TURN.

Operator seluler Indonesia — Telkomsel, XL, Indosat, Tri — memakai **CGNAT (symmetric NAT)**. Di jaringan seperti itu jalur `srflx` gagal, dan satu-satunya yang tersisa adalah `relay`. Tanpa TURN, panggilan itu **tidak akan pernah tersambung**, dan gejalanya persis seperti bug: "nyambung tapi videonya hitam".

Perkiraan: ~20–30% panggilan butuh relay. Kalau kedua pihak pakai kuota seluler, angkanya bisa di atas 50%.

### Berapa bandwidth yang dipakai

Hanya panggilan yang **butuh** relay yang memakai kuota TURN. Panggilan yang berhasil P2P langsung tidak lewat server sama sekali.

Kasar-kasarnya, video call 1-on-1 di 800 kbps ≈ **6 MB/menit per arah**. Relay meneruskan dua arah, jadi ≈ **12 MB per menit panggilan yang direlay**.

---

### Opsi 1 — Metered (paling cepat, untuk tes) ⚡

Cocok untuk menyelesaikan checklist hari ini. Tidak butuh kartu kredit.

1. Daftar di https://www.metered.ca/stun-turn
2. Dashboard → ambil **username** dan **credential**
3. Isi `.env`:

```
VITE_TURN_URL=turn:global.relay.metered.ca:80,turn:global.relay.metered.ca:443,turns:global.relay.metered.ca:443?transport=tcp
VITE_TURN_USERNAME=<dari dashboard>
VITE_TURN_CREDENTIAL=<dari dashboard>
```

**Batasnya: 500 MB/bulan gratis.** Dengan hitungan 12 MB/menit, itu sekitar **40 menit panggilan yang direlay per bulan** — cukup untuk menuntaskan tes, tidak cukup untuk pengguna sungguhan. Paket berbayarnya mulai $99/bulan, terlalu mahal untuk skala Skillo.

### Opsi 2 — Cloudflare (paling murah untuk produksi) 💰

Bayar sesuai pakai, **$0.05 per GB**. Dengan 12 MB/menit, 1 GB ≈ 80 menit panggilan relay ≈ **$0.05**. Anycast, jadi latensi dari Indonesia bagus.

1. Dashboard Cloudflare → **Realtime** → **TURN**
2. Buat aplikasi TURN, ambil kredensialnya
3. Isi `.env`:

```
VITE_TURN_URL=turn:turn.cloudflare.com:3478,turns:turn.cloudflare.com:5349
VITE_TURN_USERNAME=<dari dashboard>
VITE_TURN_CREDENTIAL=<dari dashboard>
```

### Opsi 3 — CoTURN sendiri (paling murah kalau ramai, kontrol penuh) 🔧

VPS Singapura atau Jakarta ~Rp 50–80rb/bulan dengan bandwidth besar. Latensi terendah untuk pengguna Indonesia.

**1. Sewa VPS** (DigitalOcean/Vultr/Linode region Singapore, atau Biznet/IDCloudHost untuk Jakarta). Ubuntu 24.04, paket terkecil sudah cukup.

**2. Arahkan subdomain** `turn.domainmu.com` ke IP VPS (A record).

**3. Pasang:**

```bash
sudo apt update && sudo apt install -y coturn certbot
sudo certbot certonly --standalone -d turn.domainmu.com
sudo sed -i 's/#TURNSERVER_ENABLED/TURNSERVER_ENABLED/' /etc/default/coturn
```

**4. Tulis `/etc/turnserver.conf`:**

```conf
listening-port=3478
tls-listening-port=5349

# Ganti dengan IP publik VPS
external-ip=1.2.3.4

realm=turn.domainmu.com
server-name=turn.domainmu.com

# Kredensial statis. Ganti password dengan yang panjang & acak.
lt-cred-mech
user=skillo:GANTI_DENGAN_PASSWORD_PANJANG_ACAK

cert=/etc/letsencrypt/live/turn.domainmu.com/fullchain.pem
pkey=/etc/letsencrypt/live/turn.domainmu.com/privkey.pem

# Rentang port relay
min-port=49152
max-port=65535

fingerprint
stale-nonce=600
no-multicast-peers

# Jangan biarkan TURN dipakai menjangkau jaringan internal
denied-peer-ip=10.0.0.0-10.255.255.255
denied-peer-ip=172.16.0.0-172.31.255.255
denied-peer-ip=192.168.0.0-192.168.255.255
```

**5. Buka firewall:**

```bash
sudo ufw allow 3478/tcp
sudo ufw allow 3478/udp
sudo ufw allow 5349/tcp
sudo ufw allow 49152:65535/udp
sudo systemctl restart coturn && sudo systemctl enable coturn
sudo systemctl status coturn
```

Kalau pakai cloud provider, buka juga port yang sama di security group / firewall panel mereka — ini yang paling sering terlewat.

**6. Isi `.env`:**

```
VITE_TURN_URL=turn:turn.domainmu.com:3478,turns:turn.domainmu.com:5349
VITE_TURN_USERNAME=skillo
VITE_TURN_CREDENTIAL=<password yang tadi>
```

---

## Verifikasi TURN (apa pun opsinya) — JANGAN DILEWAT

1. Buka https://webrtc.github.io/samples/src/content/peerconnection/trickle-ice/
2. Hapus server bawaan, **Add server** dengan URL, username, dan password TURN-mu
3. Klik **Gather candidates**

**Yang harus muncul: minimal satu baris bertipe `relay`.**

- Ada `relay` → TURN jalan. Lanjutkan.
- Hanya `host` dan `srflx` → TURN **belum** jalan. Kredensial salah, atau port relay UDP 49152–65535 belum dibuka. Jangan lanjut ke tes 3.3, pasti gagal.

---

## Setelah TURN terpasang

```bash
npm run build:apk
```

Variabel `VITE_*` di-inline saat build, jadi **APK lama tidak akan memakai TURN baru** — wajib build ulang.

Kalau APK dibangun lewat GitHub Actions, tambahkan ketiganya sebagai **Repository secrets** (Settings → Secrets and variables → Actions) dan pastikan workflow meneruskannya ke langkah build.

Cek berhasil: buka Logcat saat app jalan. Peringatan berikut **harus hilang**:

```
[useWebRTC] No TURN server configured (VITE_TURN_URL)
```

Lalu jalankan tes 3.3 di checklist: dua HP, dua operator seluler berbeda.

---

## Catatan keamanan

Kredensial TURN statis ikut ter-*bundle* di dalam APK dan bisa diekstrak siapa pun yang membongkarnya. Orang lain bisa memakai TURN server-mu untuk lalu lintas mereka sendiri.

Untuk sekarang ini bisa diterima — `denied-peer-ip` di config sudah mencegah penyalahgunaan yang paling berbahaya (menjangkau jaringan internal), dan `total-quota` bisa ditambahkan untuk membatasi.

Solusi sebenarnya adalah **kredensial TURN berbatas waktu (HMAC)**: server membuat username/password yang kedaluwarsa dalam beberapa jam, aplikasi memintanya saat hendak menelepon. Itu butuh endpoint server sendiri — di CoTURN aktifkan `use-auth-secret` + `static-auth-secret`. Catat sebagai utang teknis; jangan menghambat rilis pertama.
