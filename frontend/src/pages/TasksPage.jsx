import React, { useState, useEffect, useMemo } from 'react';
import { 
  CheckSquare, 
  Plus, 
  Search, 
  Filter, 
  Sparkles, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Lock, 
  Unlock, 
  MoreVertical, 
  Edit3, 
  Trash2, 
  Calendar, 
  User as UserIcon, 
  ArrowRight, 
  Layers, 
  ListFilter, 
  LayoutGrid, 
  List as ListIcon, 
  ShieldAlert, 
  ChevronDown, 
  AlertCircle,
  TrendingUp,
  RefreshCw,
  Loader2,
  ExternalLink
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  getClubTasks, 
  createTask, 
  updateTask, 
  updateTaskStatus, 
  deleteTask, 
  suggestTasksWithAI,
  getClubEvents,
  getClubMembers
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

const STATUS_COLUMNS = [
  { id: 'TODO', label: 'To Do', color: 'border-slate-300 bg-slate-50/70 text-slate-700', badgeVariant: 'neutral' },
  { id: 'IN_PROGRESS', label: 'In Progress', color: 'border-blue-400 bg-blue-50/40 text-blue-800', badgeVariant: 'info' },
  { id: 'BLOCKED', label: 'Blocked', color: 'border-rose-400 bg-rose-50/40 text-rose-800', badgeVariant: 'error' },
  { id: 'COMPLETED', label: 'Completed', color: 'border-emerald-400 bg-emerald-50/40 text-emerald-800', badgeVariant: 'success' },
];

const PRIORITY_CONFIG = {
  URGENT: { label: 'Urgent', variant: 'error', icon: AlertTriangle },
  HIGH: { label: 'High', variant: 'warning', icon: TrendingUp },
  MEDIUM: { label: 'Medium', variant: 'info', icon: Clock },
  LOW: { label: 'Low', variant: 'neutral', icon: CheckCircle2 },
};

export default function TasksPage() {
  const { activeClub, activeRole } = useAuth();

  const [tasks, setTasks] = useState([]);
  const [events, setEvents] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // View Mode: 'kanban' or 'list'
  const [viewMode, setViewMode] = useState('kanban');

  // Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [eventFilter, setEventFilter] = useState('ALL');
  const [priorityFilter, setPriorityFilter] = useState('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState('ALL');
  const [blockedOnly, setBlockedOnly] = useState(false);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const [editingTask, setEditingTask] = useState(null);

  // Form State for Manual Task Creation/Edit
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priority: 'MEDIUM',
    status: 'TODO',
    event_id: '',
    assignee_id: '',
    deadline: '',
    depends_on_task_id: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState(null);

  // AI Task Suggestion State
  const [aiGoal, setAiGoal] = useState('');
  const [aiCommittee, setAiCommittee] = useState('Technical Operations');
  const [aiEventId, setAiEventId] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiError, setAiError] = useState(null);
  const [addingTaskIdx, setAddingTaskIdx] = useState(null);

  // Notification Toast
  const [toastMessage, setToastMessage] = useState(null);

  const showToast = (msg) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const isManagement = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);
  const canUpdateStatus = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER', 'VOLUNTEER'].includes(activeRole);

  // Fetch initial tasks, events, and members
  const loadData = async () => {
    if (!activeClub) return;
    setLoading(true);
    setError(null);
    try {
      const [tasksRes, eventsRes, membersRes] = await Promise.all([
        getClubTasks(activeClub.id),
        getClubEvents(activeClub.id),
        getClubMembers(activeClub.id),
      ]);

      if (tasksRes.success) setTasks(tasksRes.data);
      if (eventsRes.success) setEvents(eventsRes.data);
      if (membersRes.success) setMembers(membersRes.data);
    } catch (err) {
      console.error('Failed to load tasks data', err);
      setError(err.response?.data?.detail || 'Failed to load task board');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeClub?.id]);

  // Filtered Tasks
  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesSearch = 
        task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchesEvent = eventFilter === 'ALL' || task.event_id === eventFilter;
      const matchesPriority = priorityFilter === 'ALL' || task.priority === priorityFilter;
      const matchesAssignee = 
        assigneeFilter === 'ALL' || 
        (assigneeFilter === 'UNASSIGNED' && !task.assignee_id) || 
        task.assignee_id === assigneeFilter;
      
      const matchesBlocked = !blockedOnly || task.is_blocked;

      return matchesSearch && matchesEvent && matchesPriority && matchesAssignee && matchesBlocked;
    });
  }, [tasks, searchQuery, eventFilter, priorityFilter, assigneeFilter, blockedOnly]);

  // Counts for Metrics Header
  const metrics = useMemo(() => {
    const total = tasks.length;
    const todo = tasks.filter(t => t.status === 'TODO').length;
    const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
    const blocked = tasks.filter(t => t.is_blocked || t.status === 'BLOCKED').length;
    const done = tasks.filter(t => t.status === 'DONE').length;
    return { total, todo, inProgress, blocked, done };
  }, [tasks]);

  // Open Task Create Modal
  const handleOpenCreateModal = (defaultStatus = 'TODO') => {
    setEditingTask(null);
    setFormData({
      title: '',
      description: '',
      priority: 'MEDIUM',
      status: defaultStatus,
      event_id: '',
      assignee_id: '',
      deadline: '',
      depends_on_task_id: '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Open Task Edit Modal
  const handleOpenEditModal = (task) => {
    setEditingTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      priority: task.priority,
      status: task.status,
      event_id: task.event_id || '',
      assignee_id: task.assignee_id || '',
      deadline: task.deadline ? task.deadline.slice(0, 10) : '',
      depends_on_task_id: task.depends_on_task_id || '',
    });
    setFormError(null);
    setIsCreateModalOpen(true);
  };

  // Submit Task Form (Create or Update)
  const handleSubmitTaskForm = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setFormError('Task title is required');
      return;
    }

    setSubmitting(true);
    setFormError(null);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim() || null,
      priority: formData.priority,
      status: formData.status,
      event_id: formData.event_id || null,
      assignee_id: formData.assignee_id || null,
      deadline: formData.deadline ? new Date(formData.deadline).toISOString() : null,
      depends_on_task_id: formData.depends_on_task_id || null,
    };

    try {
      if (editingTask) {
        const res = await updateTask(activeClub.id, editingTask.id, payload);
        if (res.success) {
          showToast(`Task "${res.data.title}" updated successfully`);
          setIsCreateModalOpen(false);
          loadData();
        }
      } else {
        const res = await createTask(activeClub.id, payload);
        if (res.success) {
          showToast(`Task "${res.data.title}" created successfully`);
          setIsCreateModalOpen(false);
          loadData();
        }
      }
    } catch (err) {
      console.error('Failed to save task', err);
      setFormError(err.response?.data?.detail || 'Failed to save task. Please check dependencies.');
    } finally {
      setSubmitting(false);
    }
  };

  // Quick Status Change (1-Click Kanban transition)
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await updateTaskStatus(activeClub.id, taskId, newStatus);
      if (res.success) {
        showToast(`Task moved to ${newStatus.replace('_', ' ')}`);
        loadData();
      }
    } catch (err) {
      console.error('Failed to update task status', err);
      showToast(err.response?.data?.detail || 'Failed to update task status');
    }
  };

  // Delete Task
  const handleDeleteTask = async (taskId, taskTitle) => {
    if (!window.confirm(`Are you sure you want to delete task "${taskTitle}"?`)) return;

    try {
      const res = await deleteTask(activeClub.id, taskId);
      if (res.success) {
        showToast(`Task "${taskTitle}" removed`);
        loadData();
      }
    } catch (err) {
      console.error('Failed to delete task', err);
      showToast(err.response?.data?.detail || 'Failed to delete task');
    }
  };

  // AI Task Suggestions Generator
  const handleGenerateAiTasks = async (e) => {
    e.preventDefault();
    if (!aiGoal.trim()) {
      setAiError('Please enter a goal or milestone description');
      return;
    }

    setAiLoading(true);
    setAiError(null);
    setAiSuggestions([]);

    try {
      const payload = {
        goal_description: aiGoal.trim(),
        committee_area: aiCommittee,
        event_id: aiEventId || null,
      };

      const res = await suggestTasksWithAI(activeClub.id, payload);
      if (res.success && res.data.tasks) {
        setAiSuggestions(res.data.tasks);
        if (res.data.tasks.length === 0) {
          setAiError('AI was unable to formulate specific tasks. Try a more detailed description.');
        }
      }
    } catch (err) {
      console.error('AI Suggestion error', err);
      setAiError(err.response?.data?.detail || 'Failed to generate AI task breakdown');
    } finally {
      setAiLoading(false);
    }
  };

  // Add an AI Suggested Task to the board
  const handleAddAiSuggestedTask = async (taskItem, index) => {
    setAddingTaskIdx(index);
    try {
      const payload = {
        title: taskItem.title,
        description: `${taskItem.description}\n\n[Suggested Role: ${taskItem.suggested_role || 'Lead'} | Timeline: ${taskItem.suggested_timeline || 'N/A'}]`,
        priority: taskItem.priority || 'MEDIUM',
        status: 'TODO',
        event_id: aiEventId || null,
      };

      const res = await createTask(activeClub.id, payload);
      if (res.success) {
        showToast(`Added "${taskItem.title}" to board`);
        setAiSuggestions(prev => prev.filter((_, i) => i !== index));
        loadData();
      }
    } catch (err) {
      console.error('Failed to add suggested task', err);
      showToast(err.response?.data?.detail || 'Failed to create task');
    } finally {
      setAddingTaskIdx(null);
    }
  };

  // Add all AI suggestions at once
  const handleAddAllAiTasks = async () => {
    if (!aiSuggestions.length) return;
    setAiLoading(true);
    try {
      for (const item of aiSuggestions) {
        const payload = {
          title: item.title,
          description: `${item.description}\n\n[Suggested Role: ${item.suggested_role || 'Lead'} | Timeline: ${item.suggested_timeline || 'N/A'}]`,
          priority: item.priority || 'MEDIUM',
          status: 'TODO',
          event_id: aiEventId || null,
        };
        await createTask(activeClub.id, payload);
      }
      showToast(`Added ${aiSuggestions.length} tasks to board!`);
      setAiSuggestions([]);
      setIsAiModalOpen(false);
      loadData();
    } catch (err) {
      console.error('Failed to add all suggestions', err);
      showToast('Error adding some tasks');
      loadData();
    } finally {
      setAiLoading(false);
    }
  };

  // Relative Date Helper
  const formatDeadline = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    const now = new Date();
    const diffDays = Math.ceil((date - now) / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { text: `${Math.abs(diffDays)}d overdue`, isOverdue: true };
    }
    if (diffDays === 0) {
      return { text: 'Due today', isToday: true };
    }
    return { text: `Due in ${diffDays}d`, isUpcoming: true };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-lg shadow-xl text-sm font-medium border border-slate-700 flex items-center gap-2 animate-in fade-in slide-in-from-bottom-3">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          {toastMessage}
        </div>
      )}

      {/* Top Header & Actions */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Task Management & Kanban</h1>
            <Badge variant="emerald" size="sm">Live Board</Badge>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Track operational deliverables, critical path dependencies, and team ownership for <span className="font-semibold text-slate-700">{activeClub?.name || 'Club'}</span>.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setViewMode('kanban')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'kanban' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              Kanban
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                viewMode === 'list' 
                  ? 'bg-white text-slate-900 shadow-sm' 
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ListIcon className="w-3.5 h-3.5" />
              List
            </button>
          </div>

          {/* AI Task Assistant Button */}
          {isManagement && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsAiModalOpen(true)}
              className="gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 hover:border-purple-300"
            >
              <Sparkles className="w-4 h-4 text-purple-600" />
              AI Task Breakdown
            </Button>
          )}

          {/* New Task Button */}
          {isManagement && (
            <Button
              variant="primary"
              size="sm"
              onClick={() => handleOpenCreateModal('TODO')}
              className="gap-1.5 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              New Task
            </Button>
          )}
        </div>
      </div>

      {/* Metrics Header Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-500">Total Tasks</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">{metrics.total}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-slate-500">To Do</div>
          <div className="text-2xl font-bold text-slate-700 mt-1">{metrics.todo}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-blue-600">In Progress</div>
          <div className="text-2xl font-bold text-blue-700 mt-1">{metrics.inProgress}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm">
          <div className="text-xs font-medium text-rose-600 flex items-center gap-1">
            <Lock className="w-3 h-3 text-rose-500" /> Blocked
          </div>
          <div className="text-2xl font-bold text-rose-600 mt-1">{metrics.blocked}</div>
        </div>
        <div className="bg-white border border-slate-200/80 rounded-xl p-3.5 shadow-sm col-span-2 sm:col-span-1">
          <div className="text-xs font-medium text-emerald-600">Completed</div>
          <div className="text-2xl font-bold text-emerald-700 mt-1">{metrics.done}</div>
        </div>
      </div>

      {/* Filters and Search Toolbar */}
      <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-sm space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search tasks by title or details..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 transition-colors"
            />
          </div>

          {/* Filter Selectors */}
          <div className="flex items-center gap-2 flex-wrap text-xs">
            {/* Event Filter */}
            <select
              value={eventFilter}
              onChange={(e) => setEventFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Events</option>
              {events.map((ev) => (
                <option key={ev.id} value={ev.id}>{ev.title}</option>
              ))}
            </select>

            {/* Priority Filter */}
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {/* Assignee Filter */}
            <select
              value={assigneeFilter}
              onChange={(e) => setAssigneeFilter(e.target.value)}
              className="py-1.5 px-2.5 bg-slate-50 border border-slate-200 rounded-lg text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="ALL">All Assignees</option>
              <option value="UNASSIGNED">Unassigned</option>
              {members.map((m) => {
                const userId = m.user_id || m.user?.id;
                const name = m.full_name || m.user?.full_name || m.email || 'Member';
                return (
                  <option key={userId || m.membership_id} value={userId}>{name}</option>
                );
              })}
            </select>

            {/* Blocked Only Toggle */}
            <button
              onClick={() => setBlockedOnly(!blockedOnly)}
              className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg border font-medium transition-colors ${
                blockedOnly 
                  ? 'bg-rose-50 border-rose-300 text-rose-700' 
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Lock className="w-3.5 h-3.5" />
              Blocked Only
            </button>

            {/* Clear Filters */}
            {(searchQuery || eventFilter !== 'ALL' || priorityFilter !== 'ALL' || assigneeFilter !== 'ALL' || blockedOnly) && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setEventFilter('ALL');
                  setPriorityFilter('ALL');
                  setAssigneeFilter('ALL');
                  setBlockedOnly(false);
                }}
                className="text-slate-400 hover:text-slate-600 px-2 py-1 underline text-xs"
              >
                Reset
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading & Error States */}
      {loading && (
        <div className="py-20 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <p className="text-sm font-medium">Loading operations board...</p>
        </div>
      )}

      {error && !loading && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-sm flex items-center gap-3">
          <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          <div>{error}</div>
        </div>
      )}

      {/* KANBAN BOARD VIEW */}
      {!loading && !error && viewMode === 'kanban' && (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
          {STATUS_COLUMNS.map((col) => {
            const columnTasks = filteredTasks.filter((t) => {
              if (col.id === 'COMPLETED') return t.status === 'COMPLETED' || t.status === 'DONE';
              return t.status === col.id;
            });
            return (
              <div
                key={col.id}
                className="bg-slate-100/70 border border-slate-200/90 rounded-xl p-3 flex flex-col max-h-[85vh] shadow-sm"
              >
                {/* Column Header */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-800 text-sm">{col.label}</span>
                    <span className="bg-white border border-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full shadow-2xs">
                      {columnTasks.length}
                    </span>
                  </div>
                  {isManagement && (
                    <button
                      onClick={() => handleOpenCreateModal(col.id)}
                      className="p-1 hover:bg-white rounded text-slate-500 hover:text-slate-900 transition-colors"
                      title={`Add task to ${col.label}`}
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {/* Cards Container */}
                <div className="space-y-3 overflow-y-auto pr-1 flex-1 min-h-[150px]">
                  {columnTasks.length === 0 ? (
                    <div className="h-28 border-2 border-dashed border-slate-200 rounded-lg flex flex-col items-center justify-center text-slate-400 text-xs p-3 text-center">
                      <span>No tasks in {col.label}</span>
                      {isManagement && (
                        <button
                          onClick={() => handleOpenCreateModal(col.id)}
                          className="mt-1 text-emerald-600 hover:underline font-medium"
                        >
                          + Add new task
                        </button>
                      )}
                    </div>
                  ) : (
                    columnTasks.map((task) => {
                      const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                      const deadlineInfo = formatDeadline(task.deadline);

                      return (
                        <div
                          key={task.id}
                          className={`bg-white rounded-xl p-3.5 border transition-all duration-150 hover:shadow-md ${
                            task.is_blocked 
                              ? 'border-rose-300 ring-1 ring-rose-200/70 bg-rose-50/10' 
                              : 'border-slate-200/90 hover:border-slate-300'
                          }`}
                        >
                          {/* Top Badges & Priority */}
                          <div className="flex items-center justify-between gap-2 mb-2">
                            <Badge variant={priority.variant} size="sm">
                              {priority.label}
                            </Badge>
                            
                            {/* Action Menu / Status Selector */}
                            <div className="flex items-center gap-1">
                              {canUpdateStatus && (
                                <div className="relative group">
                                  <select
                                    value={task.status}
                                    onChange={(e) => handleStatusChange(task.id, e.target.value)}
                                    className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded px-1.5 py-0.5 text-slate-600 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer"
                                  >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="BLOCKED">Blocked</option>
                                    <option value="DONE">Done</option>
                                  </select>
                                </div>
                              )}
                              
                              {isManagement && (
                                <button
                                  onClick={() => handleOpenEditModal(task)}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                                  title="Edit Task"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                              )}

                              {isManagement && (
                                <button
                                  onClick={() => handleDeleteTask(task.id, task.title)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                                  title="Delete Task"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Task Title */}
                          <h4 className="text-sm font-semibold text-slate-900 leading-snug mb-1">
                            {task.title}
                          </h4>

                          {/* Description */}
                          {task.description && (
                            <p className="text-xs text-slate-500 line-clamp-2 mb-2.5">
                              {task.description}
                            </p>
                          )}

                          {/* CRITICAL DEPENDENCY BLOCKER WARNING BADGE */}
                          {task.is_blocked && (
                            <div className="mb-2.5 p-2 bg-rose-50/90 border border-rose-200/90 rounded-lg flex items-start gap-1.5 text-rose-800 text-[11px] leading-tight">
                              <Lock className="w-3.5 h-3.5 text-rose-600 flex-shrink-0 mt-0.5" />
                              <div>
                                <span className="font-semibold">Blocked:</span>{' '}
                                {task.blocking_reason || `Waiting on prerequisite "${task.depends_on?.title || 'task'}" to be completed.`}
                              </div>
                            </div>
                          )}

                          {/* Non-blocked prerequisite indicator */}
                          {!task.is_blocked && task.depends_on && (
                            <div className="mb-2.5 p-1.5 bg-slate-50 border border-slate-200/80 rounded-md flex items-center gap-1.5 text-[11px] text-slate-600">
                              <Unlock className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                              <span className="truncate">Dep: {task.depends_on.title} (Resolved)</span>
                            </div>
                          )}

                          {/* Card Footer: Event, Assignee, Deadline */}
                          <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100 text-xs text-slate-500">
                            {/* Assignee Avatar */}
                            <div className="flex items-center gap-1.5 min-w-0">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0">
                                {task.assignee ? task.assignee.full_name.charAt(0) : '?'}
                              </div>
                              <span className="text-[11px] truncate max-w-[90px]" title={task.assignee ? task.assignee.full_name : 'Unassigned'}>
                                {task.assignee ? task.assignee.full_name : 'Unassigned'}
                              </span>
                            </div>

                            {/* Deadline Badge */}
                            {deadlineInfo && (
                              <div className={`flex items-center gap-1 text-[11px] font-medium ${
                                deadlineInfo.isOverdue 
                                  ? 'text-rose-600 font-semibold' 
                                  : deadlineInfo.isToday 
                                  ? 'text-amber-600 font-semibold' 
                                  : 'text-slate-500'
                              }`}>
                                <Calendar className="w-3 h-3" />
                                {deadlineInfo.text}
                              </div>
                            )}
                          </div>

                          {/* Event Tag if present */}
                          {task.event && (
                            <div className="mt-2 text-[10px] text-slate-400 font-medium flex items-center gap-1 truncate">
                              <Layers className="w-2.5 h-2.5" />
                              <span className="truncate">{task.event.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* LIST / TABLE VIEW */}
      {!loading && !error && viewMode === 'list' && (
        <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-600 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3 px-4">Task & Description</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Event</th>
                  <th className="py-3 px-4">Assignee</th>
                  <th className="py-3 px-4">Deadline</th>
                  <th className="py-3 px-4">Prerequisite Dependency</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTasks.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="py-12 text-center text-slate-400 text-sm">
                      No matching tasks found. Adjust your search or filters.
                    </td>
                  </tr>
                ) : (
                  filteredTasks.map((task) => {
                    const priority = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM;
                    const deadlineInfo = formatDeadline(task.deadline);
                    const statusObj = STATUS_COLUMNS.find(s => s.id === task.status) || STATUS_COLUMNS[0];

                    return (
                      <tr key={task.id} className="hover:bg-slate-50/60 transition-colors">
                        {/* Title & Description */}
                        <td className="py-3 px-4 max-w-xs">
                          <div className="font-semibold text-slate-900 text-sm">{task.title}</div>
                          {task.description && (
                            <div className="text-slate-500 text-[11px] truncate mt-0.5">{task.description}</div>
                          )}
                        </td>

                        {/* Status with Interactive Selector */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {canUpdateStatus ? (
                            <select
                              value={task.status}
                              onChange={(e) => handleStatusChange(task.id, e.target.value)}
                              className="text-xs font-semibold bg-white border border-slate-200 rounded-md px-2 py-1 text-slate-700 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                            >
                              <option value="TODO">To Do</option>
                              <option value="IN_PROGRESS">In Progress</option>
                              <option value="BLOCKED">Blocked</option>
                              <option value="DONE">Done</option>
                            </select>
                          ) : (
                            <Badge variant={statusObj.badgeVariant} size="sm">
                              {statusObj.label}
                            </Badge>
                          )}
                        </td>

                        {/* Priority */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          <Badge variant={priority.variant} size="sm">
                            {priority.label}
                          </Badge>
                        </td>

                        {/* Event */}
                        <td className="py-3 px-4 whitespace-nowrap text-slate-600">
                          {task.event ? (
                            <span className="font-medium">{task.event.title}</span>
                          ) : (
                            <span className="text-slate-400 italic">General</span>
                          )}
                        </td>

                        {/* Assignee */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {task.assignee ? (
                            <div className="flex items-center gap-1.5">
                              <div className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-[10px] font-bold">
                                {task.assignee.full_name.charAt(0)}
                              </div>
                              <span className="font-medium text-slate-700">{task.assignee.full_name}</span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Deadline */}
                        <td className="py-3 px-4 whitespace-nowrap">
                          {deadlineInfo ? (
                            <span className={deadlineInfo.isOverdue ? 'text-rose-600 font-semibold' : 'text-slate-600'}>
                              {deadlineInfo.text}
                            </span>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Dependency / Blocker */}
                        <td className="py-3 px-4 max-w-xs">
                          {task.is_blocked ? (
                            <div className="flex items-center gap-1.5 text-rose-700 bg-rose-50 border border-rose-200 px-2 py-1 rounded text-[11px] font-medium">
                              <Lock className="w-3 h-3 text-rose-600 flex-shrink-0" />
                              <span className="truncate">Blocked: {task.depends_on?.title || 'Prerequisite'}</span>
                            </div>
                          ) : task.depends_on ? (
                            <div className="flex items-center gap-1 text-emerald-700 text-[11px]">
                              <Unlock className="w-3 h-3 text-emerald-600" />
                              <span className="truncate">{task.depends_on.title} (Resolved)</span>
                            </div>
                          ) : (
                            <span className="text-slate-400">None</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 whitespace-nowrap text-right">
                          <div className="flex items-center justify-end gap-1">
                            {isManagement && (
                              <button
                                onClick={() => handleOpenEditModal(task)}
                                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded transition-colors"
                                title="Edit"
                              >
                                <Edit3 className="w-3.5 h-3.5" />
                              </button>
                            )}
                            {isManagement && (
                              <button
                                onClick={() => handleDeleteTask(task.id, task.title)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="Delete"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CREATE / EDIT TASK MODAL */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
      >
        <form onSubmit={handleSubmitTaskForm} className="space-y-4">
          {formError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Title <span className="text-rose-500">*</span>
            </label>
            <Input
              type="text"
              placeholder="e.g. Design hackathon attendee badge & lanyard"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Description / Action Items
            </label>
            <Textarea
              rows={3}
              placeholder="Outline specific deliverables, file specs, or notes..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Status</label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="BLOCKED">Blocked</option>
                <option value="DONE">Done</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Associated Event</label>
              <select
                value={formData.event_id}
                onChange={(e) => setFormData({ ...formData, event_id: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None (General Operations)</option>
                {events.map((ev) => (
                  <option key={ev.id} value={ev.id}>{ev.title}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Assignee</label>
              <select
                value={formData.assignee_id}
                onChange={(e) => setFormData({ ...formData, assignee_id: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">Unassigned</option>
                {members.map((m) => {
                  const userId = m.user_id || m.user?.id;
                  const name = m.full_name || m.user?.full_name || m.email || 'Member';
                  return (
                    <option key={userId || m.membership_id} value={userId}>
                      {name} ({m.role})
                    </option>
                  );
                })}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Deadline</label>
              <Input
                type="date"
                value={formData.deadline}
                onChange={(e) => setFormData({ ...formData, deadline: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                <span>Prerequisite Task</span>
                <span className="text-[10px] text-slate-400 font-normal">Enforces Dependency</span>
              </label>
              <select
                value={formData.depends_on_task_id}
                onChange={(e) => setFormData({ ...formData, depends_on_task_id: e.target.value })}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">None (Can start immediately)</option>
                {tasks
                  .filter((t) => !editingTask || t.id !== editingTask.id)
                  .map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title} ({t.status})
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div className="p-3 bg-amber-50/60 border border-amber-200/80 rounded-lg text-xs text-amber-800 flex items-start gap-2">
            <Lock className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-semibold">Dependency Invariant:</span> If you select a prerequisite task, this task will remain flagged as <span className="font-semibold text-rose-700">Blocked</span> until the prerequisite is marked as <strong>Done</strong>.
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsCreateModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={submitting}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* GROQ AI TASK BREAKDOWN MODAL */}
      <Modal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
        title="AI Task Breakdown Assistant"
      >
        <div className="space-y-4">
          <div className="p-3.5 bg-purple-50 border border-purple-200 rounded-xl text-purple-900 text-xs flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <span className="font-bold">Powered by Groq LLM:</span> Describe any club goal, milestone, or event objective to instantly generate discrete actionable tasks with suggested owners and timelines.
            </div>
          </div>

          <form onSubmit={handleGenerateAiTasks} className="space-y-3">
            {aiError && (
              <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-700 rounded-lg text-xs">
                {aiError}
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Goal / Milestone Description <span className="text-rose-500">*</span>
              </label>
              <Textarea
                rows={3}
                placeholder="e.g. Set up high-speed network, power strips, and check-in badges for 300 hackathon attendees in Seminar Hall"
                value={aiGoal}
                onChange={(e) => setAiGoal(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Committee / Functional Area
                </label>
                <select
                  value={aiCommittee}
                  onChange={(e) => setAiCommittee(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="Technical Operations">Technical Operations</option>
                  <option value="Logistics & Venue">Logistics & Venue</option>
                  <option value="Sponsorship & Finance">Sponsorship & Finance</option>
                  <option value="Marketing & Social Media">Marketing & Social Media</option>
                  <option value="Registration & Welcome">Registration & Welcome</option>
                  <option value="Stage, AV & Emcee">Stage, AV & Emcee</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Target Event (Optional)
                </label>
                <select
                  value={aiEventId}
                  onChange={(e) => setAiEventId(e.target.value)}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">General Club Operations</option>
                  {events.map((ev) => (
                    <option key={ev.id} value={ev.id}>{ev.title}</option>
                  ))}
                </select>
              </div>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={aiLoading}
              className="w-full gap-2 bg-purple-600 hover:bg-purple-700 border-purple-600"
            >
              <Sparkles className="w-4 h-4" />
              Generate Task Breakdown
            </Button>
          </form>

          {/* AI Suggestions Results */}
          {aiSuggestions.length > 0 && (
            <div className="pt-3 border-t border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Generated Tasks ({aiSuggestions.length})
                </span>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddAllAiTasks}
                  disabled={aiLoading}
                  className="text-xs py-1 text-emerald-700 border-emerald-300 hover:bg-emerald-50"
                >
                  Add All to Board
                </Button>
              </div>

              <div className="max-h-64 overflow-y-auto space-y-2 pr-1">
                {aiSuggestions.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-50 border border-slate-200 rounded-lg flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-900">{item.title}</span>
                        <Badge variant={PRIORITY_CONFIG[item.priority]?.variant || 'info'} size="sm">
                          {item.priority}
                        </Badge>
                      </div>
                      <p className="text-slate-600 text-[11px]">{item.description}</p>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3">
                        <span>Role: <strong className="text-slate-600">{item.suggested_role}</strong></span>
                        <span>Timeline: <strong className="text-slate-600">{item.suggested_timeline}</strong></span>
                      </div>
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddAiSuggestedTask(item, idx)}
                      loading={addingTaskIdx === idx}
                      className="text-[11px] py-1 px-2.5 flex-shrink-0"
                    >
                      + Add
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
