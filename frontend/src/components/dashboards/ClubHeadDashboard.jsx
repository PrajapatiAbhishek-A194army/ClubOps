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
import StatCard from '../ui/StatCard';
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
      {/* Metrics Row using StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Today's Focus"
          value={todayTasks.length}
          subtitle="Scheduled for immediate action"
          icon={CheckSquare}
          badge={todayTasks.length > 0 ? `${todayTasks.length} Urgent` : 'Clear'}
          badgeVariant={todayTasks.length > 0 ? 'warning' : 'emerald'}
        />

        <StatCard
          title="Available Volunteers"
          value={volStats.available}
          subtitle={`${volStats.total} total in roster`}
          icon={UserCheck}
          badge={volStats.checked_in > 0 ? `${volStats.checked_in} Active` : null}
          badgeVariant="emerald"
        />

        <StatCard
          title="Active Events"
          value={totalEvents}
          subtitle="Live on campus schedule"
          icon={Calendar}
          badge="In Flight"
          badgeVariant="emerald"
        />

        <StatCard
          title="Meeting Follow-ups"
          value={meetingActions.length}
          subtitle="Action items pending completion"
          icon={Clock}
          badge={meetingActions.length > 0 ? 'Pending' : 'Synced'}
          badgeVariant={meetingActions.length > 0 ? 'warning' : 'emerald'}
        />
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
                rightIcon={ArrowRight}
              >
                Kanban Board
              </Button>
            </CardHeader>
            <CardContent>
              {todayTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium">No urgent tasks due today.</p>
                  <p className="text-[11px]">All deliverables are progressing on track.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {todayTasks.map((t) => (
                    <div
                      key={t.id}
                      className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{t.title}</span>
                          <Badge
                            variant={
                              t.priority === 'CRITICAL'
                                ? 'error'
                                : t.priority === 'HIGH'
                                ? 'warning'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {t.priority}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Event: {t.event_title || 'General'}</span>
                          <span>•</span>
                          <span>Owner: {t.assignee_name || 'Unassigned'}</span>
                        </div>
                      </div>
                      <Badge variant="neutral" size="sm">
                        {t.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Meeting Action Items Extract */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  AI Extracted Meeting Actions
                </CardTitle>
                <CardDescription>Committee assignments automatically ingested from standup transcripts</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/meetings')}
                rightIcon={ArrowRight}
              >
                Meetings
              </Button>
            </CardHeader>
            <CardContent>
              {meetingActions.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium">No unassigned meeting action items.</p>
                  <p className="text-[11px]">Paste new minutes in the Meeting Intelligence tab to auto-extract deliverables.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {meetingActions.slice(0, 5).map((act, idx) => (
                    <div key={idx} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-800 truncate">{act.title}</p>
                        <p className="text-[11px] text-slate-400">
                          Owner: <span className="text-slate-600 font-medium">{act.suggested_owner || 'Unassigned'}</span>
                        </p>
                      </div>
                      <Badge variant="emerald" size="sm">AI Extracted</Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Volunteer Telemetry & Broadcasts (1 col) */}
        <div className="space-y-6">
          {/* Volunteer Status Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Users className="w-4 h-4 text-purple-600" />
                Volunteer Squad Health
              </CardTitle>
              <CardDescription>Real-time staffing and shift distribution</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <div className="text-lg font-bold text-slate-900">{volStats.checked_in}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Checked In</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl text-center">
                  <div className="text-lg font-bold text-slate-900">{volStats.available}</div>
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Ready for Duty</div>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => navigate('/app/volunteers')}
                rightIcon={ArrowRight}
              >
                Manage Volunteer Pool
              </Button>
            </CardContent>
          </Card>

          {/* Quick Announcements Card */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Megaphone className="w-4 h-4 text-emerald-600" />
                Recent Club Broadcasts
              </CardTitle>
              <CardDescription>Campus updates dispatched across channels</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {announcements.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">No recent announcements sent.</p>
              ) : (
                announcements.slice(0, 3).map((ann) => (
                  <div key={ann.id} className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                    <div className="font-bold text-slate-900 truncate">{ann.title}</div>
                    <div className="text-[10px] text-slate-400 flex items-center justify-between">
                      <span>{ann.target_channel || 'General'}</span>
                      <span>{new Date(ann.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/app/announcements')}
              >
                Create Announcement
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
