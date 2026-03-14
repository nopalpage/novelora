# Setup: Google Login + Email Verifikasi

## File yang diubah/ditambahkan

| File | Status |
|------|--------|
| `functions/api/[[route]].js` | ✏️ Dimodifikasi — tambah route verifikasi |
| `frontend/src/lib/auth.js` | ✏️ Dimodifikasi — tambah Google OAuth + verifikasi |
| `frontend/src/components/auth-modal.js` | ✏️ Dimodifikasi — UI baru |
| `supabase-migration-auth.sql` | ✨ Baru |

---

## Langkah 1 — Jalankan SQL Migration

Di Supabase Dashboard → SQL Editor, jalankan isi file `supabase-migration-auth.sql`.

---

## Langkah 2 — Aktifkan Google OAuth di Supabase

1. Buka **Supabase Dashboard → Authentication → Providers**
2. Aktifkan **Google**
3. Isi **Client ID** dan **Client Secret** dari Google Cloud Console:
   - Pergi ke https://console.cloud.google.com
   - Buat project baru (atau pakai yang ada)
   - APIs & Services → Credentials → Create OAuth 2.0 Client
   - Application type: **Web application**
   - Authorized redirect URIs: `https://<project-ref>.supabase.co/auth/v1/callback`
   - Copy Client ID & Secret ke Supabase
4. Simpan

---

## Langkah 3 — Daftar Resend (gratis, 3000 email/bulan)

1. Buka https://resend.com → Sign up gratis
2. API Keys → Create API Key
3. Copy API Key-nya

### Ganti `from` email di route.js
Di `functions/api/[[route]].js`, cari baris:
```
from: 'Novelora <noreply@novelora.my.id>',
```
Ganti dengan domain kamu yang sudah diverifikasi di Resend.

---

## Langkah 4 — Tambah Secret di Cloudflare Pages

Cloudflare Dashboard → Pages → novelora → Settings → Variables and Secrets:

| Variable | Value |
|----------|-------|
| `RESEND_API_KEY` | API key dari Resend |
| `SUPABASE_URL` | URL Supabase project kamu |
| `SUPABASE_SERVICE_KEY` | Service role key Supabase |

Set semua sebagai **Secret** (bukan plain text).

---

## Langkah 5 — Tambah dependency Resend (opsional)

Implementasi ini menggunakan `fetch` langsung ke Resend API — **tidak perlu install package apapun**.

---

## Alur Lengkap

### Register dengan Email
1. User isi form → klik **Buat Akun**
2. Supabase buat user (belum verified)
3. Backend kirim kode 6 digit ke email
4. Modal berganti ke halaman masukkan kode
5. User masukkan kode → backend verifikasi
6. `profiles.email_verified = true` → selesai ✅

### Login dengan Google
1. User klik **Lanjutkan dengan Google**
2. Redirect ke halaman Google login
3. Setelah login Google, redirect kembali ke app
4. Supabase otomatis buat session
5. User langsung masuk ✅ (Google user = sudah terverifikasi)
