/*
  # Add topic_summary and needs_human_response to conversations

  - `topic_summary` (text) - AI-generated short label describing what the user is asking about
  - `needs_human_response` (boolean) - Set when auto-escalation fires after 1 minute
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'topic_summary'
  ) THEN
    ALTER TABLE conversations ADD COLUMN topic_summary text;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversations' AND column_name = 'needs_human_response'
  ) THEN
    ALTER TABLE conversations ADD COLUMN needs_human_response boolean DEFAULT false;
  END IF;
END $$;

-- Backfill existing rows that may have NULL needs_human_response
UPDATE conversations SET needs_human_response = false WHERE needs_human_response IS NULL;

-- Enforce NOT NULL now that all rows have a value
ALTER TABLE conversations ALTER COLUMN needs_human_response SET NOT NULL;
