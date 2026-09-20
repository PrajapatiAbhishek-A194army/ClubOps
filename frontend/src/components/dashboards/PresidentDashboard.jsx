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
import StatCard from '../ui/StatCard';
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
      {/* KPI Cards Row using StatCard */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Events"
          value={activeEvents.length}
          subtitle="Campus schedule in flight"
          icon={Calendar}
          badge="Live"
          badgeVariant="emerald"
        />

        <StatCard
          title="Task Completion"
          value={`${completionRate}%`}
          subtitle={`${completedTasks} of ${totalTasks} finished`}
          icon={CheckSquare}
          trend={`${completionRate}%`}
          trendDirection={completionRate >= 50 ? 'up' : 'down'}
        />

        <StatCard
          title="Club Roster"
          value={volunteersCount}
          subtitle="Active registered volunteers"
          icon={Users}
          badge={pendingJoins > 0 ? `${pendingJoins} Pending` : 'Verified'}
          badgeVariant={pendingJoins > 0 ? 'warning' : 'emerald'}
        />

        <StatCard
          title="Risk Radar"
          value={`${totalRisks} Flags`}
          subtitle={`${criticalRisks} critical severity`}
          icon={ShieldAlert}
          badge={criticalRisks > 0 ? 'Intervention' : 'Monitored'}
          badgeVariant={criticalRisks > 0 ? 'error' : 'emerald'}
        />
      </div>

      {/* Main Grid: Active Events & Pending Approvals */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Active Events & Health (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600" />
                  Campus Event Operations
                </CardTitle>
                <CardDescription>Major programs and current milestone progression</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/events')}
                rightIcon={ArrowRight}
              >
                All Events
              </Button>
            </CardHeader>
            <CardContent>
              {activeEvents.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium">No active events currently scheduled.</p>
                  <p className="text-[11px]">Initialize an event to activate automated milestone decomposition.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {activeEvents.map((ev) => (
                    <div
                      key={ev.id}
                      onClick={() => navigate(`/app/events/${ev.id}`)}
                      className="py-3.5 flex items-center justify-between gap-4 hover:bg-slate-50/80 p-2.5 rounded-xl cursor-pointer transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-900 truncate">{ev.title}</span>
                          <Badge
                            variant={
                              ev.status === 'PLANNING'
                                ? 'info'
                                : ev.status === 'ONGOING'
                                ? 'success'
                                : 'neutral'
                            }
                            size="sm"
                          >
                            {ev.status}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-400">
                          <span>Date: {ev.start_date ? new Date(ev.start_date).toLocaleDateString() : 'TBD'}</span>
                          <span>•</span>
                          <span>Venue: {ev.location || 'Campus Center'}</span>
                        </div>
                      </div>
                      <ChevronRight className="w-4 h-4 text-slate-400 shrink-0" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Critical Path Risks */}
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-rose-600" />
                  Active Risk & Dependency Radar
                </CardTitle>
                <CardDescription>Automated detection of overdue deliverables and bottlenecks</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/risks')}
                rightIcon={ArrowRight}
              >
                Risk Radar
              </Button>
            </CardHeader>
            <CardContent>
              {recentRisks.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-xs">
                  All critical paths are on track. No open risks detected.
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {recentRisks.slice(0, 4).map((r) => (
                    <div key={r.id} className="py-2.5 flex items-center justify-between gap-3">
                      <div className="space-y-0.5 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 truncate">{r.title}</p>
                        <p className="text-[11px] text-slate-400 truncate">{r.description}</p>
                      </div>
                      <Badge
                        variant={
                          r.severity === 'CRITICAL'
                            ? 'error'
                            : r.severity === 'HIGH'
                            ? 'warning'
                            : 'info'
                        }
                        size="sm"
                      >
                        {r.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Strategic Actions & Approvals (1 col) */}
        <div className="space-y-6">
          {/* Executive Approvals Queue */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600" />
                Presidential Approval Queue
              </CardTitle>
              <CardDescription>Items awaiting executive authorization</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">Volunteer Applications</div>
                  <div className="text-[10px] text-slate-400">{pendingJoins} requests awaiting signoff</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/app/volunteers')}
                >
                  Review
                </Button>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs">
                <div>
                  <div className="font-bold text-slate-900">Broadcast Dispatches</div>
                  <div className="text-[10px] text-slate-400">{pendingAnnouncements} announcements queued</div>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate('/app/announcements')}
                >
                  Review
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Quick Navigation Links */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm">Strategic Governance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => navigate('/app/analytics')}
                rightIcon={ArrowRight}
              >
                Operations Analytics
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => navigate('/app/audit')}
                rightIcon={ArrowRight}
              >
                Immutable Audit Trail
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="w-full justify-between"
                onClick={() => navigate('/app/settings')}
                rightIcon={ArrowRight}
              >
                Club Governance Settings
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
