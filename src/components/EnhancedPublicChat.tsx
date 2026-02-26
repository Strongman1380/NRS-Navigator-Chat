import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Phone, AlertCircle, MapPin, Home, User, ShieldCheck, Info } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateAIResponse } from '../lib/aiResponses';

interface Message {
  id: string;
  conversation_id: string;
  sender_type: 'visitor' | 'admin' | 'ai';
  content: string;
  resource_id?: string;
  is_read: boolean;
  created_at: string;
  user_id?: string;
}

interface Resource {
  id: string;
  name: string;
  type: string;
  phone?: string;
  address?: string;
  city?: string;
}

export default function EnhancedPublicChat() {
  const { user } = useAuth();
  const stripeDonationUrl = import.meta.env.VITE_STRIPE_DONATION_URL as string | undefined;
  const [hasConsented, setHasConsented] = useState(() => {
    return sessionStorage.getItem('nrs_consent_acknowledged') === 'true';
  });
  const [consentChecked, setConsentChecked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedResources, setSuggestedResources] = useState<Resource[]>([]);
  const [isHumanConnected, setIsHumanConnected] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const handleConsent = () => {
    sessionStorage.setItem('nrs_consent_acknowledged', 'true');
    setHasConsented(true);
  };

  useEffect(() => {
    if (hasConsented) initializeChat();
  }, [hasConsented]);

  useEffect(() => {
    if (!conversationId) return;

    const cleanupMessages = subscribeToMessages();
    const cleanupConversation = subscribeToConversation();
    const pollInterval = setInterval(pollForNewMessages, 3000);

    return () => {
      cleanupMessages();
      cleanupConversation();
      clearInterval(pollInterval);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        status: 'active',
        assigned_to_human: false,
        priority: 'medium',
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return;
    }

    setConversationId(data.id);

    await supabase.from('analytics_events').insert({
      event_type: 'conversation_started',
      conversation_id: data.id,
      metadata: { timestamp: new Date().toISOString() },
    });

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

  const addMessageIfNew = (msg: Message) => {
    setMessages((prev) => {
      if (prev.some(m => m.id === msg.id)) return prev;
      return [...prev, msg];
    });
  };

  const pollForNewMessages = async () => {
    if (!conversationId) return;

    // Only poll for admin/ai messages — visitor messages are added locally
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .neq('sender_type', 'visitor')
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      setMessages((prev) => {
        const existingIds = new Set(prev.map(m => m.id));
        const newOnes = data.filter(m => !existingIds.has(m.id));
        if (newOnes.length === 0) return prev;

        if (newOnes.some(m => m.sender_type === 'admin')) {
          setIsHumanConnected(true);
        }

        return [...prev, ...newOnes];
      });
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
            addMessageIfNew(newMessage);
          }
          if (newMessage.sender_type === 'admin') {
            setIsHumanConnected(true);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const subscribeToConversation = () => {
    const channel = supabase
      .channel(`conversation-status:${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'conversations',
          filter: `id=eq.${conversationId}`,
        },
        (payload) => {
          const updated = payload.new as { assigned_to_human?: boolean };
          if (updated.assigned_to_human) {
            setIsHumanConnected(true);
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

    await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'visitor',
      content: messageContent,
    });

    await supabase.from('analytics_events').insert({
      event_type: 'message_sent',
      conversation_id: conversationId,
      metadata: { sender: 'visitor', length: messageContent.length },
    });

    await generateSmartAIResponse(messageContent);
    setIsLoading(false);
  };

  const generateSmartAIResponse = async (userMessage: string) => {
    // If a human admin has taken over, don't generate AI responses
    if (isHumanConnected) return;

    // Also check the DB in case the flag was set between renders
    const { data: convo } = await supabase
      .from('conversations')
      .select('assigned_to_human')
      .eq('id', conversationId)
      .single();

    if (convo?.assigned_to_human) {
      setIsHumanConnected(true);
      return;
    }

    // Build context from conversation history
    const previousTopics = messages
      .filter(m => m.sender_type === 'ai' && m.content)
      .flatMap(m => {
        const topics: string[] = [];
        const lower = m.content.toLowerCase();
        if (lower.includes('shelter') || lower.includes('housing')) topics.push('housing');
        if (lower.includes('treatment') || lower.includes('rehab')) topics.push('treatment');
        if (lower.includes('food') || lower.includes('meal')) topics.push('food');
        if (lower.includes('medical') || lower.includes('doctor')) topics.push('medical');
        if (lower.includes('legal') || lower.includes('lawyer')) topics.push('legal');
        if (lower.includes('crisis') || lower.includes('988')) topics.push('crisis');
        return topics;
      });

    const visitorMessages = messages.filter(m => m.sender_type === 'visitor');
    const aiResult = generateAIResponse(userMessage, {
      messageCount: visitorMessages.length,
      previousTopics: [...new Set(previousTopics)],
    });

    // Insert the AI response into Supabase so both user and admin see it
    const { data: aiMsg } = await supabase.from('messages').insert({
      conversation_id: conversationId,
      sender_type: 'ai',
      content: aiResult.message,
    }).select().single();

    // Add to local state directly — don't rely on realtime subscription
    if (aiMsg) {
      addMessageIfNew(aiMsg);
    } else {
      // Fallback: add optimistically if insert didn't return data
      setMessages((prev) => [...prev, {
        id: 'ai-' + Date.now(),
        conversation_id: conversationId!,
        sender_type: 'ai' as const,
        content: aiResult.message,
        is_read: false,
        created_at: new Date().toISOString(),
      }]);
    }

    // Update conversation metadata based on AI analysis
    if (aiResult.priority === 'urgent') {
      await supabase.from('conversations').update({
        priority: 'urgent',
        urgency: 'urgent',
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);

      await supabase.from('analytics_events').insert({
        event_type: 'crisis_detected',
        conversation_id: conversationId,
        metadata: { timestamp: new Date().toISOString(), tags: aiResult.tags },
      });
    } else if (aiResult.priority && aiResult.priority !== 'low') {
      await supabase.from('conversations').update({
        priority: aiResult.priority,
        category: aiResult.tags?.[0] || null,
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);
    }
  };

  const handleCrisisCall = () => {
    window.location.href = 'tel:988';
  };

  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  // ─── Consent / Disclaimer Screen ──────────────────────────────
  if (!hasConsented) {
    return (
      <div className="flex flex-col h-screen-safe bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="flex-1 overflow-y-auto">
          <div className="max-w-2xl mx-auto px-4 sm:px-6 py-6 sm:py-10 safe-x">

            {/* Logo / Title */}
            <div className="text-center mb-6">
              <div className="inline-flex items-center justify-center w-14 h-14 bg-blue-100 rounded-2xl mb-3">
                <ShieldCheck className="w-7 h-7 text-blue-600" />
              </div>
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">NRS Navigator</h1>
              <p className="text-sm text-slate-600 mt-1">Resource Navigation Support</p>
            </div>

            {/* Disclaimer card */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">

              {/* Important Notice header */}
              <div className="bg-blue-600 px-4 sm:px-6 py-3">
                <h2 className="text-white font-semibold text-sm sm:text-base flex items-center gap-2">
                  <Info className="w-4 h-4 flex-shrink-0" />
                  Important Information — Please Read Before Continuing
                </h2>
              </div>

              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-4 text-[13px] sm:text-sm text-slate-700 leading-relaxed">

                {/* What this is */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">What This Service Is</h3>
                  <p>
                    NRS Navigator is an <strong>AI-assisted resource navigation tool</strong> that helps connect you with community resources such as shelters, food assistance, treatment programs, medical care, and other services in Nebraska. It provides <strong>general information and resource referrals only</strong>.
                  </p>
                </div>

                {/* What this is NOT */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">What This Service Is NOT</h3>
                  <ul className="list-disc list-inside space-y-1 text-slate-600">
                    <li>This is <strong>not therapy, counseling, or medical advice</strong></li>
                    <li>This tool does <strong>not diagnose, treat, or prevent</strong> any mental health or medical condition</li>
                    <li>AI responses are <strong>not a substitute</strong> for professional help from a licensed counselor, therapist, or medical provider</li>
                    <li>The AI may occasionally provide <strong>inaccurate or incomplete information</strong> — always verify resource details independently</li>
                  </ul>
                </div>

                {/* AI Disclosure */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">AI Disclosure</h3>
                  <p>
                    You are initially interacting with an <strong>artificial intelligence system</strong>, not a human. The AI is designed to help with basic resource navigation questions. A trained human support specialist monitors conversations and may join the chat when more detailed support is needed. You will be notified when a human joins the conversation.
                  </p>
                </div>

                {/* Human Oversight */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Human Oversight</h3>
                  <p>
                    All conversations are monitored by a human support team. If the system detects signs of crisis, complex needs, or if you request to speak with a person, your conversation will be <strong>escalated to a live support specialist</strong>. You can request a human at any time by typing "I'd like to speak with someone."
                  </p>
                </div>

                {/* Crisis Resources */}
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-red-800 mb-2">If You Are in Crisis</h3>
                  <p className="text-red-700 mb-2">
                    If you are experiencing a mental health emergency, thoughts of self-harm, or are in immediate danger, please contact emergency services directly:
                  </p>
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold flex-shrink-0">!</span>
                      <span className="font-medium text-red-800">988</span>
                      <span className="text-red-700">— Suicide & Crisis Lifeline (call or text, 24/7)</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-red-600 text-white rounded-full text-xs font-bold flex-shrink-0">!</span>
                      <span className="font-medium text-red-800">911</span>
                      <span className="text-red-700">— Emergency Services</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 bg-orange-500 text-white rounded-full text-xs font-bold flex-shrink-0">!</span>
                      <span className="font-medium text-red-800">1-800-799-7233</span>
                      <span className="text-red-700">— National Domestic Violence Hotline</span>
                    </div>
                  </div>
                </div>

                {/* Privacy */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Privacy & Data</h3>
                  <p>
                    We collect only the minimum information necessary to connect you with resources. Your conversation is stored securely and is accessible only to authorized support staff. We do not sell or share your data with third parties. You are not required to provide your name or any identifying information to use this service.
                  </p>
                </div>

                {/* Limitations */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Limitations & Accuracy</h3>
                  <p>
                    Resource availability, contact information, and eligibility requirements may change without notice. While we make every effort to keep our database current, we recommend calling ahead to confirm details. The AI system may occasionally misinterpret your needs — if a response seems off, please rephrase or ask to speak with a human.
                  </p>
                </div>

                {/* Checkbox */}
                <div className="border-t border-slate-200 pt-4 mt-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={consentChecked}
                      onChange={(e) => setConsentChecked(e.target.checked)}
                      className="mt-0.5 w-5 h-5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer flex-shrink-0"
                    />
                    <span className="text-slate-700 text-[13px] sm:text-sm leading-relaxed group-hover:text-slate-900 transition-colors">
                      I have read and understand the above information. I acknowledge that this is an <strong>AI-assisted resource navigation tool</strong>, not a substitute for professional counseling, therapy, or medical care. I understand that a human may monitor and join this conversation, and that I should contact 988 or 911 if I am in immediate crisis.
                    </span>
                  </label>
                </div>
              </div>

              {/* Continue button */}
              <div className="px-4 sm:px-6 pb-4 sm:pb-5">
                <button
                  onClick={handleConsent}
                  disabled={!consentChecked}
                  className="w-full py-3 bg-blue-600 text-white rounded-xl font-semibold text-sm sm:text-base hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                >
                  I Understand — Continue to Chat
                </button>
              </div>
            </div>

            {/* Footer note */}
            <p className="text-center text-[11px] sm:text-xs text-slate-400 mt-4">
              NRS Navigator is not a licensed healthcare provider. This service complies with applicable state and federal regulations regarding AI-assisted communications.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-screen-safe bg-gradient-to-br from-slate-50 to-slate-100">
      {/* Header - safe area top for notched iPhones */}
      <div className="bg-white border-b border-slate-200 shadow-sm safe-top">
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 safe-x">
          <div className="mb-2 sm:mb-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-[11px] sm:text-xs text-slate-700">
                Chat is private, secure, and confidential. Optional: support this mission to help more people receive resources statewide.
              </p>
              {stripeDonationUrl ? (
                <a
                  href={stripeDonationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 active:bg-emerald-800 transition-colors text-[11px] sm:text-xs font-medium"
                >
                  Donate
                </a>
              ) : (
                <p className="text-[10px] sm:text-[11px] text-slate-500">
                  Set `VITE_STRIPE_DONATION_URL` to enable donations.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">NRS Navigator</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5">
                {isHumanConnected ? (
                  <span className="flex items-center gap-1 text-green-600 font-medium">
                    <User className="w-3 h-3 flex-shrink-0" />
                    Connected to support specialist
                  </span>
                ) : (
                  'Resource navigation support'
                )}
              </p>
            </div>
            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0 ml-2">
              <button
                onClick={handleCrisisCall}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 active:bg-red-800 transition-colors text-xs sm:text-sm font-medium"
              >
                <Phone className="w-3.5 h-3.5" />
                988
              </button>
              <button
                onClick={handleEmergencyCall}
                className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 active:bg-orange-800 transition-colors text-xs sm:text-sm font-medium"
              >
                <AlertCircle className="w-3.5 h-3.5" />
                911
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Messages area */}
      <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
        <div className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 space-y-3 safe-x">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender_type === 'visitor' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[80%] sm:max-w-[75%] md:max-w-2xl rounded-2xl px-3 sm:px-4 py-2.5 sm:py-3 ${
                  message.sender_type === 'visitor'
                    ? 'bg-blue-600 text-white'
                    : 'bg-white text-slate-900 shadow-sm border border-slate-200'
                }`}
              >
                {message.sender_type !== 'visitor' && (
                  <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-0.5">
                    {message.sender_type === 'admin' ? 'Brandon' : 'NRS Navigator'}
                  </div>
                )}
                <p className="text-[13px] sm:text-sm md:text-[15px] leading-relaxed whitespace-pre-line">{message.content}</p>
              </div>
            </div>
          ))}

          {suggestedResources.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-3 sm:p-4 space-y-2 sm:space-y-3">
              <h3 className="font-semibold text-slate-900 flex items-center gap-2 text-sm sm:text-base">
                <MapPin className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600 flex-shrink-0" />
                Suggested Resources
              </h3>
              {suggestedResources.map((resource) => (
                <div key={resource.id} className="border-t border-slate-200 pt-2 sm:pt-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <h4 className="font-medium text-slate-900 text-sm">{resource.name}</h4>
                      {resource.address && (
                        <p className="text-xs sm:text-sm text-slate-600 mt-0.5">
                          {resource.address}, {resource.city}
                        </p>
                      )}
                    </div>
                    {resource.phone && (
                      <a
                        href={`tel:${resource.phone}`}
                        className="ml-2 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-sm font-medium flex items-center gap-1 flex-shrink-0"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        Call
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-white rounded-2xl px-4 py-2.5 shadow-sm border border-slate-200">
                <Loader2 className="h-4 w-4 sm:h-5 sm:w-5 animate-spin text-slate-400" />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input area - safe area bottom for home indicator */}
      <div className="bg-white border-t border-slate-200 shadow-lg safe-bottom">
        <form onSubmit={handleSendMessage} className="max-w-4xl mx-auto px-3 sm:px-4 md:px-6 py-2 sm:py-3 safe-x">
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
