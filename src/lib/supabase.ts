import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim();
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export type Message = {
  id: string;
  conversation_id: string;
  sender_type: 'visitor' | 'admin' | 'ai';
  content: string;
  is_read: boolean;
  created_at: string;
};

export type Conversation = {
  id: string;
  visitor_name: string | null;
  location: string | null;
  category: string | null;
  urgency: string | null;
  constraints: string | null;
  status: string;
  assigned_to_human: boolean;
  created_at: string;
  updated_at: string;
};

export type AdminStatus = {
  id: string;
  is_online: boolean;
  auto_response_message: string;
  updated_at: string;
};

export type HandoffSummary = {
  id: string;
  conversation_id: string;
  category: string | null;
  location: string | null;
  urgency: string | null;
  key_constraints: string | null;
  what_user_asked: string | null;
  what_was_provided: string | null;
  recommended_next_step: string | null;
  safety_flags: string | null;
  created_at: string;
};
