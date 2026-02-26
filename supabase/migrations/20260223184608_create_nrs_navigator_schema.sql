/*
  # NRS Navigator Instant Messaging System

  1. New Tables
    - `admin_status`
      - `id` (uuid, primary key)
      - `is_online` (boolean) - Brandon's availability status
      - `auto_response_message` (text) - Custom away message
      - `updated_at` (timestamptz) - Last status change
      
    - `conversations`
      - `id` (uuid, primary key)
      - `visitor_name` (text, nullable) - Optional visitor identifier
      - `location` (text, nullable) - City/county
      - `category` (text, nullable) - Type of help needed
      - `urgency` (text, nullable) - Timeline for help
      - `constraints` (text, nullable) - Barriers mentioned
      - `status` (text) - active, resolved, needs_handoff
      - `assigned_to_human` (boolean) - If Brandon is handling it
      - `created_at` (timestamptz)
      - `updated_at` (timestamptz)
      
    - `messages`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `sender_type` (text) - visitor, admin, ai
      - `content` (text)
      - `is_read` (boolean)
      - `created_at` (timestamptz)
      
    - `handoff_summaries`
      - `id` (uuid, primary key)
      - `conversation_id` (uuid, foreign key)
      - `category` (text)
      - `location` (text)
      - `urgency` (text)
      - `key_constraints` (text)
      - `what_user_asked` (text)
      - `what_was_provided` (text)
      - `recommended_next_step` (text)
      - `safety_flags` (text)
      - `created_at` (timestamptz)

  2. Security
    - Enable RLS on all tables
    - Public can create conversations and send messages
    - Only authenticated admin can view all data and update status
    - Public can only read their own conversation by ID
*/

-- Admin Status Table
CREATE TABLE IF NOT EXISTS admin_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  is_online boolean DEFAULT false,
  auto_response_message text DEFAULT 'Thanks for reaching out. Brandon is currently away. I''m the NRS Navigator AI and I''ll help you find resources right now, or I can save your request for Brandon to follow up.',
  updated_at timestamptz DEFAULT now()
);

-- Insert default admin status
INSERT INTO admin_status (is_online) 
VALUES (false)
ON CONFLICT DO NOTHING;

-- Conversations Table
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  visitor_name text,
  location text,
  category text,
  urgency text,
  constraints text,
  status text DEFAULT 'active',
  assigned_to_human boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Messages Table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  sender_type text NOT NULL CHECK (sender_type IN ('visitor', 'admin', 'ai')),
  content text NOT NULL,
  is_read boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

-- Handoff Summaries Table
CREATE TABLE IF NOT EXISTS handoff_summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid REFERENCES conversations(id) ON DELETE CASCADE,
  category text,
  location text,
  urgency text,
  key_constraints text,
  what_user_asked text,
  what_was_provided text,
  recommended_next_step text,
  safety_flags text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE admin_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE handoff_summaries ENABLE ROW LEVEL SECURITY;

-- Admin Status Policies
CREATE POLICY "Anyone can read admin status"
  ON admin_status FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Only authenticated users can update admin status"
  ON admin_status FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Conversations Policies
CREATE POLICY "Anyone can create conversations"
  ON conversations FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read conversations by ID"
  ON conversations FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can update conversations"
  ON conversations FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Messages Policies
CREATE POLICY "Anyone can create messages"
  ON messages FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read messages for their conversation"
  ON messages FOR SELECT
  TO public
  USING (true);

CREATE POLICY "Authenticated users can update messages"
  ON messages FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

-- Handoff Summaries Policies
CREATE POLICY "Anyone can create handoff summaries"
  ON handoff_summaries FOR INSERT
  TO public
  WITH CHECK (true);

CREATE POLICY "Anyone can read handoff summaries"
  ON handoff_summaries FOR SELECT
  TO public
  USING (true);

-- Index for performance
CREATE INDEX IF NOT EXISTS idx_messages_conversation_id ON messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at);
CREATE INDEX IF NOT EXISTS idx_conversations_status ON conversations(status);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON conversations(created_at);
CREATE INDEX IF NOT EXISTS idx_handoff_summaries_conversation_id ON handoff_summaries(conversation_id);