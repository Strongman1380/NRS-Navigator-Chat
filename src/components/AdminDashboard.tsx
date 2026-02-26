import { useState, useEffect } from 'react';
import { Power, MessageSquare, Users, Clock, AlertCircle } from 'lucide-react';
import { supabase, type Conversation, type Message, type AdminStatus } from '../lib/supabase';
import AdminConversationView from './AdminConversationView';

export default function AdminDashboard() {
  const [adminStatus, setAdminStatus] = useState<AdminStatus | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [unreadCounts, setUnreadCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchAdminStatus();
    fetchConversations();
    subscribeToConversations();
  }, []);

  useEffect(() => {
    conversations.forEach((conv) => {
      fetchUnreadCount(conv.id);
    });
  }, [conversations]);

  const fetchAdminStatus = async () => {
    const { data } = await supabase
      .from('admin_status')
      .select('*')
      .single();

    if (data) {
      setAdminStatus(data);
    }
  };

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

  const fetchUnreadCount = async (conversationId: string) => {
    const { count } = await supabase
      .from('messages')
      .select('*', { count: 'exact', head: true })
      .eq('conversation_id', conversationId)
      .eq('sender_type', 'visitor')
      .eq('is_read', false);

    setUnreadCounts((prev) => ({ ...prev, [conversationId]: count || 0 }));
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
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
        },
        (payload) => {
          const message = payload.new as Message;
          if (message.sender_type === 'visitor') {
            fetchUnreadCount(message.conversation_id);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const toggleOnlineStatus = async () => {
    if (!adminStatus) return;

    const newStatus = !adminStatus.is_online;

    const { error } = await supabase
      .from('admin_status')
      .update({
        is_online: newStatus,
        updated_at: new Date().toISOString(),
      })
      .eq('id', adminStatus.id);

    if (!error) {
      setAdminStatus({ ...adminStatus, is_online: newStatus });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800';
      case 'needs_handoff':
        return 'bg-amber-100 text-amber-800';
      case 'resolved':
        return 'bg-slate-100 text-slate-800';
      default:
        return 'bg-slate-100 text-slate-800';
    }
  };

  const activeConversations = conversations.filter((c) => c.status === 'active');
  const needsHandoff = conversations.filter((c) => c.status === 'needs_handoff' || c.assigned_to_human);
  const totalUnread = Object.values(unreadCounts).reduce((sum, count) => sum + count, 0);

  if (selectedConversation) {
    return (
      <AdminConversationView
        conversationId={selectedConversation}
        onBack={() => setSelectedConversation(null)}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Admin Dashboard</h1>
              <p className="text-sm text-slate-600 mt-1">NRS Navigator message management</p>
            </div>
            <button
              onClick={toggleOnlineStatus}
              className={`flex items-center gap-2 px-5 py-2.5 rounded-lg font-medium transition-colors ${
                adminStatus?.is_online
                  ? 'bg-green-600 text-white hover:bg-green-700'
                  : 'bg-amber-500 text-white hover:bg-amber-600'
              }`}
            >
              <Power className="h-5 w-5" />
              {adminStatus?.is_online ? 'Online' : 'Away'}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Active Chats</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{activeConversations.length}</p>
              </div>
              <div className="h-12 w-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <MessageSquare className="h-6 w-6 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Needs Handoff</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{needsHandoff.length}</p>
              </div>
              <div className="h-12 w-12 bg-amber-100 rounded-lg flex items-center justify-center">
                <AlertCircle className="h-6 w-6 text-amber-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Unread Messages</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{totalUnread}</p>
              </div>
              <div className="h-12 w-12 bg-green-100 rounded-lg flex items-center justify-center">
                <Users className="h-6 w-6 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-600">Total Today</p>
                <p className="text-3xl font-bold text-slate-900 mt-1">{conversations.length}</p>
              </div>
              <div className="h-12 w-12 bg-slate-100 rounded-lg flex items-center justify-center">
                <Clock className="h-6 w-6 text-slate-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm">
          <div className="px-6 py-4 border-b border-slate-200">
            <h2 className="text-lg font-semibold text-slate-900">Recent Conversations</h2>
          </div>

          {isLoading ? (
            <div className="px-6 py-12 text-center text-slate-500">
              Loading conversations...
            </div>
          ) : conversations.length === 0 ? (
            <div className="px-6 py-12 text-center text-slate-500">
              No conversations yet
            </div>
          ) : (
            <div className="divide-y divide-slate-200">
              {conversations.map((conversation) => (
                <button
                  key={conversation.id}
                  onClick={() => setSelectedConversation(conversation.id)}
                  className="w-full px-6 py-4 hover:bg-slate-50 transition-colors text-left"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <span className="font-medium text-slate-900">
                          {conversation.visitor_name || 'Anonymous Visitor'}
                        </span>
                        <span className={`px-2 py-1 rounded-md text-xs font-medium ${getStatusColor(conversation.status)}`}>
                          {conversation.status}
                        </span>
                        {conversation.assigned_to_human && (
                          <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800">
                            Assigned to you
                          </span>
                        )}
                        {unreadCounts[conversation.id] > 0 && (
                          <span className="h-6 w-6 rounded-full bg-red-500 text-white text-xs font-bold flex items-center justify-center">
                            {unreadCounts[conversation.id]}
                          </span>
                        )}
                      </div>
                      <div className="mt-2 flex items-center gap-4 text-sm text-slate-600">
                        {conversation.category && (
                          <span>Category: {conversation.category}</span>
                        )}
                        {conversation.location && (
                          <span>Location: {conversation.location}</span>
                        )}
                        {conversation.urgency && (
                          <span>Urgency: {conversation.urgency}</span>
                        )}
                      </div>
                    </div>
                    <div className="text-sm text-slate-500">
                      {new Date(conversation.created_at).toLocaleString()}
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
