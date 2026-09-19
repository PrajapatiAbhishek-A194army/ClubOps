import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Calendar,
  CheckSquare,
  Users,
  AlertTriangle,
  Clock,
  ArrowRight,
  TrendingUp,
  ShieldAlert,
  ChevronRight,
  Sparkles,
  Megaphone,
  UserCheck,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function PresidentDashboard({ data, clubId, onRefresh }) {
  const navigate = useNavigate();
  const d = data || {};

  const activeEvents = d.active_events || [];
  const pendingJoins = d.pending_join_requests_count || 0;
  const pendingAnnouncements = d.pending_announcements_count || 0;
  const totalTasks = d.total_tasks_count || 0;
  const completedTasks = d.completed_tasks_count || 0;
  const completionRate = d.task_completion_rate || 0;
  const volunteersCount = d.total_volunteers_count || 0;
  const totalRisks = d.total_risks_count || 0;
  const criticalRisks = d.critical_risks_count || 0;
  const recentRisks = d.recent_risks || [];

  return (
    <div className="space-y-6">
      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Active Events</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{activeEvents.length}</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Campus Schedule</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Task Completion</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{completionRate}%</h3>
              <p className="text-[11px] text-slate-500 mt-0.5">{completedTasks} of {totalTasks} finished</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Club Roster</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{volunteersCount}</h3>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">Active Volunteers</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border ${
              criticalRisks > 0 ? 'bg-rose-50 text-rose-700 border-rose-100' : 'bg-amber-50 text-amber-700 border-amber-100'
            }`}>
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Risk Radar</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{totalRisks} Flags</h3>
              <p className="text-[11px] font-medium mt-0.5 text-rose-700">
                {criticalRisks} Critical Severity
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Active Events & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Events Overview (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Active Events & Milestone Progress</CardTitle>
                <CardDescription>Live operational status across all scheduled campus events</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/events')}
                className="text-xs"
              >
                View All Events <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {activeEvents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  No active events scheduled yet.
                </div>
              ) : (
                activeEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => navigate(`/app/events/${ev.id}`)}
                    className="p-4 bg-slate-50/70 hover:bg-slate-100/80 border border-slate-200/80 rounded-xl transition-all cursor-pointer space-y-2 group"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 group-hover:text-emerald-800 transition-colors">
                          {ev.title}
                        </span>
                        <Badge variant="emerald" size="sm">
                          {ev.status}
                        </Badge>
                      </div>
                      <span className="text-xs text-slate-500 font-mono">
                        {ev.days_until_event > 0 ? `In ${ev.days_until_event} days` : 'Happening Soon'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span>Venue: {ev.location || 'Campus Auditorium'}</span>
                      <span className="font-semibold text-slate-700">{ev.progress_percent}% completed</span>
                    </div>

                    {/* Progress Bar */}
                    <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                      <div
                        className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(100, ev.progress_percent || 15)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Risk Radar Summary */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-1.5 text-rose-900">
                  <AlertTriangle className="w-4 h-4 text-rose-600" />
                  Risk Detection Radar
                </CardTitle>
                <CardDescription>Automated AI risk detection across staffing, deadlines, and dependencies</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/risks')}
                className="text-xs"
              >
                Open Risk Radar <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {recentRisks.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>No high-priority risks detected. Event operations are running smoothly!</span>
                </div>
              ) : (
                recentRisks.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between text-xs hover:border-rose-300 transition-colors"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{r.title}</div>
                      <div className="text-[11px] text-slate-500 line-clamp-1">{r.description}</div>
                    </div>
                    <Badge variant={r.severity === 'CRITICAL' ? 'error' : 'warning'} size="sm">
                      {r.severity}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Pending Approvals & Actions Column (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Pending Leadership Approvals</CardTitle>
              <CardDescription>Items awaiting your presidential authorization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {/* Join Requests */}
              <div
                onClick={() => navigate('/app/members')}
                className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                    <UserCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Volunteer Applications</div>
                    <div className="text-[11px] text-slate-500">Applicant join requests</div>
                  </div>
                </div>
                <Badge variant={pendingJoins > 0 ? 'warning' : 'neutral'} size="sm">
                  {pendingJoins} Pending
                </Badge>
              </div>

              {/* Announcement Drafts */}
              <div
                onClick={() => navigate('/app/announcements')}
                className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                    <Megaphone className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Announcement Broadcasts</div>
                    <div className="text-[11px] text-slate-500">Draft notices to publish</div>
                  </div>
                </div>
                <Badge variant={pendingAnnouncements > 0 ? 'warning' : 'neutral'} size="sm">
                  {pendingAnnouncements} Drafts
                </Badge>
              </div>

              {/* Governance & Club Head */}
              <div
                onClick={() => navigate('/app/club-settings')}
                className="p-3.5 bg-slate-50 hover:bg-emerald-50/50 border border-slate-200 rounded-xl transition-colors cursor-pointer flex items-center justify-between"
              >
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-900">Club Governance</div>
                    <div className="text-[11px] text-slate-500">Assign Club Head & settings</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            </CardContent>
          </Card>

          {/* Quick Actions Card */}
          <Card className="bg-gradient-to-br from-emerald-800 to-emerald-950 text-white border-0">
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center gap-2 text-emerald-300 text-xs font-bold uppercase tracking-wider">
                <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                Presidential Copilot
              </div>
              <h4 className="text-base font-bold leading-snug">
                Autonomous Event Operations Engine Active
              </h4>
              <p className="text-xs text-emerald-100/90 leading-relaxed">
                Execute end-to-end multi-agent directives with LangGraph tool calling to plan events, assign tasks, and broadcast updates without manual overhead.
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => navigate('/app/events')}
                className="w-full text-xs font-bold bg-white text-emerald-950 hover:bg-emerald-50"
              >
                Plan New Event with AI
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
