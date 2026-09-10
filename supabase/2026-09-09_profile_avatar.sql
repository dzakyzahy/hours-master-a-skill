-- Personalisasi profil: foto/tema avatar, judul, bio.
-- Kolom ini sudah dipakai src/pages/Profile.tsx dan src/store.ts tapi belum pernah
-- dibuat di database live (mcqdqluxprpmrgofynaa) — tanpa ini, foto profil hanya
-- tersimpan di perangkat dan hilang saat login di HP lain.
-- Jalankan sekali di Supabase Dashboard > SQL Editor.

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS title      TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS bio        TEXT;
