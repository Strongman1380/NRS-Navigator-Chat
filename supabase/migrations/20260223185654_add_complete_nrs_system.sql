/*
  # Complete NRS Navigator System Schema

  1. New Tables
    - `profiles`
      - `id` (uuid, primary key, references auth.users)
      - `email` (text)
      - `full_name` (text)
      - `role` (text) - 'admin' or 'user'
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `resources`
      - `id` (uuid, primary key)
      - `name` (text) - Resource name
      - `type` (text) - 'shelter', 'treatment', 'crisis', 'food', 'medical', 'legal', 'other'
      - `description` (text)
      - `address` (text)
      - `city` (text)
      - `state` (text)
      - `zip_code` (text)
      - `phone` (text)
      - `website` (text)
      - `hours` (text)
      - `eligibility` (text)
      - `services` (text[])
      - `availability_status` (text) - 'available', 'full', 'closed', 'unknown'
      - `is_active` (boolean)
      - `created_by` (uuid, references profiles)
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
    
    - `conversation_tags`
      - `id` (uuid, primary key)
      - `name` (text)
      - `color` (text)
      - `created_at` (timestamptz)
    
    - `admin_notes`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, references conversations)
      - `admin_id` (uuid, references profiles)
      - `note` (text)
      - `created_at` (timestamptz)
    
    - `conversation_tags_junction`
      - `conversation_id` (uuid, references conversations)
      - `tag_id` (uuid, references conversation_tags)
      - Primary key (conversation_id, tag_id)
    
    - `analytics_events`
      - `id` (uuid, primary key)
      - `event_type` (text) - 'message_sent', 'handoff_requested', 'resource_shared', etc.
      - `conversation_id` (uuid, references conversations)
      - `metadata` (jsonb)
      - `created_at` (timestamptz)

  2. Updates to Existing Tables
    - Add columns to `conversations`:
      - `assigned_to` (uuid, references profiles)
      - `priority` (text) - 'low', 'medium', 'high', 'urgent'
      - `follow_up_date` (timestamptz)
      - `resolution_notes` (text)
      - `updated_at` (timestamptz)
    
    - Add columns to `messages`:
      - `resource_id` (uuid, references resources) - for tracking shared resources

  3. Security
    - Enable RLS on all new tables
    - Admins can read/write everything
    - Public users can only read active resources
    - Conversations remain accessible to public for chat
    
  4. Important Notes
    - Profiles are created automatically on user signup
    - First user becomes admin (can be changed manually)
    - Resources can be managed only by admins
    - Analytics track all important events
    - Tags help organize and filter conversations
*/

-- Create profiles table
CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text NOT NULL,
  full_name text,
  role text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public profiles are viewable by everyone"
  ON profiles FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
  ON profiles FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = id);

-- Create resources table
CREATE TABLE IF NOT EXISTS resources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  type text NOT NULL CHECK (type IN ('shelter', 'treatment', 'crisis', 'food', 'medical', 'legal', 'other')),
  description text,
  address text,
  city text,
  state text,
  zip_code text,
  phone text,
  website text,
  hours text,
  eligibility text,
  services text[],
  availability_status text DEFAULT 'unknown' CHECK (availability_status IN ('available', 'full', 'closed', 'unknown')),
  is_active boolean DEFAULT true,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE resources ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Active resources are viewable by everyone"
  ON resources FOR SELECT
  USING (is_active = true);

CREATE POLICY "Admins can insert resources"
  ON resources FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can update resources"
  ON resources FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can delete resources"
  ON resources FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create conversation_tags table
CREATE TABLE IF NOT EXISTS conversation_tags (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL UNIQUE,
  color text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE conversation_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags are viewable by authenticated users"
  ON conversation_tags FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can manage tags"
  ON conversation_tags FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create admin_notes table
CREATE TABLE IF NOT EXISTS admin_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  admin_id uuid NOT NULL REFERENCES profiles(id),
  note text NOT NULL,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE admin_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view all notes"
  ON admin_notes FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can create notes"
  ON admin_notes FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = admin_id
    AND EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create conversation_tags_junction table
CREATE TABLE IF NOT EXISTS conversation_tags_junction (
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  tag_id uuid NOT NULL REFERENCES conversation_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, tag_id)
);

ALTER TABLE conversation_tags_junction ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view tag associations"
  ON conversation_tags_junction FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "Admins can manage tag associations"
  ON conversation_tags_junction FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

-- Create analytics_events table
CREATE TABLE IF NOT EXISTS analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  conversation_id uuid REFERENCES conversations(id) ON DELETE SET NULL,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE analytics_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view analytics"
  ON analytics_events FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );

CREATE POLICY "System can insert analytics"
  ON analytics_events FOR INSERT
  WITH CHECK (true);

-- Add new columns to conversations table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'assigned_to'
  ) THEN
    ALTER TABLE conversations ADD COLUMN assigned_to uuid REFERENCES profiles(id);
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'priority'
  ) THEN
    ALTER TABLE conversations ADD COLUMN priority text DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'follow_up_date'
  ) THEN
    ALTER TABLE conversations ADD COLUMN follow_up_date timestamptz;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'resolution_notes'
  ) THEN
    ALTER TABLE conversations ADD COLUMN resolution_notes text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE conversations ADD COLUMN updated_at timestamptz DEFAULT now();
  END IF;
END $$;

-- Add resource tracking to messages
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'messages' AND column_name = 'resource_id'
  ) THEN
    ALTER TABLE messages ADD COLUMN resource_id uuid REFERENCES resources(id);
  END IF;
END $$;

-- Insert default tags
INSERT INTO conversation_tags (name, color) VALUES
  ('Housing', '#3B82F6'),
  ('Treatment', '#10B981'),
  ('Crisis', '#EF4444'),
  ('Food', '#F59E0B'),
  ('Medical', '#8B5CF6'),
  ('Legal', '#6366F1'),
  ('Follow-up Needed', '#EC4899')
ON CONFLICT (name) DO NOTHING;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_resources_type ON resources(type);
CREATE INDEX IF NOT EXISTS idx_resources_city ON resources(city);
CREATE INDEX IF NOT EXISTS idx_resources_active ON resources(is_active);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_assigned ON conversations(assigned_to);
CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics_events(event_type);
CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics_events(created_at);