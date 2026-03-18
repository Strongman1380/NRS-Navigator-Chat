import { useState, useEffect } from 'react';
import {
  Calendar, Phone, Plus, Trash2, Edit3, X, Check, Clock, User,
  Briefcase, Scale, Heart, Users, ChevronDown, ChevronUp,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserEvent {
  id: string;
  title: string;
  event_type: string;
  event_date: string;
  reminder_date: string | null;
  notes: string | null;
  created_at: string;
}

interface UserContact {
  id: string;
  contact_type: string;
  name: string;
  phone: string | null;
  email: string | null;
  notes: string | null;
  created_at: string;
}

const EVENT_TYPES: Record<string, { label: string; color: string }> = {
  court_date: { label: 'Court Date', color: 'bg-red-100 text-red-700' },
  probation_checkin: { label: 'Probation Check-in', color: 'bg-orange-100 text-orange-700' },
  mat_appointment: { label: 'MAT Appointment', color: 'bg-blue-100 text-blue-700' },
  ua_date: { label: 'UA Date', color: 'bg-amber-100 text-amber-700' },
  treatment_session: { label: 'Treatment Session', color: 'bg-emerald-100 text-emerald-700' },
  case_manager: { label: 'Case Manager', color: 'bg-purple-100 text-purple-700' },
  benefits_review: { label: 'Benefits Review', color: 'bg-cyan-100 text-cyan-700' },
  other: { label: 'Other', color: 'bg-slate-100 text-slate-700' },
};

const CONTACT_TYPES: Record<string, { label: string; icon: typeof User }> = {
  probation_officer: { label: 'Probation Officer', icon: Scale },
  attorney: { label: 'Attorney', icon: Scale },
  treatment_provider: { label: 'Treatment Provider', icon: Heart },
  sponsor: { label: 'Sponsor', icon: Users },
  case_manager: { label: 'Case Manager', icon: Briefcase },
  employer: { label: 'Employer', icon: Briefcase },
  family: { label: 'Family', icon: Users },
  other: { label: 'Other', icon: User },
};

function daysUntil(dateStr: string): number {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
  });
}

function formatTime(dateStr: string): string {
  const d = new Date(dateStr);
  if (d.getHours() === 0 && d.getMinutes() === 0) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

export default function PersonalDashboard() {
  const { user } = useAuth();
  const [events, setEvents] = useState<UserEvent[]>([]);
  const [contacts, setContacts] = useState<UserContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventForm, setShowEventForm] = useState(false);
  const [showContactForm, setShowContactForm] = useState(false);
  const [editingEvent, setEditingEvent] = useState<UserEvent | null>(null);
  const [editingContact, setEditingContact] = useState<UserContact | null>(null);
  const [showPastEvents, setShowPastEvents] = useState(false);

  // Event form state
  const [eventTitle, setEventTitle] = useState('');
  const [eventType, setEventType] = useState('other');
  const [eventDate, setEventDate] = useState('');
  const [eventNotes, setEventNotes] = useState('');

  // Contact form state
  const [contactName, setContactName] = useState('');
  const [contactType, setContactType] = useState('other');
  const [contactPhone, setContactPhone] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [contactNotes, setContactNotes] = useState('');

  useEffect(() => {
    if (user) loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);
    const [eventsRes, contactsRes] = await Promise.all([
      supabase.from('user_events').select('*').eq('user_id', user!.id).order('event_date', { ascending: true }),
      supabase.from('user_contacts').select('*').eq('user_id', user!.id).order('created_at', { ascending: true }),
    ]);
    if (eventsRes.data) setEvents(eventsRes.data);
    if (contactsRes.data) setContacts(contactsRes.data);
    setLoading(false);
  }

  function resetEventForm() {
    setEventTitle('');
    setEventType('other');
    setEventDate('');
    setEventNotes('');
    setEditingEvent(null);
    setShowEventForm(false);
  }

  function resetContactForm() {
    setContactName('');
    setContactType('other');
    setContactPhone('');
    setContactEmail('');
    setContactNotes('');
    setEditingContact(null);
    setShowContactForm(false);
  }

  function openEditEvent(event: UserEvent) {
    setEditingEvent(event);
    setEventTitle(event.title);
    setEventType(event.event_type);
    setEventDate(new Date(event.event_date).toISOString().slice(0, 16));
    setEventNotes(event.notes || '');
    setShowEventForm(true);
  }

  function openEditContact(contact: UserContact) {
    setEditingContact(contact);
    setContactName(contact.name);
    setContactType(contact.contact_type);
    setContactPhone(contact.phone || '');
    setContactEmail(contact.email || '');
    setContactNotes(contact.notes || '');
    setShowContactForm(true);
  }

  async function handleSaveEvent() {
    if (!eventTitle.trim() || !eventDate) return;
    const payload = {
      user_id: user!.id,
      title: eventTitle.trim(),
      event_type: eventType,
      event_date: new Date(eventDate).toISOString(),
      notes: eventNotes.trim() || null,
    };

    if (editingEvent) {
      await supabase.from('user_events').update(payload).eq('id', editingEvent.id);
    } else {
      await supabase.from('user_events').insert(payload);
    }
    resetEventForm();
    loadData();
  }

  async function handleDeleteEvent(id: string) {
    await supabase.from('user_events').delete().eq('id', id);
    setEvents(prev => prev.filter(e => e.id !== id));
  }

  async function handleSaveContact() {
    if (!contactName.trim()) return;
    const payload = {
      user_id: user!.id,
      contact_type: contactType,
      name: contactName.trim(),
      phone: contactPhone.trim() || null,
      email: contactEmail.trim() || null,
      notes: contactNotes.trim() || null,
    };

    if (editingContact) {
      await supabase.from('user_contacts').update(payload).eq('id', editingContact.id);
    } else {
      await supabase.from('user_contacts').insert(payload);
    }
    resetContactForm();
    loadData();
  }

  async function handleDeleteContact(id: string) {
    await supabase.from('user_contacts').delete().eq('id', id);
    setContacts(prev => prev.filter(c => c.id !== id));
  }

  const now = new Date();
  const upcomingEvents = events.filter(e => new Date(e.event_date) >= now);
  const pastEvents = events.filter(e => new Date(e.event_date) < now);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="animate-spin w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto" style={{ WebkitOverflowScrolling: 'touch' }}>
      <div className="max-w-2xl mx-auto px-3 sm:px-4 md:px-6 py-4 sm:py-6 space-y-6 safe-x">

        {/* ─── Upcoming Events ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Upcoming Dates
            </h2>
            <button
              onClick={() => { resetEventForm(); setShowEventForm(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {upcomingEvents.length === 0 && !showEventForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">No upcoming dates. Add court hearings, probation check-ins, appointments, and more.</p>
            </div>
          )}

          <div className="space-y-2">
            {upcomingEvents.map(event => {
              const days = daysUntil(event.event_date);
              const typeInfo = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
              const time = formatTime(event.event_date);
              return (
                <div key={event.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] sm:text-xs font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        {days <= 3 && days >= 0 && (
                          <span className="text-[10px] sm:text-xs font-medium text-red-600 flex items-center gap-0.5">
                            <Clock className="w-3 h-3" />
                            {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days} days`}
                          </span>
                        )}
                        {days > 3 && (
                          <span className="text-[10px] sm:text-xs text-slate-400">
                            {days} days away
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-medium text-slate-900 truncate">{event.title}</p>
                      <p className="text-xs text-slate-500">
                        {formatDate(event.event_date)}{time ? ` at ${time}` : ''}
                      </p>
                      {event.notes && <p className="text-xs text-slate-400 mt-1 line-clamp-2">{event.notes}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditEvent(event)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {pastEvents.length > 0 && (
            <button
              onClick={() => setShowPastEvents(!showPastEvents)}
              className="flex items-center gap-1 mt-3 text-xs text-slate-400 hover:text-slate-600 transition-colors"
            >
              {showPastEvents ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              {pastEvents.length} past event{pastEvents.length !== 1 ? 's' : ''}
            </button>
          )}

          {showPastEvents && (
            <div className="space-y-2 mt-2 opacity-60">
              {pastEvents.map(event => {
                const typeInfo = EVENT_TYPES[event.event_type] || EVENT_TYPES.other;
                return (
                  <div key={event.id} className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${typeInfo.color}`}>
                          {typeInfo.label}
                        </span>
                        <p className="text-sm text-slate-600 mt-1">{event.title}</p>
                        <p className="text-xs text-slate-400">{formatDate(event.event_date)}</p>
                      </div>
                      <button onClick={() => handleDeleteEvent(event.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ─── Key Contacts ──────────────────────────── */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
              <Phone className="w-4 h-4 sm:w-5 sm:h-5 text-blue-600" />
              Key Contacts
            </h2>
            <button
              onClick={() => { resetContactForm(); setShowContactForm(true); }}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 active:bg-blue-800 transition-colors text-xs sm:text-sm font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </button>
          </div>

          {contacts.length === 0 && !showContactForm && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 text-center">
              <p className="text-sm text-slate-500">No contacts saved. Add your PO, attorney, sponsor, treatment provider, and more.</p>
            </div>
          )}

          <div className="space-y-2">
            {contacts.map(contact => {
              const typeInfo = CONTACT_TYPES[contact.contact_type] || CONTACT_TYPES.other;
              const Icon = typeInfo.icon;
              return (
                <div key={contact.id} className="bg-white border border-slate-200 rounded-xl p-3 shadow-sm">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Icon className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                        <span className="text-[10px] sm:text-xs font-medium text-slate-500">{typeInfo.label}</span>
                      </div>
                      <p className="text-sm font-medium text-slate-900">{contact.name}</p>
                      {contact.phone && (
                        <a href={`tel:${contact.phone}`} className="text-xs text-blue-600 hover:text-blue-700 flex items-center gap-1 mt-0.5">
                          <Phone className="w-3 h-3" />
                          {contact.phone}
                        </a>
                      )}
                      {contact.email && <p className="text-xs text-slate-500 mt-0.5">{contact.email}</p>}
                      {contact.notes && <p className="text-xs text-slate-400 mt-1">{contact.notes}</p>}
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => openEditContact(contact)} className="p-1.5 text-slate-400 hover:text-blue-600 transition-colors">
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                      <button onClick={() => handleDeleteContact(contact.id)} className="p-1.5 text-slate-400 hover:text-red-600 transition-colors">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      {/* ─── Event Form Modal ──────────────────────────── */}
      {showEventForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingEvent ? 'Edit Event' : 'Add Event'}
              </h3>
              <button onClick={resetEventForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Title</label>
                <input
                  type="text"
                  value={eventTitle}
                  onChange={(e) => setEventTitle(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., Court hearing — Lancaster County"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={eventType}
                  onChange={(e) => setEventType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {Object.entries(EVENT_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventDate}
                  onChange={(e) => setEventDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={eventNotes}
                  onChange={(e) => setEventNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Address, what to bring, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={resetEventForm}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveEvent}
                disabled={!eventTitle.trim() || !eventDate}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                {editingEvent ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Contact Form Modal ──────────────────────────── */}
      {showContactForm && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-5 sm:p-6 max-w-sm w-full">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">
                {editingContact ? 'Edit Contact' : 'Add Contact'}
              </h3>
              <button onClick={resetContactForm} className="p-1 text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Name</label>
                <input
                  type="text"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="e.g., Officer Johnson"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Type</label>
                <select
                  value={contactType}
                  onChange={(e) => setContactType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                >
                  {Object.entries(CONTACT_TYPES).map(([key, { label }]) => (
                    <option key={key} value={key}>{label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Phone</label>
                <input
                  type="tel"
                  value={contactPhone}
                  onChange={(e) => setContactPhone(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="402-555-1234"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Email (optional)</label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  placeholder="officer@county.gov"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Notes (optional)</label>
                <textarea
                  value={contactNotes}
                  onChange={(e) => setContactNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                  rows={2}
                  placeholder="Office hours, location, etc."
                />
              </div>
            </div>

            <div className="flex gap-2 mt-4">
              <button
                onClick={resetContactForm}
                className="flex-1 border border-slate-300 text-slate-700 py-2.5 rounded-lg font-medium hover:bg-slate-50 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveContact}
                disabled={!contactName.trim()}
                className="flex-1 bg-blue-600 text-white py-2.5 rounded-lg font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 text-sm flex items-center justify-center gap-1"
              >
                <Check className="w-4 h-4" />
                {editingContact ? 'Update' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
