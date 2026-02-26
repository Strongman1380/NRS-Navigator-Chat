import { useState, useEffect } from 'react';
import {
  BarChart3, MessageSquare, Users, Clock, AlertCircle, TrendingUp,
  Filter, Tag, Calendar, LogOut, Settings, Database
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import AdminConversationView from './AdminConversationView';
import ResourceManager from './ResourceManager';

interface Conversation {
  id: string;
  status: string;
  priority: string;
  assigned_to: string | null;
  created_at: string;
  updated_at: string;
}

interface AnalyticsData {
  totalToday: number;
  activeChats: number;
  needsAttention: number;
  averageResponseTime: number;
  topCategories: Array<{ name: string; count: number }>;
  urgentCount: number;
}

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

  useEffect(() => {
    fetchConversations();
    fetchAnalytics();
    subscribeToConversations();
  }, []);

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
    }
    setIsLoading(false);
  };

  const fetchAnalytics = async () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const { data: convos } = await supabase
      .from('conversations')
      .select('*')
      .gte('created_at', today.toISOString());

    const { data: events } = await supabase
      .from('analytics_events')
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

  const filteredConversations = conversations.filter(c => {
    if (filterStatus !== 'all' && c.status !== filterStatus) return false;
    if (filterPriority !== 'all' && c.priority !== filterPriority) return false;
    return true;
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 border-red-300';
      case 'high': return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'medium': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'low': return 'bg-slate-100 text-slate-800 border-slate-300';
      default: return 'bg-slate-100 text-slate-800 border-slate-300';
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
            <div className="flex gap-1.5 sm:gap-2 flex-shrink-0">
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
                  className="w-full px-3 sm:px-4 md:px-6 py-3 sm:py-4 hover:bg-slate-50 active:bg-slate-100 transition-colors text-left"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                        <span className="font-medium text-slate-900 text-xs sm:text-sm">
                          #{conversation.id.slice(0, 8)}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium border ${getPriorityColor(conversation.priority)}`}>
                          {conversation.priority}
                        </span>
                        <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                        {conversation.needs_human_response && (
                          <span className="px-1.5 sm:px-2 py-0.5 sm:py-1 rounded-md text-[10px] sm:text-xs font-medium bg-red-100 text-red-800 border border-red-300 animate-pulse">
                            HUMAN
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-[11px] sm:text-xs md:text-sm text-slate-600">
                        {new Date(conversation.updated_at).toLocaleString()}
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
