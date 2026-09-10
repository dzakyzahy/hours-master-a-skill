-- ============================================================
-- SKILLO — Supabase Database Schema Migration
-- Jalankan di: Supabase Dashboard → SQL Editor
-- Project: mcqdqluxprpmrgofynaa
-- ============================================================
-- 
-- URUTAN EKSEKUSI:
-- 1. Jalankan bagian "TABLES" terlebih dahulu
-- 2. Kemudian "ROW LEVEL SECURITY"
-- 3. Kemudian "TRIGGER"
-- 4. Kemudian "SPRINT 2 ADDITIONS" (kolom baru)
-- ============================================================

-- ============================================================
-- BAGIAN 1: TABLES
-- ============================================================

-- Tabel Profil Pengguna (extend dari auth.users)
CREATE TABLE IF NOT EXISTS profiles (
  id                      UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username                TEXT UNIQUE,
  email                   TEXT,
  total_hours             REAL DEFAULT 0,
  -- Kolom untuk Monetisasi (Sprint 3 / RevenueCat)
  ai_tokens               INTEGER DEFAULT 10,
  subscription_status     TEXT DEFAULT 'free' CHECK (subscription_status IN ('free', 'active', 'cancelled', 'expired')),
  subscription_expires_at TIMESTAMPTZ,
  -- Personalisasi profil (avatar_url = id preset, data URL, atau http(s) URL)
  avatar_url              TEXT,
  title                   TEXT,
  bio                     TEXT,
  -- Kolom untuk Cloud Storage Skillo (Sprint 2)
  cloud_storage_enabled   BOOLEAN DEFAULT FALSE,
  created_at              TIMESTAMPTZ DEFAULT NOW(),
  updated_at              TIMESTAMPTZ DEFAULT NOW()
);

-- Tabel Proyek (Sprint 2 — Skillo Cloud Storage, berbayar)
-- User gratis hanya simpan di LocalForage (HP)
-- User dengan subscription aktif juga sync ke sini untuk multi-device
CREATE TABLE IF NOT EXISTS projects (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  local_id     TEXT NOT NULL,         -- ID lokal dari ProjectDB (IndexedDB)
  name         TEXT NOT NULL,
  total_hours  REAL DEFAULT 0,
  daily_goal   REAL DEFAULT 2,
  hours_today  REAL DEFAULT 0,
  phases       JSONB NOT NULL DEFAULT '[]',
  deleted_at   TIMESTAMPTZ,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, local_id)
);

-- Tabel Rahasia User (API key Gemini, disimpan server-side)
CREATE TABLE IF NOT EXISTS user_secrets (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  secret_type  TEXT NOT NULL,
  secret_value TEXT NOT NULL,
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, secret_type)
);

-- Tabel Status Timer (live sync antar device)
CREATE TABLE IF NOT EXISTS timer_state (
  project_id  TEXT NOT NULL,
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  is_active   BOOLEAN DEFAULT FALSE,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (project_id, user_id)
);

-- Tabel Pertemanan
CREATE TABLE IF NOT EXISTS friends (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id_1   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  user_id_2   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id_1, user_id_2),
  CHECK (user_id_1 < user_id_2) -- cegah duplikat terbalik
);

-- Tabel Permintaan Pertemanan
CREATE TABLE IF NOT EXISTS friend_requests (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id   UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  status      TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(sender_id, receiver_id)
);

-- ============================================================
-- BAGIAN 2: ROW LEVEL SECURITY (RLS)
-- ============================================================

ALTER TABLE profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects        ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_secrets    ENABLE ROW LEVEL SECURITY;
ALTER TABLE timer_state     ENABLE ROW LEVEL SECURITY;
ALTER TABLE friends         ENABLE ROW LEVEL SECURITY;
ALTER TABLE friend_requests ENABLE ROW LEVEL SECURITY;

-- profiles: user hanya bisa baca/edit profil sendiri
-- tapi bisa baca username orang lain (untuk fitur search teman)
CREATE POLICY "profiles_read_own" ON profiles
  FOR SELECT USING (TRUE); -- semua user bisa baca (username, total_hours)
CREATE POLICY "profiles_update_own" ON profiles
  FOR UPDATE USING (auth.uid() = id);

-- projects: hanya pemilik yang bisa akses
CREATE POLICY "projects_owner" ON projects
  USING (auth.uid() = user_id);
CREATE POLICY "projects_insert_own" ON projects
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- user_secrets: sangat private, hanya pemilik
CREATE POLICY "secrets_owner" ON user_secrets
  USING (auth.uid() = user_id);

-- timer_state: hanya pemilik
CREATE POLICY "timer_owner" ON timer_state
  USING (auth.uid() = user_id);
-- Tapi perlu bisa dibaca teman untuk live sync — adjust jika perlu
CREATE POLICY "timer_insert_own" ON timer_state
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- friends: bisa dilihat oleh kedua pihak
CREATE POLICY "friends_participants" ON friends
  USING (auth.uid() = user_id_1 OR auth.uid() = user_id_2);
CREATE POLICY "friends_insert_own" ON friends
  FOR INSERT WITH CHECK (auth.uid() = user_id_1 OR auth.uid() = user_id_2);

-- friend_requests: bisa dilihat pengirim dan penerima
CREATE POLICY "friend_req_participants" ON friend_requests
  USING (auth.uid() = sender_id OR auth.uid() = receiver_id);
CREATE POLICY "friend_req_insert_own" ON friend_requests
  FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- ============================================================
-- BAGIAN 3: FUNGSI & TRIGGER
-- ============================================================

-- Fungsi: buat profil otomatis saat user baru mendaftar
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO profiles (id, email, username)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'username', split_part(NEW.email, '@', 1))
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Fungsi: update updated_at otomatis
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS profiles_updated_at ON profiles;
CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Fungsi: increment ai_tokens dengan aman (dipakai oleh Edge Function)
CREATE OR REPLACE FUNCTION increment_ai_tokens(user_uuid UUID, amount INTEGER)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET ai_tokens = GREATEST(0, ai_tokens + amount)
  WHERE id = user_uuid;
END;
$$;

-- ============================================================
-- BAGIAN 4: INDEX untuk performa query
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_friends_user1 ON friends(user_id_1);
CREATE INDEX IF NOT EXISTS idx_friends_user2 ON friends(user_id_2);
CREATE INDEX IF NOT EXISTS idx_friend_req_receiver ON friend_requests(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_timer_state_project ON timer_state(project_id);

-- ============================================================
-- BAGIAN 5: REALTIME (untuk live timer sync & presence)
-- ============================================================

-- Aktifkan Realtime untuk tabel timer_state
-- (Lakukan di Supabase Dashboard: Database → Replication → Tables)
-- ALTER PUBLICATION supabase_realtime ADD TABLE timer_state;
-- ALTER PUBLICATION supabase_realtime ADD TABLE profiles;

-- ============================================================
-- SELESAI. Verifikasi dengan:
-- SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';
-- ============================================================
