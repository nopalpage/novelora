# 🔧 NOVELORA — Fix Guide v1.3.1
## Memperbaiki Google OAuth Error + Admin Role System

---

## 🚨 Root Cause Error

URL di screenshot menunjukkan:
```
jpyltgwovdrturzvsplu.supabase.co/novelora.my.id?error=server_error
  &error_code=unexpected_failure
  &error_description=Database+error+saving+new+user
```

**Dua masalah terpisah:**

### Masalah 1 — "Database error saving new user"
Supabase gagal membuat baris baru di tabel `profiles` saat user login pertama kali via Google.
Penyebab: **trigger `on_auth_user_created` belum ada atau bermasalah**, atau **RLS policy terlalu ketat** sehingga INSERT ke `profiles` diblokir.

### Masalah 2 — "requested path is invalid"
Redirect URL yang diterima Supabase adalah `jpyltgwovdrturzvsplu.supabase.co/novelora.my.id` — artinya `novelora.my.id` diperlakukan sebagai **path** bukan domain. Ini terjadi karena `redirectTo` dikirim tanpa `https://` prefix, atau domain belum terdaftar di Supabase Allowed Redirect URLs.

---

## ✅ Langkah-Langkah Fix (Urutan Penting!)

---

### LANGKAH 1 — Jalankan SQL Migration

**Di Supabase Dashboard → SQL Editor**, copy-paste dan jalankan seluruh isi file:
```
supabase-migration-fix-v1.3.1.sql
```

Yang dikerjakan SQL ini:
- Tambahkan kolom `role`, `is_banned`, `avatar_url` di tabel `profiles` jika belum ada
- Buat/update trigger `on_auth_user_created` yang robust (pakai `EXCEPTION` handler)
- Perbaiki semua RLS policies di tabel `profiles`
- Buat tabel `verification_codes`
- Backfill profil untuk user lama yang belum punya profil

**Jangan lupa ganti email admin:**
```sql
UPDATE public.profiles SET role = 'admin'
WHERE email = 'your-admin-email@gmail.com';  -- ← ganti ini
```

---

### LANGKAH 2 — Set Supabase URL Configuration

Di **Supabase Dashboard → Authentication → URL Configuration**:

```
Site URL:
  https://novelora.my.id

Additional Redirect URLs (tambahkan SEMUA baris ini):
  https://novelora.my.id/
  https://novelora.my.id/**
  http://localhost:5173/
  http://localhost:5173/**
```

> ⚠️ Pastikan TIDAK ada typo (spasi, trailing slash ganda, dll.)

---

### LANGKAH 3 — Set Environment Variables di Cloudflare Pages

Di **Cloudflare Pages → novelora → Settings → Environment Variables**:

| Variable | Value |
|----------|-------|
| `VITE_SUPABASE_URL` | `https://jpyltgwovdrturzvsplu.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | *(anon key dari Supabase)* |
| `VITE_SITE_URL` | `https://novelora.my.id` |
| `SUPABASE_URL` | `https://jpyltgwovdrturzvsplu.supabase.co` |
| `SUPABASE_SERVICE_KEY` | *(service_role key dari Supabase)* |
| `RESEND_API_KEY` | *(API key Resend.com jika dipakai)* |

> 💡 `VITE_*` dipakai frontend (Vite), sisanya dipakai backend (Cloudflare Functions/Hono).

---

### LANGKAH 4 — Copy File yang Sudah Diperbaiki

Copy file-file berikut ke repositori GitHub kamu:

```
FIXES/
├── frontend/
│   ├── src/
│   │   ├── lib/
│   │   │   └── auth.js           ← copy ke frontend/src/lib/auth.js
│   │   └── pages/
│   │       └── admin/
│   │           └── users.js      ← copy ke frontend/src/pages/admin/users.js
└── supabase-migration-fix-v1.3.1.sql  ← jalankan di Supabase SQL Editor
```

---

### LANGKAH 5 — Trigger Deploy

Push ke GitHub → Cloudflare Pages akan auto-deploy.

Atau manual: **Cloudflare Pages → Deployments → Retry last deployment**

---

## 🔍 Verifikasi Fix Berhasil

Setelah deploy, coba:

1. **Buka** `https://novelora.my.id` di incognito window
2. **Klik** "Sign in" → "Lanjutkan dengan Google"
3. **Pilih** akun Google
4. **Harus redirect** kembali ke `https://novelora.my.id/` (bukan ke Supabase URL)
5. **Cek** di Supabase → Table Editor → `profiles` — harus ada baris baru

---

## 🛡️ Cara Cek Role Admin di Frontend

Gunakan helper dari `auth.js`:

```javascript
import { isAdmin, isAuthor, getRole, onAuthChange } from '../lib/auth.js'

// Cek di component/page
onAuthChange(({ loading, user, role }) => {
  if (loading) return

  if (!user) {
    // Belum login
    navigate('/login')
    return
  }

  if (!isAdmin()) {
    // Sudah login tapi bukan admin
    navigate('/')
    return
  }

  // Aman, user adalah admin
  renderAdminContent()
})

// Atau langsung
if (isAdmin()) {
  showAdminMenu()
}

if (isAuthor()) {
  showWriterTools()
}
```

---

## 📋 Role Matrix

| Role     | Baca Novel | Bookmark | Tulis Novel | Admin Panel |
|----------|:----------:|:--------:|:-----------:|:-----------:|
| `reader` | ✅ | ✅ | ❌ | ❌ |
| `author` | ✅ | ✅ | ✅ | ❌ |
| `admin`  | ✅ | ✅ | ✅ | ✅ |

**Ubah role user:** Masuk Admin Panel → Users → pilih role dari dropdown.

---

## 🆘 Troubleshooting

### Error masih muncul setelah fix?

1. **Hard refresh** browser (`Ctrl+Shift+R`)
2. Pastikan SQL migration sudah dijalankan dan **tidak ada error** di output
3. Cek Supabase → Logs → Auth untuk melihat error detail
4. Pastikan `VITE_SITE_URL` di Cloudflare **sudah disave** dan deployment sudah **selesai**

### "Profile not found" setelah login Google?

Jalankan bagian BACKFILL di SQL migration:
```sql
INSERT INTO public.profiles (id, email, username, role, created_at, updated_at)
SELECT u.id, u.email,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email,'@',1)),
  'reader', u.created_at, NOW()
FROM auth.users u
WHERE NOT EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = u.id)
ON CONFLICT (id) DO NOTHING;
```

### Admin panel tidak bisa diakses meski sudah set role?

1. **Sign out** lalu **sign in kembali** — role di-cache di session
2. Atau buka DevTools → Application → Local Storage → hapus key `nn-auth`

---

*Generated for Novelora v1.3.1 — 2025*
