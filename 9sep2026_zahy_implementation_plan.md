# Skillo — Master Implementation Plan
## Backend, Data, Storage & Payment

**Tanggal:** 9 September 2026  
**Status:** Menunggu Approval untuk Eksekusi

---

## Ringkasan Masalah yang Ditemukan

Setelah audit menyeluruh di seluruh codebase, ditemukan hal-hal berikut:

| # | Masalah | Tingkat Risiko | File |
|---|---------|---------------|------|
| 1 | Email & password developer hardcoded di source code | 🔴 KRITIS | `setup-users.mjs`, `store.ts`, `development_guide.md` |
| 2 | Login function punya logika `isDiky`/`isZahy` — identity bergantung nama spesifik | 🔴 KRITIS | `store.ts` |
| 3 | `DEFAULT_TEAM_MEMBERS` hardcoded (data kontak developer publik) | 🔴 KRITIS | `store.ts` |
| 4 | Biometric fallback `await login(targetUser, '123')` — siapapun bisa bypass dengan password `123` di offline mode | 🔴 KRITIS | `Login.tsx` |
| 5 | RevenueCat key masih `test_...` di `.env` | 🟡 PENTING | `.env` |
| 6 | Supabase Edge Function untuk RevenueCat webhook belum ada | 🟡 PENTING | (belum dibuat) |
| 7 | `syncToSupabase()` adalah stub `console.log` — projects tidak pernah tersimpan ke cloud | 🟡 PENTING | `store.ts` |
| 8 | Projects default "Ethical Hacking" dengan 120 jam hardcoded muncul untuk semua user baru — **ini akar bug "120 jam"** | 🟡 PENTING | `store.ts` |
| 9 | Presence/online status hanya via localStorage — tidak real-time, tidak akurat di mobile | 🟠 SEDANG | `store.ts` |
| 10 | `BackupService.ts` upload ke Google Drive root (bukan `appDataFolder`) | 🟠 SEDANG | `BackupService.ts` |
| 11 | `VITE_GEMINI_API_KEY` (fallback dari env) tidak boleh masuk ke `.env` production — bisa ekspos key | 🟠 SEDANG | `.env`, `store.ts` |
| 12 | Tidak ada panduan setup environment untuk developer baru | 🟢 MINOR | (belum ada) |

---

## Arsitektur Storage — Strategi Tiga Lapisan

Ini adalah keputusan desain utama yang memengaruhi seluruh implementasi:

```
┌─────────────────────────────────────────────────────────────────┐
│                    SKILLO STORAGE STRATEGY                      │
├──────────────────┬──────────────────┬───────────────────────────┤
│   TIER 1: LOKAL  │  TIER 2: GDRIVE  │    TIER 3: SKILLO CLOUD   │
│   (Default)      │  (Gratis)        │    (Berbayar)             │
├──────────────────┼──────────────────┼───────────────────────────┤
│ • Zustand +      │ • Backup manual  │ • Supabase PostgreSQL      │
│   LocalStorage   │   atau otomatis  │ • Real-time sync semua     │
│ • IndexedDB via  │ • JSON file di   │   perangkat                │
│   LocalForage    │   Google Drive   │ • Collaboration features   │
│ • Chat & project │   (appDataFolder)│ • Priority support         │
│   tersimpan di   │ • Restore saat   │ • Unlock via token Skillo  │
│   perangkat      │   install ulang  │   (beli ke developer)      │
│ • GRATIS         │ • GRATIS         │ • Rp 15.000/bulan (est.)  │
│ • OFFLINE FIRST  │ • Butuh akun GG  │ • Butuh internet           │
└──────────────────┴──────────────────┴───────────────────────────┘

Seperti WhatsApp:
- Chat tersimpan di HP (Tier 1) ✓
- Bisa backup ke Google Drive (Tier 2) ✓  
- Fitur premium butuh langganan (Tier 3) ✓
```

---

## ⚠️ User Review Required

> [!CAUTION]
> **Credentials Asli di Source Code**: Email `dzakyzr3@gmail.com`, `dikydwi442@gmail.com` beserta passwordnya tersimpan di `store.ts` dan `setup-users.mjs`. Harus dihapus sebelum repository jadi publik.

> [!WARNING]
> **Bug 120 Jam**: Project "Ethical Hacking" dengan 120 jam hardcoded ada di initial state `store.ts`. Ini muncul untuk SEMUA user baru karena `zustand/persist` menyimpannya di localStorage. Fix-nya: hapus default project dan bersihkan localStorage lama.

> [!IMPORTANT]
> **Supabase Edge Function diperlukan untuk payment**: Tanpa ini, user yang bayar tidak dapat token. Perlu akses ke Supabase CLI atau Dashboard untuk deploy function.

---

## Urutan Eksekusi (Berdasarkan Prioritas)

---

## SPRINT 1 — Security Critical (Hari Ini)
*Harus selesai sebelum APK dirilis ke publik*

### 1.1 Hapus Hardcoded Credentials

#### [MODIFY] [setup-users.mjs](file:///d:/HoursAppCounter/setup-users.mjs)
Ubah dari script khusus developer menjadi script setup generik yang bisa digunakan siapapun. Baca credentials dari environment variables atau argumen CLI.

**Perubahan:**
- Hapus array `users` yang berisi email & password asli
- Baca dari `SETUP_USER_EMAIL`, `SETUP_USER_PASSWORD`, `SETUP_USER_NAME` env vars
- Tambah validasi: jika env tidak ada, tampilkan petunjuk jelas
- Tambah opsi CLI: `node setup-users.mjs --email=xxx --password=xxx --name=xxx`

---

#### [MODIFY] [store.ts](file:///d:/HoursAppCounter/src/store.ts)
Ini perubahan terbesar dan paling kritis:

**Hapus:**
- `DEFAULT_TEAM_MEMBERS` object (berisi data kontak pribadi developer)
- Logic `isDiky`, `isZahy` dari fungsi `login`
- Email hardcoded `dikydwi442@gmail.com`, `dzakyzr3@gmail.com`
- Password fallback `'123'` dan `'diky123hours'`, `'zahy123hours'`
- Default project "Ethical Hacking" dengan 120 jam → **Fix bug 120 jam**
- `friends: DEFAULT_TEAM_MEMBERS.diky` sebagai initial state

**Ganti dengan:**
- Login murni via Supabase Auth — tidak ada fallback username spesifik
- Untuk mode dev offline: akun generik dari env `VITE_DEV_EMAIL` / `VITE_DEV_PASSWORD` (bukan hardcode)
- `friends: []` sebagai initial state — load dari Supabase setelah login
- `projects: []` sebagai initial state — load dari LocalForage setelah login

---

#### [MODIFY] [Login.tsx](file:///d:/HoursAppCounter/src/pages/Login.tsx)
- Hapus `await login(targetUser, '123')` dari biometric handler — ganti dengan session check yang proper
- Biometric hanya bisa digunakan jika sudah ada session Supabase yang valid (token belum expired)
- Jika session expired, arahkan ke login form

---

#### [MODIFY] [development_guide.md](file:///d:/HoursAppCounter/docs/development_guide.md)
- Hapus kredensial `diky / 123` dari dokumentasi
- Ganti dengan instruksi: "Buat akun dev sendiri via `setup-users.mjs`"

---

### 1.2 Fix Bug Jam 120 & Default Projects

#### Akar Masalah
Di `store.ts`, initial state `projects` berisi satu project hardcoded:
```ts
projects: [{ id: 'default-1', name: 'Ethical Hacking', totalHours: 120, ... }]
```
Karena `zustand/persist` menyimpan ini ke localStorage, **semua user yang pernah buka app ini mendapatkan project palsu "Ethical Hacking" dengan 120 jam.**

#### Fix
1. Ubah `projects: []` di initial state
2. Tambah `storage_version: 1` ke zustand persist state
3. Saat app load, cek versi storage. Jika versi lama (tidak ada `storage_version`), hapus project dengan id `'default-1'`
4. Load projects dari **LocalForage per-user** setelah login berhasil

---

## SPRINT 2 — Storage Architecture (Local-First + Google Drive)

### 2.1 Project Storage — LocalForage + Google Drive

#### [NEW] [src/services/ProjectDB.ts](file:///d:/HoursAppCounter/src/services/ProjectDB.ts)
Service baru untuk manajemen project lokal menggunakan LocalForage:

```
ProjectDB (IndexedDB via LocalForage)
├── saveProject(userId, project)
├── getProjects(userId) → Project[]
├── deleteProject(userId, projectId)
└── exportAllAsJSON(userId) → string
```

- **Per-user isolation**: key menggunakan `projects_${userId}` agar data tidak tercampur
- Projects TIDAK lagi disimpan di Zustand persist (cegah cross-user contamination)

---

#### [MODIFY] [src/services/BackupService.ts](file:///d:/HoursAppCounter/src/services/BackupService.ts)
Perbaikan backup ke Google Drive:
- Ubah `parents: ['appDataFolder']` — ini sudah benar tapi scope juga harus benar
- Tambah **fungsi restore**: cari file `SkilloBackup.json` di Drive, download, import
- Tambah **auto-backup opsional**: saat user buka app setelah 24 jam, tawarkan backup otomatis
- Pisahkan backup **chat** dan **projects** menjadi file terpisah untuk efisiensi

**Alur Backup seperti WhatsApp:**
```
User klik "Backup ke Google Drive"
  → Sign in Google (sekali saja)
  → Upload SkilloProjects_{userId}.json
  → Upload SkilloChats_{userId}.json
  → Simpan timestamp backup terakhir

Saat Install Ulang:
  → Login Supabase
  → Cek apakah ada backup di Drive
  → Tawarkan restore otomatis
```

---

### 2.2 Chat Storage — LocalForage (Sudah Ada, Perlu Diperkuat)

#### [MODIFY] [src/services/ChatDB.ts](file:///d:/HoursAppCounter/src/services/ChatDB.ts)
- Sudah menggunakan LocalForage ✅
- Tambah **per-user isolation**: key `chats_${userId}_${friendId}`
- Tambah `getUnreadCount(userId, friendId)` untuk badge notifikasi
- Tambah `markAsRead(userId, friendId)` 

---

### 2.3 Skillo Cloud Storage — Supabase (Berbayar)

#### Schema Baru di Supabase — Tabel `projects`
```sql
CREATE TABLE projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID REFERENCES profiles(id) ON DELETE CASCADE,
  name         TEXT NOT NULL,
  total_hours  REAL DEFAULT 0,
  daily_goal   REAL DEFAULT 2,
  hours_today  REAL DEFAULT 0,
  phases       JSONB NOT NULL DEFAULT '[]',
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  deleted_at   TIMESTAMPTZ,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "user_owns_projects" ON projects
  USING (auth.uid() = user_id);
```

#### Di `store.ts` — Tambah `cloudSyncEnabled` flag
```
user.subscription_status === 'active' → cloudSyncEnabled = true
  → Project tersimpan di KEDUANYA: LocalForage (offline) + Supabase (cloud)
  → Real-time sync antar perangkat via Supabase Realtime

cloudSyncEnabled = false (gratis)
  → Project hanya di LocalForage
  → Backup manual ke Google Drive
```

---

## SPRINT 3 — RevenueCat Payment (3 Tahap)

### Tahap 1: TEST MODE (Sekarang — untuk development)

**Kondisi saat ini:** Key `test_zikjOUsZaSTGGTgzcyeiFZnJEEz` sudah ada di `.env`

**Apa yang terjadi di test mode:**
- RevenueCat memproses "pembelian" tanpa ke Google Play
- Tidak ada charge ke user
- Cocok untuk testing UI flow dan debugging webhook

**Yang perlu dilakukan sekarang:**
1. Di RevenueCat Dashboard → buat **Product** dan **Offering** (belum ada = UI akan kosong)
2. Set up Webhook URL di RC Dashboard → arahkan ke Supabase Edge Function (perlu deploy dulu)
3. Test webhook trigger manual dari RC Dashboard → cek log

---

### Tahap 2: SANDBOX MODE (Sebelum Go-Live)

**Syarat:**
- App sudah terdaftar di Google Play Console (Internal Testing / Closed Testing)
- Gunakan Google Play **License Tester** accounts
- Ganti key ke `goog_xxx` production key dari RevenueCat

**Yang perlu dilakukan:**
1. Dapat `goog_xxx` key dari RevenueCat Dashboard → `Apps → Your App → API Keys`
2. Update `.env`: `VITE_RC_GOOGLE_API_KEY=goog_xxx`
3. Build release APK (signed), upload ke Google Play Internal Testing
4. Test pembelian dengan License Tester account — tidak dicharge
5. Pastikan webhook diterima dan Edge Function memproses dengan benar

---

### Tahap 3: PRODUCTION (Saat Rilis Publik)

**Syarat:**
- App sudah approved di Play Store
- RevenueCat Products sudah linked ke Google Play
- Edge Function sudah tested dan live
- `versionCode` dinaikkan

**Yang perlu dilakukan:**
1. Sama seperti Sandbox tapi dengan real users dan real billing
2. Monitor RevenueCat dashboard untuk event failures
3. Set up alert di Supabase untuk Edge Function errors

---

### 3.1 Supabase Schema untuk Payment

```sql
-- Tambah kolom ke tabel profiles yang sudah ada
ALTER TABLE profiles 
  ADD COLUMN IF NOT EXISTS ai_tokens INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS subscription_status TEXT DEFAULT 'free',
  ADD COLUMN IF NOT EXISTS subscription_expires_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS total_hours REAL DEFAULT 0;
```

---

### 3.2 Supabase Edge Function: RevenueCat Webhook

#### [NEW] [supabase/functions/revenuecat-webhook/index.ts](file:///d:/HoursAppCounter/supabase/functions/revenuecat-webhook/index.ts)

```
POST /functions/v1/revenuecat-webhook
Authorization: Bearer {RC_WEBHOOK_SECRET}

Flow:
1. Validasi Authorization header vs RC_WEBHOOK_SECRET env var
2. Parse JSON body → ambil event.type dan subscriber.original_app_user_id
3. Switch case berdasarkan event type:
   - INITIAL_PURCHASE / RENEWAL → update profiles set ai_tokens += 100, subscription_status = 'active'
   - CANCELLATION → update subscription_status = 'cancelled'
   - EXPIRATION → update subscription_status = 'expired'
4. Return 200 OK ke RevenueCat
```

**Env vars yang dibutuhkan di Supabase Edge Function secrets:**
- `REVENUECAT_WEBHOOK_SECRET` — dari RC Dashboard → Integrations → Webhooks
- `SUPABASE_SERVICE_ROLE_KEY` — dari Supabase Settings (otomatis tersedia di Edge Functions)

---

### 3.3 Env Variables Update

#### [MODIFY] [.env](file:///d:/HoursAppCounter/.env)

```env
# =============================================
# SUPABASE (Database, Auth, Realtime)
# =============================================
VITE_SUPABASE_URL=https://mcqdqluxprpmrgofynaa.supabase.co
VITE_SUPABASE_ANON_KEY=eyJ...

# =============================================
# GEMINI AI (hanya untuk dev lokal, JANGAN di production)  
# User di production input key mereka sendiri via UI
# =============================================
# VITE_GEMINI_API_KEY=AIzaSy...  ← Komentari/hapus di production build

# =============================================
# GOOGLE AUTH & DRIVE BACKUP
# =============================================
VITE_GOOGLE_CLIENT_ID=695078683840-oj0hpbqnoummp7e23996bep641foulr7.apps.googleusercontent.com

# =============================================
# REVENUECAT — PAYMENT
# =============================================
# TAHAP 1 (sekarang - test): test_zikjOUsZaSTGGTgzcyeiFZnJEEz
# TAHAP 2 (sandbox): goog_xxxxx (dari RC Dashboard)
# TAHAP 3 (production): goog_xxxxx production
VITE_RC_GOOGLE_API_KEY=test_zikjOUsZaSTGGTgzcyeiFZnJEEz

# =============================================
# DEV ONLY — Hapus sebelum commit ke production branch
# =============================================
# VITE_DEV_EMAIL=test@yourdomain.com
# VITE_DEV_PASSWORD=your_dev_password
```

---

## SPRINT 4 — Presence System (Online/Offline Akurat)

### Masalah Saat Ini
- `checkFriendsOnlineStatus()` hanya baca `localStorage` item `presence_${username}`
- Threshold 12 detik — terlalu cepat, tidak akurat di mobile (background kill)
- Tidak ada mekanisme heartbeat yang konsisten

### Fix: Supabase Realtime Presence

#### [MODIFY] [src/store.ts](file:///d:/HoursAppCounter/src/store.ts)
Tambah fungsi `startPresenceHeartbeat()`:
```
- Saat login → join Supabase Realtime channel 'global-presence'
- Kirim heartbeat setiap 30 detik (track: {userId, username, lastSeen})
- Dengarkan join/leave event → update friends online status di state
- Saat app masuk background (Capacitor app state change) → kirim 'offline' signal
- Saat logout → leave channel
```

---

## SPRINT 5 — Bug Fixes & QA

### 5.1 Fix Bug Jam 120 (Root Cause + Fix)

**Root cause ditemukan di `store.ts` line 484-499:**
```ts
// INI MASALAHNYA:
projects: [
  {
    id: 'default-1',
    name: 'Ethical Hacking', 
    totalHours: 120,  // ← 120 jam hardcoded!
    ...
  }
]
```

**Fix:**
1. Ubah `projects: []` di initial state
2. Tambah migration di `partialize` untuk bersihkan project `default-1` dari localStorage lama
3. Load projects dari `ProjectDB.ts` (LocalForage) setelah login

---

### 5.2 OTA Update Testing

#### [MODIFY] [src/services/UpdaterService.ts](file:///d:/HoursAppCounter/src/services/UpdaterService.ts)
- Review dan pastikan `@capgo/capacitor-updater` sudah dikonfigurasi dengan benar
- Tambah UI feedback saat update tersedia dan sedang didownload
- Tambah rollback mechanism jika update gagal

---

## SPRINT 6 — Modul AI & Docs

### 6.1 Panduan Setup Environment

#### [NEW] [docs/env_setup_guide.md](file:///d:/HoursAppCounter/docs/env_setup_guide.md)
Dokumen komprehensif untuk onboarding developer baru:
- Cara mendapatkan Supabase credentials
- Cara setup Google Cloud Console (OAuth Client ID)
- Cara mendapatkan RevenueCat API keys (test vs production)
- Cara deploy Supabase Edge Function
- Diagram alur pembayaran end-to-end
- Panduan RevenueCat test → sandbox → production

#### [NEW] [docs/revenuecat_setup.md](file:///d:/HoursAppCounter/docs/revenuecat_setup.md)
Panduan khusus RevenueCat step-by-step untuk Android:
- Setup product di Google Play Console
- Link product ke RevenueCat
- Konfigurasi webhook ke Supabase
- Testing dengan test key
- Checklist sebelum Go-Live

### 6.2 Kelas AI Module (Backend)

#### Tambahan kolom di `profiles` Supabase:
```sql
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS ai_learning_data JSONB DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS ai_tokens_used INTEGER DEFAULT 0;
```

#### [NEW] [src/services/AiService.ts](file:///d:/HoursAppCounter/src/services/AiService.ts)
Perbaikan AiService yang sudah ada:
- Tambah token tracking: setiap generate plan → kurangi `ai_tokens` user
- Jika `ai_tokens === 0` → tampilkan paywall (beli token)
- Tambah fallback: user bisa input API key sendiri (gratis, tanpa beli token)
- Backend validasi: Supabase Edge Function sebagai proxy Gemini (opsional, lebih aman)

---

## File yang Akan Diubah / Dibuat — Summary

### [MODIFY] Files
| File | Sprint | Perubahan Utama |
|------|--------|----------------|
| `setup-users.mjs` | 1 | Hapus hardcode, baca dari env/CLI |
| `src/store.ts` | 1, 2, 4 | Hapus credentials, fix storage, tambah presence heartbeat |
| `src/pages/Login.tsx` | 1 | Fix biometric bypass vulnerability |
| `src/services/BackupService.ts` | 2 | Perbaikan Google Drive (appDataFolder + restore) |
| `src/services/ChatDB.ts` | 2 | Per-user isolation |
| `android/app/build.gradle` | Pre-release | Naikkan `versionCode` |
| `.env` | 3 | Tambah variabel, komentar panduan |
| `docs/development_guide.md` | 1 | Hapus kredensial hardcode |

### [NEW] Files
| File | Sprint | Deskripsi |
|------|--------|-----------|
| `src/services/ProjectDB.ts` | 2 | LocalForage storage per-user untuk projects |
| `supabase/functions/revenuecat-webhook/index.ts` | 3 | Edge Function payment webhook |
| `docs/env_setup_guide.md` | 6 | Panduan setup lengkap semua key |
| `docs/revenuecat_setup.md` | 6 | Panduan RevenueCat Android step-by-step |

---

## Verification Plan

### Setelah Sprint 1:
- `npm run build` → tidak ada TypeScript error
- `npm run build:apk` → APK berhasil dibuild
- Login dengan akun baru (bukan diky/zahy) → berhasil masuk
- Tidak ada `diky`, `zahy`, `dikydwi442`, `dzakyzr3` di source code

### Setelah Sprint 2:
- Buat project baru → muncul di app
- Restart/refresh app → project masih ada (dari LocalForage)
- Klik "Backup ke Google Drive" → file terupload
- Uninstall + reinstall → restore dari Drive → project kembali

### Setelah Sprint 3:
- Klik tombol beli di app → RevenueCat flow terbuka
- Event masuk ke RC Dashboard
- Webhook trigger → log di Supabase Edge Function muncul
- User mendapatkan token AI setelah "pembelian" berhasil

### Play Store Release Checklist:
- [ ] Tidak ada hardcoded credentials di source code
- [ ] `versionCode` dinaikkan dari `1` ke `2`
- [ ] RevenueCat key sudah production (saat rilis asli)
- [ ] Supabase Edge Function sudah deployed
- [ ] Build dengan `assembleRelease` + keystore signing
- [ ] Bug 120 jam terfix — user baru mulai dari 0 jam
