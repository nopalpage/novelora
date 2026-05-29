/**
 * Novelora — Hono Backend (Cloudflare Workers — standalone)
 * Sebelumnya: Cloudflare Pages Functions (hono/cloudflare-pages)
 * Sekarang  : Cloudflare Workers (hono/cloudflare-workers)
 *
 * Deploy: wrangler deploy  (akun: thedarkcube313)
 * Domain: api.novelora.my.id
 */
import { Hono } from "hono";
import { cors } from "hono/cors";
import { cache } from "hono/cache";
import { etag } from "hono/etag";
import { secureHeaders } from "hono/secure-headers";
// import { compress } from "hono/compress";
import { createClient } from "@supabase/supabase-js";
import { Redis } from "@upstash/redis/cloudflare";
import { Ratelimit } from "@upstash/ratelimit";
import { withSentry } from "@sentry/cloudflare";

const rootApp = new Hono();

rootApp.get("/", (c) => c.json({
  ok: true,
  message: "Welcome to Novelora API. Endpoints are available under /api"
}));

const app = new Hono().basePath("/api");

/* ── Global CORS ── */
rootApp.use(
  "*",
  cors({
    origin: ["https://novelora.my.id", "https://novelora-frontend.pages.dev", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:5173"],
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowHeaders: ["Content-Type", "Authorization", "x-api-key"],
  })
);

/* ── Security Guard ── */
rootApp.use("*", async (c, next) => {
  if (c.req.method === "OPTIONS") return next();
  
  // 1. API Secret Key Check (Anti Third-Party / Postman)
  const expectedKey = c.env?.API_SECRET_KEY;
  if (expectedKey && c.env?.ENVIRONMENT === 'production') {
    const providedKey = c.req.header("x-api-key");
    if (providedKey !== expectedKey) {
      console.log(`403 Forbidden: Invalid API Key. Expected: ${expectedKey}, Provided: ${providedKey}`);
      return c.json({ ok: false, message: "Forbidden: Invalid API Key" }, 403);
    }
  }

  // 2. Origin & Referer Check (Anti CSRF / Unwanted sites)
  const origin = c.req.header("origin") || "";
  const referer = c.req.header("referer") || "";
  const allowed = ["https://novelora.my.id", "https://novelora-frontend.pages.dev", "http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:3000", "http://127.0.0.1:5173"];
  
  const isAllowed = allowed.includes(origin) || allowed.some(a => referer.startsWith(a));
  
  if (!isAllowed) {
    console.log(`403 Forbidden: Origin '${origin}' or Referer '${referer}' not allowed.`);
    return c.json({ ok: false, message: `Forbidden: Origin not allowed (origin: ${origin}, referer: ${referer})` }, 403);
  }
  return next();
});

/* ── Middleware ── */
const localRateLimitMap = new Map();

const rateLimiter = async (c, next) => {
  const ip = c.req.header("cf-connecting-ip") || c.req.header("x-forwarded-for") || "unknown";
  if (ip === "unknown") return next();

  if (c.env?.UPSTASH_REDIS_REST_URL && c.env?.UPSTASH_REDIS_REST_TOKEN) {
    // Global Rate Limiting via Upstash Redis
    const redis = Redis.fromEnv(c.env);
    const ratelimit = new Ratelimit({
      redis: redis,
      limiter: Ratelimit.slidingWindow(100, "60 s"),
      analytics: true,
    });
    const { success, limit, remaining, reset } = await ratelimit.limit(`ratelimit_${ip}`);
    c.header("X-RateLimit-Limit", limit.toString());
    c.header("X-RateLimit-Remaining", remaining.toString());
    c.header("X-RateLimit-Reset", reset.toString());
    
    if (!success) {
      return err(c, "Too many requests, please try again later", 429);
    }
  } else {
    // Fallback: Local Memory Rate Limiting (Per Edge Node)
    const now = Date.now();
    const data = localRateLimitMap.get(ip) || { count: 0, resetTime: now + 60000 };
    if (now > data.resetTime) { data.count = 0; data.resetTime = now + 60000; }
    data.count++;
    localRateLimitMap.set(ip, data);
    if (data.count > 100) return err(c, "Too many requests, please try again later", 429);
  }
  
  return next();
};

app.use("*", secureHeaders());
app.use("*", rateLimiter);
// app.use("*", compress());
app.use("*", etag());

/* ── Helpers ── */
const db = (c) => {
  const url = c.env?.SUPABASE_URL;
  const key = c.env?.SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
};
const ok = (c, data, meta = {}) => c.json({ ok: true, data, ...meta });
const err = (c, message, status = 400) => {
  console.error(`[API ERROR] ${c.req.method} ${c.req.path} -> ${status}: ${message}`);
  return c.json({ ok: false, message }, status);
};

async function logActivity(c, supabase, action, details) {
  if (!supabase) return;
  const user = c.get("user");
  if (!user || user.id === "dev") return;
  await supabase.from("activity_logs").insert({
    admin_id: user.id,
    action,
    details
  });
}

/* ── Auth guard ── */
async function requireAdmin(c, next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return err(c, "Unauthorized", 401);

  // Bypass for local development, or if the correct API Key is provided
  const expectedKey = c.env?.API_SECRET_KEY;
  const providedKey = c.req.header("x-api-key");
  const isValidApiKey = expectedKey && providedKey === expectedKey;

  if (token === 'dummy-token' && (c.env?.ENVIRONMENT !== 'production' || isValidApiKey)) {
    c.set("user", { id: "dev" });
    c.set("profile", { role: "owner" });
    return next();
  }

  const supabase = db(c);
  if (!supabase) return next();
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return err(c, "Unauthorized", 401);
  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin" && profile?.role !== "owner") return err(c, "Forbidden", 403);
  c.set("user", user);
  c.set("profile", profile);
  return next();
}

async function requireAuth(c, next) {
  const token = c.req.header("Authorization")?.replace("Bearer ", "");
  if (!token) return err(c, "Unauthorized", 401);

  // Bypass for local development with dummy-token
  if (token === 'dummy-token' && c.env?.ENVIRONMENT !== 'production') {
    c.set("user", { id: "dev" });
    return next();
  }

  const supabase = db(c);
  if (!supabase) { c.set("user", { id: "dev" }); return next(); }
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return err(c, "Unauthorized", 401);
  c.set("user", user);
  return next();
}

/* ══════════════════════════════════════════
   META (Genres & Tags)
══════════════════════════════════════════ */
app.get("/meta/genres-tags", cache({ cacheName: "meta", cacheControl: "max-age=3600" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data, error } = await supabase.from("novels").select("genres, tags");
  if (error) return err(c, error.message, 500);

  const genresMap = new Map();
  const tagsMap = new Map();

  data.forEach((novel) => {
    (novel.genres || []).forEach((g) => {
      genresMap.set(g, (genresMap.get(g) || 0) + 1);
    });
    (novel.tags || []).forEach((t) => {
      tagsMap.set(t, (tagsMap.get(t) || 0) + 1);
    });
  });

  return ok(c, {
    genres: Array.from(genresMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count),
    tags: Array.from(tagsMap.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  });
});

/* ══════════════════════════════════════════
   NOVELS
══════════════════════════════════════════ */
app.get("/novels", cache({ cacheName: "novels", cacheControl: "max-age=60,s-maxage=120" }), async (c) => {
  const { origin, genre, status, sort = "popular", limit = 20, page = 1 } = c.req.query();
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  let q = supabase.from("novels").select("*", { count: "exact" }).range((page - 1) * limit, page * limit - 1);
  if (origin) q = q.eq("origin", origin);
  if (status) q = q.eq("status", status);
  if (sort === "popular") q = q.order("views", { ascending: false });
  if (sort === "new") q = q.order("created_at", { ascending: false });
  if (sort === "rating") q = q.order("rating", { ascending: false });
  const { data, error, count } = await q;
  if (error) return err(c, error.message, 500);
  return ok(c, data, { total: count });
});

app.get("/novels/search", async (c) => {
  const q = c.req.query("q")?.trim();
  if (!q || q.length < 2) return err(c, "Query too short");
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data, error } = await supabase.from("novels")
    .select("id,title,cover_url,origin,status,rating,views")
    .textSearch("title", q, { type: "websearch" }).limit(20);
  if (error) return err(c, error.message, 500);
  return ok(c, data);
});

app.get("/novels/:id", cache({ cacheName: "novel", cacheControl: "max-age=120,s-maxage=300" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data, error } = await supabase.from("novels").select("*").eq("id", c.req.param("id")).single();
  if (error) return err(c, "Not found", 404);
  return ok(c, data);
});

app.get("/novels/:id/related", cache({ cacheName: "related-novels", cacheControl: "max-age=300" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data: currentNovel } = await supabase.from("novels").select("id, origin").eq("id", c.req.param("id")).single();
  if (!currentNovel) return ok(c, []);
  
  const { data, error } = await supabase.from("novels")
    .select("*")
    .eq("origin", currentNovel.origin)
    .neq("id", currentNovel.id)
    .limit(3);
    
  if (error) return err(c, error.message, 500);
  return ok(c, data || []);
});

app.post("/novels", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const novelData = {
    title: body.title,
    author: body.author || "Unknown",
    cover_url: body.image || body.cover_url,
    description: body.description,
    origin: body.origin || "JP",
    status: body.status || "Ongoing",
    tags: body.tags || [],
    genres: body.genres || [],
    avg_rating: body.rating || 0,
    total_views: body.views || 0
  };
  const { data, error } = await supabase.from("novels").insert(novelData).select().single();
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Add Novel", `Added novel "${data.title}"`));
  return ok(c, data);
});

app.put("/novels/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const novelData = {
    title: body.title,
    author: body.author,
    cover_url: body.image || body.cover_url,
    description: body.description,
    origin: body.origin,
    status: body.status,
    tags: body.tags,
    genres: body.genres,
    avg_rating: body.rating,
    total_views: body.views,
    updated_at: new Date()
  };
  Object.keys(novelData).forEach(key => novelData[key] === undefined && delete novelData[key]);
  const { data, error } = await supabase.from("novels").update(novelData).eq("id", c.req.param("id")).select().single();
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Edit Novel", `Updated novel "${data.title || c.req.param("id")}"`));
  return ok(c, data);
});

app.delete("/novels/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { data: n } = await supabase.from("novels").select("title").eq("id", c.req.param("id")).single();
  const title = n?.title || c.req.param("id");
  const { error } = await supabase.from("novels").delete().eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Delete Novel", `Deleted novel "${title}"`));
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   CHAPTERS
══════════════════════════════════════════ */
app.get("/novels/:id/chapters", cache({ cacheName: "chapters", cacheControl: "max-age=60" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data, error } = await supabase.from("chapters")
    .select("id,chapter_num,title,created_at")
    .eq("novel_id", c.req.param("id")).order("chapter_num", { ascending: true });
  if (error) return err(c, error.message, 500);
  const mapped = (data || []).map(ch => ({ ...ch, translation_type: "HTL" }));
  return ok(c, mapped);
});

app.get("/chapters/latest", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { chapters: [], total: 0 });
  
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  
  const { data, count } = await supabase.from("chapters")
    .select("id,chapter_num,title,created_at,novel_id,novels(title,cover_url,origin)", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * limit, page * limit - 1);
    
  const mapped = data || [];
  return ok(c, { chapters: mapped, total: count || 0 });
});

app.get("/chapters/:id", cache({ cacheName: "chapter-content", cacheControl: "max-age=300,s-maxage=600" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Not found", 404);
  const { data, error } = await supabase.from("chapters")
    .select("id,novel_id,chapter_num,title,content,created_at")
    .eq("id", c.req.param("id")).single();
  if (error) return err(c, "Not found", 404);
  c.executionCtx?.waitUntil(supabase.rpc("increment_chapter_views", { chapter_id: c.req.param("id") }));
  return ok(c, { ...data, translation_type: "HTL" });
});

app.post("/chapters", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const insertData = {
    novel_id: body.novel_id,
    chapter_num: body.chapter_num,
    title: body.title,
    content: body.content
  };
  const { data, error } = await supabase.from("chapters").insert(insertData).select().single();
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Add Chapter", `Added chapter ${data.chapter_num} to novel ${data.novel_id}`));
  return ok(c, data);
});

app.put("/chapters/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const updateData = {
    chapter_num: body.chapter_num,
    title: body.title,
    content: body.content
  };
  Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);
  const { data, error } = await supabase.from("chapters").update(updateData).eq("id", c.req.param("id")).select().single();
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Edit Chapter", `Updated chapter ${data.chapter_num} of novel ${data.novel_id}`));
  return ok(c, data);
});

app.delete("/chapters/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase.from("chapters").delete().eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Delete Chapter", `Deleted chapter ${c.req.param("id")}`));
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   COMMENTS
══════════════════════════════════════════ */
app.get("/users/:id/comments", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, created_at, novel_id, novels(title)")
    .eq("user_id", c.req.param("id"))
    .order("created_at", { ascending: false })
    .limit(50);
    
  if (error) return err(c, error.message, 500);
  
  const formatted = data.map(d => ({
    id: d.id,
    novelId: d.novel_id,
    novelTitle: d.novels?.title || "Unknown Novel",
    content: d.content,
    date: new Date(d.created_at).toISOString().split('T')[0]
  }));
  
  return ok(c, formatted);
});


app.get("/novels/:id/comments", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, likes_count, created_at, user_id, profiles!inner(username, avatar_url)")
    .eq("novel_id", c.req.param("id"))
    .order("created_at", { ascending: false })
    .limit(50);
    
  if (error) return err(c, error.message, 500);
  
  const formatted = data.map(d => ({
    id: d.id,
    userId: d.user_id,
    userName: d.profiles?.username || "Unknown",
    userAvatar: d.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.user_id}`,
    text: d.content,
    createdAt: d.created_at,
    likes: d.likes_count
  }));
  
  return ok(c, formatted);
});

app.post("/comments", requireAuth, async (c) => {
  const { novel_id, content } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const { data, error } = await supabase
    .from("comments")
    .insert({ novel_id, user_id: c.get("user").id, content })
    .select()
    .single();
    
  if (error) return err(c, error.message, 500);
  return ok(c, data);
});

app.post("/comments/:id/like", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const commentId = c.req.param("id");
  const userId = c.get("user").id;
  
  const { error: insertErr } = await supabase
    .from("comment_likes")
    .insert({ comment_id: commentId, user_id: userId });
    
  if (!insertErr) {
    const { data: cData } = await supabase.from("comments").select("likes_count").eq("id", commentId).single();
    if (cData) {
      await supabase.from("comments").update({ likes_count: (cData.likes_count || 0) + 1 }).eq("id", commentId);
    }
  }
  return ok(c, { liked: true });
});

app.delete("/comments/:id/like", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const commentId = c.req.param("id");
  const userId = c.get("user").id;
  
  const { error: delErr } = await supabase
    .from("comment_likes")
    .delete()
    .match({ comment_id: commentId, user_id: userId });
    
  if (!delErr) {
    const { data: cData } = await supabase.from("comments").select("likes_count").eq("id", commentId).single();
    if (cData && cData.likes_count > 0) {
      await supabase.from("comments").update({ likes_count: cData.likes_count - 1 }).eq("id", commentId);
    }
  }
  return ok(c, { unliked: true });
});

/* ══════════════════════════════════════════
   COMMENTS (admin)
══════════════════════════════════════════ */
app.get("/admin/comments", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("comments")
    .select("id, content, likes_count, created_at, user_id, profiles(username, avatar_url), novel_id, novels(title)")
    .order("created_at", { ascending: false })
    .limit(100);
    
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.delete("/admin/comments/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  
  const { data: comment } = await supabase.from("comments").select("profiles(username)").eq("id", c.req.param("id")).single();
  const uname = comment?.profiles?.username || "unknown user";
  
  const { error } = await supabase
    .from("comments")
    .delete()
    .eq("id", c.req.param("id"));
    
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Delete Comment", `Deleted comment by ${uname}`));
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   LIVE CHAT
══════════════════════════════════════════ */
app.get("/chat/messages", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("chat_messages")
    .select("id, content, created_at, user_id, profiles!inner(username, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(50);
    
  if (error) return err(c, error.message, 500);
  
  const formatted = data.map(d => ({
    id: d.id,
    userId: d.user_id,
    userName: d.profiles?.username || "Unknown",
    userAvatar: d.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.user_id}`,
    text: d.content,
    createdAt: d.created_at
  }));
  
  return ok(c, formatted.reverse());
});

app.post("/chat/messages", requireAuth, async (c) => {
  const { text } = await c.req.json();
  if (!text) return err(c, "Message cannot be empty", 400);
  
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({ user_id: c.get("user").id, content: text })
    .select()
    .single();
    
  if (error) return err(c, error.message, 500);
  return ok(c, data);
});

/* ══════════════════════════════════════════
   RANKINGS
══════════════════════════════════════════ */
app.get("/rankings/weekly", cache({ cacheName: "rankings", cacheControl: "max-age=300,s-maxage=600" }), async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data } = await supabase.from("novel_summary").select("*").order("total_views", { ascending: false }).limit(20);
  return ok(c, data || []);
});

/* ══════════════════════════════════════════
   ANALYTICS
══════════════════════════════════════════ */
app.get("/analytics/summary", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const admins = await supabase.from("profiles").select("id").in("role", ["admin", "owner"]);
  const adminIds = (admins.data || []).map(a => a.id);

  const [views, adminViews, novels, users, chapters] = await Promise.all([
    supabase.from("page_views").select("id", { count: "exact", head: true }),
    adminIds.length > 0 ? supabase.from("page_views").select("id", { count: "exact", head: true }).in("user_id", adminIds) : Promise.resolve({ count: 0 }),
    supabase.from("novels").select("id", { count: "exact", head: true }).neq("status", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("chapters").select("id", { count: "exact", head: true }).eq("is_draft", false),
  ]);

  const realTotalViews = (views.count || 0) - (adminViews.count || 0);

  return ok(c, [
    { icon: "👁", label: "Total Page Views", value: _fmt(realTotalViews), delta: 12, up: true },
    { icon: "📚", label: "Active Novels", value: _fmt(novels.count || 0), delta: 3, up: true },
    { icon: "👥", label: "Users", value: _fmt(users.count || 0), delta: 8, up: true },
    { icon: "📖", label: "Chapters", value: _fmt(chapters.count || 0), delta: 5, up: true },
  ]);
});

app.get("/analytics/pageviews", requireAdmin, async (c) => {
  const days = parseInt(c.req.query("days") || "7");
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const since = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase.from("page_views").select("created_at, profiles(role)").gte("created_at", since);
  const filteredData = (data || []).filter(v => {
    const role = v.profiles?.role;
    return role !== "admin" && role !== "owner";
  });
  const byDay = {};
  filteredData.forEach(v => { const day = v.created_at.slice(0, 10); byDay[day] = (byDay[day] || 0) + 1; });
  const labels = [], values = [];
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
  if (!supabase) return err(c, "Database not available", 503);
  const { data } = await supabase.from("novels").select("id,title,total_views,avg_rating").order("total_views", { ascending: false }).limit(10);
  return ok(c, data || []);
});

/* ══════════════════════════════════════════
   ADS
══════════════════════════════════════════ */
app.get("/ads", async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  const { data } = await supabase.from("ads").select("*").eq("active", true);
  return ok(c, data || []);
});

app.post("/ads", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  const { data, error } = await supabase.from("ads").insert(body).select().single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.put("/ads/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase.from("ads").update(body).eq("id", c.req.param("id")).select().single();
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.delete("/ads/:id", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase.from("ads").delete().eq("id", c.req.param("id"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

app.post("/ads/:id/impression", async (c) => {
  const supabase = db(c);
  if (supabase) supabase.rpc("increment_ad_impressions", { ad_id: c.req.param("id") });
  return ok(c, { ok: true });
});

app.post("/ads/:id/click", async (c) => {
  const supabase = db(c);
  if (supabase) supabase.rpc("increment_ad_clicks", { ad_id: c.req.param("id") });
  return ok(c, { ok: true });
});

/* ══════════════════════════════════════════
   USER FEATURES
══════════════════════════════════════════ */
app.get("/me/bookmarks", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data } = await supabase.from("bookmarks").select("*, novel_summary(*)").eq("user_id", c.get("user").id);
  return ok(c, data || []);
});

app.post("/me/bookmarks", requireAuth, async (c) => {
  const { novel_id } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { novel_id });
  const { error } = await supabase.from("bookmarks").upsert({ user_id: c.get("user").id, novel_id });
  if (error) return err(c, error.message);
  return ok(c, { novel_id });
});

app.delete("/me/bookmarks/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  const { error } = await supabase.from("bookmarks").delete().eq("user_id", c.get("user").id).eq("novel_id", c.req.param("novelId"));
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

app.post("/me/likes", requireAuth, async (c) => {
  const { novel_id } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { novel_id });
  await supabase.from("novel_likes").upsert({ user_id: c.get("user").id, novel_id });
  await supabase.rpc("increment_novel_likes", { novel_id });
  return ok(c, { novel_id });
});

app.delete("/me/likes/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  await supabase.from("novel_likes").delete().eq("user_id", c.get("user").id).eq("novel_id", c.req.param("novelId"));
  return ok(c, { deleted: true });
});

app.put("/me/progress", requireAuth, async (c) => {
  const { chapter_id, position } = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { chapter_id });
  await supabase.from("reading_progress").upsert({ user_id: c.get("user").id, chapter_id, position, updated_at: new Date() });
  return ok(c, { chapter_id });
});

app.get("/me/progress/:novelId", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, null);
  const { data } = await supabase.from("reading_progress")
    .select("chapter_id, position, chapters(chapter_num, title, novel_id)")
    .eq("user_id", c.get("user").id).eq("chapters.novel_id", c.req.param("novelId"))
    .order("updated_at", { ascending: false }).limit(1).single();
  return ok(c, data);
});

app.get("/me/history", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("reading_progress")
    .select("chapter_id, position, updated_at, chapters(chapter_num, title, novel_id, novels(id, title, cover_url, origin))")
    .eq("user_id", c.get("user").id)
    .order("updated_at", { ascending: false })
    .limit(50);
    
  if (error) return err(c, error.message);
  return ok(c, data || []);
});

app.delete("/me/history", requireAuth, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { deleted: true });
  
  const { error } = await supabase
    .from("reading_progress")
    .delete()
    .eq("user_id", c.get("user").id);
    
  if (error) return err(c, error.message);
  return ok(c, { deleted: true });
});

/* ══════════════════════════════════════════
   USERS (admin)
══════════════════════════════════════════ */
app.get("/users", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(100);
  return ok(c, data || []);
});

app.put("/users/:id", requireAdmin, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, body);
  const { data, error } = await supabase.from("profiles").update(body).eq("id", c.req.param("id")).select().single();
  if (error) return err(c, error.message);
  
  if (body.status === "Banned") {
    c.executionCtx?.waitUntil(logActivity(c, supabase, "Ban User", `Banned user ${data.username || c.req.param("id")}`));
  } else if (body.status === "Active") {
    c.executionCtx?.waitUntil(logActivity(c, supabase, "Unban User", `Unbanned user ${data.username || c.req.param("id")}`));
  } else if (body.role) {
    c.executionCtx?.waitUntil(logActivity(c, supabase, "Change Role", `Changed role of ${data.username || c.req.param("id")} to ${body.role}`));
  } else {
    c.executionCtx?.waitUntil(logActivity(c, supabase, "Update User", `Updated user ${data.username || c.req.param("id")}`));
  }
  
  return ok(c, data);
});

/* ══════════════════════════════════════════
   REQUESTS
══════════════════════════════════════════ */
app.get("/requests", async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("novel_requests")
    .select("id, content, upvotes, downvotes, created_at, user_id, parent_id, profiles!inner(username, avatar_url)")
    .order("created_at", { ascending: false })
    .limit(100);
    
  if (error) return err(c, error.message, 500);
  
  // Format for frontend
  const formatted = data.map(d => ({
    id: d.id,
    userId: d.user_id,
    userName: d.profiles?.username || "Unknown",
    userAvatar: d.profiles?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${d.user_id}`,
    content: d.content,
    createdAt: d.created_at,
    upvotes: d.upvotes,
    downvotes: d.downvotes,
    parentId: d.parent_id
  }));
  
  return ok(c, formatted);
});

app.post("/requests", requireAuth, async (c) => {
  const { content, parent_id } = await c.req.json();
  if (!content) return err(c, "Content is required");
  
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const payload = { user_id: c.get("user").id, content };
  if (parent_id) payload.parent_id = parent_id;
  
  const { data, error } = await supabase
    .from("novel_requests")
    .insert(payload)
    .select()
    .single();
    
  if (error) return err(c, error.message, 500);
  return ok(c, data);
});

app.post("/requests/:id/vote", requireAuth, async (c) => {
  const { vote_type } = await c.req.json();
  if (vote_type !== "up" && vote_type !== "down") return err(c, "Invalid vote type");
  
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const requestId = c.req.param("id");
  const userId = c.get("user").id;
  
  // Check if vote exists
  const { data: existing } = await supabase
    .from("novel_request_votes")
    .select("vote_type")
    .match({ request_id: requestId, user_id: userId })
    .single();
    
  if (existing && existing.vote_type === vote_type) {
    return ok(c, { message: "Already voted" });
  }
  
  // Update votes
  await supabase
    .from("novel_request_votes")
    .upsert({ request_id: requestId, user_id: userId, vote_type });
    
  // Simple increment logic for demo (better done with triggers or RPC, but this suffices for simple port)
  const incCol = vote_type === "up" ? "upvotes" : "downvotes";
  const decCol = vote_type === "up" ? "downvotes" : "upvotes";
  
  const { data: reqData } = await supabase.from("novel_requests").select("upvotes, downvotes").eq("id", requestId).single();
  if (reqData) {
    const updates = { [incCol]: reqData[incCol] + 1 };
    if (existing) {
      updates[decCol] = Math.max(0, reqData[decCol] - 1);
    }
    await supabase.from("novel_requests").update(updates).eq("id", requestId);
  }
  
  return ok(c, { ok: true });
});

/* ══════════════════════════════════════════
   ADMIN PANEL
══════════════════════════════════════════ */
app.get("/admin/activity-logs", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const page = parseInt(c.req.query("page") || "1");
  const limit = parseInt(c.req.query("limit") || "10");
  const search = c.req.query("search") || "";
  const startDate = c.req.query("start_date") || "";
  const endDate = c.req.query("end_date") || "";
  
  let q = supabase.from("activity_logs").select("id, action, details, created_at, profiles(username)", { count: "exact" });
  
  if (search) {
    q = q.or(`action.ilike.%${search}%,details.ilike.%${search}%`);
  }
  if (startDate) {
    q = q.gte("created_at", `${startDate}T00:00:00Z`);
  }
  if (endDate) {
    q = q.lte("created_at", `${endDate}T23:59:59Z`);
  }
  
  q = q.order("created_at", { ascending: false }).range((page - 1) * limit, page * limit - 1);
  
  const { data, error, count } = await q;
  if (error) return err(c, error.message);
  
  const formatted = data.map(d => ({
    id: d.id.toString(),
    date: d.created_at.replace("T", " ").substring(0, 16),
    admin: d.profiles?.username || "Unknown",
    action: d.action,
    details: d.details,
    color: d.action.includes("Delete") || d.action.includes("Ban") ? "red" : 
           d.action.includes("Edit") || d.action.includes("Resolve") || d.action.includes("Change") ? "green" : 
           d.action.includes("Add") ? "blue" : "purple"
  }));
  
  return ok(c, formatted, { total: count, page, limit });
});

app.get("/admin/dashboard-stats", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return err(c, "Database not available", 503);
  
  const [novels, users, comments, reports, newReg, recentRep, pageViews] = await Promise.all([
    supabase.from("novels").select("id", { count: "exact", head: true }).neq("status", "draft"),
    supabase.from("profiles").select("id", { count: "exact", head: true }),
    supabase.from("comments").select("id", { count: "exact", head: true }),
    supabase.from("reports").select("id", { count: "exact", head: true }),
    supabase.from("profiles").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    supabase.from("reports").select("id", { count: "exact", head: true }).gte("created_at", new Date(Date.now() - 86400000).toISOString()),
    supabase.from("page_views").select("created_at, profiles(role)").gte("created_at", new Date(Date.now() - 7 * 86400000).toISOString())
  ]);

  const filteredPageViews = (pageViews.data || []).filter(v => {
    const role = v.profiles?.role;
    return role !== "admin" && role !== "owner";
  });

  const byDay = {};
  filteredPageViews.forEach(v => { const day = v.created_at.slice(0, 10); byDay[day] = (byDay[day] || 0) + 1; });
  const activeUsersTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    activeUsersTrend.push({
      name: d.toLocaleDateString("en", { weekday: "short" }),
      users: (byDay[key] || 0) // Real data count
    });
  }

  return ok(c, {
    totalNovels: novels.count || 0,
    totalUsers: users.count || 0,
    commentsMod: comments.count || 0,
    pendingRequests: reports.count || 0,
    newRegistrations: newReg.count || 0,
    recentReports: recentRep.count || 0,
    activeOnline: byDay[new Date().toISOString().slice(0, 10)] || 0, // Using today's page views as active online proxy
    activeUsersTrend
  });
});

/* ══════════════════════════════════════════
   REPORTS
══════════════════════════════════════════ */
app.post("/reports", requireAuth, async (c) => {
  const body = await c.req.json();
  const supabase = db(c);
  if (!supabase) return ok(c, { ...body, id: Date.now() });
  
  const { data, error } = await supabase
    .from("reports")
    .insert({ ...body, user_id: c.get("user").id })
    .select()
    .single();
    
  if (error) return err(c, error.message);
  return ok(c, data);
});

app.get("/admin/reports", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, []);
  
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);
    
  if (error) return err(c, error.message);
  return ok(c, data || []);
});

app.put("/admin/reports/:id/resolve", requireAdmin, async (c) => {
  const supabase = db(c);
  if (!supabase) return ok(c, { resolved: true });
  
  const { data, error } = await supabase
    .from("reports")
    .update({ status: 'Resolved' })
    .eq("id", c.req.param("id"))
    .select()
    .single();
    
  if (error) return err(c, error.message);
  c.executionCtx?.waitUntil(logActivity(c, supabase, "Resolve Report", `Resolved report #${data.id}`));
  return ok(c, data);
});

/* ══════════════════════════════════════════
   AUTH (Client-Side via Supabase)
══════════════════════════════════════════ */
// Semua rute autentikasi telah dipindahkan ke sisi klien (frontend) menggunakan @supabase/supabase-js.
// Backend hanya perlu memverifikasi token melalui middleware requireAuth.

/* ── Health ── */
app.get("/health", (c) => c.json({ ok: true, ts: Date.now(), runtime: "cloudflare-workers" }));

rootApp.route("/", app);
rootApp.notFound((c) => err(c, "Not found", 404));

/* ══════════════════════════════════════════
   WORKERS ENTRY POINT
   (bukan Pages Functions — tidak pakai handle() dari hono/cloudflare-pages)
══════════════════════════════════════════ */
export default withSentry(
  (env) => ({
    dsn: env.SENTRY_DSN,
    tracesSampleRate: 1.0,
  }),
  {
    fetch: rootApp.fetch,
  }
);

/* ── Helpers ── */
function _fmt(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(0) + "K";
  return String(n);
}

