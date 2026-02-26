import { useState, useEffect, useRef } from 'react';
import { Send, Loader2 } from 'lucide-react';
import { supabase, type Message, type AdminStatus } from '../lib/supabase';

export default function PublicChat() {
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    initializeChat();
    fetchAdminStatus();
  }, []);

  useEffect(() => {
    if (conversationId) {
      subscribeToMessages();
    }
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    const { data, error } = await supabase
      .from('conversations')
      .insert({
        status: 'active',
        assigned_to_human: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return;
    }

    setConversationId(data.id);

    await new Promise(resolve => setTimeout(resolve, 500));

    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      conversation_id: data.id,
      sender_type: 'ai',
      content: "Hi, I'm NRS Navigator. I help people find resources and take the next right step. What brings you here today?",
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages([welcomeMessage]);
  };

  const fetchAdminStatus = async () => {
    const { data } = await supabase
      .from('admin_status')
      .select('*')
      .single();

    if (data) {
      setAdminStatus(data);
    }
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`conversation:${conversationId}`)
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
          if (newMessage.sender_type !== 'visitor') {
            setMessages((prev) => [...prev, newMessage]);
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

    if (!inputValue.trim() || !conversationId || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const visitorMessage: Message = {
      id: 'temp-' + Date.now(),
      conversation_id: conversationId,
      sender_type: 'visitor',
      content: messageContent,
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, visitorMessage]);

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: 'visitor',
        content: messageContent,
      });

    if (error) {
      console.error('Error sending message:', error);
    }

    await simulateAIResponse(messageContent);
    setIsLoading(false);
  };

  const simulateAIResponse = async (userMessage: string) => {
    await new Promise(resolve => setTimeout(resolve, 1000));

    let aiResponse = '';

    const lowerMessage = userMessage.toLowerCase();

    if (lowerMessage.includes('housing') || lowerMessage.includes('shelter') || lowerMessage.includes('homeless')) {
      aiResponse = "Got it. Housing support. A few quick questions:\n\n1. What city or county are you in?\n2. Do you need emergency shelter tonight, or longer-term housing?\n3. Any barriers like no ID, no income, or pets?";
    } else if (lowerMessage.includes('treatment') || lowerMessage.includes('rehab') || lowerMessage.includes('detox') || lowerMessage.includes('addiction')) {
      aiResponse = "Understood. Treatment/recovery support. To point you in the right direction:\n\n1. What city or county are you in?\n2. Are you looking for detox, outpatient, residential, or recovery support groups?\n3. Do you have insurance or Medicaid?";
    } else if (lowerMessage.includes('food') || lowerMessage.includes('hungry') || lowerMessage.includes('eat')) {
      aiResponse = "Food assistance. Quick questions:\n\n1. What city or county are you in?\n2. Do you need food today, or help applying for benefits like SNAP?\n3. Any transportation issues?";
    } else if (lowerMessage.includes('crisis') || lowerMessage.includes('suicide') || lowerMessage.includes('kill myself') || lowerMessage.includes('end it')) {
      aiResponse = "I hear you're in crisis. This is serious.\n\n🚨 If you're in immediate danger:\n• Call/text 988 (Suicide & Crisis Lifeline)\n• Call 911 if you need emergency help now\n\nAre you safe right now?";
    } else if (lowerMessage.includes('talk to brandon') || lowerMessage.includes('human') || lowerMessage.includes('person')) {
      if (adminStatus?.is_online) {
        aiResponse = "Connecting you to Brandon now. He'll be with you shortly.";
        await supabase
          .from('conversations')
          .update({ assigned_to_human: true })
          .eq('id', conversationId);
      } else {
        aiResponse = adminStatus?.auto_response_message || "Brandon is currently away. I can help you find resources right now, or save your request for him to follow up. What works better for you?";
      }
    } else {
      aiResponse = "I'm here to help you find resources fast. What do you need help with?\n\nCommon areas:\n• Housing or shelter\n• Food assistance\n• Treatment or recovery support\n• Mental health resources\n• Legal help\n• Employment\n• ID or documents\n\nOr just tell me what's going on and I'll guide you from there.";
    }

    const { error } = await supabase
      .from('messages')
      .insert({
        conversation_id: conversationId,
        sender_type: adminStatus?.is_online ? 'ai' : 'ai',
        content: aiResponse,
      });

    if (error) {
      console.error('Error sending AI response:', error);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">NRS Navigator</h1>
              <p className="text-sm text-slate-600 mt-1">Resource navigation support</p>
            </div>
            <div className="flex items-center gap-2">
              <div className={`h-3 w-3 rounded-full ${adminStatus?.is_online ? 'bg-green-500' : 'bg-amber-500'}`} />
              <span className="text-sm font-medium text-slate-700">
                {adminStatus?.is_online ? 'Brandon online' : 'AI available'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-2xl rounded-2xl px-5 py-3 ${
                  message.sender_type === 'visitor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                }`}
              >
                {message.sender_type !== 'visitor' && (
                  <div className="text-xs font-semibold text-slate-500 mb-1">
                    {message.sender_type === 'admin' ? 'Brandon' : 'NRS Navigator'}
                  </div>
                )}
                <p className="text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-5 py-3 shadow-sm border border-slate-200">
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="bg-white border-t border-slate-200 shadow-lg">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-6 py-4">
          <div className="flex gap-3">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Type your message..."
              disabled={isLoading}
              className="flex-1 px-5 py-3 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-slate-100 disabled:cursor-not-allowed text-[15px]"
            />
            <button
              type="submit"
              disabled={!inputValue.trim() || isLoading}
              className="px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium flex items-center gap-2"
            >
              <Send className="h-5 w-5" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
