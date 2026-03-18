/*
  # Saved Conversations

  Allows authenticated (non-guest) users to save conversations
  to their account for future reference.

  1. New Table: `saved_conversations`
    - `id` (uuid, primary key)
    - `user_id` (uuid, references auth.users(id))
    - `conversation_id` (uuid, references conversations)
    - `title` (text) - user-provided or auto-generated label
    - `created_at` (timestamptz)

  2. Security
    - Users can only see/manage their own saved conversations
*/

CREATE TABLE IF NOT EXISTS saved_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  title text DEFAULT 'Untitled Conversation',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, conversation_id)
);

CREATE INDEX IF NOT EXISTS idx_saved_conversations_user ON saved_conversations(user_id);

ALTER TABLE saved_conversations ENABLE ROW LEVEL SECURITY;

-- Users can view their own saved conversations
CREATE POLICY "Users can view own saved conversations"
  ON saved_conversations FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- Users can save conversations
CREATE POLICY "Users can save conversations"
  ON saved_conversations FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own saved conversations (e.g. rename title)
CREATE POLICY "Users can update own saved conversations"
  ON saved_conversations FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Users can remove their own saved conversations
CREATE POLICY "Users can delete own saved conversations"
  ON saved_conversations FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Admins can view all saved conversations
CREATE POLICY "Admins can view all saved conversations"
  ON saved_conversations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'admin'
    )
  );
