import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3,
  TrendingUp,
  Award,
  AlertTriangle,
  Calendar,
  CheckSquare,
  Users,
  Sparkles,
  Download,
  RefreshCw,
  Zap,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
  ChevronRight,
  Flame,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import {
  getAnalyticsOverview,
  getAIExecutiveInsights,
  downloadAnalyticsReport,
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';

const STATUS_COLORS = {
  TODO: '#94a3b8',
  IN_PROGRESS: '#3b82f6',
  BLOCKED: '#f43f5e',
  DONE: '#10b981',
};

const PRIORITY_COLORS = {
  URGENT: '#ef4444',
  HIGH: '#f97316',
  MEDIUM: '#eab308',
  LOW: '#64748b',
};

const PIE_COLORS = ['#10b981', '#3b82f6', '#f43f5e', '#94a3b8'];

export default function AnalyticsPage() {
  const { activeClub } = useAuth();

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [aiRefreshing, setAiRefreshing] = useState(false);
  const [exporting, setExporting] = useState(false);

  const loadAnalytics = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getAnalyticsOverview(activeClub.id);
      if (res.success && res.data) {
        setData(res.data);
      } else {
        setError(res.error || 'Failed to load operations analytics.');
      }
    } catch (err) {
      console.error('Error fetching analytics:', err);
      setError(err.message || 'Error connecting to analytics engine.');
    } finally {
      setLoading(false);
    }
  }, [activeClub?.id]);

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  const handleRefreshAI = async () => {
    if (!activeClub?.id) return;
    try {
      setAiRefreshing(true);
      const res = await getAIExecutiveInsights(activeClub.id);
      if (res.success && res.data) {
        setData((prev) => ({
          ...prev,
          ai_insights: res.data,
        }));
      }
    } catch (err) {
      console.error('Error refreshing AI insights:', err);
    } finally {
      setAiRefreshing(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeClub?.id) return;
    try {
      setExporting(true);
      const blob = await downloadAnalyticsReport(activeClub.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clubops_${activeClub.code || 'operations'}_report.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to download report:', err);
    } finally {
      setExporting(false);
    }
  };

  const health = data?.health_score || {
    overall_score: 85,
    status_tier: 'HEALTHY',
    status_label: 'Healthy Trajectory',
    summary_message: 'Operations running on track.',
    components: [],
  };

  const eventCadence = data?.event_cadence || [];
  const taskDistribution = data?.task_distribution || [];
  const priorityDistribution = data?.priority_distribution || [];
  const volunteerLeaderboard = data?.volunteer_leaderboard || [];
  const riskBreakdown = data?.risk_breakdown || [];
  const aiInsights = data?.ai_insights;

  const pieData = taskDistribution.map((t) => ({
    name: t.status.replace('_', ' '),
    value: t.count,
    rawStatus: t.status,
  }));

  const getTierBadge = (tier) => {
    if (tier === 'EXCELLENT') return <Badge variant="success" dot pulse>Excellent</Badge>;
    if (tier === 'HEALTHY') return <Badge variant="success" dot>Healthy</Badge>;
    if (tier === 'NEEDS_ATTENTION') return <Badge variant="warning" dot>Needs Attention</Badge>;
    return <Badge variant="error" dot pulse>Critical</Badge>;
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Banner with Actions */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            Operations Intelligence & Recharts Telemetry
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Operations Analytics & Insights
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Real-time delivery velocity, institutional health index, volunteer contributions, and executive reporting.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={handleRefreshAI}
            disabled={aiRefreshing || loading}
          >
            {aiRefreshing ? 'Analyzing with AI...' : 'Refresh AI Insights'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={Download}
            onClick={handleExportCSV}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting...' : 'Export Advisor CSV'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadAnalytics}>
            Retry
          </Button>
        </div>
      )}

      {/* Row 1: Operational Health Score & Key Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Health Score Card (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Club Health Index
              </span>
              {getTierBadge(health.status_tier)}
            </div>

            <div className="flex items-center gap-5 mt-4">
              <div className="relative w-24 h-24 rounded-full bg-emerald-50 border-4 border-emerald-500 flex flex-col items-center justify-center shrink-0 shadow-sm">
                <span className="text-3xl font-black text-slate-900 leading-none">
                  {health.overall_score}
                </span>
                <span className="text-[10px] font-bold text-emerald-700 uppercase tracking-wider mt-0.5">
                  / 100
                </span>
              </div>

              <div>
                <h3 className="text-base font-bold text-slate-900">{health.status_label}</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  {health.summary_message}
                </p>
              </div>
            </div>
          </div>

          <div className="mt-5 pt-4 border-t border-slate-100 space-y-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Component Weights
            </span>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {health.components.map((c, idx) => (
                <div key={idx} className="p-2 bg-slate-50 rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between font-bold text-slate-700 text-[11px]">
                    <span className="truncate">{c.name}</span>
                    <span className="text-emerald-700 font-extrabold">{c.score} pts</span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{c.impact_note}</div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 4 KPI Cards (7 cols) */}
        <div className="lg:col-span-7 grid grid-cols-2 sm:grid-cols-2 gap-4">
          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Events Total</span>
              <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900">{data?.total_events || 0}</div>
              <p className="text-xs text-slate-500 mt-0.5">Scheduled programs</p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Tasks in Flight</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900">{data?.total_tasks || 0}</div>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">Active execution track</p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Volunteers</span>
              <div className="w-9 h-9 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900">{data?.total_volunteers || 0}</div>
              <p className="text-xs text-slate-500 mt-0.5">Approved club roster</p>
            </div>
          </Card>

          <Card className="p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Risks</span>
              <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="mt-3">
              <div className="text-3xl font-black text-slate-900">{data?.active_risks_count || 0}</div>
              <p className="text-xs text-amber-700 font-medium mt-0.5">Flags on active radar</p>
            </div>
          </Card>
        </div>
      </div>

      {/* Row 2: Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Monthly Event Cadence (8 cols) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Calendar className="w-4 h-4 text-emerald-600" />
                Event Delivery Cadence & Status Flow
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Monthly distribution of completed, on-track, and at-risk events.
              </p>
            </div>
          </div>

          <div className="h-64 w-full">
            {eventCadence.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={eventCadence} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                  <Bar dataKey="completed" name="Completed" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="on_track" name="On Track" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="at_risk" name="At Risk" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No event cadence data available yet.
              </div>
            )}
          </div>
        </div>

        {/* Task Throughput Distribution Donut (4 cols) */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <CheckSquare className="w-4 h-4 text-emerald-600" />
              Task Velocity Status
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">Execution throughput across all events.</p>
          </div>

          <div className="h-52 w-full my-2">
            {pieData.length > 0 && pieData.some((p) => p.value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={STATUS_COLORS[entry.rawStatus] || PIE_COLORS[index % PIE_COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#ffffff',
                      borderRadius: '12px',
                      border: '1px solid #e2e8f0',
                      fontSize: '12px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-xs text-slate-400">
                No active tasks to display.
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2 text-[11px] pt-3 border-t border-slate-100">
            {taskDistribution.map((td) => (
              <div key={td.status} className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: STATUS_COLORS[td.status] || '#94a3b8' }}
                  />
                  <span className="text-slate-600">{td.status.replace('_', ' ')}</span>
                </div>
                <span className="font-bold text-slate-900">{td.count}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 3: AI Executive Operational Advisor & Volunteer Leaderboard */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* AI Executive Insights Card (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">AI Operational Advisor</h2>
                <p className="text-[11px] text-slate-400">Groq LLM Intelligence Engine</p>
              </div>
            </div>
            <Badge variant="success" size="sm" pulse dot>
              Live Insights
            </Badge>
          </div>

          {aiInsights ? (
            <div className="space-y-3.5 text-xs">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200/70 rounded-xl text-emerald-950 font-medium leading-relaxed">
                {aiInsights.health_assessment}
              </div>

              {/* Strengths */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                  Key Strengths
                </span>
                <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                  {aiInsights.operational_strengths.map((str, idx) => (
                    <li key={idx}>{str}</li>
                  ))}
                </ul>
              </div>

              {/* Critical Bottlenecks */}
              <div>
                <span className="font-bold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Bottlenecks & Critical Dependencies
                </span>
                <ul className="space-y-1 text-slate-600 pl-4 list-disc">
                  {aiInsights.critical_bottlenecks.map((bot, idx) => (
                    <li key={idx}>{bot}</li>
                  ))}
                </ul>
              </div>

              {/* Recommendations */}
              <div className="pt-2 border-t border-slate-100">
                <span className="font-bold text-slate-900 block mb-1.5 flex items-center gap-1.5">
                  <Zap className="w-3.5 h-3.5 text-blue-600" />
                  Actionable Recommendations
                </span>
                <div className="space-y-1.5">
                  {aiInsights.actionable_recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 border border-slate-200/60 text-slate-800 flex items-start gap-2"
                    >
                      <ChevronRight className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                      <span>{rec}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 py-6 text-center">
              Click "Refresh AI Insights" to generate an executive briefing.
            </p>
          )}
        </div>

        {/* Volunteer Leaderboard (6 cols) */}
        <div className="lg:col-span-6 bg-white rounded-2xl border border-slate-200/90 shadow-2xs p-5 sm:p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
                  <Award className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">Volunteer Leaderboard</h2>
                  <p className="text-[11px] text-slate-400">Ranked by completed tasks & event attendance</p>
                </div>
              </div>
              <Badge variant="neutral" size="sm">
                Top Contributors
              </Badge>
            </div>

            <div className="space-y-2.5 overflow-y-auto max-h-[360px] scrollbar-thin">
              {volunteerLeaderboard.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">
                  No active volunteer points logged yet.
                </p>
              ) : (
                volunteerLeaderboard.map((v, idx) => {
                  const isTop3 = idx < 3;
                  return (
                    <div
                      key={v.user_id}
                      className={`p-3 rounded-xl border flex items-center justify-between gap-3 transition-colors ${
                        idx === 0
                          ? 'bg-amber-50/60 border-amber-200/80'
                          : idx === 1
                          ? 'bg-slate-50/80 border-slate-200/80'
                          : idx === 2
                          ? 'bg-orange-50/50 border-orange-200/60'
                          : 'bg-white border-slate-100 hover:bg-slate-50'
                      }`}
                    >
                      <div className="flex items-center gap-3 truncate">
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                            idx === 0
                              ? 'bg-amber-500 text-white'
                              : idx === 1
                              ? 'bg-slate-400 text-white'
                              : idx === 2
                              ? 'bg-orange-400 text-white'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {idx + 1}
                        </div>

                        <div className="truncate">
                          <div className="text-xs font-bold text-slate-900 truncate">
                            {v.full_name}
                          </div>
                          <div className="text-[10px] text-slate-400 truncate flex items-center gap-1.5 mt-0.5">
                            <span className="font-semibold text-slate-600">{v.role}</span>
                            <span>•</span>
                            <span>{v.tasks_completed} tasks completed</span>
                          </div>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-bold border border-emerald-200/80">
                          <Flame className="w-3 h-3 text-amber-500" />
                          <span>{v.engagement_points} pts</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
            <span>Points: 20 pts per task completed, 30 pts per check-in</span>
            <button
              onClick={handleExportCSV}
              className="font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer"
            >
              Export Roster
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
