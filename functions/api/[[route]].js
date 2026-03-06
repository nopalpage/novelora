/**
<<<<<<< HEAD
 * Novelora — Hono Backend (Cloudflare Pages Functions)
=======
 * NovelNest — Hono Backend (Cloudflare Pages Functions)
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
 * All /api/* routes
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { cache } from "hono/cache";
import { etag } from "hono/etag";
import { compress } from "hono/compress";
import { handle } from "hono/cloudflare-pages";
import { createClient } from "@supabase/supabase-js";

const app = new Hono().basePath("/api");

/* ── Middleware ── */
app.use(
  "*",
  cors({
<<<<<<< HEAD
    origin: ["https://novelora.my.id", "http://localhost:5173"],
=======
    origin: ["https://novelnest.pages.dev", "http://localhost:5173"],
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  }),
);
app.use("*", compress());
app.use("*", etag());

/* ── Helpers ── */
const db = (c) => {
  const url = c.env?.SUPABASE_URL;
  const key = c.env?.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};
const ok = (c, data, meta = {}) => c.json({ ok: true, data, ...meta });
const err = (c, msg, status = 400) =>
  c.json({ ok: false, message: msg }, status);

/* ── Auth guard ── */
async function requireAdmin(c, next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return err(c, "Unauthorized", 401);
  const supabase = db(c);
  if (!supabase) return next(); // dev mode
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return err(c, "Unauthorized", 401);
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") return err(c, "Forbidden", 403);
  c.set("user", user);
  c.set("profile", profile);
  return next();
}

async function requireAuth(c, next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return err(c, "Unauthorized", 401);
  const supabase = db(c);
  if (!supabase) {
    c.set("user", { id: "dev" });
    return next();
  }
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return err(c, "Unauthorized", 401);
  c.set("user", user);
  return next();
}

/* ══════════════════════════════════════════
   NOVELS
══════════════════════════════════════════ */
app.get(
  "/novels",
  cache({ cacheName: "novels", cacheControl: "max-age=60,s-maxage=120" }),
  async (c) => {
    const {
      origin,
      genre,
      status,
      sort = "popular",
      limit = 20,
      page = 1,
    } = c.req.query();
    const supabase = db(c);
    if (!supabase) return ok(c, MOCK_NOVELS);
    let q = supabase
      .from("novel_summary")
      .select("*")
      .range((page - 1) * limit, page * limit - 1);
    if (origin) q = q.eq("origin", origin);
    if (status) q = q.eq("status", status);
    if (sort === "popular") q = q.order("total_views", { ascending: false });
    if (sort === "new") q = q.order("created_at", { ascending: false });
    if (sort === "rating") q = q.order("avg_rating", { ascending: false });
    const { data, error, count } = await q;
    if (error) return err(c, error.message, 500);
    return ok(c, data, { total: count });
  },
);

app.get("/novels/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return err(c, "Query too short");
  const supabase = db(c);
  if (!supabase)
    return ok(
      c,
      MOCK_NOVELS.filter((n) =>
        n.title.toLowerCase().includes(q.toLowerCase()),
      ),
    );
  const { data, error } = await supabase
    .from("novels")
    .select("id,title,slug,cover_url,origin,status,avg_rating,total_views")
    .textSearch("title", q, { type: "websearch" })
    .limit(20);
  if (error) return err(c, error.message, 500);
  return ok(c, data);
});

app.get(
  "/novels/:id",
  cache({ cacheName: "novel", cacheControl: "max-age=120,s-maxage=300" }),
  async (c) => {
    const supabase = db(c);
    if (!supabase)
      return ok(
        c,
        MOCK_NOVELS.find((n) => n.id === c.req.param("id")) || MOCK_NOVELS[0],
      );
    const { data, error } = await supabase
      .from("novel_summary")
      .select("*")
      .eq("id", c.req.param("id"))
      .single();
    if (error) return err(c, "Not found", 404);
    return ok(c, data);
  },
);

app.post("/novels", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const { data, error } = await supabase
    .from("novels")
    .insert({ ...body, author_id: c.get("user").id })
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.put("/novels/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase
    .from("novels")
    .update({ ...body, updated_at: new Date() })
    .eq("id", c.req.param("id"))
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.delete("/novels/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase
    .from("novels")
    .delete()
    .eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   CHAPTERS
══════════════════════════════════════════ */
app.get(
  "/novels/:id/chapters",
  cache({ cacheName: "chapters", cacheControl: "max-age=60" }),
  async (c) => {
    const supabase = db(c);
    if (!supabase) return ok(c, []);
    const { data, error } = await supabase
      .from("chapters")
      .select("id,chapter_num,title,word_count,created_at")
      .eq("novel_id", c.req.param("id"))
      .eq("is_draft", false)
      .order("chapter_num", { ascending: true });
    if (error) return err(c, error.message, 500);
    return ok(c, data);
  },
);

app.get("/chapters/latest", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data } = await supabase
    .from("chapters")
    .select("id,chapter_num,title,novel_id,novels(title)")
    .eq("is_draft", false)
    .order("created_at", { ascending: false })
    .limit(10);
  return ok(c, data || []);
});

app.get(
  "/chapters/:id",
  cache({
    cacheName: "chapter-content",
    cacheControl: "max-age=300,s-maxage=600",
  }),
  async (c) => {
    const supabase = db(c);
    if (!supabase) return err(c, "Not found", 404);
    const { data, error } = await supabase
      .from("chapters")
      .select("id,novel_id,chapter_num,title,content,word_count,created_at")
      .eq("id", c.req.param("id"))
      .eq("is_draft", false)
      .single();
    if (error) return err(c, "Not found", 404);
    c.executionCtx?.waitUntil(
      supabase.rpc("increment_chapter_views", {
        chapter_id: c.req.param("id"),
      }),
    );
    return ok(c, data);
  },
);

app.post("/chapters", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const { data, error } = await supabase
    .from("chapters")
    .insert(body)
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.put("/chapters/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase
    .from("chapters")
    .update({ ...body, updated_at: new Date() })
    .eq("id", c.req.param("id"))
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.delete("/chapters/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase
    .from("chapters")
    .delete()
    .eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   RANKINGS
══════════════════════════════════════════ */
app.get(
  "/rankings/weekly",
  cache({ cacheName: "rankings", cacheControl: "max-age=300,s-maxage=600" }),
  async (c) => {
    const supabase = db(c);
    if (!supabase) return ok(c, MOCK_NOVELS.slice(0, 10));
    const { data } = await supabase
      .from("novel_summary")
      .select("*")
      .order("total_views", { ascending: false })
      .limit(20);
    return ok(c, data || MOCK_NOVELS);
  },
);

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
app.get("/analytics/summary", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, MOCK_ANALYTICS_SUMMARY);
  const [views, novels, users, chapters] = await Promise.all([
    supabase.from("page_views").select("id", { count: "exact", head: true }),
    supabase
      .from("novels")
      .select("id", { count: "exact", head: true })
      .neq("status", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase
      .from("chapters")
      .select("id", { count: "exact", head: true })
      .eq("is_draft", false),
  ]);
  return ok(c, [
    {
      icon: "👁",
      label: "Total Page Views",
      value: _fmt(views.count || 0),
      delta: 12,
      up: true,
    },
    {
      icon: "📚",
      label: "Active Novels",
      value: _fmt(novels.count || 0),
      delta: 3,
      up: true,
    },
    {
      icon: "👥",
      label: "Users",
      value: _fmt(users.count || 0),
      delta: 8,
      up: true,
    },
    {
      icon: "📖",
      label: "Chapters",
      value: _fmt(chapters.count || 0),
      delta: 5,
      up: true,
    },
  ]);
});

app.get("/analytics/pageviews", requireAdmin, async (c) => {
  const days = parseInt(c.req.query("days") || "7");
  const supabase = db(c);
  if (!supabase)
    return ok(c, { labels: MOCK_CHART_LABELS, values: MOCK_CHART_VALUES });
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase
    .from("page_views")
    .select("created_at")
    .gte("created_at", since);
  // Group by day
  const byDay = {};
  (data || []).forEach((v) => {
    const day = v.created_at.slice(0, 10);
    byDay[day] = (byDay[day] || 0) + 1;
  });
  const labels = [];
  const values = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    labels.push(d.toLocaleDateString("en", { weekday: "short" }));
    values.push(byDay[key] || 0);
  }
  return ok(c, { labels, values });
});

app.get("/analytics/top-novels", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, MOCK_NOVELS.slice(0, 5));
  const { data } = await supabase
    .from("novels")
    .select("id,title,total_views,avg_rating")
    .order("total_views", { ascending: false })
    .limit(10);
  return ok(c, data || []);
});

/* ══════════════════════════════════════════
   ADS
══════════════════════════════════════════ */
app.get("/ads", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, MOCK_ADS);
  const { data } = await supabase.from("ads").select("*").eq("active", true);
  return ok(c, data || MOCK_ADS);
});

app.post("/ads", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const { data, error } = await supabase
    .from("ads")
    .insert(body)
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.put("/ads/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase
    .from("ads")
    .update(body)
    .eq("id", c.req.param("id"))
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.delete("/ads/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase
    .from("ads")
    .delete()
    .eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

app.post("/ads/:id/impression", async (c) => {
  const supabase = db(c);
  if (supabase)
    supabase.rpc("increment_ad_impressions", { ad_id: c.req.param("id") });
  return ok(c, { ok: true });
});

app.post("/ads/:id/click", async (c) => {
  const supabase = db(c);
  if (supabase)
    supabase.rpc("increment_ad_clicks", { ad_id: c.req.param("id") });
  return ok(c, { ok: true });
});

/* ══════════════════════════════════════════
   USER FEATURES
══════════════════════════════════════════ */
// Bookmarks
app.get("/me/bookmarks", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data } = await supabase
    .from("bookmarks")
    .select("*, novel_summary(*)")
    .eq("user_id", c.get("user").id);
  return ok(c, data || []);
});

app.post("/me/bookmarks", requireAuth, async (c) => {
  const { novel_id } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { novel_id });
  const { error } = await supabase
    .from("bookmarks")
    .upsert({ user_id: c.get("user").id, novel_id });
  if (error) return err(c, error.message);
  return ok(c, { novel_id });
});

app.delete("/me/bookmarks/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", c.get("user").id)
    .eq("novel_id", c.req.param("novelId"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

// Likes
app.post("/me/likes", requireAuth, async (c) => {
  const { novel_id } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { novel_id });
  await supabase
    .from("novel_likes")
    .upsert({ user_id: c.get("user").id, novel_id });
  await supabase.rpc("increment_novel_likes", { novel_id });
  return ok(c, { novel_id });
});

app.delete("/me/likes/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  await supabase
    .from("novel_likes")
    .delete()
    .eq("user_id", c.get("user").id)
    .eq("novel_id", c.req.param("novelId"));
  return ok(c, { deleted: true });
});

// Reading progress
app.put("/me/progress", requireAuth, async (c) => {
  const { chapter_id, position } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { chapter_id });
  await supabase.from("reading_progress").upsert({
    user_id: c.get("user").id,
    chapter_id,
    position,
    updated_at: new Date(),
  });
  return ok(c, { chapter_id });
});

app.get("/me/progress/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, null);
  const { data } = await supabase
    .from("reading_progress")
    .select("chapter_id, position, chapters(chapter_num, title, novel_id)")
    .eq("user_id", c.get("user").id)
    .eq("chapters.novel_id", c.req.param("novelId"))
    .order("updated_at", { ascending: false })
    .limit(1)
    .single();
  return ok(c, data);
});

/* ══════════════════════════════════════════
   USERS (admin)
══════════════════════════════════════════ */
app.get("/users", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data } = await supabase
    .from("profiles")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
  return ok(c, data || []);
});

app.put("/users/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase
    .from("profiles")
    .update(body)
    .eq("id", c.req.param("id"))
    .select()
    .single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

/* ══════════════════════════════════════════
   AUTH
══════════════════════════════════════════ */
app.post("/auth/login", async (c) => {
  const { email, password } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { user: { email }, mock: true });
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error) return err(c, error.message, 401);
  return ok(c, { user: data.user, session: data.session });
});

app.post("/auth/register", async (c) => {
  const { email, password, username } = await c.req.json();
  if (!email || !password || !username) return err(c, "All fields required");
  const supabase = db(c);
  if (!supabase) return ok(c, { user: { email }, mock: true });
  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: false,
    user_metadata: { username },
  });
  if (error) return err(c, error.message, 400);
  return ok(c, { user: data.user });
});

/* ──────────────────────────────────────────
   CUSTOM EMAIL VERIFICATION
────────────────────────────────────────── */

app.post("/auth/send-verification", async (c) => {
  const { email } = await c.req.json();
  if (!email) return err(c, "Email diperlukan");

  const supabase = db(c);
  if (!supabase) return ok(c, { sent: true, mock: true });

  // Generate kode 6 digit
  const code = Math.floor(100000 + Math.random() * 900000).toString();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString(); // 10 menit

  // Simpan kode ke DB (upsert berdasarkan email — timpa kode lama)
  const { error: dbErr } = await supabase
    .from("verification_codes")
    .upsert(
      { email, code, expires_at: expiresAt, used: false },
      { onConflict: "email" },
    );
  if (dbErr) {
    // Jika tidak bisa upsert (belum ada constraint), insert saja
    await supabase
      .from("verification_codes")
      .insert({ email, code, expires_at: expiresAt, used: false });
  }

  // Kirim email via Resend
  const resendKey = c.env?.RESEND_API_KEY;
  if (resendKey) {
    const html = `
      <!DOCTYPE html>
      <html><head><meta charset="utf-8"></head>
      <body style="font-family:-apple-system,sans-serif;background:#f0efea;padding:40px 20px;margin:0;">
        <div style="max-width:420px;margin:0 auto;background:#1a1a18;border-radius:16px;padding:36px;color:#e8e0d4;">
          <div style="text-align:center;margin-bottom:28px;">
            <div style="font-size:36px;margin-bottom:10px;">📚</div>
<<<<<<< HEAD
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#e8c89a;letter-spacing:-0.5px;">Novelora</h1>
=======
            <h1 style="margin:0;font-size:22px;font-weight:700;color:#e8c89a;letter-spacing:-0.5px;">NovelNest</h1>
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
          </div>
          <h2 style="font-size:17px;color:#e8e0d4;margin:0 0 8px;">Kode Verifikasi Akun Kamu</h2>
          <p style="color:#9c9c90;font-size:14px;margin:0 0 24px;line-height:1.6;">
            Masukkan kode berikut di halaman verifikasi. Kode hanya berlaku <strong style="color:#e8e0d4;">10 menit</strong>.
          </p>
          <div style="background:#2a2a28;border:1px solid #3a3a38;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px;">
            <span style="font-size:40px;font-weight:800;color:#e8c89a;letter-spacing:14px;font-variant-numeric:tabular-nums;">${code}</span>
          </div>
          <p style="color:#6b6b65;font-size:12px;margin:0;line-height:1.6;">
            Jika kamu tidak merasa mendaftar, abaikan email ini.<br>
            Jangan bagikan kode ini ke siapapun.
          </p>
        </div>
      </body></html>
    `;
    await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${resendKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
<<<<<<< HEAD
        from: "Novelora <noreply@novelora.my.id>", // ganti dengan domain kamu
        to: [email],
        subject: `${code} — Kode Verifikasi Novelora`,
=======
        from: "NovelNest <noreply@novelora.my.id>", // ganti dengan domain kamu
        to: [email],
        subject: `${code} — Kode Verifikasi NovelNest`,
>>>>>>> bb63f203f9f6ba2fcfda878a8fe7f55974e94c48
        html,
      }),
    });
  }

  return ok(c, { sent: true });
});

app.post("/auth/verify-code", async (c) => {
  const { email, code } = await c.req.json();
  if (!email || !code) return err(c, "Email dan kode diperlukan");

  const supabase = db(c);
  if (!supabase) return ok(c, { verified: true, mock: true });

  // Cek kode: valid, belum dipakai, belum expired
  const { data, error } = await supabase
    .from("verification_codes")
    .select("id")
    .eq("email", email)
    .eq("code", code)
    .eq("used", false)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  if (error || !data)
    return err(c, "Kode tidak valid atau sudah kedaluwarsa", 400);

  // Tandai kode sebagai sudah dipakai
  await supabase
    .from("verification_codes")
    .update({ used: true })
    .eq("id", data.id);

  // Update profile: email_verified = true
  await supabase
    .from("profiles")
    .update({ email_verified: true })
    .eq("email", email);

  return ok(c, { verified: true });
});

/* ── Health ── */
app.get("/health", (c) =>
  c.json({ ok: true, ts: Date.now(), runtime: "cloudflare-pages-functions" }),
);
app.notFound((c) => err(c, "Not found", 404));

export const onRequest = handle(app);

/* ── Helpers ── */
function _fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

/* ── Fallback ── */
const MOCK_NOVELS = [
  {
    id: "1",
    title: "Sang Raja yang Dilupakan",
    author_name: "Ariana Kusuma",
    origin: "id",
    status: "ongoing",
    avg_rating: 4.8,
    total_views: 890000,
    chapter_count: 142,
  },
  {
    id: "2",
    title: "異世界転生の英雄譚",
    author_name: "YamazakiRen",
    origin: "jp",
    status: "ongoing",
    avg_rating: 4.9,
    total_views: 2400000,
    chapter_count: 387,
  },
];
const MOCK_ADS = [
  {
    id: "mock-1",
    slot: "banner",
    active: true,
    title: "Bookwalker",
    description: "Global novel store",
    cta: "Shop Now",
    url: "#",
    icon: "🛒",
    impressions: 45200,
    clicks: 904,
  },
  {
    id: "mock-2",
    slot: "sidebar",
    active: true,
    title: "NovelAI",
    description: "Write with AI",
    cta: "Try Free",
    url: "#",
    icon: "🤖",
    impressions: 28100,
    clicks: 1124,
  },
  {
    id: "mock-3",
    slot: "inline",
    active: true,
    title: "Go Premium",
    description: "Ad-free reading",
    cta: "Upgrade",
    url: "#",
    icon: "⭐",
    impressions: 87400,
    clicks: 1748,
  },
];
const MOCK_ANALYTICS_SUMMARY = [
  { icon: "👁", label: "Total Page Views", value: "284K", delta: 12, up: true },
  { icon: "📚", label: "Active Novels", value: "12.4K", delta: 3, up: true },
  { icon: "👥", label: "Users", value: "47.8K", delta: 8, up: true },
  { icon: "📖", label: "Chapters", value: "84K", delta: 5, up: true },
];
const MOCK_CHART_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const MOCK_CHART_VALUES = [12400, 14200, 11800, 15600, 17200, 21400, 18900];
