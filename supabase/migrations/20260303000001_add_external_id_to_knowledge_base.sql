/*
  Adds external_id column to knowledge_base for 211 NDP bulk import deduplication.
  The 211 Export API uses ServiceAtLocation IDs as stable identifiers.
*/

ALTER TABLE knowledge_base
  ADD COLUMN IF NOT EXISTS external_id text;

CREATE UNIQUE INDEX IF NOT EXISTS idx_knowledge_base_external_id
  ON knowledge_base(external_id)
  WHERE external_id IS NOT NULL;
