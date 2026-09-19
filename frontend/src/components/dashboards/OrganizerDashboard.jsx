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

export default function OrganizerDashboard({ data, clubId, onRefresh }) {
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
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Meeting Actions</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{meetingActions.length}</h3>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">AI Extracted Items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0 border border-amber-100">
              <Megaphone className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Announcements</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{announcements.length}</h3>
              <p className="text-[11px] text-amber-700 font-medium mt-0.5">Active Broadcasts</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Tasks & Meeting Actions (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today's Tasks */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Today's Deliverables & Priority Tasks</CardTitle>
                <CardDescription>Tasks scheduled for delivery in the next 24-48 hours</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="text-xs"
              >
                Open Kanban <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {todayTasks.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No immediate tasks due today. All caught up!
                </div>
              ) : (
                todayTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-emerald-300 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-2">
                        <span>{t.title}</span>
                        {t.event_title && (
                          <span className="text-[10px] text-slate-400 font-normal">
                            ({t.event_title})
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span>Assignee: {t.assignee_name || 'Unassigned'}</span>
                        {t.due_datetime && (
                          <>
                            <span>&bull;</span>
                            <span className="text-rose-600 font-medium flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Due Soon
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <Badge variant={t.priority === 'HIGH' || t.priority === 'CRITICAL' ? 'error' : 'info'} size="sm">
                      {t.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Meeting Actions */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  AI Meeting Action Items
                </CardTitle>
                <CardDescription>Action items automatically extracted from past club meeting notes</CardDescription>
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
            <CardContent className="space-y-2.5">
              {meetingActions.length === 0 ? (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 text-center">
                  No extracted action items pending. Upload meeting minutes in Meeting Intelligence to auto-extract tasks.
                </div>
              ) : (
                meetingActions.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-slate-50/70 border border-slate-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{item.task_description}</div>
                      <div className="text-[11px] text-slate-500">
                        Suggested Owner: <strong className="text-slate-700">{item.suggested_owner || 'General Crew'}</strong>
                        {item.meeting_title && ` • From ${item.meeting_title}`}
                      </div>
                    </div>
                    <Badge variant={item.priority === 'HIGH' ? 'error' : 'neutral'} size="sm">
                      {item.priority}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Volunteer Availability & Announcements Column (1 col) */}
        <div className="space-y-5">
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
