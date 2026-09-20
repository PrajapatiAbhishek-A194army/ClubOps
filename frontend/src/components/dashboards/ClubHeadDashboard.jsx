import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  Clock,
  Users,
  MessageSquare,
  Megaphone,
  Calendar,
  Sparkles,
  ArrowRight,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function ClubHeadDashboard({ data, clubId, onRefresh }) {
  const navigate = useNavigate();
  const d = data || {};

  const todayTasks = d.today_tasks || [];
  const upcomingTasks = d.upcoming_tasks || [];
  const totalEvents = d.total_active_events || 0;
  const volStats = d.volunteer_availability_stats || { available: 0, busy: 0, checked_in: 0, total: 0 };
  const meetingActions = d.meeting_action_items || [];
  const announcements = d.recent_announcements || [];

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Today's Focus</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{todayTasks.length}</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Tasks Due Soon</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Available Volunteers</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{volStats.available}</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{volStats.total} total in roster</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Events</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalEvents}</h3>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">Live On Campus</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Meeting Follow-ups</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{meetingActions.length}</h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Action Items Pending</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Operations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Tasks Schedule (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Tasks & Urgent Priorities */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  Immediate Tasks & Due Dates
                </CardTitle>
                <CardDescription>Tasks scheduled for today or requiring urgent attention</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="text-xs"
              >
                Task Board <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <div className="text-center py-8 text-sm text-slate-500 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2 opacity-60" />
                  All clear for today! No urgent pending tasks.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todayTasks.map((task) => (
                    <div key={task.id} className="py-3 flex items-center justify-between gap-4 first:pt-0 last:pb-0">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900 truncate">{task.title}</p>
                        <div className="flex items-center gap-2 mt-1 text-xs text-slate-500">
                          {task.event_title && (
                            <span className="text-primary-700 font-medium">{task.event_title}</span>
                          )}
                          {task.assignee_name && (
                            <span>&bull; Assigned: {task.assignee_name}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Badge
                          variant={
                            task.priority === 'HIGH' || task.priority === 'CRITICAL'
                              ? 'danger'
                              : task.priority === 'MEDIUM'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                        >
                          {task.priority}
                        </Badge>
                        <Badge variant="outline" size="sm">
                          {task.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Action Items */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-purple-600" />
                  Post-Meeting Action Items
                </CardTitle>
                <CardDescription>Extracted commitments from AI-transcribed sprint meetings</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/meetings')}
                className="text-xs"
              >
                View Meetings <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent>
              {meetingActions.length === 0 ? (
                <div className="text-center py-6 text-sm text-slate-400 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  No pending action items from recent meetings.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {meetingActions.map((action) => (
                    <div
                      key={action.id}
                      className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-slate-900">{action.task_description}</p>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {action.meeting_title ? `From: ${action.meeting_title}` : 'Meeting Action'}
                          {action.suggested_owner && ` &bull; Assigned to ${action.suggested_owner}`}
                        </p>
                      </div>
                      <Badge variant="info" size="sm">
                        {action.priority || 'MEDIUM'}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Volunteers & Operations (1 col) */}
        <div className="space-y-6">
          {/* Quick Actions Card */}
          <Card className="bg-gradient-to-br from-primary-900 to-slate-900 text-white border-0 shadow-lg shadow-primary-950/20">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 text-primary-200 text-xs font-semibold uppercase tracking-wider mb-2">
                <Sparkles className="w-4 h-4" /> Operations Hub
              </div>
              <h4 className="text-lg font-bold">Fast Operational Workflows</h4>
              <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                Dispatch announcements, organize shifts, coordinate campus events, and synchronize volunteer assignments.
              </p>
              <div className="mt-4 space-y-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => navigate('/app/events')}
                  className="w-full justify-start bg-primary-600 hover:bg-primary-500 text-xs text-white"
                >
                  <Calendar className="w-3.5 h-3.5 mr-2" /> Launch Campus Event
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/app/volunteers')}
                  className="w-full justify-start text-xs text-white border-white/20 hover:bg-white/10"
                >
                  <Users className="w-3.5 h-3.5 mr-2" /> Assign Volunteer Squad
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/app/announcements')}
                  className="w-full justify-start text-xs text-white border-white/20 hover:bg-white/10"
                >
                  <Megaphone className="w-3.5 h-3.5 mr-2" /> Post Announcement
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Volunteer Availability Matrix */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Volunteer Availability Matrix</CardTitle>
              <CardDescription>Live staffing readiness for shifts & duties</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Available for Shift
                  </span>
                  <span className="font-bold text-sm">{volStats.available}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-amber-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-600" /> On Duty / Busy
                  </span>
                  <span className="font-bold text-sm">{volStats.busy}</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-blue-50 border border-blue-200 rounded-xl text-blue-900">
                  <span className="font-semibold flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-blue-600" /> Checked-In Today
                  </span>
                  <span className="font-bold text-sm">{volStats.checked_in}</span>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/volunteers')}
                className="w-full text-xs"
              >
                Manage Volunteer Squad <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardContent>
          </Card>

          {/* Recent Announcements */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Campus Broadcasts</CardTitle>
                <CardDescription>Recent club notices</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/announcements')}
                className="text-[11px] p-1.5 h-7"
              >
                Draft <ArrowRight className="w-3 h-3 ml-0.5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {announcements.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No announcements published yet.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-900 leading-tight">{ann.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center gap-1">
                      <span className="font-mono uppercase">{ann.target_channel}</span>
                      <span>&bull;</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
