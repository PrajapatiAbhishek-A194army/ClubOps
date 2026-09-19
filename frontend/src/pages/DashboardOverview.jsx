import React, { useState } from 'react';
import {
  Calendar,
  CheckSquare,
  Users,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Clock,
  ShieldAlert,
  ChevronRight,
  CheckCircle2,
  FileText,
  Bell,
  Play
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getClubEvents } from '../services/api';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { activeClub } = useAuth();
  const [realEvents, setRealEvents] = useState([]);
  const [loadingEvents, setLoadingEvents] = useState(false);
  const [activeTab, setActiveTab] = useState('ALL');

  React.useEffect(() => {
    if (!activeClub?.id) return;
    const loadEvents = async () => {
      try {
        setLoadingEvents(true);
        const res = await getClubEvents(activeClub.id);
        if (res.success && res.data) {
          setRealEvents(res.data);
        }
      } catch (err) {
        console.error('Failed to load dashboard events:', err);
      } finally {
        setLoadingEvents(false);
      }
    };
    loadEvents();
  }, [activeClub?.id]);

  const stats = [
    {
      title: 'Active Events',
      value: realEvents.length > 0 ? String(realEvents.length) : '3',
      change: 'Synced with campus database',
      icon: Calendar,
      variant: 'emerald',
    },
    {
      title: 'Tasks in Flight',
      value: '24',
      change: '18 completed this week',
      icon: CheckSquare,
      variant: 'info',
    },
    {
      title: 'Volunteer Roster',
      value: '42',
      change: '88% match rate',
      icon: Users,
      variant: 'purple',
    },
    {
      title: 'Active Risk Flags',
      value: '2',
      change: 'Requires attention',
      icon: AlertTriangle,
      variant: 'warning',
    },
  ];

  const activeEvents = [
    {
      id: 'evt_1',
      title: 'HackOut 2026: 36hr Hackathon',
      date: 'April 12 - 14, 2026',
      lead: 'Rahul Sharma (Technical Lead)',
      progress: 68,
      tasksRemaining: 7,
      status: 'ON_TRACK',
      volunteers: 18,
    },
    {
      id: 'evt_2',
      title: 'Annual Tech Symposium & Robotics Expo',
      date: 'May 04, 2026',
      lead: 'Priya Patel (Event Organizer)',
      progress: 42,
      tasksRemaining: 14,
      status: 'AT_RISK',
      volunteers: 12,
    },
    {
      id: 'evt_3',
      title: 'Web3 & AI Developer Bootcamp',
      date: 'May 20, 2026',
      lead: 'Alex President (Club President)',
      progress: 25,
      tasksRemaining: 19,
      status: 'PLANNING',
      volunteers: 8,
    },
  ];

  const detectedRisks = [
    {
      id: 'rsk_1',
      severity: 'CRITICAL',
      title: 'Banner Printing Blocked',
      reason: 'Dependency "Sponsor Payment Confirmation" is pending approval from Finance Lead.',
      affectedEvent: 'HackOut 2026',
      mitigation: 'Automated notification dispatched to finance@college.edu to release purchase order.',
    },
    {
      id: 'rsk_2',
      severity: 'HIGH',
      title: 'Registration Desk Understaffed',
      reason: '3 volunteer slots open for Day 1 morning shift (08:00 AM - 12:00 PM).',
      affectedEvent: 'HackOut 2026',
      mitigation: 'AI recommended 4 available volunteers matching "Registration & Coordination" skills.',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Welcome & Quick Action Banner */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
            AI Operations Active
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            Club Operations Command Center
          </h1>
          <p className="text-xs sm:text-sm text-slate-600">
            Real-time telemetry across all student organization events, AI action workflows, and automated risk prevention.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <Button
            variant="outline"
            leftIcon={FileText}
            onClick={() => navigate('/app/meetings')}
          >
            Process Notes
          </Button>
          <Button
            variant="primary"
            leftIcon={Sparkles}
            onClick={() => navigate('/app/events')}
          >
            AI Event Planner
          </Button>
        </div>
      </div>

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s, idx) => {
          const Icon = s.icon;
          return (
            <Card key={idx} hover className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">{s.title}</span>
                <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                  <Icon className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3">
                <div className="text-2xl font-black text-slate-900 tracking-tight">{s.value}</div>
                <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1 font-medium">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  {s.change}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* Operations Dual Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Events Progress */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-emerald-600" />
              Active Events Radar
            </h2>
            <button
              onClick={() => navigate('/app/events')}
              className="text-xs font-semibold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 cursor-pointer"
            >
              View All Events
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="space-y-3">
            {(realEvents.length > 0 ? realEvents : activeEvents).map((event) => {
              const isReal = !!event.created_at || !!event.club_id;
              const formattedDate = isReal
                ? new Date(event.start_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                : event.date;
              const leadText = isReal ? event.location : event.lead;
              const progressPct = isReal ? event.progress_percent : event.progress;
              const remainingText = isReal
                ? `${event.timeline?.filter((m) => !m.completed).length || 0} milestones pending`
                : `${event.tasksRemaining} tasks remaining`;

              return (
                <Card
                  key={event.id}
                  hover
                  onClick={() => isReal && navigate(`/app/events/${event.id}`)}
                  className={`p-5 transition-all ${isReal ? 'cursor-pointer hover:border-emerald-300' : ''}`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{event.title}</h3>
                        <Badge
                          variant={
                            event.status === 'ON_TRACK'
                              ? 'success'
                              : event.status === 'AT_RISK'
                              ? 'warning'
                              : 'neutral'
                          }
                          size="sm"
                          dot
                        >
                          {event.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {formattedDate} • {leadText}
                      </p>
                    </div>
                    <div className="text-right sm:text-right">
                      <span className="text-xs font-bold text-slate-900">{progressPct}%</span>
                      <span className="text-[11px] text-slate-400 block">{remainingText}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-3 w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        event.status === 'AT_RISK' ? 'bg-amber-500' : 'bg-emerald-600'
                      }`}
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Proactive Risk Detection Radar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600" />
              Proactive Risk Radar
            </h2>
            <Badge variant="warning" size="sm" pulse dot>
              Live Monitor
            </Badge>
          </div>

          <div className="space-y-3">
            {detectedRisks.map((risk) => (
              <div
                key={risk.id}
                className="bg-white rounded-2xl p-4 border border-amber-200/80 shadow-2xs space-y-2 hover:border-amber-300 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900">{risk.title}</span>
                  <Badge
                    variant={risk.severity === 'CRITICAL' ? 'error' : 'warning'}
                    size="sm"
                  >
                    {risk.severity}
                  </Badge>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">{risk.reason}</p>
                <div className="pt-2 border-t border-slate-100 text-[11px] text-emerald-800 bg-emerald-50/70 p-2 rounded-lg">
                  <strong>AI Mitigation:</strong> {risk.mitigation}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
