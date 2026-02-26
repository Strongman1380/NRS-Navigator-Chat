/*
  # Knowledge Base Table

  Stores extended resource knowledge from treatment facility listings,
  AA meeting schedules, and other reference data files that supplement
  the admin-managed `resources` table.

  1. New Table: `knowledge_base`
    - `id` (uuid, primary key)
    - `title` (text) - Resource/facility name
    - `content` (text) - Full descriptive text (address, services, hours, etc.)
    - `category` (text) - 'treatment_facility', 'aa_meeting', 'buprenorphine_prescriber', 'counseling', 'medical', 'other'
    - `city` (text) - For location-based queries
    - `state` (text)
    - `zip_code` (text)
    - `phone` (text)
    - `website` (text)
    - `tags` (text[]) - Searchable tags
    - `lat` (double precision)
    - `lon` (double precision)
    - `source_file` (text) - Which file this was imported from
    - `is_active` (boolean, default true)
    - `created_at` (timestamptz)
    - `updated_at` (timestamptz)

  2. Security
    - Enable RLS
    - Public can read active entries
    - Admins can manage all entries
*/

-- Create knowledge_base table
CREATE TABLE IF NOT EXISTS knowledge_base (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  content text NOT NULL,
  category text NOT NULL DEFAULT 'other',
  city text,
  state text,
  zip_code text,
  phone text,
  website text,
  tags text[] DEFAULT '{}',
  lat double precision,
  lon double precision,
  source_file text,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_city ON knowledge_base(city);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_state ON knowledge_base(state);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base(is_active);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_tags ON knowledge_base USING gin(tags);

-- Full-text search index on content
ALTER TABLE knowledge_base ADD COLUMN IF NOT EXISTS fts tsvector
  GENERATED ALWAYS AS (to_tsvector('english', coalesce(title, '') || ' ' || coalesce(content, '') || ' ' || coalesce(city, ''))) STORED;
CREATE INDEX IF NOT EXISTS idx_knowledge_base_fts ON knowledge_base USING gin(fts);

-- Enable RLS
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;

-- Public can read active entries
CREATE POLICY "Public can read active knowledge base entries"
  ON knowledge_base
  FOR SELECT
  TO public
  USING (is_active = true);

-- Admins can do everything
CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Update trigger
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();
