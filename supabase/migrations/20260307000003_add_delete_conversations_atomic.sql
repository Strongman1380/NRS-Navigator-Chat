-- Atomic function to delete conversations and their messages in a single transaction.
-- Used by the manage-conversations edge function to avoid partial deletes.
create or replace function delete_conversations_atomic(conversation_ids uuid[])
returns void
language plpgsql
security definer
as $$
begin
  delete from messages where conversation_id = any(conversation_ids);
  delete from conversations where id = any(conversation_ids);
end;
$$;
