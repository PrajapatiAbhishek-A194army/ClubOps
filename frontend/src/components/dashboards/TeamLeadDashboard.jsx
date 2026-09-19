import React from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  AlertOctagon,
  Clock,
  Layers,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  Sparkles,
  ChevronRight
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import Button from '../ui/Button';
import Badge from '../ui/Badge';

export default function TeamLeadDashboard({ data, clubId, onRefresh }) {
  const navigate = useNavigate();
  const d = data || {};

  const teamWorkload = d.team_workload || [];
  const blockedTasks = d.blocked_tasks || [];
  const upcomingDeadlines = d.upcoming_deadlines || [];
  const stats = d.department_stats || { total_squad_tasks: 0, blocked_count: 0, in_progress_count: 0, completed_count: 0 };

  return (
    <div className="space-y-6">
      {/* Metric Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-100">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Squad Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.total_squad_tasks}</h3>
              <p className="text-[11px] text-emerald-700 font-medium mt-0.5">Active Deliverables</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-rose-50 text-rose-700 flex items-center justify-center shrink-0 border border-rose-100">
              <AlertOctagon className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Blocked Tasks</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.blocked_count}</h3>
              <p className="text-[11px] text-rose-700 font-medium mt-0.5">Bottlenecks to Clear</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0 border border-blue-100">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">In Progress</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{stats.in_progress_count}</h3>
              <p className="text-[11px] text-blue-700 font-medium mt-0.5">Active Sprint Items</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="w-11 h-11 rounded-2xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0 border border-purple-100">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Team Capacity</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-0.5">{teamWorkload.length}</h3>
              <p className="text-[11px] text-purple-700 font-medium mt-0.5">Team Members</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Grid: Team Workload (2 cols) & Blocked / Deadlines (1 col) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Team Workload Distribution (2 cols) */}
        <div className="lg:col-span-2 space-y-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle>Team Workload & Squad Delegation</CardTitle>
                <CardDescription>Monitor task loads across your functional team to avoid burnout and bottlenecks</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/volunteers')}
                className="text-xs"
              >
                Assign Volunteers <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-3">
              {teamWorkload.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No volunteers currently assigned to this squad.
                </div>
              ) : (
                teamWorkload.map((m) => {
                  const total = m.assigned_tasks_count;
                  const completed = m.completed_tasks_count;
                  const inProg = m.in_progress_count;
                  const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                  return (
                    <div
                      key={m.user_id}
                      className="p-3.5 bg-slate-50/70 border border-slate-200/80 rounded-xl space-y-2"
                    >
                      <div className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 text-emerald-800 font-bold flex items-center justify-center text-[11px]">
                            {m.full_name ? m.full_name[0] : 'U'}
                          </div>
                          <div>
                            <span className="font-bold text-slate-900">{m.full_name}</span>
                            <span className="text-[10px] text-slate-400 ml-1.5 capitalize">({m.role.toLowerCase().replace('_', ' ')})</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-[11px]">
                          <span className="text-slate-500">
                            <strong>{total}</strong> tasks assigned
                          </span>
                          <span className="text-emerald-700 font-semibold">
                            {completed} done
                          </span>
                          {inProg > 0 && (
                            <span className="text-blue-700 font-semibold">
                              {inProg} in flight
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Workload Progress Bar */}
                      <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                          style={{ width: `${Math.max(5, completionPct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>

          {/* Blocked Tasks Monitor */}
          <Card className="border-rose-200/80">
            <CardHeader className="flex flex-row items-center justify-between pb-3 bg-rose-50/30">
              <div>
                <CardTitle className="text-rose-950 flex items-center gap-1.5">
                  <AlertOctagon className="w-4 h-4 text-rose-600" />
                  Blocked Tasks & Dependency Bottlenecks
                </CardTitle>
                <CardDescription>Resolve dependencies before scheduled deliverables are delayed</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="text-xs border-rose-200 hover:bg-rose-50"
              >
                Inspect on Kanban <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5 pt-4">
              {blockedTasks.length === 0 ? (
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Zero blocked tasks detected in this department. All systems go!</span>
                </div>
              ) : (
                blockedTasks.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-white border border-rose-200 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{t.title}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Assignee: {t.assignee_name || 'Unassigned'} • Status: <strong className="text-rose-600">BLOCKED</strong>
                      </div>
                    </div>
                    <Badge variant="error" size="sm">
                      Blocked Dependency
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        {/* Upcoming Deadlines Column (1 col) */}
        <div className="space-y-5">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" />
                  Upcoming Deadlines
                </CardTitle>
                <CardDescription>Deliverables timeline</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="text-[11px] p-1.5 h-7"
              >
                All Tasks
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {upcomingDeadlines.length === 0 ? (
                <div className="text-center py-6 text-xs text-slate-400">
                  No upcoming deadlines recorded for this squad.
                </div>
              ) : (
                upcomingDeadlines.map((t) => (
                  <div
                    key={t.id}
                    className="p-3 bg-slate-50/80 border border-slate-200 rounded-xl text-xs space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-900 truncate max-w-[170px]">{t.title}</span>
                      <Badge variant={t.priority === 'HIGH' || t.priority === 'CRITICAL' ? 'error' : 'neutral'} size="sm">
                        {t.priority}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-500 pt-0.5">
                      <span>Assignee: {t.assignee_name || 'Open'}</span>
                      {t.due_datetime && (
                        <span className="text-emerald-700 font-medium">
                          {new Date(t.due_datetime).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          {/* Quick Squad Directive Card */}
          <Card className="bg-slate-900 text-slate-100 border-0">
            <CardContent className="p-5 space-y-2.5 text-xs">
              <div className="font-bold text-emerald-400 flex items-center gap-1.5 text-sm">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                Team Lead Delegation Tip
              </div>
              <p className="text-slate-300 leading-relaxed">
                Use the AI Copilot to automatically map unassigned AV, catering, and coding tasks to volunteers with matching availability and skills.
              </p>
              <Button
                variant="primary"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="w-full text-xs font-semibold mt-2"
              >
                Manage Squad Kanban
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
