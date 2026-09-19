import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Bell,
  Sparkles,
  Plus,
  Send,
  Mail,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Radio,
  Share2,
  Trash2,
  Filter,
  Search,
  MessageSquare,
  ShieldCheck,
  Megaphone,
  CheckCheck,
  Layers,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import Modal from '../components/ui/Modal';
import { useAuth } from '../context/AuthContext';
import {
  getClubAnnouncements,
  generateAIAnnouncement,
  createAnnouncement,
  publishAnnouncement,
  deleteAnnouncement,
  getClubEvents
} from '../services/api';

export default function AnnouncementsPage() {
  const { activeClub, user, activeRole } = useAuth();

  const [announcements, setAnnouncements] = useState([]);
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals
  const [isAIModalOpen, setIsAIModalOpen] = useState(false);
  const [isManualModalOpen, setIsManualModalOpen] = useState(false);
  const [publishingId, setPublishingId] = useState(null);
  const [actionSuccessMessage, setActionSuccessMessage] = useState(null);

  // AI Generator Form State
  const [selectedEventId, setSelectedEventId] = useState('');
  const [aiCategory, setAiCategory] = useState('REGISTRATION_REMINDER');
  const [aiTone, setAiTone] = useState('ENTHUSIASTIC');
  const [aiChannel, setAiChannel] = useState('EMAIL');
  const [aiNotes, setAiNotes] = useState('');
  const [generatingAI, setGeneratingAI] = useState(false);
  const [generatedDraft, setGeneratedDraft] = useState(null);
  const [broadcastEmail, setBroadcastEmail] = useState(true);
  const [dispatchInApp, setDispatchInApp] = useState(true);
  const [savingAction, setSavingAction] = useState(false);

  // Manual Form State
  const [manualTitle, setManualTitle] = useState('');
  const [manualContent, setManualContent] = useState('');
  const [manualCategory, setManualCategory] = useState('GENERAL');
  const [manualChannel, setManualChannel] = useState('EMAIL');
  const [manualEventId, setManualEventId] = useState('');
  const [manualBroadcastEmail, setManualBroadcastEmail] = useState(true);
  const [manualDispatchInApp, setManualDispatchInApp] = useState(true);
  const [manualPublishNow, setManualPublishNow] = useState(false);

  const isLeadership = ['PRESIDENT', 'CLUB_HEAD'].includes(activeRole);
  const canDraft = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER', 'TEAM_LEAD'].includes(activeRole);

  const fetchData = async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const [annRes, evRes] = await Promise.all([
        getClubAnnouncements(activeClub.id),
        getClubEvents(activeClub.id)
      ]);

      if (annRes.success) {
        setAnnouncements(annRes.data || []);
      }
      if (evRes.success) {
        setEvents(evRes.data || []);
      }
    } catch (err) {
      console.error(err);
      setError('Failed to load announcements.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [activeClub?.id]);

  // Handle AI generation
  const handleGenerateAI = async () => {
    if (!activeClub?.id) return;
    try {
      setGeneratingAI(true);
      setError(null);
      const res = await generateAIAnnouncement(activeClub.id, {
        event_id: selectedEventId || null,
        category: aiCategory,
        tone: aiTone,
        target_channel: aiChannel,
        custom_notes: aiNotes.trim() || null,
      });

      if (res.success && res.data) {
        setGeneratedDraft(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to generate announcement with AI.');
    } finally {
      setGeneratingAI(false);
    }
  };

  // Save AI draft or publish
  const handleSaveAIDraft = async (publishNow = false) => {
    if (!generatedDraft || !activeClub?.id) return;
    try {
      setSavingAction(true);
      setError(null);

      const createRes = await createAnnouncement(activeClub.id, {
        title: generatedDraft.title,
        content: generatedDraft.content,
        event_id: selectedEventId || null,
        category: generatedDraft.category || aiCategory,
        target_channel: aiChannel,
        status: 'DRAFT',
        created_source: 'AI_DRAFTED',
      });

      if (createRes.success && createRes.data) {
        const createdId = createRes.data.id;

        if (publishNow && isLeadership) {
          await publishAnnouncement(activeClub.id, createdId, {
            broadcast_email: broadcastEmail,
            dispatch_in_app: dispatchInApp,
          });
          setActionSuccessMessage('Announcement published and broadcasted successfully!');
        } else {
          setActionSuccessMessage('AI announcement saved as draft for leadership review.');
        }

        setIsAIModalOpen(false);
        setGeneratedDraft(null);
        setAiNotes('');
        await fetchData();
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save announcement.');
    } finally {
      setSavingAction(false);
    }
  };

  // Handle manual announcement creation
  const handleCreateManual = async () => {
    if (!manualTitle.trim() || !manualContent.trim() || !activeClub?.id) return;
    try {
      setSavingAction(true);
      const res = await createAnnouncement(activeClub.id, {
        title: manualTitle.trim(),
        content: manualContent.trim(),
        event_id: manualEventId || null,
        category: manualCategory,
        target_channel: manualChannel,
        status: manualPublishNow && isLeadership ? 'PUBLISHED' : 'DRAFT',
        created_source: 'MANUAL',
      });

      if (res.success && res.data) {
        if (manualPublishNow && isLeadership) {
          await publishAnnouncement(activeClub.id, res.data.id, {
            broadcast_email: manualBroadcastEmail,
            dispatch_in_app: manualDispatchInApp,
          });
          setActionSuccessMessage('Announcement created, published, and broadcasted!');
        } else {
          setActionSuccessMessage('Announcement draft saved successfully.');
        }

        setIsManualModalOpen(false);
        setManualTitle('');
        setManualContent('');
        await fetchData();
        setTimeout(() => setActionSuccessMessage(null), 4000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to create announcement.');
    } finally {
      setSavingAction(false);
    }
  };

  // Publish existing draft
  const handlePublishExisting = async (annId) => {
    if (!activeClub?.id) return;
    try {
      setPublishingId(annId);
      const res = await publishAnnouncement(activeClub.id, annId, {
        broadcast_email: true,
        dispatch_in_app: true,
      });
      if (res.success) {
        setActionSuccessMessage(`Published! ${res.data.email_sent_count} emails broadcasted via Brevo.`);
        await fetchData();
        setTimeout(() => setActionSuccessMessage(null), 5000);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to publish announcement.');
    } finally {
      setPublishingId(null);
    }
  };

  // Delete announcement
  const handleDelete = async (annId) => {
    if (!window.confirm('Are you sure you want to delete this announcement?')) return;
    try {
      await deleteAnnouncement(activeClub.id, annId);
      setAnnouncements((prev) => prev.filter((a) => a.id !== annId));
      setActionSuccessMessage('Announcement deleted.');
      setTimeout(() => setActionSuccessMessage(null), 3000);
    } catch (err) {
      console.error(err);
      setError('Failed to delete announcement.');
    }
  };

  // Metrics calculation
  const totalCount = announcements.length;
  const publishedCount = announcements.filter((a) => a.status === 'PUBLISHED').length;
  const draftCount = announcements.filter((a) => a.status === 'DRAFT').length;
  const totalEmailsSent = announcements.reduce((sum, a) => sum + (a.email_sent_count || 0), 0);

  // Filtered List
  const filteredAnnouncements = announcements.filter((ann) => {
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'PUBLISHED' && ann.status === 'PUBLISHED') ||
      (statusFilter === 'DRAFT' && ann.status === 'DRAFT');

    const matchesCategory =
      categoryFilter === 'ALL' || ann.category === categoryFilter;

    const matchesSearch =
      !searchQuery.trim() ||
      ann.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      ann.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ann.event_title && ann.event_title.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchesStatus && matchesCategory && matchesSearch;
  });

  const getCategoryBadge = (cat) => {
    switch (cat) {
      case 'EMERGENCY_NOTICE':
        return <Badge variant="error" size="sm">🚨 Emergency Notice</Badge>;
      case 'REGISTRATION_REMINDER':
        return <Badge variant="info" size="sm">⚡ Registration Reminder</Badge>;
      case 'VENUE_UPDATE':
        return <Badge variant="warning" size="sm">📍 Venue & Logistics</Badge>;
      case 'COMPLETION_MESSAGE':
        return <Badge variant="purple" size="sm">🎉 Milestone & Wrap-up</Badge>;
      default:
        return <Badge variant="emerald" size="sm">📢 General Notice</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Announcements & Multi-Channel Broadcast
            </h1>
            <Badge variant="emerald" size="sm">Phase 11</Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            AI-powered campus communications, Brevo transactional email delivery, and in-app member broadcast
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <Button
            variant="secondary"
            leftIcon={RefreshCw}
            onClick={fetchData}
            loading={loading}
            className="text-xs"
          >
            Refresh
          </Button>

          {canDraft && (
            <>
              <Button
                variant="outline"
                leftIcon={Plus}
                onClick={() => setIsManualModalOpen(true)}
                className="text-xs"
              >
                Create Manual
              </Button>

              <Button
                variant="primary"
                leftIcon={Sparkles}
                onClick={() => {
                  setGeneratedDraft(null);
                  setIsAIModalOpen(true);
                }}
                className="text-xs shadow-sm"
              >
                Draft with AI
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Success Banner */}
      {actionSuccessMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-xs text-emerald-900 flex items-center gap-2.5 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-semibold">{actionSuccessMessage}</span>
        </div>
      )}

      {/* Error Banner */}
      {error && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-900 flex items-center gap-2.5">
          <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Total Notices</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Radio className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Live Broadcasts</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{publishedCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Pending Drafts</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{draftCount}</h3>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Brevo Emails Sent</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalEmailsSent}</h3>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search announcements by keyword, topic, or event..."
                className="w-full pl-9 pr-4 py-1.5 text-xs rounded-xl border border-slate-200 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
              />
            </div>

            {/* Status Tabs */}
            <div className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl shrink-0">
              {['ALL', 'PUBLISHED', 'DRAFT'].map((tab) => (
                <button
                  key={tab}
                  onClick={() => setStatusFilter(tab)}
                  className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                    statusFilter === tab
                      ? 'bg-white text-emerald-800 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {tab === 'ALL' ? 'All' : tab === 'PUBLISHED' ? 'Published' : 'Drafts'}
                </button>
              ))}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-slate-100">
            <span className="text-[11px] font-semibold text-slate-400 mr-1 flex items-center gap-1">
              <Filter className="w-3 h-3" /> Category:
            </span>
            {[
              { id: 'ALL', label: 'All Categories' },
              { id: 'REGISTRATION_REMINDER', label: '⚡ Registration' },
              { id: 'VENUE_UPDATE', label: '📍 Venue Updates' },
              { id: 'EMERGENCY_NOTICE', label: '🚨 Emergency' },
              { id: 'COMPLETION_MESSAGE', label: '🎉 Completion' },
              { id: 'GENERAL', label: '📢 General' },
            ].map((pill) => (
              <button
                key={pill.id}
                onClick={() => setCategoryFilter(pill.id)}
                className={`text-[11px] px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                  categoryFilter === pill.id
                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300 font-bold'
                    : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Announcements Feed */}
      {loading ? (
        <div className="py-16 text-center space-y-3">
          <div className="w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-xs text-slate-500">Loading club announcements...</p>
        </div>
      ) : filteredAnnouncements.length === 0 ? (
        <Card className="py-16 text-center border-dashed">
          <CardContent className="space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-100">
              <Megaphone className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-bold text-slate-900">No Announcements Found</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              {searchQuery || statusFilter !== 'ALL' || categoryFilter !== 'ALL'
                ? 'No announcements match your current filter parameters. Try clearing your filters.'
                : 'Keep club members informed with AI-drafted broadcasts, registration updates, and emergency notices.'}
            </p>
            {canDraft && (
              <Button
                variant="primary"
                leftIcon={Sparkles}
                size="sm"
                onClick={() => setIsAIModalOpen(true)}
                className="mt-2"
              >
                Draft Announcement with AI
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredAnnouncements.map((ann) => {
            const isDraft = ann.status === 'DRAFT';
            return (
              <Card key={ann.id} className="overflow-hidden hover:border-emerald-300/80 transition-all">
                <div className="p-5 space-y-3">
                  {/* Top Badges & Meta */}
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      {getCategoryBadge(ann.category)}

                      <span className="text-[11px] px-2 py-0.5 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono">
                        {ann.target_channel}
                      </span>

                      {ann.event_title && (
                        <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-medium flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-emerald-600" />
                          {ann.event_title}
                        </span>
                      )}

                      {ann.created_source === 'AI_DRAFTED' && (
                        <span className="text-[10px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200 font-semibold flex items-center gap-1">
                          <Sparkles className="w-2.5 h-2.5" /> AI Drafted
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-xs px-2.5 py-0.5 rounded-full font-bold flex items-center gap-1 ${
                          isDraft
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}
                      >
                        {isDraft ? (
                          <>
                            <Clock className="w-3 h-3" /> Draft Pending Review
                          </>
                        ) : (
                          <>
                            <CheckCheck className="w-3 h-3 text-emerald-700" /> Published
                          </>
                        )}
                      </span>
                    </div>
                  </div>

                  {/* Title & Author */}
                  <div>
                    <h3 className="text-base font-bold text-slate-900 tracking-tight leading-snug">
                      {ann.title}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5 flex items-center gap-2">
                      <span>By {ann.creator_name || 'Club Leadership'}</span>
                      <span>&bull;</span>
                      <span>{new Date(ann.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                    </p>
                  </div>

                  {/* Content with Markdown Formatting */}
                  <div className="p-3.5 bg-slate-50/70 border border-slate-100 rounded-xl text-xs text-slate-700 leading-relaxed whitespace-pre-line">
                    {ann.content}
                  </div>

                  {/* Delivery & Status Banner */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div className="flex flex-wrap items-center gap-4 text-slate-500">
                      {isDraft ? (
                        <span className="text-amber-800 font-medium flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-amber-600" />
                          Visible to club organizers. Awaiting leadership approval to broadcast.
                        </span>
                      ) : (
                        <>
                          <span className="text-emerald-800 font-medium flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            Dispatched to in-app member notifications
                          </span>
                          {ann.email_broadcast_sent && (
                            <span className="text-purple-800 font-medium flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-purple-600" />
                              Delivered to {ann.email_sent_count} members via Brevo
                            </span>
                          )}
                        </>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {isDraft && isLeadership && (
                        <Button
                          variant="primary"
                          size="sm"
                          leftIcon={Send}
                          loading={publishingId === ann.id}
                          onClick={() => handlePublishExisting(ann.id)}
                          className="text-xs shadow-2xs"
                        >
                          Publish & Broadcast via Brevo
                        </Button>
                      )}

                      {isLeadership && (
                        <button
                          type="button"
                          onClick={() => handleDelete(ann.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Announcement"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal 1: AI Announcement Generator */}
      <Modal
        isOpen={isAIModalOpen}
        onClose={() => setIsAIModalOpen(false)}
        size="xl"
        title="AI Announcement Generator"
        description="Leverage Groq Llama 3.3 70B to craft targeted, high-conversion campus communications"
      >
        <div className="space-y-4">
          {!generatedDraft ? (
            <>
              {/* Event Context Selector */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Event (Optional)
                  </label>
                  <select
                    value={selectedEventId}
                    onChange={(e) => setSelectedEventId(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="">General Club Broadcast (No specific event)</option>
                    {events.map((ev) => (
                      <option key={ev.id} value={ev.id}>
                        {ev.title} ({ev.status})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Announcement Category
                  </label>
                  <select
                    value={aiCategory}
                    onChange={(e) => setAiCategory(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 font-medium"
                  >
                    <option value="REGISTRATION_REMINDER">⚡ Registration Reminder</option>
                    <option value="VENUE_UPDATE">📍 Venue & Logistics Update</option>
                    <option value="EMERGENCY_NOTICE">🚨 Urgent Operational Notice</option>
                    <option value="COMPLETION_MESSAGE">🎉 Event Completion & Wrap-Up</option>
                    <option value="GENERAL">📢 General Community Update</option>
                  </select>
                </div>
              </div>

              {/* Tone & Target Channel */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Tone & Voice
                  </label>
                  <select
                    value={aiTone}
                    onChange={(e) => setAiTone(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="ENTHUSIASTIC">Enthusiastic & High Energy</option>
                    <option value="PROFESSIONAL">Professional & Authoritative</option>
                    <option value="URGENT">Urgent & Action Required</option>
                    <option value="FRIENDLY">Friendly & Welcoming</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Broadcast Medium
                  </label>
                  <select
                    value={aiChannel}
                    onChange={(e) => setAiChannel(e.target.value)}
                    className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="EMAIL">Email Broadcast (Brevo SMTP)</option>
                    <option value="WHATSAPP">WhatsApp / Discord Template</option>
                    <option value="CAMPUS_PORTAL">Campus Digital Portal</option>
                  </select>
                </div>
              </div>

              {/* Custom Directives / Extra Details */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Specific Highlights, Deadlines, or Instructions (Optional)
                </label>
                <textarea
                  rows={3}
                  value={aiNotes}
                  onChange={(e) => setAiNotes(e.target.value)}
                  placeholder="e.g. Free refreshments provided by sponsors. Check-in starts 9:30 AM at North Gate. Bring laptops!"
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div className="flex justify-end pt-2">
                <Button
                  variant="primary"
                  leftIcon={Sparkles}
                  loading={generatingAI}
                  onClick={handleGenerateAI}
                  className="w-full sm:w-auto shadow-sm"
                >
                  Generate Announcement Draft
                </Button>
              </div>
            </>
          ) : (
            /* Generated Draft Review & Editor */
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/80 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-900">
                <span className="font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  AI Draft Generated! Review & adjust before broadcasting.
                </span>
                <button
                  type="button"
                  onClick={() => setGeneratedDraft(null)}
                  className="text-emerald-700 hover:text-emerald-900 font-bold cursor-pointer text-[11px] underline"
                >
                  Regenerate
                </button>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Announcement Headline
                </label>
                <input
                  type="text"
                  value={generatedDraft.title}
                  onChange={(e) => setGeneratedDraft({ ...generatedDraft, title: e.target.value })}
                  className="w-full text-sm font-bold text-slate-900 rounded-xl border border-slate-300 p-2.5 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Announcement Body Content
                </label>
                <textarea
                  rows={6}
                  value={generatedDraft.content}
                  onChange={(e) => setGeneratedDraft({ ...generatedDraft, content: e.target.value })}
                  className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 font-sans focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 leading-relaxed"
                />
              </div>

              {generatedDraft.channel_formatted && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                    Target Channel Preview ({aiChannel})
                  </label>
                  <div className="p-2.5 bg-slate-100 rounded-xl text-xs font-mono text-slate-700">
                    {generatedDraft.channel_formatted}
                  </div>
                </div>
              )}

              {/* Broadcast Options */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <div className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <Radio className="w-3.5 h-3.5 text-emerald-600" />
                  Broadcast Channels
                </div>
                <div className="flex flex-wrap items-center gap-4 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={broadcastEmail}
                      onChange={(e) => setBroadcastEmail(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Broadcast email to all club members via Brevo API</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-slate-700 font-medium">
                    <input
                      type="checkbox"
                      checked={dispatchInApp}
                      onChange={(e) => setDispatchInApp(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>Send in-app notification alerts</span>
                  </label>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-2">
                <Button
                  variant="secondary"
                  onClick={() => handleSaveAIDraft(false)}
                  loading={savingAction}
                  className="text-xs"
                >
                  Save as Draft
                </Button>

                {isLeadership && (
                  <Button
                    variant="primary"
                    leftIcon={Send}
                    onClick={() => handleSaveAIDraft(true)}
                    loading={savingAction}
                    className="text-xs shadow-sm"
                  >
                    Publish & Broadcast Now
                  </Button>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal 2: Manual Announcement Creator */}
      <Modal
        isOpen={isManualModalOpen}
        onClose={() => setIsManualModalOpen(false)}
        size="lg"
        title="Create Announcement"
        description="Draft or broadcast an official campus announcement manually"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Title *
            </label>
            <input
              type="text"
              value={manualTitle}
              onChange={(e) => setManualTitle(e.target.value)}
              placeholder="e.g. Mandatory Briefing for All Hackathon Volunteers"
              className="w-full text-xs rounded-xl border border-slate-300 p-2.5 text-slate-900 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
              <select
                value={manualCategory}
                onChange={(e) => setManualCategory(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900"
              >
                <option value="GENERAL">📢 General Community Notice</option>
                <option value="REGISTRATION_REMINDER">⚡ Registration Reminder</option>
                <option value="VENUE_UPDATE">📍 Venue & Schedule Update</option>
                <option value="EMERGENCY_NOTICE">🚨 Urgent Operational Notice</option>
                <option value="COMPLETION_MESSAGE">🎉 Event Wrap-Up & Recap</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Linked Event</label>
              <select
                value={manualEventId}
                onChange={(e) => setManualEventId(e.target.value)}
                className="w-full text-xs rounded-xl border border-slate-300 p-2.5 bg-white text-slate-900"
              >
                <option value="">None (Club-wide broadcast)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Announcement Content *
            </label>
            <textarea
              rows={5}
              value={manualContent}
              onChange={(e) => setManualContent(e.target.value)}
              placeholder="Write the announcement body text here..."
              className="w-full text-xs rounded-xl border border-slate-300 p-3 text-slate-900 leading-relaxed focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Broadcast Options */}
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-800">
              <input
                type="checkbox"
                checked={manualPublishNow}
                onChange={(e) => setManualPublishNow(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
              />
              <span>Publish & broadcast immediately (Skip draft)</span>
            </label>

            {manualPublishNow && (
              <div className="flex flex-wrap items-center gap-4 text-xs pl-6 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={manualBroadcastEmail}
                    onChange={(e) => setManualBroadcastEmail(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>Send Brevo emails</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-slate-600">
                  <input
                    type="checkbox"
                    checked={manualDispatchInApp}
                    onChange={(e) => setManualDispatchInApp(e.target.checked)}
                    className="rounded border-slate-300 text-emerald-600"
                  />
                  <span>In-app notifications</span>
                </label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              onClick={() => setIsManualModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={handleCreateManual}
              loading={savingAction}
              disabled={!manualTitle.trim() || !manualContent.trim()}
              className="text-xs"
            >
              {manualPublishNow ? 'Publish & Broadcast' : 'Save Draft'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
