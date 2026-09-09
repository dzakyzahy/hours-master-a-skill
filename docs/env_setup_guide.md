# Panduan Setup Environment Variables — Skillo

Dokumen ini menjelaskan cara mendapatkan dan mengisi setiap variabel di file `.env` untuk menjalankan semua fitur Skillo.

> **Penting**: Jangan pernah commit file `.env` ke Git. File ini sudah ada di `.gitignore`.

---

## Daftar Variabel & Cara Mendapatkannya

### 1. Supabase (Database & Auth)

**Variabel:**
```env
VITE_SUPABASE_URL=https://[project-ref].supabase.co
VITE_SUPABASE_ANON_KEY=[anon-key]
```

**Cara mendapatkan:**
1. Buka [supabase.com/dashboard](https://supabase.com/dashboard)
2. Login / buat akun gratis
3. Klik **New Project** → isi nama project → tunggu inisialisasi (~2 menit)
4. Buka **Settings** → **API**
5. Salin **Project URL** → paste ke `VITE_SUPABASE_URL`
6. Salin **anon public** key → paste ke `VITE_SUPABASE_ANON_KEY`

**Project Skillo yang aktif:** `mcqdqluxprpmrgofynaa` (region: ap-southeast-1 / Singapore)

---

### 2. Gemini AI (AI Mastery Generator)

**Variabel:**
```env
# Untuk dev lokal saja — user production input key sendiri via UI
VITE_GEMINI_API_KEY=AIzaSy...
```

**Cara mendapatkan (GRATIS):**
1. Buka [aistudio.google.com/app/apikey](https://aistudio.google.com/app/apikey)
2. Login dengan akun Google
3. Klik **Create API Key** → pilih project Google Cloud
4. Salin key yang muncul

> **Catatan**: Di production, jangan isi ini di `.env`. User akan input API key mereka sendiri melalui UI (Profile → Konfigurasi API Key). Key disimpan privat di Supabase `user_secrets` dengan RLS.

---

### 3. Google Auth & Drive Backup

**Variabel:**
```env
VITE_GOOGLE_CLIENT_ID=[client-id].apps.googleusercontent.com
```

**Cara mendapatkan:**
1. Buka [console.cloud.google.com](https://console.cloud.google.com)
2. Pilih atau buat project baru
3. Aktifkan dua API ini:
   - **Google Drive API** (untuk backup)
   - **Google Sign-In / Identity** (untuk auth)
4. Buka **APIs & Services** → **Credentials**
5. Klik **Create Credentials** → **OAuth 2.0 Client ID**
6. Pilih **Android** untuk app mobile, isi package name: `com.hoursmaster.app`
7. Salin **Client ID**

---

### 4. RevenueCat (Pembayaran In-App)

**Variabel:**
```env
VITE_RC_GOOGLE_API_KEY=[key]
```

**Lihat panduan lengkap di: [revenuecat_setup.md](./revenuecat_setup.md)**

**Ringkasan 3 tahap:**
| Tahap | Key Diawali | Digunakan Untuk |
|-------|-------------|-----------------|
| TEST | `test_...` | Development lokal, tidak ke Play Store |
| SANDBOX | `goog_...` | Testing dengan Google Play License Tester |
| PRODUCTION | `goog_...` | Rilis publik ke Play Store |

---

## Skema Database Supabase yang Diperlukan

Jalankan SQL ini di **Supabase SQL Editor** (sekali saja saat setup pertama):

```sql
-- Tabel Profil Pengguna
CREATE TABLE IF NOT EXISTS profiles (
  id              UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username        TEXT UNIQUE,
  email           TEXT,
  total_hours     REAL DEFAULT 0,
  ai_tokens       INTEGER DEFAULT 10,
  subscription_status TEXT DEFAULT 'free',
  subscription_expires_at TIMESTAMPTZ,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Rahasia User (untuk API key Gemini)
CREATE TABLE IF NOT EXISTS user_secrets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  secret_type TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, secret_type)
);

-- Tabel Status Timer
CREATE TABLE IF NOT EXISTS timer_state (
  project_id  TEXT NOT NULL,
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  is_active   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Tabel Pertemanan
CREATE TABLE IF NOT EXISTS friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Permintaan Pertemanan
CREATE TABLE IF NOT EXISTS friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending',
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- Row Level Security (RLS)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secrets ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- Policy: user hanya bisa akses data mereka sendiri
CREATE POLICY "profiles_self" ON profiles USING (auth.uid() = id);
CREATE POLICY "secrets_self" ON user_secrets USING (auth.uid() = user_id);
CREATE POLICY "timer_self" ON timer_state USING (auth.uid() = user_id);
CREATE POLICY "friends_self" ON friends USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "friend_req_self" ON friend_requests USING (auth.uid() = sender_id OR auth.uid() = receiver_id);

-- Trigger: otomatis buat profil saat user baru daftar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (NEW.id, NEW.email, split_part(NEW.email, '@', 1));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

---

## Membuat Akun Developer

Setelah Supabase dikonfigurasi, buat akun dengan:

```bash
# Interaktif
node setup-users.mjs

# Atau langsung
node setup-users.mjs --email=kamu@email.com --password=passwordkuat123 --name=namakamu
```

---

## Verifikasi Setup

Setelah semua selesai, jalankan:
```bash
npm run dev
```
Buka `http://localhost:5173` dan login dengan akun yang baru dibuat.
