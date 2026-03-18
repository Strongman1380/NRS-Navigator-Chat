/*
  # Track user consent on conversations

  Adds explicit consent metadata so each conversation can show
  that terms/risk acknowledgements were accepted before chat begins.
*/

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS terms_accepted boolean DEFAULT false;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS terms_accepted_at timestamptz;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS terms_version text;

ALTER TABLE conversations
  ADD COLUMN IF NOT EXISTS risks_acknowledged boolean DEFAULT false;

-- Ensure that when terms_accepted is true, timestamp and version are always present
ALTER TABLE conversations
  ADD CONSTRAINT chk_conversations_terms_consistency
  CHECK ((terms_accepted IS NOT TRUE) OR (terms_accepted_at IS NOT NULL AND terms_version IS NOT NULL));
