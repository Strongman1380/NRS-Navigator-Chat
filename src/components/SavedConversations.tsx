import { useState, useEffect } from 'react';
import { BookmarkPlus, Trash2, MessageCircle, Loader2, ChevronRight, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SavedConversation {
  id: string;
  conversation_id: string;
  title: string;
  created_at: string;
  message_preview?: string;
  message_count?: number;
}

interface ConversationMessage {
  id: string;
  sender_type: 'visitor' | 'admin' | 'ai';
  content: string;
  created_at: string;
}

export default function SavedConversations() {
  const { user } = useAuth();
  const [saved, setSaved] = useState<SavedConversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageLoadError, setMessageLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user) loadSaved();
  }, [user]);

  const loadSaved = async () => {
    if (!user) return;
    setLoading(true);

    const { data, error } = await supabase
      .from('saved_conversations')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error loading saved conversations:', error);
      setLoading(false);
      return;
    }

    // Load preview for each conversation in parallel
    const enriched = await Promise.all(
      (data || []).map(async (item) => {
        try {
          const { data: msgs, count, error: msgError } = await supabase
            .from('messages')
            .select('content', { count: 'exact' })
            .eq('conversation_id', item.conversation_id)
            .eq('sender_type', 'visitor')
            .order('created_at', { ascending: false })
            .limit(1);

          if (msgError) {
            console.error(`Error loading preview for ${item.conversation_id}:`, msgError);
          }

          return {
            ...item,
            message_preview: msgs?.[0]?.content || 'No messages',
            message_count: count || 0,
          };
        } catch (err) {
          console.error(`Error loading preview for ${item.conversation_id}:`, err);
          return { ...item, message_preview: 'No messages', message_count: 0 };
        }
      })
    );

    setSaved(enriched);
    setLoading(false);
  };

  const viewConversation = async (conversationId: string) => {
    setSelectedId(conversationId);
    setLoadingMessages(true);
    setMessageLoadError(null);

    const { data, error } = await supabase
      .from('messages')
      .select('id, sender_type, content, created_at')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error loading messages:', error);
      setMessageLoadError('Unable to load saved conversations');
      setMessages([]);
    } else {
      setMessages(data || []);
    }
    setLoadingMessages(false);
  };

  const removeSaved = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    // Capture the item before any state mutation
    const removed = saved.find(s => s.id === id);

    const { error } = await supabase.from('saved_conversations').delete().eq('id', id);
    if (error) {
      console.error('Error removing saved conversation:', error);
      return;
    }

    setSaved(prev => prev.filter(s => s.id !== id));
    if (selectedId && removed && removed.conversation_id === selectedId) {
      setSelectedId(null);
      setMessages([]);
    }
  };

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Viewing a conversation transcript
  if (selectedId) {
    return (
      <div className="flex flex-col h-full">
        <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3 flex items-center gap-3">
          <button
            onClick={() => { setSelectedId(null); setMessages([]); }}
            className="text-blue-600 hover:text-blue-700 text-sm font-medium"
          >
            Back
          </button>
          <div className="h-4 w-px bg-slate-200" />
          <h3 className="text-sm font-medium text-slate-900 truncate">
            {saved.find(s => s.conversation_id === selectedId)?.title || 'Conversation'}
          </h3>
        </div>

        <div className="flex-1 overflow-y-auto px-3 sm:px-4 py-4 space-y-3" style={{ WebkitOverflowScrolling: 'touch' }}>
          {loadingMessages ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
            </div>
          ) : messageLoadError ? (
            <p className="text-center text-red-500 text-sm py-8">Failed to load messages: {messageLoadError}</p>
          ) : messages.length === 0 ? (
            <p className="text-center text-slate-500 text-sm py-8">No messages in this conversation</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] sm:max-w-[75%] rounded-2xl px-3 sm:px-4 py-2.5 ${
                    msg.sender_type === 'visitor'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                  }`}
                >
                  {msg.sender_type !== 'visitor' && (
                    <div className="text-[10px] font-semibold text-slate-500 mb-0.5">
                      {msg.sender_type === 'admin' ? 'Admin' : 'NRS Navigator'}
                    </div>
                  )}
                  <p className="text-[13px] sm:text-sm leading-relaxed whitespace-pre-line">{msg.content}</p>
                  <p className={`text-[10px] mt-1 ${msg.sender_type === 'visitor' ? 'text-blue-200' : 'text-slate-400'}`}>
                    {formatTime(msg.created_at)}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // Saved conversations list
  return (
    <div className="flex flex-col h-full">
      <div className="bg-white border-b border-slate-200 px-3 sm:px-4 py-3">
        <h2 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2">
          <BookmarkPlus className="w-4 h-4 text-blue-600" />
          Saved Conversations
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Your saved conversations are private and only visible to you
        </p>
      </div>

      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
          </div>
        ) : saved.length === 0 ? (
          <div className="text-center py-12 px-4">
            <MessageCircle className="w-10 h-10 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-600 font-medium text-sm">No saved conversations yet</p>
            <p className="text-slate-400 text-xs mt-1">
              When chatting, tap the bookmark icon to save a conversation for later
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {saved.map((item) => (
              <div
                key={item.id}
                role="button"
                tabIndex={0}
                onClick={() => viewConversation(item.conversation_id)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); viewConversation(item.conversation_id); } }}
                className="w-full text-left px-3 sm:px-4 py-3 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <h3 className="font-medium text-slate-900 text-sm truncate">{item.title}</h3>
                    <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDate(item.created_at)}
                      {item.message_count ? ` · ${item.message_count} messages` : ''}
                    </p>
                    {item.message_preview && (
                      <p className="text-xs text-slate-400 mt-1 truncate">{item.message_preview}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={(e) => removeSaved(item.id, e)}
                      className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                      title="Remove from saved"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
