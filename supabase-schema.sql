-- ================================================================
--  NovelNest v2 — Complete Supabase Schema
--  Run in SQL Editor at supabase.com
-- ================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── PROFILES ────────────────────────────────────────────────
CREATE TABLE profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username    TEXT UNIQUE NOT NULL,
  avatar_url  TEXT,
  bio         TEXT,
  role        TEXT DEFAULT 'reader' CHECK (role IN ('reader','author','admin')),
  is_banned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION handle_new_user() RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'username', 'user_' || LEFT(NEW.id::TEXT, 8)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users FOR EACH ROW EXECUTE PROCEDURE handle_new_user();

-- ── NOVELS ──────────────────────────────────────────────────
CREATE TABLE novels (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  author_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT,
  cover_url    TEXT,
  origin       TEXT DEFAULT 'original',
  language     TEXT DEFAULT 'en',
  status       TEXT DEFAULT 'ongoing' CHECK (status IN ('ongoing','completed','hiatus','draft')),
  total_views  BIGINT DEFAULT 0,
  total_likes  INT DEFAULT 0,
  avg_rating   NUMERIC(3,2) DEFAULT 0,
  tags         TEXT[],
  is_mature    BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX novels_search_idx ON novels USING GIN (to_tsvector('english', title || ' ' || COALESCE(description,'')));
CREATE INDEX novels_origin_idx ON novels(origin);
CREATE INDEX novels_status_idx ON novels(status);
CREATE INDEX novels_views_idx  ON novels(total_views DESC);

-- ── GENRES ──────────────────────────────────────────────────
CREATE TABLE genres (id SERIAL PRIMARY KEY, name TEXT UNIQUE, icon TEXT, slug TEXT UNIQUE);
INSERT INTO genres (name,icon,slug) VALUES
  ('Fantasy','🌀','fantasy'),('Romance','💕','romance'),('Action','⚔️','action'),
  ('Isekai','🌌','isekai'),('Sci-Fi','🚀','sci-fi'),('Mystery','🔍','mystery'),
  ('Horror','👻','horror'),('Drama','🎭','drama'),('School Life','🎓','school-life'),
  ('Xianxia','🏮','xianxia'),('Historical','🏰','historical'),('GameLit','🎮','gamelit');

CREATE TABLE novel_genres (
  novel_id UUID REFERENCES novels(id) ON DELETE CASCADE,
  genre_id INT  REFERENCES genres(id) ON DELETE CASCADE,
  PRIMARY KEY (novel_id, genre_id)
);

-- ── CHAPTERS ────────────────────────────────────────────────
CREATE TABLE chapters (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  novel_id     UUID NOT NULL REFERENCES novels(id) ON DELETE CASCADE,
  chapter_num  INT NOT NULL,
  title        TEXT NOT NULL,
  content      TEXT NOT NULL,
  word_count   INT DEFAULT 0,
  views        INT DEFAULT 0,
  is_premium   BOOLEAN DEFAULT FALSE,
  is_draft     BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (novel_id, chapter_num)
);

CREATE OR REPLACE FUNCTION calc_word_count() RETURNS TRIGGER AS $$
BEGIN NEW.word_count := array_length(regexp_split_to_array(trim(NEW.content),'\s+'),1); RETURN NEW; END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER chapters_wc BEFORE INSERT OR UPDATE ON chapters FOR EACH ROW EXECUTE PROCEDURE calc_word_count();

-- Increment chapter views
CREATE OR REPLACE FUNCTION increment_chapter_views(chapter_id UUID) RETURNS void AS $$
BEGIN UPDATE chapters SET views = views + 1 WHERE id = chapter_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── BOOKMARKS ───────────────────────────────────────────────
CREATE TABLE bookmarks (
  user_id     UUID REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id    UUID REFERENCES novels(id) ON DELETE CASCADE,
  last_ch_id  UUID REFERENCES chapters(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

-- ── NOVEL LIKES ─────────────────────────────────────────────
CREATE TABLE novel_likes (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id   UUID REFERENCES novels(id)   ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

CREATE OR REPLACE FUNCTION increment_novel_likes(novel_id UUID) RETURNS void AS $$
BEGIN UPDATE novels SET total_likes = total_likes + 1 WHERE id = novel_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── RATINGS ─────────────────────────────────────────────────
CREATE TABLE ratings (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  novel_id   UUID REFERENCES novels(id)   ON DELETE CASCADE,
  score      INT CHECK (score BETWEEN 1 AND 5),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, novel_id)
);

CREATE OR REPLACE FUNCTION update_avg_rating() RETURNS TRIGGER AS $$
BEGIN
  UPDATE novels SET avg_rating = (SELECT ROUND(AVG(score)::NUMERIC,2) FROM ratings WHERE novel_id = COALESCE(NEW.novel_id, OLD.novel_id))
  WHERE id = COALESCE(NEW.novel_id, OLD.novel_id);
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER on_rating_change AFTER INSERT OR UPDATE OR DELETE ON ratings FOR EACH ROW EXECUTE PROCEDURE update_avg_rating();

-- ── COMMENTS ────────────────────────────────────────────────
CREATE TABLE comments (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  chapter_id  UUID NOT NULL REFERENCES chapters(id)  ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES profiles(id)  ON DELETE CASCADE,
  parent_id   UUID REFERENCES comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL,
  likes       INT DEFAULT 0,
  is_pinned   BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ── READING PROGRESS ────────────────────────────────────────
CREATE TABLE reading_progress (
  user_id    UUID REFERENCES profiles(id) ON DELETE CASCADE,
  chapter_id UUID REFERENCES chapters(id) ON DELETE CASCADE,
  position   FLOAT DEFAULT 0,  -- scroll %, 0-100
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (user_id, chapter_id)
);

-- ── NOTIFICATIONS ───────────────────────────────────────────
CREATE TABLE notifications (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id    UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type       TEXT NOT NULL,  -- 'new_chapter' | 'comment' | 'like' | 'system'
  title      TEXT,
  body       TEXT,
  link       TEXT,
  is_read    BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ── PAGE VIEWS (analytics) ──────────────────────────────────
CREATE TABLE page_views (
  id         BIGSERIAL PRIMARY KEY,
  path       TEXT NOT NULL,
  referrer   TEXT,
  user_agent TEXT,
  language   TEXT,
  user_id    UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX pv_path_idx    ON page_views(path);
CREATE INDEX pv_created_idx ON page_views(created_at);

-- ── ADS ─────────────────────────────────────────────────────
CREATE TABLE ads (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title       TEXT NOT NULL,
  description TEXT,
  image_url   TEXT,
  url         TEXT NOT NULL,
  cta         TEXT DEFAULT 'Learn More',
  icon        TEXT,
  slot        TEXT NOT NULL CHECK (slot IN ('banner','sidebar','inline')),
  advertiser  TEXT,
  active      BOOLEAN DEFAULT TRUE,
  impressions INT DEFAULT 0,
  clicks      INT DEFAULT 0,
  starts_at   TIMESTAMPTZ,
  ends_at     TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION increment_ad_impressions(ad_id UUID) RETURNS void AS $$
BEGIN UPDATE ads SET impressions = impressions + 1 WHERE id = ad_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION increment_ad_clicks(ad_id UUID) RETURNS void AS $$
BEGIN UPDATE ads SET clicks = clicks + 1 WHERE id = ad_id; END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ── NOVEL SUMMARY VIEW ──────────────────────────────────────
CREATE VIEW novel_summary AS
  SELECT n.id, n.title, n.slug, n.cover_url, n.origin, n.language,
         n.status, n.total_views, n.total_likes, n.avg_rating, n.tags, n.created_at,
         p.username AS author_name,
         COUNT(c.id)       AS chapter_count,
         MAX(c.created_at) AS last_updated
  FROM novels n
  JOIN profiles p ON p.id = n.author_id
  LEFT JOIN chapters c ON c.novel_id = n.id AND c.is_draft = false
  WHERE n.status != 'draft'
  GROUP BY n.id, p.username;

-- ── RLS ─────────────────────────────────────────────────────
ALTER TABLE profiles          ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels            ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters          ENABLE ROW LEVEL SECURITY;
ALTER TABLE bookmarks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE novel_likes       ENABLE ROW LEVEL SECURITY;
ALTER TABLE ratings           ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments          ENABLE ROW LEVEL SECURITY;
ALTER TABLE reading_progress  ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications     ENABLE ROW LEVEL SECURITY;
ALTER TABLE ads               ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "profiles_read"  ON profiles   FOR SELECT USING (true);
CREATE POLICY "novels_read"    ON novels      FOR SELECT USING (status != 'draft');
CREATE POLICY "chapters_read"  ON chapters    FOR SELECT USING (is_draft = false);
CREATE POLICY "comments_read"  ON comments    FOR SELECT USING (true);
CREATE POLICY "ads_active_read" ON ads        FOR SELECT USING (active = true);

-- Auth write
CREATE POLICY "profiles_own"   ON profiles   FOR UPDATE  USING (auth.uid() = id);
CREATE POLICY "novels_author"  ON novels      FOR ALL     USING (auth.uid() = author_id);
CREATE POLICY "chapters_author"ON chapters    FOR ALL     USING (auth.uid() = (SELECT author_id FROM novels WHERE id = novel_id));
CREATE POLICY "bookmarks_own"  ON bookmarks   FOR ALL     USING (auth.uid() = user_id);
CREATE POLICY "likes_own"      ON novel_likes FOR ALL     USING (auth.uid() = user_id);
CREATE POLICY "ratings_own"    ON ratings     FOR ALL     USING (auth.uid() = user_id);
CREATE POLICY "comments_auth"  ON comments    FOR INSERT  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "comments_own"   ON comments    FOR DELETE  USING (auth.uid() = user_id);
CREATE POLICY "progress_own"   ON reading_progress FOR ALL USING (auth.uid() = user_id);
CREATE POLICY "notif_own"      ON notifications    FOR ALL USING (auth.uid() = user_id);

-- Enable realtime for these tables
ALTER PUBLICATION supabase_realtime ADD TABLE novels;
ALTER PUBLICATION supabase_realtime ADD TABLE chapters;
ALTER PUBLICATION supabase_realtime ADD TABLE comments;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE page_views;
