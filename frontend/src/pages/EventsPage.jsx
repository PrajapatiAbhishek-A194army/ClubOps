import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Calendar, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Clock, 
  DollarSign, 
  CheckCircle2, 
  AlertTriangle, 
  ChevronRight, 
  ArrowRight,
  Loader2,
  CalendarDays,
  Users
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClubEvents, createEvent, planEventWithAI } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function EventsPage() {
  const { activeClub, activeRole } = useAuth();

  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // New Event Modal State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [createTab, setCreateTab] = useState('ai'); // 'ai' or 'manual'

  // AI Planner Form
  const [aiTitle, setAiTitle] = useState('');
  const [aiType, setAiType] = useState('HACKATHON');
  const [aiDuration, setAiDuration] = useState(2);
  const [aiAttendees, setAiAttendees] = useState(150);
  const [aiFocus, setAiFocus] = useState('AI Agents, Open Source Tools');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiPlanResult, setAiPlanResult] = useState(null);

  // Manual / Staged Event Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: 'Campus Auditorium',
    event_type: 'WORKSHOP',
    start_date: '',
    end_date: '',
    budget: 500,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const canManageEvents = ['PRESIDENT', 'ORGANIZER'].includes(activeRole);

  const fetchEvents = async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const params = {};
      if (statusFilter !== 'ALL') params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();

      const res = await getClubEvents(activeClub.id, params);
      if (res.success) {
        setEvents(res.data);
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load events.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, [activeClub?.id, statusFilter]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchEvents();
  };

  const handleGenerateAiPlan = async (e) => {
    e.preventDefault();
    if (!aiTitle.trim()) return;
    try {
      setAiGenerating(true);
      setCreateError(null);
      const res = await planEventWithAI(activeClub.id, {
        title: aiTitle.trim(),
        event_type: aiType,
        duration_days: parseInt(aiDuration) || 1,
        expected_attendees: parseInt(aiAttendees) || 100,
        focus_areas: aiFocus.trim(),
      });
      if (res.success) {
        setAiPlanResult(res.data);
        // Pre-populate standard fields from AI plan
        const today = new Date();
        const start = new Date(today);
        start.setDate(today.getDate() + 14); // 2 weeks out by default
        const end = new Date(start);
        end.setDate(start.getDate() + (parseInt(aiDuration) || 1));

        setFormData({
          title: aiTitle.trim(),
          description: res.data.suggested_description,
          location: 'Campus Innovation Center',
          event_type: aiType,
          start_date: start.toISOString().slice(0, 16),
          end_date: end.toISOString().slice(0, 16),
          budget: res.data.suggested_budget,
        });
      }
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'AI planning failed. Please retry.');
    } finally {
      setAiGenerating(false);
    }
  };

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    try {
      setCreateSubmitting(true);
      setCreateError(null);

      const payload = {
        title: formData.title,
        description: formData.description,
        location: formData.location,
        event_type: formData.event_type,
        start_date: new Date(formData.start_date).toISOString(),
        end_date: new Date(formData.end_date).toISOString(),
        budget: parseFloat(formData.budget) || 0,
      };

      // If created from AI plan, include generated timeline and checklists
      if (aiPlanResult) {
        payload.timeline = aiPlanResult.timeline;
        payload.checklists = aiPlanResult.checklists;
      }

      const res = await createEvent(activeClub.id, payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        setAiPlanResult(null);
        fetchEvents();
      }
    } catch (err) {
      setCreateError(err.response?.data?.detail || 'Failed to create event. Check dates and details.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON_TRACK':
        return <Badge variant="success">On Track</Badge>;
      case 'PLANNING':
        return <Badge variant="primary">In Planning</Badge>;
      case 'AT_RISK':
        return <Badge variant="warning">At Risk</Badge>;
      case 'COMPLETED':
        return <Badge variant="outline">Completed</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'TBD';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Action */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Event Operations</h1>
            <Badge variant="primary" className="text-xs">
              {events.length} {events.length === 1 ? 'Event' : 'Events'}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Plan, monitor timelines, coordinate volunteers, and track deliverables for {activeClub?.name || 'your club'}.
          </p>
        </div>

        {canManageEvents && (
          <Button
            variant="primary"
            className="flex items-center gap-2 shadow-sm"
            onClick={() => {
              setIsCreateModalOpen(true);
              setAiPlanResult(null);
            }}
          >
            <Sparkles className="w-4 h-4 text-emerald-300" />
            <span>Plan New Event</span>
          </Button>
        )}
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <form onSubmit={handleSearchSubmit} className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search events by title, venue, or keyword..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-1.5 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
          />
        </form>

        {/* Status Filters */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {['ALL', 'ON_TRACK', 'PLANNING', 'AT_RISK', 'COMPLETED'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                statusFilter === status
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'ALL' ? 'All Events' : status.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Event Cards Grid */}
      {loading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm text-slate-500">Loading club operations and events...</p>
        </div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error}
        </div>
      ) : events.length === 0 ? (
        <Card className="border-dashed border-2 border-slate-200 p-12 text-center">
          <CalendarDays className="w-12 h-12 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-900">No events found</h3>
          <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-5">
            {searchQuery || statusFilter !== 'ALL'
              ? 'No scheduled events match your search query or status filter.'
              : 'There are no active events for this organization yet. Kick off planning with the AI Event Architect!'}
          </p>
          {canManageEvents && (
            <Button
              variant="primary"
              onClick={() => setIsCreateModalOpen(true)}
              className="inline-flex items-center gap-2"
            >
              <Sparkles className="w-4 h-4 text-emerald-300" />
              <span>Create First Event</span>
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {events.map((ev) => (
            <Card key={ev.id} className="hover:shadow-md transition-shadow border-slate-200 flex flex-col justify-between">
              <CardContent className="p-5 space-y-4">
                {/* Header: Type & Status */}
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-md border border-emerald-100">
                    {ev.event_type}
                  </span>
                  {getStatusBadge(ev.status)}
                </div>

                {/* Title & Description */}
                <div>
                  <h3 className="font-semibold text-slate-900 text-base leading-snug line-clamp-2">
                    {ev.title}
                  </h3>
                  <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                    {ev.description || 'No detailed description provided.'}
                  </p>
                </div>

                {/* Metadata List */}
                <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>
                      {formatDate(ev.start_date)} - {formatDate(ev.end_date)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span className="truncate">{ev.location}</span>
                  </div>

                  <div className="flex items-center justify-between text-slate-500 pt-1">
                    <span className="flex items-center gap-1 font-medium text-slate-700">
                      <DollarSign className="w-3.5 h-3.5 text-slate-400" />
                      Budget: ${ev.budget.toLocaleString()}
                    </span>
                    <span className="text-[11px] bg-slate-100 px-2 py-0.5 rounded text-slate-600 font-medium">
                      {ev.days_until_event === 0 ? 'Happening Now' : `In ${ev.days_until_event} days`}
                    </span>
                  </div>
                </div>

                {/* Milestone Progress Bar */}
                <div className="pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-slate-500 font-medium">Milestone Progress</span>
                    <span className="font-semibold text-slate-700">{ev.progress_percent}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-300 ${
                        ev.progress_percent === 100
                          ? 'bg-emerald-500'
                          : ev.status === 'AT_RISK'
                          ? 'bg-amber-500'
                          : 'bg-emerald-600'
                      }`}
                      style={{ width: `${ev.progress_percent}%` }}
                    />
                  </div>
                </div>
              </CardContent>

              {/* Action Button */}
              <div className="p-4 bg-slate-50 border-t border-slate-100 rounded-b-xl">
                <Link
                  to={`/app/events/${ev.id}`}
                  className="w-full flex items-center justify-center gap-1.5 py-2 px-3 bg-white hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg border border-slate-200 transition-colors shadow-2xs"
                >
                  <span>Open Operations Dashboard</span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Plan / Create Event Modal */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title="Plan New Campus Event"
        size="lg"
      >
        <div className="space-y-4">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setCreateTab('ai')}
              className={`pb-3 px-4 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors ${
                createTab === 'ai'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Event Architect (Fast Blueprint)</span>
            </button>
            <button
              onClick={() => setCreateTab('manual')}
              className={`pb-3 px-4 text-xs font-semibold border-b-2 transition-colors ${
                createTab === 'manual'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Manual Form
            </button>
          </div>

          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* AI TAB */}
          {createTab === 'ai' && !aiPlanResult && (
            <form onSubmit={handleGenerateAiPlan} className="space-y-4 pt-1">
              <p className="text-xs text-slate-500">
                Provide high-level parameters and our AI engine will generate a multi-stage timeline, sponsor checklist, and volunteer allocation specs.
              </p>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Event Name / Concept</label>
                <Input
                  required
                  placeholder="e.g. HackOut 2026 36-Hour National Hackathon"
                  value={aiTitle}
                  onChange={(e) => setAiTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Event Type</label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="HACKATHON">Hackathon</option>
                    <option value="WORKSHOP">Workshop</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="EXPO">Expo / Exhibition</option>
                    <option value="CULTURAL">Cultural Festival</option>
                    <option value="MEETING">General Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Duration (Days)</label>
                  <Input
                    type="number"
                    min="1"
                    max="14"
                    value={aiDuration}
                    onChange={(e) => setAiDuration(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Target Attendees</label>
                  <Input
                    type="number"
                    min="10"
                    max="5000"
                    value={aiAttendees}
                    onChange={(e) => setAiAttendees(e.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Focus Areas & Highlights</label>
                <Input
                  placeholder="e.g. Cloud deployment, prizes, keynote speaker from industry"
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                />
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={aiGenerating || !aiTitle.trim()}>
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Blueprint...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>Generate Blueprint with AI</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* AI RESULT REVIEW TAB */}
          {createTab === 'ai' && aiPlanResult && (
            <div className="space-y-4 pt-1 max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span className="text-xs font-semibold text-emerald-900">
                    AI Blueprint Generated for "{aiTitle}"
                  </span>
                </div>
                <button
                  onClick={() => setAiPlanResult(null)}
                  className="text-xs text-emerald-700 underline font-medium hover:text-emerald-900"
                >
                  Regenerate
                </button>
              </div>

              {/* Editable Fields */}
              <form onSubmit={handleCreateSubmit} className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Event Title</label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Campus Venue</label>
                    <Input
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Start Date & Time</label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">End Date & Time</label>
                    <Input
                      type="datetime-local"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">Target Budget ($)</label>
                    <Input
                      type="number"
                      required
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                  <Textarea
                    rows={2}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  />
                </div>

                {/* AI Timeline Preview */}
                <div>
                  <h4 className="text-xs font-semibold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Generated Milestones ({aiPlanResult.timeline?.length || 0})</span>
                  </h4>
                  <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200 max-h-40 overflow-y-auto">
                    {aiPlanResult.timeline?.map((m, idx) => (
                      <div key={idx} className="flex items-center justify-between text-xs text-slate-700">
                        <span className="font-medium">• {m.title}</span>
                        <span className="text-[11px] text-slate-500 bg-white px-1.5 py-0.5 rounded border border-slate-200">
                          {m.assigned_to}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={createSubmitting}>
                    {createSubmitting ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        <span>Creating Event...</span>
                      </>
                    ) : (
                      <span>Save & Open Operations Dashboard</span>
                    )}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {/* MANUAL FORM TAB */}
          {createTab === 'manual' && (
            <form onSubmit={handleCreateSubmit} className="space-y-3 pt-1">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Event Title</label>
                <Input
                  required
                  placeholder="e.g. Annual Technical Symposium"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Event Type</label>
                  <select
                    value={formData.event_type}
                    onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="WORKSHOP">Workshop</option>
                    <option value="HACKATHON">Hackathon</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="EXPO">Expo</option>
                    <option value="CULTURAL">Cultural</option>
                    <option value="MEETING">Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Venue / Location</label>
                  <Input
                    required
                    placeholder="e.g. Computer Science Hall 101"
                    value={formData.location}
                    onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Start Date & Time</label>
                  <Input
                    type="datetime-local"
                    required
                    value={formData.start_date}
                    onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">End Date & Time</label>
                  <Input
                    type="datetime-local"
                    required
                    value={formData.end_date}
                    onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Allocated Budget ($)</label>
                  <Input
                    type="number"
                    min="0"
                    value={formData.budget}
                    onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
                <Textarea
                  rows={3}
                  placeholder="Outline the goals, speakers, and schedule highlights..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={createSubmitting}>
                  {createSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Event</span>
                  )}
                </Button>
              </div>
            </form>
          )}
        </div>
      </Modal>
    </div>
  );
}
