import { useState, useEffect, useRef, useCallback } from 'react';
import {
  MessageSquare, Users, AlertCircle, TrendingUp, LogOut, Database, RefreshCw
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminConversationView from './AdminConversationView';
import ResourceManager from './ResourceManager';
import { useBrowserNotifications } from '../hooks/useBrowserNotifications';

interface Conversation {
  id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
  needs_human_response?: boolean;
  category?: string;
  visitor_name?: string;
  location?: string;
  topic_summary?: string;
}

interface AnalyticsData {
  totalToday: number;
  activeChats: number;
  needsAttention: number;
  averageResponseTime: number;
  topCategories: Array<{ name: string; count: number }>;
  urgentCount: number;
}

const POLL_INTERVAL = 30_000; // 30 seconds

export default function EnhancedAdminDashboard() {
  const { signOut, profile } = useAuth();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    totalToday: 0,
    activeChats: 0,
    needsAttention: 0,
    averageResponseTime: 0,
    topCategories: [],
    urgentCount: 0,
  });
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [currentView, setCurrentView] = useState<'dashboard' | 'resources'>('dashboard');
  const [messagePreviews, setMessagePreviews] = useState<Record<string, string>>({});
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());

  // Notification state
  const { requestPermission, notify, playAlertSound } = useBrowserNotifications();
  const notifiedConversationsRef = useRef<Set<string>>(new Set());
  const notifiedUrgentRef = useRef<Set<string>>(new Set());

  // Request notification permission on mount
  useEffect(() => {
    requestPermission();
  }, [requestPermission]);

  useEffect(() => {
    fetchConversations();
    fetchAnalytics();
    const unsubscribe = subscribeToConversations();

    // Polling fallback
    const pollInterval = setInterval(() => {
      fetchConversations();
      fetchAnalytics();
    }, POLL_INTERVAL);

    return () => {
      unsubscribe();
      clearInterval(pollInterval);
    };
  }, []);

  // Fire notifications when conversations change
  useEffect(() => {
    if (conversations.length === 0) return;

    for (const convo of conversations) {
      // Notify on brand-new conversations
      if (!notifiedConversationsRef.current.has(convo.id)) {
        notifiedConversationsRef.current.add(convo.id);
        const preview = messagePreviews[convo.id] || '';
        const isUrgent = convo.priority === 'urgent' || convo.needs_human_response;

        if (isUrgent) {
          notify('URGENT: New Crisis Conversation', {
            body: preview || `Priority: ${convo.priority} — Status: ${convo.status}`,
            urgent: true,
          });
          playAlertSound();
          notifiedUrgentRef.current.add(convo.id);
        } else {
          notify('New Conversation', {
            body: preview || `Priority: ${convo.priority} — Status: ${convo.status}`,
          });
        }
      }

      // Notify when existing conversation becomes urgent
      if (
        (convo.priority === 'urgent' || convo.needs_human_response) &&
        !notifiedUrgentRef.current.has(convo.id)
      ) {
        notifiedUrgentRef.current.add(convo.id);
        const preview = messagePreviews[convo.id] || '';
        notify('Conversation Escalated to URGENT', {
          body: preview || `#${convo.id.slice(0, 8)} needs immediate attention`,
          urgent: true,
        });
        playAlertSound();
      }
    }
  }, [conversations, messagePreviews, notify, playAlertSound]);

  const fetchConversations = async () => {
    setIsLoading(true);
    const { data, error } = await supabase
      .from('conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
    } else {
      setConversations(data || []);
      if (data && data.length > 0) {
        fetchMessagePreviews(data);
      }
    }
    setIsLoading(false);
    setLastUpdated(new Date());
  };

  const fetchMessagePreviews = async (convos: Conversation[]) => {
    // Batch fetch the first visitor message for each conversation
    const ids = convos.map(c => c.id);
    const { data: messages, error } = await supabase
      .from('messages')
      .select('conversation_id, content')
      .in('conversation_id', ids)
      .eq('sender_type', 'visitor')
      .order('created_at', { ascending: true });

    if (error || !messages) return;

    // Take the first message per conversation
    const previews: Record<string, string> = {};
    for (const msg of messages) {
      if (!previews[msg.conversation_id]) {
        previews[msg.conversation_id] = msg.content.slice(0, 150);
      }
    }
    setMessagePreviews(previews);
  };

  const fetchAnalytics = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', today.toISOString());

    const activeChats = convos?.filter(c => c.status === 'active').length || 0;
    const needsAttention = convos?.filter(c =>
      c.status === 'needs_handoff' || c.status === 'escalated' || c.needs_human_response || c.priority === 'urgent' || c.priority === 'high'
    ).length || 0;
    const urgentCount = convos?.filter(c => c.priority === 'urgent' || c.needs_human_response).length || 0;

    setAnalytics({
      totalToday: convos?.length || 0,
      activeChats,
      needsAttention,
      averageResponseTime: 0,
      topCategories: [],
      urgentCount,
    });
  };

  const subscribeToConversations = () => {
    const channel = supabase
      .channel('conversations-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'conversations',
        },
        () => {
          fetchConversations();
          fetchAnalytics();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleManualRefresh = useCallback(() => {
    fetchConversations();
    fetchAnalytics();
  }, []);

  const filteredConversations = conversations.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    return true;
  });

  // Urgent/safety conversations that need attention
  const urgentConversations = conversations.filter(
    c => (c.priority === 'urgent' || c.needs_human_response) && c.status !== 'resolved'
  );

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
    }
  };

  const getPriorityBorderColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'border-l-red-500';
      case 'high': return 'border-l-orange-500';
      case 'medium': return 'border-l-blue-500';
      case 'low': return 'border-l-slate-300';
      default: return 'border-l-slate-300';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'needs_handoff': return 'bg-amber-100 text-amber-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      case 'resolved': return 'bg-slate-100 text-slate-800';
      default: return 'bg-slate-100 text-slate-800';
    }
  };

  if (selectedConversation) {
    return (
      <AdminConversationView
        conversationId={selectedConversation}
        onBack={() => {
          setSelectedConversation(null);
          fetchConversations();
          fetchAnalytics();
        }}
      />
    );
  }

  if (currentView === 'resources') {
    return (
      <div className="min-h-screen h-screen-safe bg-slate-50">
        <div className="bg-white border-b border-slate-200 shadow-sm safe-top">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 safe-x">
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <h1 className="text-base sm:text-lg md:text-2xl font-bold text-slate-900">Resources</h1>
                <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5">Manage resources</p>
              </div>
              <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
                <button
                  onClick={() => setCurrentView('dashboard')}
                  className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-slate-200 text-slate-700 rounded-lg hover:bg-slate-300 active:bg-slate-400 transition-colors font-medium text-xs sm:text-sm"
                >
                  <MessageSquare className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                  <span className="hidden sm:inline">Dashboard</span>
                </button>
                <button
                  onClick={signOut}
                  className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 safe-x">
          <ResourceManager />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen h-screen-safe bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm safe-top">
        <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 safe-x">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <h1 className="text-base sm:text-lg md:text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-[11px] sm:text-xs md:text-sm text-slate-600 mt-0.5 truncate">Welcome, {profile?.full_name || 'Admin'}</p>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
              <button
                onClick={handleManualRefresh}
                className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 sm:py-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
                title={`Last updated: ${lastUpdated.toLocaleTimeString()}`}
              >
                <RefreshCw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span className="hidden md:inline text-[11px] text-slate-400">
                  {lastUpdated.toLocaleTimeString()}
                </span>
              </button>
              <button
                onClick={() => setCurrentView('resources')}
                className="flex items-center gap-1 sm:gap-2 px-2.5 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors font-medium text-xs sm:text-sm"
              >
                <Database className="w-3.5 h-3.5 sm:w-4 sm:h-4 md:w-5 md:h-5" />
                <span className="hidden sm:inline">Resources</span>
              </button>
              <button
                onClick={signOut}
                className="flex items-center px-2 sm:px-3 py-1.5 sm:py-2 text-slate-600 hover:bg-slate-100 active:bg-slate-200 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Safety Alert Banner */}
      {urgentConversations.length > 0 && (
        <div className="bg-red-600 animate-pulse-slow">
          <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 safe-x">
            <div className="flex items-start gap-2 sm:gap-3">
              <AlertCircle className="w-5 h-5 text-white flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="text-white font-semibold text-xs sm:text-sm">
                  {urgentConversations.length} urgent conversation{urgentConversations.length > 1 ? 's' : ''} requiring immediate attention
                </p>
                <div className="mt-1.5 space-y-1">
                  {urgentConversations.slice(0, 5).map(convo => (
                    <button
                      key={convo.id}
                      onClick={() => setSelectedConversation(convo.id)}
                      className="block w-full text-left text-white/90 hover:text-white text-[11px] sm:text-xs bg-red-700/40 hover:bg-red-700/60 rounded px-2 py-1 transition-colors"
                    >
                      <span className="font-medium">#{convo.id.slice(0, 8)}</span>
                      {convo.visitor_name && <span className="ml-1.5">— {convo.visitor_name}</span>}
                      {convo.topic_summary && (
                        <span className="ml-1.5 px-1 py-0.5 bg-white/20 rounded text-[10px] font-medium">{convo.topic_summary}</span>
                      )}
                      {convo.needs_human_response && (
                        <span className="ml-1.5 px-1 py-0.5 bg-white/30 rounded text-[10px] font-medium">REQUESTING HUMAN</span>
                      )}
                      {messagePreviews[convo.id] && (
                        <span className="ml-1.5 opacity-80 truncate">
                          — {messagePreviews[convo.id].slice(0, 80)}{messagePreviews[convo.id].length > 80 ? '...' : ''}
                        </span>
                      )}
                    </button>
                  ))}
                  {urgentConversations.length > 5 && (
                    <p className="text-white/70 text-[10px] sm:text-xs">
                      + {urgentConversations.length - 5} more urgent conversations
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 py-3 sm:py-4 md:py-6 safe-x">
        {/* Stats grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 md:gap-4 mb-4 sm:mb-6 md:mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600">Total Today</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">{analytics.totalToday}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600">Active</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">{analytics.activeChats}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600">Attention</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">{analytics.needsAttention}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-3 sm:p-4 md:p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] sm:text-xs md:text-sm font-medium text-slate-600">Urgent</p>
                <p className="text-xl sm:text-2xl md:text-3xl font-bold text-slate-900 mt-0.5">{analytics.urgentCount}</p>
              </div>
              <div className="h-8 w-8 sm:h-10 sm:w-10 md:h-12 md:w-12 bg-red-100 rounded-lg flex items-center justify-center">
                <TrendingUp className="h-4 w-4 sm:h-5 sm:w-5 md:h-6 md:w-6 text-red-600" />
              </div>
            </div>
          </div>
        </div>

        {/* Conversations list */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm mb-4 sm:mb-6">
          <div className="px-3 sm:px-4 md:px-6 py-2.5 sm:py-3 md:py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2 sm:gap-4">
            <h2 className="text-sm sm:text-base md:text-lg font-semibold text-slate-900">Conversations</h2>
            <div className="flex gap-1.5 sm:gap-2 md:gap-3 flex-wrap">
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="escalated">Escalated</option>
                <option value="needs_handoff">Needs Handoff</option>
                <option value="resolved">Resolved</option>
              </select>
              <select
                value={filterPriority}
                onChange={(e) => setFilterPriority(e.target.value)}
                className="px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 border border-slate-300 rounded-lg text-xs sm:text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">All Priority</option>
                <option value="urgent">Urgent</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="px-4 py-8 sm:py-12 text-center text-slate-500 text-sm">
              Loading conversations...
            </div>
          ) : filteredConversations.length === 0 ? (
            <div className="px-4 py-8 sm:py-12 text-center text-slate-500 text-sm">
              No conversations found
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {filteredConversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className={`w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left border-l-4 ${getPriorityBorderColor(conversation.priority)}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        {(conversation.priority === 'urgent' || conversation.needs_human_response) && (
                          <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                          </span>
                        )}
                        <span className="font-medium text-slate-900 text-xs sm:text-sm">
                          {conversation.visitor_name || `#${conversation.id.slice(0, 8)}`}
                        </span>
                        {conversation.visitor_name && (
                          <span className="text-slate-400 text-[10px] sm:text-xs">
                            #{conversation.id.slice(0, 8)}
                          </span>
                        )}
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                        {conversation.needs_human_response && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            REQUESTING HUMAN
                          </span>
                        )}
                        {conversation.category && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200">
                            {conversation.category}
                          </span>
                        )}
                      </div>
                      {/* Topic summary label */}
                      {conversation.topic_summary && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] sm:text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                            {conversation.topic_summary}
                          </span>
                        </div>
                      )}
                      {/* Message preview */}
                      {messagePreviews[conversation.id] && (
                        <p className="mt-1 text-[11px] sm:text-xs text-slate-500 line-clamp-2">
                          {messagePreviews[conversation.id]}
                        </p>
                      )}
                      <div className="mt-1 text-[11px] sm:text-xs md:text-sm text-slate-400">
                        {new Date(conversation.updated_at).toLocaleString()}
                        {conversation.location && (
                          <span className="ml-2">— {conversation.location}</span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
