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
  CheckSquare
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getEventDetails,
  updateEvent,
  toggleMilestone,
  deleteEvent
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function EventDetailsPage() {
  const { eventId } = useParams();
  const navigate = useNavigate();
  const { activeClub, activeRole } = useAuth();

  const [event, setEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('milestones'); // 'milestones' | 'checklists' | 'details'

  // Milestone toggling animation state
  const [togglingMilestoneId, setTogglingMilestoneId] = useState(null);

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

  // Delete Event State
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteSubmitting, setDeleteSubmitting] = useState(false);

  const canEditEvent = ['PRESIDENT', 'ORGANIZER'].includes(activeRole);
  const canToggleMilestone = ['PRESIDENT', 'ORGANIZER', 'TEAM_LEAD'].includes(activeRole);
  const isPresident = activeRole === 'PRESIDENT';

  const fetchEvent = async () => {
    if (!activeClub?.id || !eventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getEventDetails(activeClub.id, eventId);
      if (res.success) {
        setEvent(res.data);
        setEditFormData({
          title: res.data.title,
          description: res.data.description || '',
          location: res.data.location || '',
          status: res.data.status,
          budget: res.data.budget,
          start_date: new Date(res.data.start_date).toISOString().slice(0, 16),
          end_date: new Date(res.data.end_date).toISOString().slice(0, 16),
        });
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

  const handleMilestoneToggle = async (milestoneId, currentCompleted) => {
    if (!canToggleMilestone) return;
    try {
      setTogglingMilestoneId(milestoneId);
      const res = await toggleMilestone(
        activeClub.id,
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

      const res = await updateEvent(activeClub.id, eventId, payload);
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
    try {
      setDeleteSubmitting(true);
      const res = await deleteEvent(activeClub.id, eventId);
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
              <span className="text-xs font-bold tracking-wider uppercase text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded border border-emerald-200">
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
                <p className="text-xs text-slate-500 font-medium">Milestones</p>
                <span className="text-xs font-bold text-slate-700">{event.progress_percent}%</span>
              </div>
              <p className="text-lg font-bold text-slate-900">
                {timeline.filter((m) => m.completed).length} / {timeline.length}
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

                  return (
                    <div
                      key={m.id || idx}
                      onClick={() => handleMilestoneToggle(m.id, isDone)}
                      className={`flex items-start justify-between gap-3 p-3.5 rounded-xl border transition-all ${
                        isDone
                          ? 'bg-slate-50/70 border-slate-200 opacity-80'
                          : 'bg-white border-slate-200 hover:border-emerald-300 shadow-2xs'
                      } ${canToggleMilestone ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                      <div className="flex items-start gap-3">
                        <button
                          disabled={!canToggleMilestone || isToggling}
                          className="mt-0.5 shrink-0 text-slate-400 hover:text-emerald-600 transition-colors"
                        >
                          {isToggling ? (
                            <Loader2 className="w-5 h-5 animate-spin text-emerald-600" />
                          ) : isDone ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-600 fill-emerald-100" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-300 hover:text-emerald-500" />
                          )}
                        </button>

                        <div>
                          <p
                            className={`text-sm font-semibold ${
                              isDone ? 'line-through text-slate-500' : 'text-slate-900'
                            }`}
                          >
                            {m.title}
                          </p>
                          <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                            <span>Target: {m.target_date || 'Ongoing'}</span>
                            <span>•</span>
                            <span className="font-medium text-slate-600">Assigned: {m.assigned_to || 'Core Team'}</span>
                          </div>
                        </div>
                      </div>

                      <Badge variant={isDone ? 'success' : 'outline'} className="text-[11px] shrink-0">
                        {isDone ? 'Done' : 'Pending'}
                      </Badge>
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
