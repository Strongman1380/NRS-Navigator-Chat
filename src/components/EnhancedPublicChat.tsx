import { useState, useEffect, useRef } from 'react';
import { Send, Loader2, Phone, AlertCircle, MapPin, User, ShieldCheck, Info, Search, BookmarkPlus, MessageCircle, Bookmark, LogOut, Calendar } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { generateTopicSummary } from '../lib/aiResponses';
import ResourceBrowser from './ResourceBrowser';
import SavedConversations from './SavedConversations';
import PersonalDashboard from './PersonalDashboard';

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


type ActiveTab = 'chat' | 'resources' | 'saved' | 'dashboard';

const HUMAN_REQUEST_PATTERNS = [
  'human',
  'real person',
  'talk to someone',
  'talk to a person',
  'speak with someone',
  'speak to someone',
  'live agent',
  'real help',
  'connect me to',
  'talk to brandon',
  'speak with brandon',
  'need a person',
  'not ai',
];

export default function EnhancedPublicChat() {
  const { user, signOut, hasDashboardAccess } = useAuth();
  const isGuest = !user?.email; // anonymous users have no email
  const stripeDonationUrl = import.meta.env.VITE_STRIPE_DONATION_URL as string | undefined;
  const [hasConsented, setHasConsented] = useState(false);
  const [consentChecked, setConsentChecked] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [suggestedResources] = useState<Resource[]>([]);
  const [isHumanConnected, setIsHumanConnected] = useState(false);
  const [activeTab, setActiveTab] = useState<ActiveTab>('chat');
  const [conversationSaved, setConversationSaved] = useState(false);
  const [savingConversation, setSavingConversation] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAdminTyping, setIsAdminTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const escalationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingBroadcastRef = useRef<number>(0);
  const isHumanConnectedRef = useRef(false);
  const humanEscalationSentRef = useRef(false);

  const handleConsent = async () => {
    const consentAcceptedAt = new Date().toISOString();
    const ok = await initializeChat(consentAcceptedAt);
    if (ok) {
      setHasConsented(true);
    }
  };

  useEffect(() => {
    if (!conversationId) return;

    const cleanupMessages = subscribeToMessages();
    const cleanupConversation = subscribeToConversation();
    const pollInterval = setInterval(pollForNewMessages, 3000);

    // Set up typing indicator channel
    const typingChannel = supabase.channel(`typing:${conversationId}`);
    typingChannel
      .on('broadcast', { event: 'typing' }, (payload) => {
        if (payload.payload?.sender === 'admin') {
          setIsAdminTyping(true);
          // Clear after 3s of no typing events
          if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = setTimeout(() => setIsAdminTyping(false), 3000);
        }
      })
      .subscribe();
    typingChannelRef.current = typingChannel;

    return () => {
      cleanupMessages();
      cleanupConversation();
      clearInterval(pollInterval);
      if (typingChannelRef.current) {
        supabase.removeChannel(typingChannelRef.current);
        typingChannelRef.current = null;
      }
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);
    };
  }, [conversationId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const initializeChat = async (consentAcceptedAt: string): Promise<boolean> => {
    if (!user) return false;

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        status: 'active',
        assigned_to_human: false,
        priority: 'medium',
        terms_accepted: true,
        terms_accepted_at: consentAcceptedAt,
        terms_version: '2026-02-26',
        risks_acknowledged: true,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating conversation:', error);
      return false;
    }

    setConversationId(data.id);

    await supabase.from('analytics_events').insert({
      event_type: 'conversation_started',
      conversation_id: data.id,
      metadata: { timestamp: new Date().toISOString() },
    });

    await supabase.from('analytics_events').insert({
      event_type: 'terms_accepted',
      conversation_id: data.id,
      metadata: {
        timestamp: consentAcceptedAt,
        termsVersion: '2026-02-26',
        risksAcknowledged: true,
      },
    });

    await new Promise(resolve => setTimeout(resolve, 500));

    const welcomeMessage: Message = {
      id: 'welcome-' + Date.now(),
      conversation_id: data.id,
      sender_type: 'ai',
      content: "Hey, I'm the Next Right Step Recovery Navigator. I'm an AI tool that helps people find resources like housing, treatment, food, legal help, employment, and more across Nebraska. I'm not a counselor, lawyer, or case manager, and I'm not connected to your supervision or court case. If you need to talk to a real person, I can connect you. What can I help you with today?",
      is_read: false,
      created_at: new Date().toISOString(),
    };

    setMessages([welcomeMessage]);
    return true;
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
          setIsHumanConnected(true); isHumanConnectedRef.current = true;
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
            setIsHumanConnected(true); isHumanConnectedRef.current = true;
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
            setIsHumanConnected(true); isHumanConnectedRef.current = true;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const TYPING_THROTTLE_MS = 400;

  const broadcastTyping = () => {
    const now = Date.now();
    if (typingChannelRef.current && now - lastTypingBroadcastRef.current > TYPING_THROTTLE_MS) {
      lastTypingBroadcastRef.current = now;
      typingChannelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { sender: 'visitor' },
      });
    }
  };

  const startEscalationTimer = () => {
    // Don't start if human already connected or escalation already sent
    if (isHumanConnectedRef.current || humanEscalationSentRef.current) return;

    // Clear existing timer
    if (escalationTimerRef.current) clearTimeout(escalationTimerRef.current);

    escalationTimerRef.current = setTimeout(async () => {
      // Re-check refs inside the callback to avoid stale closure
      if (isHumanConnectedRef.current || humanEscalationSentRef.current) return;

      // Double-check: has a human responded in the meantime?
      const { data: convo } = await supabase
        .from('conversations')
        .select('assigned_to_human')
        .eq('id', conversationId)
        .single();

      if (convo?.assigned_to_human) return;

      // Mark ref immediately to prevent duplicate escalations from concurrent timers
      humanEscalationSentRef.current = true;

      // Insert first to get the real DB id — avoids temp-id / realtime duplicate
      const { data: escalationMsg } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: "I'm reaching out to Brandon Hinrichs, our human support specialist, right now. He'll be with you shortly. In the meantime, feel free to keep sharing what you need help with — you don't have to figure this out alone.",
      }).select().single();

      if (escalationMsg) addMessageIfNew(escalationMsg);

      // Flag the conversation so admin sees it
      await supabase.from('conversations').update({
        needs_human_response: true,
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);
    }, 60_000); // 1 minute
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!inputValue.trim() || !conversationId || isLoading) return;

    const messageContent = inputValue.trim();
    setInputValue('');
    setIsLoading(true);

    const isFirstVisitorMessage = !messages.some(m => m.sender_type === 'visitor');

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

    // Set predictive topic summary on first message
    if (isFirstVisitorMessage) {
      const topicSummary = generateTopicSummary(messageContent);
      await supabase.from('conversations').update({
        topic_summary: topicSummary,
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);
    }

    await supabase.from('analytics_events').insert({
      event_type: 'message_sent',
      conversation_id: conversationId,
      metadata: { sender: 'visitor', length: messageContent.length },
    });

    await generateSmartAIResponse(messageContent);
    setIsLoading(false);

    // Start (or restart) the 1-minute escalation timer
    startEscalationTimer();
  };

  const isHumanRequest = (text: string): boolean => {
    const lower = text.toLowerCase();
    return HUMAN_REQUEST_PATTERNS.some((pattern) => lower.includes(pattern));
  };

  const isCrisisMessage = (text: string): boolean => {
    const lower = text.toLowerCase();
    return /\b(suicid|kill myself|hurt myself|self.?harm|end it all|want to die|overdose|od|not safe right now)\b/i.test(lower);
  };

  const generateSmartAIResponse = async (userMessage: string) => {
    // If a human admin has taken over, don't generate AI responses
    if (isHumanConnected) return;

    // Check the DB in case the flag was set between renders
    const { data: convo } = await supabase
      .from('conversations')
      .select('assigned_to_human')
      .eq('id', conversationId)
      .single();

    if (convo?.assigned_to_human) {
      setIsHumanConnected(true); isHumanConnectedRef.current = true;
      return;
    }

    // Deterministic crisis trigger — fast, no GPT round-trip needed.
    if (isCrisisMessage(userMessage)) {
      const crisisMessage = 'I hear you, and what you\'re feeling matters. Please call or text 988 right now — trained counselors are available 24/7. If you\'re in immediate danger, call 911. I\'m also connecting you with Brandon Hinrichs, our human support specialist, who will follow up with you directly. You don\'t have to figure this out alone.';

      const { data: aiMsg } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: crisisMessage,
      }).select().single();

      // Use the real DB id so realtime deduplicates correctly
      if (aiMsg) addMessageIfNew(aiMsg);

      await supabase.from('conversations').update({
        needs_human_response: true,
        status: 'escalated',
        priority: 'urgent',
        urgency: 'urgent',
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);

      await supabase.from('analytics_events').insert({
        event_type: 'crisis_detected',
        conversation_id: conversationId,
        metadata: { timestamp: new Date().toISOString(), source: 'runtime_crisis_trigger' },
      });

      return;
    }

    // Deterministic human handoff trigger.
    if (isHumanRequest(userMessage)) {
      const escalationMessage = "It sounds like what you're going through needs more than I can offer right now. I'm connecting you with Brandon Hinrichs, who built this platform and has over 10 years of experience in human services. He'll follow up with you directly. You don't have to figure this out alone.";

      const { data: aiMsg } = await supabase.from('messages').insert({
        conversation_id: conversationId,
        sender_type: 'ai',
        content: escalationMessage,
      }).select().single();

      if (aiMsg) addMessageIfNew(aiMsg);

      await supabase.from('conversations').update({
        needs_human_response: true,
        status: 'needs_handoff',
        priority: 'high',
        updated_at: new Date().toISOString(),
      }).eq('id', conversationId);

      await supabase.from('analytics_events').insert({
        event_type: 'human_requested',
        conversation_id: conversationId,
        metadata: { timestamp: new Date().toISOString(), source: 'chat_request' },
      });
      return;
    }

    // General case: send to the GPT-4 chat edge function.
    // It has full access to the knowledge base, live 211 API, and conversation context.
    // It inserts the AI message itself; realtime delivers it to the UI.
    try {
      const { data: { session } } = await supabase.auth.getSession();

      const chatHistory = messages
        .filter(m => !m.id.startsWith('temp-') && m.sender_type !== 'ai' || m.sender_type === 'ai')
        .map(m => ({
          role: (m.sender_type === 'visitor' ? 'user' : 'assistant') as 'user' | 'assistant',
          content: m.content,
        }));
      // Append the current visitor message
      chatHistory.push({ role: 'user', content: userMessage });

      await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/chat`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({ messages: chatHistory, conversationId }),
        }
      );
      // Realtime subscription delivers the AI message — no local state update needed.
    } catch (err) {
      console.error('Chat edge function error:', err);
    }
  };

  const handleCrisisCall = () => {
    window.location.href = 'tel:988';
  };

  const handleEmergencyCall = () => {
    window.location.href = 'tel:911';
  };

  const handleSaveConversation = async () => {
    if (!user || !conversationId || isGuest || savingConversation) return;
    setSavingConversation(true);

    // Auto-generate a title from the first visitor message
    const firstVisitor = messages.find(m => m.sender_type === 'visitor');
    const title = firstVisitor
      ? firstVisitor.content.slice(0, 60) + (firstVisitor.content.length > 60 ? '...' : '')
      : `Conversation — ${new Date().toLocaleDateString()}`;

    const { error } = await supabase.from('saved_conversations').insert({
      user_id: user.id,
      conversation_id: conversationId,
      title,
    });

    if (error) {
      console.error('Failed to save conversation:', error);
      setSaveError(error.message || 'Failed to save conversation');
    } else {
      setConversationSaved(true);
      setSaveError(null);
    }
    setSavingConversation(false);
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
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Next Right Step</h1>
              <p className="text-sm text-slate-600 mt-1">Recovery Resource Navigation</p>
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
                    Next Right Step is an <strong>AI-powered resource guide</strong> built specifically for people navigating recovery, reentry, and the justice system in Nebraska. It helps connect you with housing, treatment, food, legal help, employment, benefits, and other services. It provides <strong>general information and resource referrals only</strong>.
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
                    You are initially interacting with an <strong>AI system</strong>, not a human. The AI helps you find resources and answer questions about services in Nebraska. It is <strong>not a counselor, lawyer, or case manager</strong>, and it is <strong>not connected to your supervision or court case</strong>. A human support specialist monitors conversations and may join when needed. You will be notified when a human joins.
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

                {/* Human Staff */}
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-blue-900 mb-2">Need a Real Person?</h3>
                  <p className="text-blue-800 mb-2">
                    If at any point you would like to speak with a real person, simply say so in the chat (for example, "I'd like to talk to someone") and the AI will connect you with Brandon Hinrichs, the person behind this platform.
                  </p>
                  <p className="text-blue-800 mb-2">
                    Brandon is <strong>trauma-informed</strong>, with <strong>over 10 years of experience</strong> working directly in human services. He <strong>will not provide therapeutic insight, diagnoses, or clinical treatment</strong> — but he can provide a compassionate, knowledgeable person to talk to who understands what you're going through and can help guide you to the right resources.
                  </p>
                </div>

                {/* Service Area */}
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 sm:p-4">
                  <h3 className="font-semibold text-amber-900 mb-1">Service Area — Nebraska Only</h3>
                  <p className="text-amber-800">
                    This service is currently available only to individuals located in <strong>Nebraska</strong>. If you are reaching out from another state, we encourage you to explore resources in your area by calling <strong>211</strong> (free, confidential, available nationwide 24/7) or visiting <strong>findtreatment.gov</strong>. We appreciate your understanding as we work to expand.
                  </p>
                </div>

                {/* Privacy */}
                <div>
                  <h3 className="font-semibold text-slate-900 mb-1">Privacy & Data</h3>
                  <p>
                    We collect only the minimum information necessary to connect you with resources. Your conversation is stored securely and is accessible only to authorized support staff. <strong>We do not share information with probation officers, courts, or law enforcement.</strong> We do not sell or share your data with third parties. You are not required to provide your name or any identifying information to use this service.
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
                      I have read and understand the above information. I acknowledge that this is an <strong>AI-powered resource navigation tool</strong>, not a substitute for professional counseling, therapy, or medical care. I understand that this platform is <strong>not connected to courts, probation, or law enforcement</strong>, that a human may monitor and join this conversation, and that I should contact 988 or 911 if I am in immediate crisis.
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
              Next Right Step Recovery Navigator is not a licensed healthcare provider. This service complies with applicable state and federal regulations regarding AI-assisted communications.
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
          {stripeDonationUrl && activeTab === 'chat' && (
            <div className="mb-2 sm:mb-3 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-[11px] sm:text-xs text-slate-700">
                  Chat is private, secure, and confidential. Optional: support this mission to help more people receive resources statewide.
                </p>
                <a
                  href={stripeDonationUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-2.5 py-1.5 bg-emerald-600 text-white rounded-md hover:bg-emerald-700 active:bg-emerald-800 transition-colors text-[11px] sm:text-xs font-medium"
                >
                  Donate
                </a>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between">
            <div className="min-w-0 flex-1">
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-slate-900 truncate">Next Right Step</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5">
                {isHumanConnected && activeTab === 'chat' ? (
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
              {/* Save conversation button (only for authenticated, non-guest users in chat tab) */}
              {!isGuest && activeTab === 'chat' && conversationId && messages.length > 1 && (
                <button
                  onClick={handleSaveConversation}
                  disabled={conversationSaved || savingConversation}
                  className={`flex items-center gap-1 px-2.5 sm:px-3 py-1.5 sm:py-2 rounded-lg transition-colors text-xs sm:text-sm font-medium ${
                    conversationSaved
                      ? 'bg-emerald-100 text-emerald-700'
                      : saveError
                        ? 'bg-red-100 text-red-700 hover:bg-red-200'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:bg-slate-300'
                  }`}
                  title={conversationSaved ? 'Conversation saved' : saveError ? `Save failed: ${saveError}` : 'Save this conversation'}
                >
                  {conversationSaved ? (
                    <Bookmark className="w-3.5 h-3.5 fill-current" />
                  ) : savingConversation ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <BookmarkPlus className="w-3.5 h-3.5" />
                  )}
                  <span className="hidden sm:inline">{conversationSaved ? 'Saved' : 'Save'}</span>
                </button>
              )}
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

          {/* Tab navigation */}
          <div className="flex mt-2.5 -mb-[calc(0.625rem+1px)] sm:-mb-[calc(0.75rem+1px)] md:-mb-[calc(1rem+1px)] gap-1">
            <button
              onClick={() => setActiveTab('chat')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs sm:text-sm font-medium border border-b-0 transition-colors ${
                activeTab === 'chat'
                  ? 'bg-slate-50 text-blue-600 border-slate-200'
                  : 'bg-white text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              Chat
            </button>
            <button
              onClick={() => setActiveTab('resources')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs sm:text-sm font-medium border border-b-0 transition-colors ${
                activeTab === 'resources'
                  ? 'bg-slate-50 text-blue-600 border-slate-200'
                  : 'bg-white text-slate-500 border-transparent hover:text-slate-700'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              Resources
            </button>
            {!isGuest && (
              <button
                onClick={() => setActiveTab('saved')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs sm:text-sm font-medium border border-b-0 transition-colors ${
                  activeTab === 'saved'
                    ? 'bg-slate-50 text-blue-600 border-slate-200'
                    : 'bg-white text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <Bookmark className="w-3.5 h-3.5" />
                Saved
              </button>
            )}
            {hasDashboardAccess && !isGuest && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-t-lg text-xs sm:text-sm font-medium border border-b-0 transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-slate-50 text-blue-600 border-slate-200'
                    : 'bg-white text-slate-500 border-transparent hover:text-slate-700'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                Dashboard
              </button>
            )}
            {/* Sign out - far right */}
            <div className="flex-1" />
            <button
              onClick={signOut}
              className="flex items-center gap-1 px-2 py-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
              title="Sign out"
            >
              <LogOut className="w-3 h-3" />
              <span className="hidden sm:inline">Sign out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Resources tab */}
      {activeTab === 'resources' && (
        <div className="flex-1 overflow-hidden">
          <ResourceBrowser />
        </div>
      )}

      {/* Saved conversations tab */}
      {activeTab === 'saved' && !isGuest && (
        <div className="flex-1 overflow-hidden">
          <SavedConversations />
        </div>
      )}

      {/* Dashboard tab */}
      {activeTab === 'dashboard' && hasDashboardAccess && !isGuest && (
        <div className="flex-1 overflow-hidden">
          <PersonalDashboard />
        </div>
      )}

      {/* Chat tab */}
      {activeTab === 'chat' && (
        <>
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
                        {message.sender_type === 'admin' ? 'Brandon' : 'Recovery Navigator'}
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

              {/* AI typing indicator */}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">NRS Navigator</div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  </div>
                </div>
              )}

              {/* Admin typing indicator */}
              {isAdminTyping && !isLoading && (
                <div className="flex justify-start">
                  <div className="bg-white rounded-2xl px-4 py-3 shadow-sm border border-slate-200">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-500 mb-1">Brandon</div>
                    <div className="flex items-center gap-1">
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 bg-blue-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
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
                  onChange={(e) => {
                    setInputValue(e.target.value);
                    broadcastTyping();
                  }}
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
        </>
      )}
    </div>
  );
}
