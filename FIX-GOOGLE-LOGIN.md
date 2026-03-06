# 🔧 Fix: Error 400 redirect_uri_mismatch — Google Login

## Root Cause

Error ini terjadi karena domain `novelora.my.id` **belum didaftarkan** sebagai Authorized Redirect URI di:
1. Google Cloud Console (OAuth credentials)
2. Supabase (Site URL & Redirect URLs)

---

## Langkah Fix (Wajib dilakukan semua)

### ✅ Step 1 — Google Cloud Console

1. Buka https://console.cloud.google.com
2. Pilih project yang kamu pakai untuk app ini
3. Pergi ke **APIs & Services → Credentials**
4. Klik pada **OAuth 2.0 Client ID** yang kamu buat sebelumnya
5. Di bagian **Authorized JavaScript origins**, tambahkan:
   ```
   https://novelora.my.id
   ```
6. Di bagian **Authorized redirect URIs**, pastikan ada:
   ```
   https://jpyltgwovdrturzvsplu.supabase.co/auth/v1/callback
   ```
   *(URI ini sudah fix — Supabase yang handle redirect, bukan domain kamu)*
7. Klik **Save**
8. ⚠️ Tunggu 5–10 menit agar perubahan aktif

---

### ✅ Step 2 — Supabase Dashboard

1. Buka https://supabase.com/dashboard/project/jpyltgwovdrturzvsplu
2. Pergi ke **Authentication → URL Configuration**
3. Ubah **Site URL** menjadi:
   ```
   https://novelora.my.id
   ```
4. Di bagian **Redirect URLs**, tambahkan semua URL berikut:
   ```
   https://novelora.my.id
   https://novelora.my.id/
   https://novelora.my.id/**
   ```
5. Klik **Save**

---

### ✅ Step 3 — Verifikasi Cloudflare Pages

1. Buka Cloudflare Dashboard → Pages → **novelora**
2. Pastikan nama project sudah `novelora` (bukan `novelnest`)
3. Settings → Environment Variables, pastikan ada:
   - `SUPABASE_URL` = `https://jpyltgwovdrturzvsplu.supabase.co`
   - `SUPABASE_SERVICE_KEY` = *(service role key dari Supabase)*
   - `RESEND_API_KEY` = *(API key dari Resend, untuk email verifikasi)*

---

## Cara Kerja Google OAuth di App Ini

```
User klik "Login Google"
  → Redirect ke Google
  → Setelah approve, Google redirect ke:
     https://jpyltgwovdrturzvsplu.supabase.co/auth/v1/callback
  → Supabase proses token, lalu redirect ke:
     https://novelora.my.id/  (Site URL yang kamu set)
  → User masuk ✅
```

**Kode di `auth.js` sudah benar** — menggunakan `window.location.origin` yang otomatis menggunakan domain saat ini.

---

## Checklist

- [ ] Google Cloud Console: JavaScript origin `https://novelora.my.id` ditambahkan
- [ ] Google Cloud Console: Redirect URI Supabase sudah ada
- [ ] Supabase Site URL: `https://novelora.my.id`  
- [ ] Supabase Redirect URLs: `https://novelora.my.id/**`
- [ ] Cloudflare Pages project bernama `novelora`
- [ ] Deploy ulang setelah push kode baru ini

---

## Jika Masih Error Setelah Setting

Cek di browser DevTools → Network tab saat klik tombol Google:
- Lihat URL yang dibuat, khususnya parameter `redirect_uri`
- Pastikan nilainya sama persis dengan yang ada di Google Cloud Console
