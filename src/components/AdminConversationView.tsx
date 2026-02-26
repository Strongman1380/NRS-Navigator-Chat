import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Send, Loader2, CheckCircle, UserCheck } from 'lucide-react';
import { supabase, type Message, type Conversation } from '../lib/supabase';

interface AdminConversationViewProps {
  conversationId: string;
  onBack: () => void;
}

export default function AdminConversationView({ conversationId, onBack }: AdminConversationViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversation();
    fetchMessages();
    const cleanupSub = subscribeToMessages();
    markMessagesAsRead();
    const pollInterval = setInterval(pollForNewMessages, 3000);

    return () => {
      cleanupSub();
      clearInterval(pollInterval);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const fetchConversation = async () => {
    const { data } = await supabase
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (data) {
      setConversation(data);
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
    } else {
      setMessages(data || []);
    }
  };

  const markMessagesAsRead = async () => {
    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor')
      .eq('is_read', false);
  };

  const addMessageIfNew = (msg: Message) => {
    setMessages((prev) => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const pollForNewMessages = async () => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id));
        const newOnes = data.filter(m => !existingIds.has(m.id));
        if (newOnes.length === 0) return prev;
        return [...prev, ...newOnes];
      });

      if (data.some(m => m.sender_type === 'visitor' && !m.is_read)) {
        markMessagesAsRead();
      }
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`admin-conversation:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMessage = payload.new as Message;
          addMessageIfNew(newMessage);

          if (newMessage.sender_type === 'visitor') {
            markMessagesAsRead();
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const { data: adminMsg, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'admin',
        content: messageContent,
        is_read: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error sending message:', error);
    } else if (adminMsg) {
      addMessageIfNew(adminMsg);
    }

    await supabase
      .from('conversations')
      .update({
        assigned_to_human: true,
        status: 'escalated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    setIsLoading(false);
  };

  const handleTakeOver = async () => {
    await supabase
      .from('conversations')
      .update({
        assigned_to_human: true,
        status: 'escalated',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    setConversation(prev => prev ? { ...prev, assigned_to_human: true, status: 'escalated' } : prev);

    const { data: takeoverMsg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'admin',
      content: "Hi, I'm Brandon — a real person on the NRS team. I've joined this conversation to help you directly. How can I assist you?",
      is_read: false,
    }).select().single();

    if (takeoverMsg) {
      addMessageIfNew(takeoverMsg);
    }
  };

  const handleResolve = async () => {
    await supabase
      .from('conversations')
      .update({
        status: 'resolved',
        updated_at: new Date().toISOString(),
      })
      .eq('id', conversationId);

    onBack();
  };

  return (
    <div className="flex flex-col h-screen-safe bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 safe-x">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
              <button
                onClick={onBack}
                className="p-1.5 sm:p-2 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors flex-shrink-0"
              >
                <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 text-slate-700" />
              </button>
              <div className="min-w-0">
                <h1 className="text-sm sm:text-base md:text-xl font-bold text-slate-900 truncate">
                  {conversation?.visitor_name || 'Anonymous Visitor'}
                </h1>
                {conversation && (
                  <div className="flex items-center gap-1.5 sm:gap-3 mt-0.5 text-[10px] sm:text-xs md:text-sm text-slate-600 overflow-x-auto whitespace-nowrap">
                    {conversation.category && <span>{conversation.category}</span>}
                    {conversation.location && <span>• {conversation.location}</span>}
                    {conversation.urgency && <span>• {conversation.urgency}</span>}
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              {!conversation?.assigned_to_human && (
                <button
                  onClick={handleTakeOver}
                  className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-amber-600 text-white rounded-lg hover:bg-amber-700 active:bg-amber-800 transition-colors font-medium text-xs sm:text-sm"
                >
                  <UserCheck className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                  <span className="hidden sm:inline">Take Over</span>
                </button>
              )}
              <button
                onClick={handleResolve}
                className="flex items-center gap-1 sm:gap-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 active:bg-green-800 transition-colors font-medium text-xs sm:text-sm"
              >
                <CheckCircle className="h-3.5 w-3.5 sm:h-4 sm:w-4 md:h-5 md:w-5" />
                <span className="hidden sm:inline">Resolve</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-3 safe-x">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_type === 'admin' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[75%] md:max-w-2xl rounded-2xl px-3 sm:px-4 py-2 sm:py-3 ${
                  message.sender_type === 'admin'
                    ? 'bg-blue-600 text-white'
                    : message.sender_type === 'ai'
                    ? 'bg-slate-200 text-slate-900'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                }`}
              >
                <div className="text-[10px] sm:text-xs font-semibold mb-0.5 opacity-75">
                  {message.sender_type === 'admin' ? 'You (Brandon)' : message.sender_type === 'ai' ? 'AI Navigator' : 'Visitor'}
                </div>
                <p className="text-[13px] sm:text-sm md:text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
                <div className="text-[10px] sm:text-xs opacity-75 mt-0.5">
                  {new Date(message.created_at).toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-end">
              <div className="bg-blue-600 rounded-2xl px-4 py-2.5">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-white" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="bg-white border-t border-slate-200 shadow-lg safe-bottom">
        <form onSubmit={handleSendMessage} className="max-w-5xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 safe-x">
          <div className="flex gap-2">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-3 sm:px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-3.5 sm:px-5 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 active:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center"
            >
              <Send className="h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
