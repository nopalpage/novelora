-- Initial Schema for Novelora

-- Profiles (extends auth.users)
CREATE TABLE profiles (
  id UUID REFERENCES auth.users(id) PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'User' CHECK (role IN ('Owner', 'Admin', 'User')),
  status TEXT DEFAULT 'Active' CHECK (status IN ('Active', 'Banned')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Handle new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, username, email, role)
  VALUES (
    new.id, 
    new.raw_user_meta_data->>'username', 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'role', 'User')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Novels
CREATE TABLE novels (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  image TEXT,
  latest_chapter TEXT,
  time_ago TEXT,
  origin TEXT DEFAULT 'JP',
  status TEXT DEFAULT 'Ongoing',
  rating NUMERIC DEFAULT 0,
  views INTEGER DEFAULT 0,
  description TEXT,
  bookmarks JSONB DEFAULT '[]',
  tags JSONB DEFAULT '[]',
  genres JSONB DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Chapters
CREATE TABLE chapters (
  id TEXT PRIMARY KEY,
  novel_id TEXT REFERENCES novels(id) ON DELETE CASCADE,
  chapter_number NUMERIC NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  views INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Comments
CREATE TABLE comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  type TEXT CHECK (type IN ('novel', 'chapter')),
  item_id TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Reports
CREATE TABLE reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  item_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Resolved')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Activity Logs
CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  details TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Page Views
CREATE TABLE page_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  path TEXT NOT NULL,
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  ip_address TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS (Row Level Security)
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE novels ENABLE ROW LEVEL SECURITY;
ALTER TABLE chapters ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE page_views ENABLE ROW LEVEL SECURITY;

-- Create Policies
-- Allow anyone to read novels and chapters
CREATE POLICY "Public read access for novels" ON novels FOR SELECT USING (true);
CREATE POLICY "Public read access for chapters" ON chapters FOR SELECT USING (true);
CREATE POLICY "Public read access for comments" ON comments FOR SELECT USING (true);
CREATE POLICY "Public read access for profiles" ON profiles FOR SELECT USING (true);

-- Allow authenticated users to insert comments
CREATE POLICY "Auth insert comments" ON comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Disable RLS for service role (used by our cloudflare worker for admin tasks)
-- The worker uses the SERVICE_ROLE key, which bypasses RLS automatically.
