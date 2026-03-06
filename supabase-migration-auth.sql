-- ================================================================
--  NovelNest — Auth Migration
--  Jalankan di Supabase SQL Editor
-- ================================================================

-- 1. Tambah kolom email_verified ke profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS email_verified BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS provider       TEXT DEFAULT 'email'; -- 'email' | 'google'

-- Update existing users jadi verified (karena sudah terlanjur daftar sebelumnya)
UPDATE profiles SET email_verified = TRUE WHERE email_verified IS NULL OR email_verified = FALSE;

-- 2. Buat tabel verification_codes
CREATE TABLE IF NOT EXISTS verification_codes (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email      TEXT NOT NULL,
  code       TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used       BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vcodes_email ON verification_codes(email);
CREATE INDEX IF NOT EXISTS idx_vcodes_expires ON verification_codes(expires_at);

-- 3. Auto-hapus kode yang sudah expired (opsional, jalankan manual tiap hari)
-- DELETE FROM verification_codes WHERE expires_at < NOW() - INTERVAL '1 hour';

-- 4. RLS untuk verification_codes — hanya bisa diakses via service key (backend)
ALTER TABLE verification_codes ENABLE ROW LEVEL SECURITY;
-- Tidak ada policy publik = hanya service_role yang bisa akses (aman)
