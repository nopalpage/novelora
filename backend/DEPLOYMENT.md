# Novelora — Panduan Deployment

## Arsitektur

```
novelora.my.id          → Cloudflare Pages  (akun: semua313)
api.novelora.my.id      → Cloudflare Workers (akun: thedarkcube313)
```

---

## BAGIAN 1 — Backend (deploy dulu, baru frontend)

### Akun: thedarkcube313

#### 1. Install dependencies
```bash
cd novelora-backend
npm install
```

#### 2. Login ke akun thedarkcube313
```bash
npx wrangler login
# Browser akan terbuka → login dengan akun thedarkcube313@...
```

#### 3. Deploy Worker
```bash
npm run deploy
# Output: https://novelora-api.<subdomain>.workers.dev
```

#### 4. Set secrets (wajib agar tidak error)
```bash
npx wrangler secret put SUPABASE_URL
# Paste URL Supabase, tekan Enter

npx wrangler secret put SUPABASE_SERVICE_KEY
# Paste Service Role Key, tekan Enter

npx wrangler secret put RESEND_API_KEY
# Paste Resend API Key, tekan Enter
```

#### 5. Test backend
```bash
curl https://novelora-api.<subdomain>.workers.dev/api/health
# Expected: {"ok":true,"ts":...,"runtime":"cloudflare-workers"}
```

---

## BAGIAN 2 — Setup Custom Domain api.novelora.my.id

### Di Cloudflare Dashboard (akun semua313 — yang manage DNS novelora.my.id)

1. Buka **Cloudflare Dashboard → novelora.my.id → DNS → Records**
2. Tambah record baru:
   ```
   Type  : CNAME
   Name  : api
   Target: novelora-api.<subdomain>.workers.dev
   Proxy : ON (orange cloud ☁️)
   TTL   : Auto
   ```

### Di Cloudflare Dashboard (akun thedarkcube313)

1. Buka **Workers & Pages → novelora-backend → Settings → Domains & Routes** (dulu bernama Triggers)
2. Klik tombol **+ Add** di bagian Domains & Routes, lalu pilih **Custom Domain**.
3. Masukkan: `api.novelora.my.id`
4. Klik **Add Custom Domain** → tunggu SSL provisioning (~1-2 menit)

#### Verifikasi custom domain
```bash
curl https://api.novelora.my.id/api/health
# Expected: {"ok":true,"ts":...,"runtime":"cloudflare-workers"}
```

---

## BAGIAN 3 — Frontend

### Akun: semua313

#### 1. Set environment variables di Cloudflare Pages
Di **Cloudflare Dashboard (akun semua313) → Pages → novelora-frontend → Settings → Environment Variables**:

| Variable | Value | Tipe |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://xxx.supabase.co` | Plain text |
| `VITE_SUPABASE_ANON_KEY` | `eyJ...` | Secret |
| `VITE_SITE_URL` | `https://novelora.my.id` | Plain text |
| `VITE_API_URL` | `https://api.novelora.my.id` | Plain text |

> ⚠️ Set untuk environment **Production** dan **Preview**

#### 2. Deploy via Cloudflare Pages Dashboard (cara termudah)
1. Buka **Cloudflare Dashboard (akun semua313) → Pages → Create application**
2. **Connect to Git** → pilih repo `novelora-frontend`
3. Build settings:
   ```
   Framework preset : None
   Build command    : npm install && npm run build
   Build output dir : dist
   Root directory   : /
   ```
4. Klik **Save and Deploy**

#### Atau deploy via CLI
```bash
cd novelora-frontend
npx wrangler login  # pastikan login ke akun semua313
npm run deploy
```

---

## BAGIAN 4 — Custom Domain Frontend

Di **Cloudflare Dashboard (akun semua313) → Pages → novelora-frontend → Custom Domains**:
1. Klik **Set up a custom domain**
2. Masukkan: `novelora.my.id`
3. Cloudflare akan otomatis tambah DNS record karena domain-nya di akun yang sama ✅

---

## Development Lokal

### Terminal 1 — Backend
```bash
cd novelora-backend

# Buat file secrets lokal (jangan di-commit!)
cp .env.example .dev.vars
# Edit .dev.vars dengan nilai asli

npm run dev
# Backend berjalan di http://localhost:8787
```

### Terminal 2 — Frontend
```bash
cd novelora-frontend/frontend

# Buat file env lokal
echo "VITE_API_URL=http://localhost:8787" > .env.local
echo "VITE_SUPABASE_URL=https://xxx.supabase.co" >> .env.local
echo "VITE_SUPABASE_ANON_KEY=eyJ..." >> .env.local

npm install
npm run dev
# Frontend berjalan di http://localhost:5173
```

---

## Checklist Final

- [ ] Backend deployed → `https://novelora-api.<subdomain>.workers.dev/api/health` ✅
- [ ] Secrets backend sudah diset (SUPABASE_URL, SUPABASE_SERVICE_KEY, RESEND_API_KEY)
- [ ] DNS CNAME `api` sudah ditambahkan di zone novelora.my.id
- [ ] Custom domain `api.novelora.my.id` sudah di-attach ke Worker
- [ ] Backend custom domain verified → `https://api.novelora.my.id/api/health` ✅
- [ ] Env vars frontend sudah diset di Cloudflare Pages (termasuk VITE_API_URL)
- [ ] Frontend deployed → `https://novelora.my.id` load tanpa error ✅
- [ ] Test login/register berfungsi
- [ ] Test ambil daftar novel berfungsi
- [ ] DevTools Network: semua `/api/` call menuju `api.novelora.my.id` ✅
