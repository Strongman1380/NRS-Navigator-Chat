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
