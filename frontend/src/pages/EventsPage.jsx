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
  Users,
  Trash2
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
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiType, setAiType] = useState('WORKSHOP');
  const [aiDurationUnit, setAiDurationUnit] = useState('HOURS'); // 'HOURS' or 'DAYS'
  const [aiDurationValue, setAiDurationValue] = useState(3);
  const [aiAttendees, setAiAttendees] = useState(60);
  const [aiBudget, setAiBudget] = useState(5000);
  const [aiTargetDate, setAiTargetDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 14);
    return d.toISOString().split('T')[0];
  });
  const [aiFocus, setAiFocus] = useState('Hands-on interactive training');
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiStageMessage, setAiStageMessage] = useState('');
  const [aiPlanResult, setAiPlanResult] = useState(null);
  const [editableMilestones, setEditableMilestones] = useState([]);

  // Manual / Staged Event Form
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: 'Campus Innovation Center',
    event_type: 'WORKSHOP',
    start_date: '',
    end_date: '',
    budget: 500,
  });
  const [createSubmitting, setCreateSubmitting] = useState(false);
  const [createError, setCreateError] = useState(null);

  const canManageEvents = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  const updateMilestoneField = (index, field, value) => {
    setEditableMilestones((prev) =>
      prev.map((m, i) => (i === index ? { ...m, [field]: value } : m))
    );
  };

  const removeMilestone = (index) => {
    setEditableMilestones((prev) => prev.filter((_, i) => i !== index));
  };

  const addMilestone = () => {
    const defaultDate = formData.start_date
      ? formData.start_date.split('T')[0]
      : (aiTargetDate || new Date().toISOString().split('T')[0]);
    setEditableMilestones((prev) => [
      ...prev,
      {
        id: 'm-' + Date.now(),
        title: '',
        target_date: defaultDate,
        assigned_to: 'Volunteer',
        completed: false,
      },
    ]);
  };

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

  const formatLocalISO = (d) => {
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleGenerateAiPlan = async (e) => {
    e.preventDefault();
    if (!aiPrompt.trim()) return;
    try {
      setAiGenerating(true);
      setAiProgress(15);
      setAiStageMessage('Analyzing vision and scoping campus event theme...');
      setCreateError(null);

      const timer1 = setTimeout(() => {
        setAiProgress(40);
        setAiStageMessage('Architecting executive title, venue requirements & budget...');
      }, 400);

      const timer2 = setTimeout(() => {
        setAiProgress(70);
        setAiStageMessage('Sequencing milestone dates & assigning team roles...');
      }, 900);

      const timer3 = setTimeout(() => {
        setAiProgress(88);
        setAiStageMessage('Finalizing operational checklist & logistics...');
      }, 1400);

      const isHours = aiDurationUnit === 'HOURS';
      const durationVal = parseFloat(aiDurationValue) || (isHours ? 3 : 1);

      const requestPayload = {
        prompt: aiPrompt.trim(),
        event_type: aiType,
        expected_attendees: parseInt(aiAttendees) || 60,
        focus_areas: aiFocus.trim(),
        budget: parseFloat(aiBudget) || 0,
        start_date: aiTargetDate || undefined,
      };

      if (isHours) {
        requestPayload.duration_hours = durationVal;
        requestPayload.duration_days = Math.max(1, Math.ceil(durationVal / 24));
      } else {
        requestPayload.duration_days = parseInt(durationVal) || 1;
      }

      const res = await planEventWithAI(activeClub.id, requestPayload);

      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);

      if (res.success) {
        setAiProgress(100);
        setAiStageMessage('Blueprint finalized successfully!');
        setAiPlanResult(res.data);
        setEditableMilestones(res.data.timeline || []);

        // Compute start and end dates with clean local times
        let baseDate;
        if (aiTargetDate) {
          baseDate = new Date(aiTargetDate + 'T10:00:00');
        } else {
          baseDate = new Date();
          baseDate.setDate(baseDate.getDate() + 14);
          baseDate.setHours(10, 0, 0, 0);
        }

        const start = new Date(baseDate);
        const end = new Date(start);
        if (isHours) {
          end.setTime(start.getTime() + durationVal * 60 * 60 * 1000);
        } else {
          end.setDate(start.getDate() + Math.max(1, parseInt(durationVal)));
          end.setHours(18, 0, 0, 0); // 6:00 PM
        }

        const resolvedBudget =
          res.data.suggested_budget !== undefined && res.data.suggested_budget !== null
            ? res.data.suggested_budget
            : (parseFloat(aiBudget) || 0);

        setFormData({
          title: res.data.suggested_title || 'Campus Event',
          description: res.data.suggested_description || '',
          location: 'Campus Innovation Center',
          event_type: aiType,
          start_date: formatLocalISO(start),
          end_date: formatLocalISO(end),
          budget: resolvedBudget,
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

      // If created from AI plan, include customized milestones and checklists
      if (aiPlanResult) {
        payload.timeline = editableMilestones;
        payload.checklists = aiPlanResult.checklists;
      }

      const res = await createEvent(activeClub.id, payload);
      if (res.success) {
        setIsCreateModalOpen(false);
        setAiPlanResult(null);
        setEditableMilestones([]);
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
                      <span className="font-bold text-slate-500">₹</span>
                      Budget: ₹{ev.budget.toLocaleString('en-IN')}
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
        size="2xl"
      >
        <div className="space-y-5">
          {/* Tab Selector */}
          <div className="flex border-b border-slate-200">
            <button
              onClick={() => setCreateTab('ai')}
              className={`pb-3 px-5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
                createTab === 'ai'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>AI Event Architect (Fast Blueprint)</span>
            </button>
            <button
              onClick={() => setCreateTab('manual')}
              className={`pb-3 px-5 text-xs font-semibold border-b-2 transition-colors cursor-pointer ${
                createTab === 'manual'
                  ? 'border-emerald-600 text-emerald-700'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              Manual Form
            </button>
          </div>

          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          {/* AI TAB - PROMPT INPUT */}
          {createTab === 'ai' && !aiPlanResult && (
            <form onSubmit={handleGenerateAiPlan} className="space-y-4 pt-1">
              <p className="text-xs text-slate-500 leading-relaxed">
                Describe your campus event vision below. Enter your event prompt and budget—our AI will invent an engaging event title, compute concrete milestone dates, and assign tasks to your Club Head, Volunteers, and President.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Event Prompt & Vision <span className="text-emerald-600">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="e.g. Host a hands-on PowerBI & data analytics masterclass for 60 students featuring real-world dashboard projects and a certification challenge."
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-200 rounded-lg p-3 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  AI will suggest an executive title and complete operational blueprint based on your prompt.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Allocated Budget (₹) <span className="text-emerald-600">*</span>
                  </label>
                  <Input
                    type="number"
                    min="0"
                    step="500"
                    required
                    placeholder="e.g. 15000"
                    value={aiBudget}
                    onChange={(e) => setAiBudget(e.target.value)}
                    className="text-xs"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">User-defined budget is preserved across all milestones.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Target Event Date <span className="text-emerald-600">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={aiTargetDate}
                    onChange={(e) => setAiTargetDate(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Milestone deadlines are automatically scheduled before this date.</p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Event Type</label>
                  <select
                    value={aiType}
                    onChange={(e) => setAiType(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="WORKSHOP">Workshop</option>
                    <option value="HACKATHON">Hackathon</option>
                    <option value="SEMINAR">Seminar</option>
                    <option value="EXPO">Expo / Exhibition</option>
                    <option value="CULTURAL">Cultural Festival</option>
                    <option value="MEETING">General Meeting</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>

                {/* Duration with Unit Selector (Hours vs Days) */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Planned Duration</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min="1"
                      max={aiDurationUnit === 'HOURS' ? 72 : 14}
                      value={aiDurationValue}
                      onChange={(e) => setAiDurationValue(e.target.value)}
                      className="w-20 text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                    <select
                      value={aiDurationUnit}
                      onChange={(e) => setAiDurationUnit(e.target.value)}
                      className="flex-1 text-xs bg-white border border-slate-200 rounded-lg p-2.5 font-medium text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="HOURS">Hours</option>
                      <option value="DAYS">Days</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">Expected Attendees</label>
                  <Input
                    type="number"
                    min="5"
                    max="5000"
                    value={aiAttendees}
                    onChange={(e) => setAiAttendees(e.target.value)}
                    className="text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Focus Topics & Requirements (Optional)
                </label>
                <Input
                  placeholder="e.g. DAX calculations, report visualization, student laptop lab setup"
                  value={aiFocus}
                  onChange={(e) => setAiFocus(e.target.value)}
                  className="text-sm"
                />
              </div>

              {/* Dynamic Animated AI Progress Bar */}
              {aiGenerating && (
                <div className="p-4 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-emerald-600/10 border border-emerald-200 rounded-xl space-y-2.5 animate-fadeIn">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse" />
                      <span className="text-xs font-bold text-slate-800">
                        AI Event Architect Synthesizing Blueprint
                      </span>
                    </div>
                    <span className="text-xs font-extrabold text-emerald-700 font-mono">
                      {aiProgress}%
                    </span>
                  </div>
                  <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 rounded-full transition-all duration-300 ease-out"
                      style={{ width: `${aiProgress}%` }}
                    />
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-600">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-600 shrink-0" />
                    <span className="font-medium text-emerald-950">{aiStageMessage || 'Analyzing requirements...'}</span>
                  </div>
                </div>
              )}

              <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                  Cancel
                </Button>
                <Button variant="primary" type="submit" disabled={aiGenerating || !aiPrompt.trim()}>
                  {aiGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Generating Blueprint ({aiProgress}%)...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-emerald-300" />
                      <span>Generate Blueprint with AI</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* AI RESULT REVIEW TAB - SPACIOUS & FULLY EDITABLE */}
          {createTab === 'ai' && aiPlanResult && (
            <div className="space-y-5 pt-1 max-h-[75vh] overflow-y-auto pr-2">
              {/* Success Notification Banner */}
              <div className="p-3.5 bg-emerald-50/90 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                  <div>
                    <span className="text-xs font-bold text-emerald-950 block">
                      AI Operational Blueprint Ready
                    </span>
                    <span className="text-[11px] text-emerald-700">
                      Generated title: <span className="font-bold text-emerald-900">"{formData.title}"</span> ({aiDurationValue} {aiDurationUnit.toLowerCase()})
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setAiPlanResult(null)}
                  className="text-xs text-emerald-700 hover:text-emerald-900 font-semibold underline cursor-pointer shrink-0"
                >
                  Regenerate
                </button>
              </div>

              {/* Editable Fields Form */}
              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Event Title (AI Suggested)</label>
                    <Input
                      required
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      className="text-sm font-medium"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Campus Venue</label>
                    <Input
                      required
                      value={formData.location}
                      onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                      className="text-sm font-medium"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Start Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.start_date}
                      onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">End Date & Time</label>
                    <input
                      type="datetime-local"
                      required
                      value={formData.end_date}
                      onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg p-2.5 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">Allocated Budget (₹)</label>
                    <Input
                      type="number"
                      required
                      min="0"
                      value={formData.budget}
                      onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                      className="text-xs font-medium"
                    />
                  </div>
                </div>

                {/* Full-width Description Textarea */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                    Event Overview & Description
                  </label>
                  <textarea
                    rows={4}
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full text-sm leading-relaxed bg-white border border-slate-200 rounded-xl p-3 text-slate-800 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    placeholder="Provide detailed information regarding the workshop curriculum, speakers, and schedule..."
                  />
                </div>

                {/* Fully Editable AI Milestones Section */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-4 h-4 text-emerald-600" />
                        <span>AI-Generated Milestones ({editableMilestones.length})</span>
                      </h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Concrete dates & real team role assignments (Club Head, Volunteer, President).
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={addMilestone}
                      className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Milestone</span>
                    </button>
                  </div>

                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {editableMilestones.map((m, idx) => (
                      <div
                        key={m.id || idx}
                        className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-slate-50/80 p-2.5 rounded-xl border border-slate-200 shadow-2xs"
                      >
                        <span className="text-xs font-bold text-slate-400 w-5 shrink-0 pl-1">
                          {idx + 1}.
                        </span>

                        {/* Title input */}
                        <input
                          type="text"
                          value={m.title}
                          onChange={(e) => updateMilestoneField(idx, 'title', e.target.value)}
                          placeholder="Milestone description..."
                          className="flex-1 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                        />

                        {/* Assigned role select */}
                        <select
                          value={['President', 'Club Head', 'Volunteer'].includes(m.assigned_to) ? m.assigned_to : 'Volunteer'}
                          onChange={(e) => updateMilestoneField(idx, 'assigned_to', e.target.value)}
                          className="w-full sm:w-36 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                          title="Assignee Role"
                        >
                          <option value="Club Head">Club Head</option>
                          <option value="Volunteer">Volunteer</option>
                          <option value="President">President</option>
                        </select>

                        {/* Target Date */}
                        <input
                          type="date"
                          value={m.target_date || ''}
                          onChange={(e) => updateMilestoneField(idx, 'target_date', e.target.value)}
                          className="w-full sm:w-36 text-xs bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          title="Target Milestone Date"
                        />

                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => removeMilestone(idx)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer shrink-0"
                          title="Delete this milestone"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 flex items-center justify-end gap-2 border-t border-slate-100">
                  <Button variant="outline" type="button" onClick={() => setIsCreateModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button variant="primary" type="submit" disabled={createSubmitting}>
                    {createSubmitting ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
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
                  <label className="block text-xs font-medium text-slate-700 mb-1">Allocated Budget (₹)</label>
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
