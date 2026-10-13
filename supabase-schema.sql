CREATE TABLE IF NOT EXISTS public.syncboard_rooms (
  id TEXT PRIMARY KEY,
  title TEXT DEFAULT 'Untitled Board',
  elements JSONB DEFAULT '[]'::jsonb,
  created_by TEXT DEFAULT 'anonymous',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.syncboard_rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view rooms" ON public.syncboard_rooms FOR SELECT USING (true);
CREATE POLICY "Anyone can create rooms" ON public.syncboard_rooms FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can update rooms" ON public.syncboard_rooms FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION update_syncboard_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS syncboard_updated_at ON public.syncboard_rooms;
CREATE TRIGGER syncboard_updated_at
  BEFORE UPDATE ON public.syncboard_rooms
  FOR EACH ROW EXECUTE FUNCTION update_syncboard_timestamp();
