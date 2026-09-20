import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Sparkles, 
  Search, 
  Filter, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Phone, 
  Mail, 
  Briefcase, 
  UserCheck, 
  UserX, 
  Plus, 
  Edit3, 
  Check, 
  ChevronDown, 
  Layers, 
  LayoutGrid, 
  List as ListIcon, 
  RefreshCw, 
  Loader2, 
  Flame, 
  ShieldCheck, 
  ArrowRight,
  ExternalLink,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getClubVolunteers, 
  updateVolunteerProfile, 
  updateVolunteerAvailability, 
  toggleVolunteerCheckIn, 
  createVolunteerProfile, 
  matchVolunteersWithAI, 
  assignVolunteerToTask, 
  getClubTasks, 
  getClubMembers 
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const AVAILABILITY_CONFIG = {
  AVAILABLE: {
    label: 'Available',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-500/20',
    dot: 'bg-emerald-500',
    badgeVariant: 'success',
  },
  BUSY: {
    label: 'Busy / On Task',
    color: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-500/20',
    dot: 'bg-amber-500',
    badgeVariant: 'warning',
  },
  ON_SHIFT: {
    label: 'On Active Shift',
    color: 'bg-blue-50 text-blue-700 border-blue-200 ring-blue-500/20',
    dot: 'bg-blue-500 animate-pulse',
    badgeVariant: 'info',
  },
  UNAVAILABLE: {
    label: 'Unavailable',
    color: 'bg-slate-100 text-slate-600 border-slate-200 ring-slate-500/20',
    dot: 'bg-slate-400',
    badgeVariant: 'neutral',
  },
};

const STANDARD_SKILLS = [
  'Audio / Visual (AV)',
  'Network & Wi-Fi Setup',
  'Registration Desk',
  'Crowd Management',
  'Graphic Design',
  'Social Media & Live PR',
  'Photography',
  'Videography',
  'Food & Catering',
  'Hardware & Robotics',
  'Python / Backend',
  'Speaker Liaison',
];

export default function VolunteersPage() {
  const { activeClub, activeRole, user: currentUser } = useAuth();

  const [volunteers, setVolunteers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters & Views
  const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'table'
  const [searchQuery, setSearchQuery] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [skillFilter, setSkillFilter] = useState('ALL');
  const [checkInOnly, setCheckInOnly] = useState(false);

  // Modals & Drawers
  const [isAiMatchModalOpen, setIsAiMatchModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedVolunteer, setSelectedVolunteer] = useState(null);

  // AI Matchmaker State
  const [aiSelectedTaskId, setAiSelectedTaskId] = useState('');
  const [aiCustomSkillInput, setAiCustomSkillInput] = useState('');
  const [aiMatchLoading, setAiMatchLoading] = useState(false);
  const [aiMatchResult, setAiMatchResult] = useState(null);
  const [assigningTaskId, setAssigningTaskId] = useState(null);

  // Form State for Edit/Create Volunteer
  const [formData, setFormData] = useState({
    user_id: '',
    department: 'General Operations',
    availability_status: 'AVAILABLE',
    availability_notes: '',
    available_hours_per_week: 10,
    phone_number: '',
    skills: [],
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);
  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isManagement = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  const loadData = async () => {
    if (!activeClub) return;
    setLoading(true);
    setError(null);
    try {
      const [volsRes, tasksRes, membersRes] = await Promise.all([
        getClubVolunteers(activeClub.id),
        getClubTasks(activeClub.id),
        getClubMembers(activeClub.id),
      ]);

      if (volsRes.success) setVolunteers(volsRes.data);
      if (tasksRes.success) setTasks(tasksRes.data);
      if (membersRes.success) setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load volunteer data', err);
      setError(err.response?.data?.detail || 'Failed to load volunteer roster');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeClub?.id]);

  // Filtered Volunteers
  const filteredVolunteers = useMemo(() => {
    return volunteers.filter((v) => {
      const matchesSearch = 
        v.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.department.toLowerCase().includes(searchQuery.toLowerCase()) ||
        v.skills.some((s) => s.toLowerCase().includes(searchQuery.toLowerCase()));

      const matchesAvailability = 
        availabilityFilter === 'ALL' || v.availability_status === availabilityFilter;

      const matchesSkill = 
        skillFilter === 'ALL' || v.skills.includes(skillFilter);

      const matchesCheckIn = 
        !checkInOnly || v.check_in_status === 'CHECKED_IN';

      return matchesSearch && matchesAvailability && matchesSkill && matchesCheckIn;
    });
  }, [volunteers, searchQuery, availabilityFilter, skillFilter, checkInOnly]);

  // Metric Stats
  const metrics = useMemo(() => {
    const total = volunteers.length;
    const available = volunteers.filter((v) => v.availability_status === 'AVAILABLE').length;
    const checkedIn = volunteers.filter((v) => v.check_in_status === 'CHECKED_IN').length;
    const onShift = volunteers.filter((v) => v.availability_status === 'ON_SHIFT').length;
    const totalActiveTasks = volunteers.reduce((acc, v) => acc + (v.active_tasks_count || 0), 0);
    return { total, available, checkedIn, onShift, totalActiveTasks };
  }, [volunteers]);

  // Handle Fast Availability Status Change
  const handleAvailabilityChange = async (volunteerId, newStatus) => {
    try {
      const res = await updateVolunteerAvailability(activeClub.id, volunteerId, {
        availability_status: newStatus,
      });
      if (res.success) {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteerId ? res.data : v))
        );
        showToast(`Availability updated to ${newStatus}`);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update availability');
    }
  };

  // Handle Fast Check-In / Check-Out Toggle
  const handleToggleCheckIn = async (volunteerId, currentStatus) => {
    const nextStatus = currentStatus === 'CHECKED_IN' ? 'CHECKED_OUT' : 'CHECKED_IN';
    try {
      const res = await toggleVolunteerCheckIn(activeClub.id, volunteerId, {
        check_in_status: nextStatus,
      });
      if (res.success) {
        setVolunteers((prev) =>
          prev.map((v) => (v.id === volunteerId ? res.data : v))
        );
        showToast(
          nextStatus === 'CHECKED_IN'
            ? `Checked In on-site successfully`
            : `Checked Out successfully`
        );
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to toggle check-in');
    }
  };

  // Open Edit / Onboard Modal
  const openEditModal = (volunteer = null) => {
    setFormError(null);
    if (volunteer) {
      setSelectedVolunteer(volunteer);
      setFormData({
        user_id: volunteer.user_id,
        department: volunteer.department || 'General Operations',
        availability_status: volunteer.availability_status || 'AVAILABLE',
        availability_notes: volunteer.availability_notes || '',
        available_hours_per_week: volunteer.available_hours_per_week || 10,
        phone_number: volunteer.phone_number || '',
        skills: [...(volunteer.skills || [])],
      });
    } else {
      setSelectedVolunteer(null);
      setFormData({
        user_id: members[0]?.user_id || members[0]?.user?.id || '',
        department: 'General Operations',
        availability_status: 'AVAILABLE',
        availability_notes: '',
        available_hours_per_week: 10,
        phone_number: '',
        skills: ['Registration Desk'],
      });
    }
    setIsEditModalOpen(true);
  };

  // Submit Volunteer Profile Update / Create
  const handleSaveVolunteer = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError(null);
    try {
      let res;
      if (selectedVolunteer) {
        res = await updateVolunteerProfile(activeClub.id, selectedVolunteer.id, {
          department: formData.department,
          availability_status: formData.availability_status,
          availability_notes: formData.availability_notes,
          available_hours_per_week: parseInt(formData.available_hours_per_week, 10),
          phone_number: formData.phone_number,
          skills: formData.skills,
        });
      } else {
        res = await createVolunteerProfile(activeClub.id, {
          user_id: formData.user_id,
          department: formData.department,
          availability_status: formData.availability_status,
          availability_notes: formData.availability_notes,
          available_hours_per_week: parseInt(formData.available_hours_per_week, 10),
          phone_number: formData.phone_number,
          skills: formData.skills,
        });
      }

      if (res.success) {
        setIsEditModalOpen(false);
        showToast(selectedVolunteer ? 'Profile updated successfully' : 'Volunteer onboarded successfully');
        loadData();
      }
    } catch (err) {
      setFormError(err.response?.data?.detail || 'Failed to save volunteer profile');
    } finally {
      setSubmitting(false);
    }
  };

  // Toggle skill selection in modal
  const handleToggleSkill = (skill) => {
    setFormData((prev) => {
      const exists = prev.skills.includes(skill);
      return {
        ...prev,
        skills: exists ? prev.skills.filter((s) => s !== skill) : [...prev.skills, skill],
      };
    });
  };

  // Open AI Matchmaker
  const openAiMatchmaker = (taskId = '') => {
    setAiSelectedTaskId(taskId || (tasks[0]?.id || ''));
    setAiMatchResult(null);
    setIsAiMatchModalOpen(true);
  };

  // Execute AI Matchmaking
  const handleRunAiMatch = async () => {
    setAiMatchLoading(true);
    setAiMatchResult(null);
    try {
      const payload = {
        task_id: aiSelectedTaskId || undefined,
        required_skills: aiCustomSkillInput
          ? aiCustomSkillInput.split(',').map((s) => s.trim()).filter(Boolean)
          : [],
      };
      const res = await matchVolunteersWithAI(activeClub.id, payload);
      if (res.success) {
        setAiMatchResult(res.data);
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'AI matchmaking failed');
    } finally {
      setAiMatchLoading(false);
    }
  };

  // 1-Click Assign Volunteer from AI Match
  const handleAssignVolunteer = async (volunteerUserId) => {
    if (!aiSelectedTaskId) {
      alert('Please select a task to assign this volunteer to.');
      return;
    }
    setAssigningTaskId(volunteerUserId);
    try {
      const res = await assignVolunteerToTask(activeClub.id, {
        task_id: aiSelectedTaskId,
        volunteer_user_id: volunteerUserId,
      });
      if (res.success) {
        showToast('Volunteer successfully assigned to task!');
        setIsAiMatchModalOpen(false);
        loadData();
      }
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to assign volunteer');
    } finally {
      setAssigningTaskId(null);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 flex items-center gap-2 bg-emerald-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-emerald-700 animate-in fade-in slide-in-from-bottom-5">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span className="text-sm font-medium">{toastMessage}</span>
        </div>
      )}

      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <Users className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                Volunteer Pool & Matchmaker
              </h1>
              <p className="text-sm text-slate-500">
                Skill mapping, real-time availability, on-site check-in, and AI task dispatching
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* AI Matchmaker Trigger */}
          <Button
            onClick={() => openAiMatchmaker()}
            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4 text-emerald-200" />
            AI Matchmaker
          </Button>

          {/* Onboard Volunteer */}
          {isManagement && (
            <Button
              variant="outline"
              onClick={() => openEditModal(null)}
              className="flex items-center gap-1.5 border-slate-300 hover:bg-slate-50"
            >
              <Plus className="w-4 h-4 text-slate-600" />
              Onboard Volunteer
            </Button>
          )}

          {/* Refresh */}
          <Button
            variant="ghost"
            size="icon"
            onClick={loadData}
            title="Refresh volunteer pool"
            disabled={loading}
          >
            <RefreshCw className={`w-4 h-4 text-slate-600 ${loading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Metric Cards Banner */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Pool</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-800">{metrics.total}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Registered volunteers</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-emerald-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            Available Now
          </div>
          <div className="mt-1 text-2xl font-extrabold text-emerald-700">{metrics.available}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Ready for shifts</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-blue-600 uppercase tracking-wider flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
            Checked In
          </div>
          <div className="mt-1 text-2xl font-extrabold text-blue-700">{metrics.checkedIn}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Present on campus</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs">
          <div className="text-xs font-semibold text-amber-600 uppercase tracking-wider">On Shift</div>
          <div className="mt-1 text-2xl font-extrabold text-amber-700">{metrics.onShift}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Active duty now</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs col-span-2 md:col-span-1">
          <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Tasks</div>
          <div className="mt-1 text-2xl font-extrabold text-slate-800">{metrics.totalActiveTasks}</div>
          <div className="text-[11px] text-slate-400 mt-0.5">Assigned workload</div>
        </div>
      </div>

      {/* Control Bar: Filters, Search, and View Mode */}
      <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs flex flex-col md:flex-row gap-3 md:items-center md:justify-between text-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          {/* Search Box */}
          <div className="relative min-w-[220px] flex-1 max-w-sm">
            <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, skill, or committee..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Availability Status Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
          >
            <option value="ALL">All Availabilities</option>
            <option value="AVAILABLE">Available</option>
            <option value="BUSY">Busy</option>
            <option value="ON_SHIFT">On Active Shift</option>
            <option value="UNAVAILABLE">Unavailable</option>
          </select>

          {/* Skill Filter */}
          <select
            value={skillFilter}
            onChange={(e) => setSkillFilter(e.target.value)}
            className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 max-w-[180px]"
          >
            <option value="ALL">All Skills</option>
            {STANDARD_SKILLS.map((sk) => (
              <option key={sk} value={sk}>{sk}</option>
            ))}
          </select>

          {/* Checked-In Only Filter */}
          <button
            onClick={() => setCheckInOnly(!checkInOnly)}
            className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
              checkInOnly 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-700' 
                : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            Checked In On-Site
          </button>

          {/* Clear Filters */}
          {(searchQuery || availabilityFilter !== 'ALL' || skillFilter !== 'ALL' || checkInOnly) && (
            <button
              onClick={() => {
                setSearchQuery('');
                setAvailabilityFilter('ALL');
                setSkillFilter('ALL');
                setCheckInOnly(false);
              }}
              className="text-slate-400 hover:text-slate-600 underline text-xs ml-1"
            >
              Reset
            </button>
          )}
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1 border border-slate-200 rounded-lg p-0.5 bg-slate-50 shrink-0">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'grid'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Card Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-1.5 rounded-md transition-colors ${
              viewMode === 'table'
                ? 'bg-white text-emerald-700 shadow-2xs font-semibold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Roster Table View"
          >
            <ListIcon className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20 bg-white border border-slate-200 rounded-2xl">
          <Loader2 className="w-8 h-8 text-emerald-600 animate-spin mb-2" />
          <p className="text-sm font-medium text-slate-600">Loading volunteer pool & skills...</p>
        </div>
      ) : error ? (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-center text-rose-700">
          <AlertTriangle className="w-8 h-8 text-rose-500 mx-auto mb-2" />
          <p className="font-semibold text-sm">{error}</p>
          <Button onClick={loadData} variant="outline" className="mt-3 text-xs">
            Try Again
          </Button>
        </div>
      ) : filteredVolunteers.length === 0 ? (
        <div className="text-center py-16 bg-white border border-dashed border-slate-300 rounded-2xl p-8">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800">No Volunteers Found</h3>
          <p className="text-xs text-slate-500 max-w-md mx-auto mt-1 mb-4">
            No volunteers match your current search or filter criteria. Try resetting filters or onboarding new students.
          </p>
          {isManagement && (
            <Button onClick={() => openEditModal(null)} className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white">
              <Plus className="w-3.5 h-3.5 mr-1" />
              Onboard First Volunteer
            </Button>
          )}
        </div>
      ) : viewMode === 'grid' ? (
        /* GRID VIEW */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredVolunteers.map((vol) => {
            const availConf = AVAILABILITY_CONFIG[vol.availability_status] || AVAILABILITY_CONFIG.AVAILABLE;
            const isCheckedIn = vol.check_in_status === 'CHECKED_IN';
            const isHighWorkload = vol.active_tasks_count >= 3;

            return (
              <div
                key={vol.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs hover:shadow-md transition-all flex flex-col justify-between group"
              >
                <div>
                  {/* Card Header: Avatar, Name, Department & Check-in Badge */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="relative">
                        <img
                          src={vol.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vol.full_name}`}
                          alt={vol.full_name}
                          className="w-12 h-12 rounded-full bg-slate-100 border border-slate-200 object-cover"
                        />
                        <span
                          className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${availConf.dot}`}
                          title={`Status: ${availConf.label}`}
                        />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-bold text-slate-900 text-sm">{vol.full_name}</h3>
                          {vol.rating >= 4.9 && (
                            <Award className="w-3.5 h-3.5 text-amber-500" title="Top Rated Contributor" />
                          )}
                        </div>
                        <p className="text-xs text-slate-500">{vol.email}</p>
                        <span className="inline-block text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md mt-1">
                          {vol.department}
                        </span>
                      </div>
                    </div>

                    {/* Check-In Status Button */}
                    <button
                      onClick={() => handleToggleCheckIn(vol.id, vol.check_in_status)}
                      title={isCheckedIn ? 'Click to Check Out' : 'Click to Check In on-site'}
                      className={`text-[10px] font-semibold px-2 py-1 rounded-full border flex items-center gap-1 transition-all ${
                        isCheckedIn
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-300 shadow-2xs'
                          : 'bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                      {isCheckedIn ? 'Checked In' : 'Check In'}
                    </button>
                  </div>

                  {/* Availability Dropdown Selector */}
                  <div className="flex items-center justify-between py-1.5 px-2.5 bg-slate-50 rounded-lg border border-slate-100 text-xs mb-3">
                    <span className="text-slate-500 text-[11px]">Shift Status:</span>
                    <select
                      value={vol.availability_status}
                      onChange={(e) => handleAvailabilityChange(vol.id, e.target.value)}
                      className={`text-[11px] font-bold rounded px-1.5 py-0.5 border cursor-pointer focus:outline-none ${availConf.color}`}
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="BUSY">Busy</option>
                      <option value="ON_SHIFT">On Active Shift</option>
                      <option value="UNAVAILABLE">Unavailable</option>
                    </select>
                  </div>

                  {/* Skills Section */}
                  <div className="mb-3">
                    <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                      Tagged Skills ({vol.skills.length})
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {vol.skills.map((skill) => (
                        <span
                          key={skill}
                          className="text-[11px] font-medium bg-slate-100 text-slate-700 px-2 py-0.5 rounded-md border border-slate-200"
                        >
                          {skill}
                        </span>
                      ))}
                      {vol.skills.length === 0 && (
                        <span className="text-[11px] text-slate-400 italic">No skills tagged yet</span>
                      )}
                    </div>
                  </div>

                  {/* Workload & Active Tasks Bar */}
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs mb-3">
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-semibold text-slate-600 flex items-center gap-1">
                        <Briefcase className="w-3 h-3 text-slate-400" />
                        Current Workload
                      </span>
                      <span className={`font-bold ${isHighWorkload ? 'text-rose-600' : 'text-slate-700'}`}>
                        {vol.active_tasks_count} Active Task{vol.active_tasks_count === 1 ? '' : 's'}
                      </span>
                    </div>

                    {vol.active_tasks_count > 0 ? (
                      <div className="space-y-1 mt-1.5">
                        {vol.assigned_tasks.slice(0, 2).map((task) => (
                          <div
                            key={task.id}
                            className="text-[10px] bg-white border border-slate-200 rounded px-2 py-1 flex items-center justify-between text-slate-700 truncate"
                          >
                            <span className="truncate pr-2 font-medium">{task.title}</span>
                            <span className="shrink-0 text-slate-400 font-mono text-[9px] uppercase">
                              {task.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-emerald-600 flex items-center gap-1 mt-1">
                        <Check className="w-3 h-3 text-emerald-500" />
                        Zero backlog — Ready for assignment
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Footer: Quick Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                    <Clock className="w-3 h-3 text-slate-400" />
                    <span>{vol.available_hours_per_week} hrs/wk</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditModal(vol)}
                      className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 h-7"
                    >
                      <Edit3 className="w-3 h-3 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openAiMatchmaker()}
                      className="text-emerald-700 border-emerald-200 hover:bg-emerald-50 text-xs px-2 py-1 h-7"
                    >
                      <Sparkles className="w-3 h-3 mr-1 text-emerald-600" />
                      Match
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* TABLE VIEW */
        <div className="bg-white border border-slate-200 rounded-2xl shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase font-semibold text-[11px]">
                <tr>
                  <th className="py-3 px-4">Volunteer</th>
                  <th className="py-3 px-4">Department</th>
                  <th className="py-3 px-4">Availability</th>
                  <th className="py-3 px-4">Check-In</th>
                  <th className="py-3 px-4">Skills</th>
                  <th className="py-3 px-4">Active Workload</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {filteredVolunteers.map((vol) => {
                  const availConf = AVAILABILITY_CONFIG[vol.availability_status] || AVAILABILITY_CONFIG.AVAILABLE;
                  const isCheckedIn = vol.check_in_status === 'CHECKED_IN';

                  return (
                    <tr key={vol.id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={vol.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${vol.full_name}`}
                            alt={vol.full_name}
                            className="w-8 h-8 rounded-full border border-slate-200 bg-slate-50 object-cover"
                          />
                          <div>
                            <div className="font-bold text-slate-900">{vol.full_name}</div>
                            <div className="text-[11px] text-slate-400">{vol.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-600">
                        {vol.department}
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={vol.availability_status}
                          onChange={(e) => handleAvailabilityChange(vol.id, e.target.value)}
                          className={`text-[11px] font-bold rounded px-2 py-0.5 border cursor-pointer focus:outline-none ${availConf.color}`}
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="BUSY">Busy</option>
                          <option value="ON_SHIFT">On Active Shift</option>
                          <option value="UNAVAILABLE">Unavailable</option>
                        </select>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          onClick={() => handleToggleCheckIn(vol.id, vol.check_in_status)}
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 transition-all ${
                            isCheckedIn
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                              : 'bg-slate-50 text-slate-500 border-slate-200'
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${isCheckedIn ? 'bg-emerald-500 animate-ping' : 'bg-slate-400'}`} />
                          {isCheckedIn ? 'Checked In' : 'Checked Out'}
                        </button>
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <div className="flex flex-wrap gap-1">
                          {vol.skills.slice(0, 3).map((s) => (
                            <span
                              key={s}
                              className="text-[10px] bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded border border-slate-200"
                            >
                              {s}
                            </span>
                          ))}
                          {vol.skills.length > 3 && (
                            <span className="text-[10px] text-slate-400">+{vol.skills.length - 3}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-slate-800">
                          {vol.active_tasks_count} active
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1">
                          ({vol.available_hours_per_week}h/wk)
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => openEditModal(vol)}
                          className="text-slate-600 hover:text-slate-900 text-xs px-2 py-1 h-7"
                        >
                          <Edit3 className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AI VOLUNTEER MATCHMAKER MODAL */}
      <Modal
        isOpen={isAiMatchModalOpen}
        onClose={() => setIsAiMatchModalOpen(false)}
        title="AI Volunteer-to-Task Matchmaker"
        size="lg"
      >
        <div className="space-y-4">
          <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3.5 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Automated Skill & Capacity Matchmaker</p>
              <p className="text-emerald-700 mt-0.5">
                The AI analyzes task prerequisites, maps required skillsets, checks volunteer availability status, and penalizes heavy workloads to prevent student burnout.
              </p>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Task to Dispatch
            </label>
            <select
              value={aiSelectedTaskId}
              onChange={(e) => setAiSelectedTaskId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">-- Choose an existing club task --</option>
              {tasks.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title} [{t.priority}] — {t.assignee ? `Assigned to ${t.assignee.full_name}` : 'Unassigned'}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Optional Skill Filter (comma separated)
            </label>
            <Input
              type="text"
              placeholder="e.g. Audio / Visual (AV), Registration Desk, Photography"
              value={aiCustomSkillInput}
              onChange={(e) => setAiCustomSkillInput(e.target.value)}
            />
          </div>

          <div className="flex justify-end">
            <Button
              onClick={handleRunAiMatch}
              disabled={aiMatchLoading}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs flex items-center gap-1.5"
            >
              {aiMatchLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing Volunteer Skill Graphs...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Find Optimal Volunteers
                </>
              )}
            </Button>
          </div>

          {/* AI MATCH RESULTS */}
          {aiMatchResult && (
            <div className="mt-4 pt-4 border-t border-slate-200 space-y-3">
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700">
                <span className="font-bold text-slate-900">Analysis Summary: </span>
                {aiMatchResult.summary}
              </div>

              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Ranked Recommendations ({aiMatchResult.recommendations.length})
              </div>

              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {aiMatchResult.recommendations.map((rec, index) => {
                  const isTopMatch = index === 0;
                  return (
                    <div
                      key={rec.volunteer_id}
                      className={`p-3 rounded-xl border transition-all ${
                        isTopMatch
                          ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <img
                            src={rec.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${rec.full_name}`}
                            alt={rec.full_name}
                            className="w-9 h-9 rounded-full border border-slate-200 bg-white"
                          />
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-bold text-slate-900 text-xs">{rec.full_name}</span>
                              {isTopMatch && (
                                <Badge variant="success" className="text-[9px] py-0 px-1.5">
                                  Top Match
                                </Badge>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500">{rec.department}</div>
                          </div>
                        </div>

                        <div className="text-right">
                          <div className="text-sm font-extrabold text-emerald-700">
                            {rec.match_score}% Match
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {rec.active_tasks_count} active tasks
                          </div>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 mt-2 bg-white/80 p-2 rounded-lg border border-slate-100 italic">
                        "{rec.match_rationale}"
                      </p>

                      <div className="mt-2.5 flex items-center justify-between">
                        <div className="flex flex-wrap gap-1">
                          {rec.matching_skills.map((sk) => (
                            <span
                              key={sk}
                              className="text-[10px] bg-emerald-100 text-emerald-800 font-medium px-1.5 py-0.5 rounded border border-emerald-200"
                            >
                              ✓ {sk}
                            </span>
                          ))}
                        </div>

                        {isManagement && (
                          <Button
                            size="sm"
                            onClick={() => handleAssignVolunteer(rec.user_id)}
                            disabled={assigningTaskId === rec.user_id}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white h-7 px-2.5"
                          >
                            {assigningTaskId === rec.user_id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              'Assign to Task'
                            )}
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* EDIT / ONBOARD VOLUNTEER MODAL */}
      <Modal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        title={selectedVolunteer ? `Edit Volunteer: ${selectedVolunteer.full_name}` : 'Onboard New Volunteer'}
        size="md"
      >
        <form onSubmit={handleSaveVolunteer} className="space-y-4">
          {formError && (
            <div className="p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-xs">
              {formError}
            </div>
          )}

          {!selectedVolunteer && (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Select Club Member
              </label>
              <select
                value={formData.user_id}
                onChange={(e) => setFormData({ ...formData, user_id: e.target.value })}
                required
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {members.map((m) => {
                  const uId = m.user_id || m.user?.id;
                  const uName = m.full_name || m.user?.full_name || m.email;
                  return (
                    <option key={uId || m.membership_id} value={uId}>
                      {uName} ({m.role})
                    </option>
                  );
                })}
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Department</label>
              <Input
                type="text"
                placeholder="e.g. Logistics & Desk"
                value={formData.department}
                onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Phone / WhatsApp</label>
              <Input
                type="text"
                placeholder="+91 98765 43210"
                value={formData.phone_number}
                onChange={(e) => setFormData({ ...formData, phone_number: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Availability Status</label>
              <select
                value={formData.availability_status}
                onChange={(e) => setFormData({ ...formData, availability_status: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="AVAILABLE">Available</option>
                <option value="BUSY">Busy</option>
                <option value="ON_SHIFT">On Active Shift</option>
                <option value="UNAVAILABLE">Unavailable</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Weekly Capacity (Hours)</label>
              <Input
                type="number"
                min="1"
                max="60"
                value={formData.available_hours_per_week}
                onChange={(e) => setFormData({ ...formData, available_hours_per_week: e.target.value })}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Availability Notes</label>
            <Textarea
              rows={2}
              placeholder="e.g. Available weekdays after 3 PM, free all weekend."
              value={formData.availability_notes}
              onChange={(e) => setFormData({ ...formData, availability_notes: e.target.value })}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Skills & Specialties
            </label>
            <div className="flex flex-wrap gap-1.5 max-h-36 overflow-y-auto p-2 bg-slate-50 border border-slate-200 rounded-lg">
              {STANDARD_SKILLS.map((sk) => {
                const isSelected = formData.skills.includes(sk);
                return (
                  <button
                    type="button"
                    key={sk}
                    onClick={() => handleToggleSkill(sk)}
                    className={`text-[11px] font-medium px-2 py-1 rounded-md border transition-all ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {isSelected ? '✓ ' : '+ '}
                    {sk}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              className="text-xs"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs"
            >
              {submitting ? 'Saving...' : 'Save Profile'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
