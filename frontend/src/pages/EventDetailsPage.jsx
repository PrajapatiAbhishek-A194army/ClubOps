import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  MapPin,
  DollarSign,
  Clock,
  CheckCircle2,
  Circle,
  AlertTriangle,
  ArrowLeft,
  Edit,
  Trash2,
  Users,
  Award,
  Briefcase,
  Layers,
  Sparkles,
  Loader2,
  CheckSquare,
  ExternalLink,
  Lock
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getEventDetails,
  updateEvent,
  toggleMilestone,
  deleteEvent,
  getEventStaffingPlan,
  approveEventStaffingPlan,
  getClubTasks,
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { activeClub, activeRole, clubs, switchClub } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'checklists' | 'details'

  // Milestone toggling animation state
  const [togglingMilestoneId, setTogglingMilestoneId] = useState(null);
  // Tasks for milestone progress display
  const [eventTasks, setEventTasks] = useState([]);

  // Edit Event Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({
    title: '',
    description: '',
    location: '',
    status: 'PLANNING',
    budget: 0,
    start_date: '',
    end_date: '',
  });
  const [editSubmitting, setEditSubmitting] = useState(false);
  const [editError, setEditError] = useState(null);

  // Delete Event Modal State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  // AI Staffing & Volunteer Estimation State
  const [staffingPlan, setStaffingPlan] = useState(null);
  const [staffingLoading, setStaffingLoading] = useState(false);
  const [staffingSuccessMsg, setStaffingSuccessMsg] = useState(null);

  const canEditEvent = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);
  const canToggleMilestone = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER', 'VOLUNTEER'].includes(activeRole);
  const isPresident = activeRole === 'PRESIDENT';

  const handleLoadStaffing = async (forceRegenerate = false) => {
    const targetClubId = event?.club_id || activeClub?.id;
    if (!targetClubId || !eventId) return;
    setStaffingLoading(true);
    setStaffingSuccessMsg(null);
    try {
      const res = await getEventStaffingPlan(targetClubId, eventId, forceRegenerate);
      if (res.success) {
        setStaffingPlan(res.data);
      }
    } catch (err) {
      console.error('Failed to load AI staffing plan:', err);
    } finally {
      setStaffingLoading(false);
    }
  };

  const handleApprovePlan = async () => {
    const targetClubId = event?.club_id || activeClub?.id;
    if (!targetClubId || !eventId || !staffingPlan) return;
    setStaffingLoading(true);
    try {
      const res = await approveEventStaffingPlan(targetClubId, eventId, {
        tasks: staffingPlan.proposed_tasks,
        dispatch_notifications: true,
      });
      if (res.success) {
        setStaffingSuccessMsg(`Staffing plan finalized! Created ${res.data.created_tasks} tasks on the Kanban board and dispatched notifications.`);
        await fetchEvent();
        await handleLoadStaffing(false);
      }
    } catch (err) {
      console.error('Failed to approve plan:', err);
    } finally {
      setStaffingLoading(false);
    }
  };

  const fetchEvent = async () => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getEventDetails(activeClub?.id, eventId);
      if (res.success) {
        const evData = res.data;
        setEvent(evData);
        setEditFormData({
          title: evData.title,
          description: evData.description || '',
          location: evData.location || '',
          status: evData.status,
          budget: evData.budget,
          start_date: new Date(evData.start_date).toISOString().slice(0, 16),
          end_date: new Date(evData.end_date).toISOString().slice(0, 16),
        });
        // If event belongs to a different club than activeClub, sync activeClub so context matches
        if (evData.club_id && (!activeClub || activeClub.id !== evData.club_id)) {
          const matchingClub = clubs?.find((c) => c.id === evData.club_id);
          if (matchingClub && switchClub) {
            switchClub(matchingClub);
          }
        }
      }
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load event details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvent();
  }, [activeClub?.id, eventId]);

  // Load event tasks so we can display per-milestone progress
  useEffect(() => {
    const fetchTasks = async () => {
      if (!activeClub?.id || !eventId) return;
      try {
        const res = await getClubTasks(activeClub.id, { event_id: eventId });
        if (res.success) setEventTasks(res.data || []);
      } catch (_) {}
    };
    fetchTasks();
  }, [activeClub?.id, eventId]);

  const handleMilestoneToggle = async (milestoneId, currentCompleted) => {
    if (!canToggleMilestone) return;
    const targetClubId = event?.club_id || activeClub?.id;
    if (!targetClubId) return;
    try {
      setTogglingMilestoneId(milestoneId);
      const res = await toggleMilestone(
        targetClubId,
        eventId,
        milestoneId,
        !currentCompleted
      );
      if (res.success) {
        setEvent(res.data);
      }
    } catch (err) {
      console.error('Milestone toggle failed:', err);
    } finally {
      setTogglingMilestoneId(null);
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    const targetClubId = event?.club_id || activeClub?.id;
    if (!targetClubId) return;
    try {
      setEditSubmitting(true);
      setEditError(null);
      const payload = {
        title: editFormData.title,
        description: editFormData.description,
        location: editFormData.location,
        status: editFormData.status,
        budget: parseFloat(editFormData.budget) || 0,
        start_date: new Date(editFormData.start_date).toISOString(),
        end_date: new Date(editFormData.end_date).toISOString(),
      };

      const res = await updateEvent(targetClubId, eventId, payload);
      if (res.success) {
        setEvent(res.data);
        setIsEditModalOpen(false);
      }
    } catch (err) {
      setEditError(err.response?.data?.detail || 'Failed to update event details.');
    } finally {
      setEditSubmitting(false);
    }
  };

  const handleDeleteSubmit = async () => {
    const targetClubId = event?.club_id || activeClub?.id;
    if (!targetClubId) return;
    try {
      setDeleteSubmitting(true);
      const res = await deleteEvent(targetClubId, eventId);
      if (res.success) {
        navigate('/app/events');
      }
    } catch (err) {
      console.error('Failed to delete event:', err);
    } finally {
      setDeleteSubmitting(false);
    }
  };

  const formatDate = (isoString) => {
    if (!isoString) return 'TBD';
    const d = new Date(isoString);
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'ON_TRACK':
        return <Badge variant="success">On Track</Badge>;
      case 'PLANNING':
        return <Badge variant="primary">Planning</Badge>;
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

  if (loading) {
    return (
      <div className="py-24 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
        <p className="text-sm text-slate-500">Loading event dashboard...</p>
      </div>
    );
  }

  if (error || !event) {
    return (
      <div className="space-y-4">
        <Link to="/app/events" className="inline-flex items-center gap-1.5 text-xs text-slate-600 hover:text-slate-900">
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Events</span>
        </Link>
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-sm">
          {error || 'Event could not be found.'}
        </div>
      </div>
    );
  }

  const timeline = event.timeline || [];
  const checklists = event.checklists || {};
  const sponsorChecklist = checklists.sponsor_checklist || [];
  const judgeChecklist = checklists.judge_checklist || [];
  const volunteerSpecs = checklists.volunteer_specs || [];

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div className="space-y-3">
        <Link
          to="/app/events"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-900 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Events Directory</span>
        </Link>

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 flex-wrap">
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-800 bg-emerald-100 px-2.5 py-0.5 rounded border border-emerald-300">
                Operations Dashboard
              </span>
              <span className="text-xs font-bold tracking-wider uppercase text-slate-700 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                {event.event_type}
              </span>
              {getStatusBadge(event.status)}
              <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded font-medium">
                {event.days_until_event === 0 ? 'Happening Now' : `${event.days_until_event} days remaining`}
              </span>
            </div>

            <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{event.title}</h1>

            <p className="text-sm text-slate-600 max-w-3xl leading-relaxed">
              {event.description || 'No detailed description.'}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 self-start lg:self-center shrink-0">
            {canEditEvent && (
              <Button
                variant="outline"
                className="flex items-center gap-1.5 text-xs"
                onClick={() => setIsEditModalOpen(true)}
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Edit Details</span>
              </Button>
            )}

            {isPresident && (
              <Button
                variant="danger"
                className="flex items-center gap-1.5 text-xs"
                onClick={() => setIsDeleteModalOpen(true)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Delete</span>
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Countdown</p>
              <p className="text-lg font-bold text-slate-900">
                {event.days_until_event} {event.days_until_event === 1 ? 'Day' : 'Days'}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 shrink-0">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <p className="text-xs text-slate-500 font-medium">Event Readiness</p>
                <span className="text-xs font-bold text-slate-700">{event.progress_percent}%</span>
              </div>
              <p className="text-base font-bold text-slate-900 mt-0.5">
                {timeline.filter((m) => m.completed).length} / {timeline.length} Milestones
              </p>
              <p className="text-[11px] text-slate-500 font-medium">
                {event.completed_tasks || 0} / {event.total_tasks || 0} Kanban Tasks Done
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0 font-bold text-lg">
              ₹
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Approved Budget</p>
              <p className="text-lg font-bold text-slate-900">₹{event.budget?.toLocaleString('en-IN')}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-50 flex items-center justify-center text-purple-600 shrink-0">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="truncate">
              <p className="text-xs text-slate-500 font-medium">Venue</p>
              <p className="text-sm font-semibold text-slate-900 truncate">{event.location}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs Navigation */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab('milestones')}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'milestones'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Operational Milestones ({timeline.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('checklists')}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'checklists'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Sponsor, Judge & Volunteers</span>
        </button>

        <button
          onClick={() => setActiveTab('details')}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'details'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Calendar className="w-4 h-4" />
          <span>Schedule & Logistics</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('staffing');
            if (!staffingPlan) handleLoadStaffing();
          }}
          className={`pb-3 px-5 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === 'staffing'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-600" />
          <span>AI Staffing & Volunteer Breakdown</span>
        </button>
      </div>

      {/* TAB 1: MILESTONES TIMELINE */}
      {activeTab === 'milestones' && (
        <Card className="border-slate-200">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-base">Milestone Progress Stepper</CardTitle>
                <p className="text-xs text-slate-500 mt-0.5">
                  Check off milestones as your team completes them. Progress and status auto-recalculate.
                </p>
              </div>
              <span className="text-xs bg-emerald-50 text-emerald-700 font-semibold px-2.5 py-1 rounded-full border border-emerald-200">
                {event.progress_percent}% Ready
              </span>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {timeline.length === 0 ? (
              <p className="text-sm text-slate-500 italic py-4 text-center">
                No milestones defined for this event yet.
              </p>
            ) : (
              <div className="space-y-2">
                {timeline.map((m, idx) => {
                  const isDone = m.completed;
                  const isToggling = togglingMilestoneId === m.id;

                  // Compute per-milestone task progress
                  const milestoneTasks = eventTasks.filter(t => t.milestone_id === m.id);
                  const totalMTasks = milestoneTasks.length;
                  const doneMTasks = milestoneTasks.filter(
                    t => ['DONE', 'COMPLETED'].includes(t.status)
                  ).length;
                  const hasLinkedTasks = totalMTasks > 0;
                  const taskPct = totalMTasks > 0 ? Math.round((doneMTasks / totalMTasks) * 100) : 0;

                  // Auto-driven milestones can't be manually toggled (tasks drive them)
                  const isAutoControlled = hasLinkedTasks;
                  const clickable = canToggleMilestone && !isAutoControlled;

                  return (
                    <div
                      key={m.id || idx}
                      onClick={() => clickable && handleMilestoneToggle(m.id, isDone)}
                      className={`p-3.5 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-emerald-50/60 border-emerald-200'
                          : 'bg-white border-slate-200 hover:border-emerald-200 shadow-2xs'
                      } ${clickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1 min-w-0">
                          {/* Status icon */}
                          <div className="mt-0.5 shrink-0">
                            {isToggling ? (
                              <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                            ) : isDone ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                            ) : (
                              <Circle className={`w-5 h-5 ${clickable ? 'text-slate-300 hover:text-emerald-500' : 'text-slate-200'}`} />
                            )}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-semibold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                              {m.title}
                            </p>
                            <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                              <span>Target: {m.target_date || 'Ongoing'}</span>
                              <span>•</span>
                              <span className="font-medium text-slate-600">Assigned: {m.assigned_to || 'Core Team'}</span>
                            </div>

                            {/* Per-milestone task progress bar */}
                            {hasLinkedTasks && (
                              <div className="mt-2.5">
                                <div className="flex items-center justify-between mb-1">
                                  <span className="text-[11px] font-medium text-slate-500">
                                    {doneMTasks}/{totalMTasks} tasks done
                                  </span>
                                  <span className={`text-[11px] font-bold ${taskPct === 100 ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {taskPct}%
                                  </span>
                                </div>
                                <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full rounded-full transition-all duration-500 ${taskPct === 100 ? 'bg-emerald-500' : 'bg-blue-400'}`}
                                    style={{ width: `${taskPct}%` }}
                                  />
                                </div>
                                <p className="text-[10px] text-slate-400 mt-1">
                                  {taskPct === 100 ? '✅ Auto-completed from Kanban tasks' : '⚡ Completes automatically when all tasks are done'}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>

                        <Badge variant={isDone ? 'success' : (hasLinkedTasks ? 'info' : 'outline')} className="text-[11px] shrink-0">
                          {isDone ? 'Done' : hasLinkedTasks ? `${doneMTasks}/${totalMTasks}` : 'Pending'}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* TAB 2: CHECKLISTS & OPERATIONAL SPECS */}
      {activeTab === 'checklists' && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Sponsors Checklist */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-emerald-600" />
                <CardTitle className="text-sm font-bold">Sponsor Deliverables</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {sponsorChecklist.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No sponsor requirements listed.</p>
              ) : (
                sponsorChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-700">
                    <span className="text-emerald-600 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Judges & Evaluation */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-purple-600" />
                <CardTitle className="text-sm font-bold">Judges & Scoring</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {judgeChecklist.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No judge requirements listed.</p>
              ) : (
                judgeChecklist.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-700">
                    <span className="text-purple-600 font-bold">✓</span>
                    <span>{item}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Volunteer Allocation Specs */}
          <Card className="border-slate-200">
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-600" />
                <CardTitle className="text-sm font-bold">Volunteer Staffing</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {volunteerSpecs.length === 0 ? (
                <p className="text-xs text-slate-400 italic">No volunteer specs listed.</p>
              ) : (
                volunteerSpecs.map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg text-xs text-slate-700">
                    <span className="text-blue-600 font-bold">•</span>
                    <span>{item}</span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* TAB 3: SCHEDULE & LOGISTICS */}
      {activeTab === 'details' && (
        <Card className="border-slate-200">
          <CardHeader>
            <CardTitle className="text-base">Event Schedule & Logistics</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Starts At</span>
                <p className="font-semibold text-slate-900">{formatDate(event.start_date)}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Concludes At</span>
                <p className="font-semibold text-slate-900">{formatDate(event.end_date)}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Campus Location</span>
                <p className="font-semibold text-slate-900">{event.location}</p>
              </div>

              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-xs text-slate-500 font-medium">Operating Budget</span>
                <p className="font-semibold text-slate-900">₹{event.budget?.toLocaleString('en-IN')}</p>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 text-xs text-slate-500">
              <p>Event Slug: <span className="font-mono text-slate-700">{event.slug}</span></p>
              <p className="mt-0.5">Internal ID: <span className="font-mono text-slate-700">{event.id}</span></p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* TAB 4: AI STAFFING & VOLUNTEER BREAKDOWN */}
      {activeTab === 'staffing' && (
        <div className="space-y-6">
          {/* Header Action Banner */}
          <div className="p-6 bg-gradient-to-r from-emerald-500/10 via-teal-500/5 to-transparent border border-emerald-200 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-600 text-white">
                  AI Operations
                </span>
                {staffingPlan?.is_approved && (
                  <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 flex items-center gap-1">
                    <Lock className="w-3 h-3 text-emerald-700" />
                    Finalized & Active on Kanban
                  </span>
                )}
                <h2 className="font-bold text-lg text-slate-900">
                  Staffing & Volunteer Skill Requirements
                </h2>
              </div>
              <p className="text-xs text-slate-600">
                {staffingPlan?.is_approved
                  ? `This staffing plan is finalized and locked. All ${staffingPlan.task_count || staffingPlan.proposed_tasks?.length} tasks are running on the Kanban board.`
                  : 'AI estimates minimum headcount, specific skill quotas, and candidate assignments with zero schedule overlap.'}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {staffingPlan?.is_approved ? (
                <>
                  <Link
                    to="/app/tasks"
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors shadow-2xs"
                  >
                    <span>View in Kanban Board</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadStaffing(true)}
                    disabled={staffingLoading}
                    leftIcon={Sparkles}
                  >
                    {staffingLoading ? 'Re-analyzing...' : 'Recalculate with AI'}
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleLoadStaffing(true)}
                    disabled={staffingLoading}
                    leftIcon={Sparkles}
                  >
                    {staffingLoading ? 'Analyzing...' : 'Recalculate Plan'}
                  </Button>
                  {canEditEvent && staffingPlan && (
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={handleApprovePlan}
                      disabled={staffingLoading}
                      leftIcon={CheckSquare}
                    >
                      Approve & Dispatch Alerts
                    </Button>
                  )}
                </>
              )}
            </div>
          </div>

          {staffingSuccessMsg && (
            <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{staffingSuccessMsg}</span>
            </div>
          )}

          {/* Key Metrics: Minimum Volunteers Required & Explanation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card className="border-slate-200">
              <CardContent className="p-4 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold shrink-0">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">Minimum Volunteers Required</p>
                  <p className="text-xl font-bold text-slate-900">
                    {staffingPlan?.min_volunteers_required || event.min_volunteers_required || 8} Volunteers
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card className="border-slate-200 md:col-span-2">
              <CardContent className="p-4 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 mt-0.5">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-xs text-slate-500 font-medium">AI Staffing Rationale</p>
                  <p className="text-xs text-slate-700 font-medium mt-0.5 leading-relaxed">
                    {staffingPlan?.ai_explanation ||
                      'Computed based on event scope, duration, and multi-track logistics requirements to ensure smooth execution.'}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Skill Breakdown in Count */}
          <div className="space-y-3">
            <h3 className="text-sm font-bold text-slate-800">
              Volunteers Required by Skill (Count Breakdown)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {(staffingPlan?.skill_requirements || event.skill_requirements || []).map((s, idx) => (
                <div
                  key={idx}
                  className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 truncate">{s.skill_name}</span>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {s.required_count} Needed
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span>Target quota</span>
                    <span className="font-semibold text-slate-700">{s.required_count} Volunteers</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Proposed Tasks & Volunteer Matches */}
          {staffingPlan?.proposed_tasks?.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-slate-800">
                  {staffingPlan?.is_approved ? 'Active Event Tasks & Volunteer Assignments' : 'Proposed Tasks & Candidate Assignments'} ({staffingPlan.proposed_tasks.length})
                </h3>
                {staffingPlan?.is_approved && (
                  <span className="text-xs text-slate-500">
                    {staffingPlan.completed_task_count || 0} / {staffingPlan.task_count || staffingPlan.proposed_tasks.length} Completed
                  </span>
                )}
              </div>
              <div className="space-y-3">
                {staffingPlan.proposed_tasks.map((t, idx) => {
                  const isDone = t.status === 'DONE' || t.status === 'COMPLETED';
                  const isInProgress = t.status === 'IN_PROGRESS';
                  const isBlocked = t.status === 'BLOCKED';

                  return (
                    <div
                      key={t.task_id || idx}
                      className="p-4 bg-white border border-slate-200 rounded-xl shadow-2xs hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                        <div className="space-y-1 flex-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-bold text-sm text-slate-900">{t.task_title}</span>
                            <Badge variant="info" size="sm">{t.priority}</Badge>
                            {t.status && (
                              <Badge
                                variant={isDone ? 'success' : isInProgress ? 'info' : isBlocked ? 'danger' : 'outline'}
                                size="sm"
                              >
                                {isDone ? 'Done' : isInProgress ? 'In Progress' : isBlocked ? 'Blocked' : 'To Do'}
                              </Badge>
                            )}
                            {t.required_skill && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 bg-purple-50 text-purple-700 rounded border border-purple-200">
                                Skill: {t.required_skill}
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600">{t.task_description}</p>
                        </div>

                        {t.suggested_volunteer_name && (
                          <div className="sm:text-right shrink-0 bg-emerald-50/60 p-2.5 rounded-lg border border-emerald-200">
                            <div className="text-xs font-bold text-emerald-900">
                              {staffingPlan?.is_approved ? 'Assigned to:' : 'Match:'} {t.suggested_volunteer_name}
                            </div>
                            <div className="text-[10px] text-emerald-700 font-semibold">
                              {staffingPlan?.is_approved ? 'Active Assignee' : `${t.skill_match_pct}% Match • Available`}
                            </div>
                            <div className="text-[10px] text-slate-500 max-w-xs mt-0.5 italic">
                              {t.match_reason}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Edit Modal */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title="Edit Event Information"
      >
        {editError && (
          <div className="mb-3 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
            {editError}
          </div>
        )}

        <form onSubmit={handleEditSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Event Title</label>
            <Input
              required
              value={editFormData.title}
              onChange={(e) => setEditFormData({ ...editFormData, title: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Status</label>
              <select
                value={editFormData.status}
                onChange={(e) => setEditFormData({ ...editFormData, status: e.target.value })}
                className="w-full text-xs bg-white border border-slate-200 rounded-lg p-2 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              >
                <option value="PLANNING">Planning</option>
                <option value="ON_TRACK">On Track</option>
                <option value="AT_RISK">At Risk</option>
                <option value="COMPLETED">Completed</option>
                <option value="CANCELLED">Cancelled</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Allocated Budget (₹)</label>
              <Input
                type="number"
                value={editFormData.budget}
                onChange={(e) => setEditFormData({ ...editFormData, budget: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Campus Venue</label>
            <Input
              value={editFormData.location}
              onChange={(e) => setEditFormData({ ...editFormData, location: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">Start Date & Time</label>
              <Input
                type="datetime-local"
                value={editFormData.start_date}
                onChange={(e) => setEditFormData({ ...editFormData, start_date: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">End Date & Time</label>
              <Input
                type="datetime-local"
                value={editFormData.end_date}
                onChange={(e) => setEditFormData({ ...editFormData, end_date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">Description</label>
            <Textarea
              rows={3}
              value={editFormData.description}
              onChange={(e) => setEditFormData({ ...editFormData, description: e.target.value })}
            />
          </div>

          <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
            <Button variant="outline" type="button" onClick={() => setIsEditModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={editSubmitting}>
              {editSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Saving...</span>
                </>
              ) : (
                <span>Save Changes</span>
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteModalOpen}
        onClose={() => setIsDeleteModalOpen(false)}
        title="Delete Campus Event"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Are you sure you want to permanently remove <strong className="text-slate-900">{event.title}</strong>? All associated milestones and checklists will be deleted.
          </p>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button variant="outline" onClick={() => setIsDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleDeleteSubmit} disabled={deleteSubmitting}>
              {deleteSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Deleting...</span>
                </>
              ) : (
                <span>Confirm Delete</span>
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
