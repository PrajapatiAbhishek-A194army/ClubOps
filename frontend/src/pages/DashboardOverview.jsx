import React, { useState, useEffect, useCallback } from 'react';
import {
  Sparkles,
  RefreshCw,
  Crown,
  ClipboardList,
  Wrench,
  HeartHandshake,
  AlertCircle,
  FileText,
  Calendar
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { getDashboardMetrics } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import PresidentDashboard from '../components/dashboards/PresidentDashboard';
import ClubHeadDashboard from '../components/dashboards/ClubHeadDashboard';
import TeamLeadDashboard from '../components/dashboards/TeamLeadDashboard';
import VolunteerDashboard from '../components/dashboards/VolunteerDashboard';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { activeClub, activeRole, user } = useAuth();

  const isPlatformPresident = user?.is_superuser || user?.email === 'president@clubops.ai';

  // Roles available for perspective switching
  const PERSPECTIVES = [
    ...(isPlatformPresident ? [{ id: 'PRESIDENT', label: 'President', icon: Crown, desc: 'Executive oversight & approvals' }] : []),
    { id: 'CLUB_HEAD', label: 'Club Head', icon: ClipboardList, desc: 'Operations, tasks & meetings' },
    { id: 'TEAM_LEAD', label: 'Team Lead', icon: Wrench, desc: 'Workload, blocked tasks & deadlines' },
    { id: 'VOLUNTEER', label: 'Volunteer', icon: HeartHandshake, desc: 'Assignments & instant check-in' },
  ];

  const resolveRolePerspective = (role) => {
    const roleUpper = (role || (isPlatformPresident ? 'PRESIDENT' : 'CLUB_HEAD')).toUpperCase();
    if (!isPlatformPresident && roleUpper === 'PRESIDENT') return 'CLUB_HEAD';
    if (roleUpper === 'ORGANIZER' || roleUpper === 'CLUB_HEAD') return 'CLUB_HEAD';
    if (['PRESIDENT', 'TEAM_LEAD', 'VOLUNTEER'].includes(roleUpper)) return roleUpper;
    return isPlatformPresident ? 'PRESIDENT' : 'CLUB_HEAD';
  };

  // Default perspective based on active club membership role or fallback
  const [selectedPerspective, setSelectedPerspective] = useState(() => {
    return resolveRolePerspective(activeRole);
  });

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Sync default perspective if activeRole changes
  useEffect(() => {
    if (activeRole) {
      setSelectedPerspective(resolveRolePerspective(activeRole));
    }
  }, [activeRole]);

  const loadMetrics = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardMetrics(activeClub.id, selectedPerspective);
      if (res.success && res.data) {
        setDashboardData(res.data);
      } else {
        setError(res.error || 'Failed to fetch telemetry metrics.');
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError(err.message || 'Failed to connect to operations backend.');
    } finally {
      setLoading(false);
    }
  }, [activeClub?.id, selectedPerspective]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome & Perspective Switcher Bar */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
              <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
              Real-time Operations Telemetry
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1.5">
              {activeClub?.name || 'Club Operations'} Command Center
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Role-tailored live operations, task workflows, and automated risk prevention.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Button
              variant="outline"
              size="sm"
              leftIcon={RefreshCw}
              onClick={loadMetrics}
              disabled={loading}
              className={loading ? 'opacity-60 cursor-not-allowed' : ''}
            >
              {loading ? 'Syncing...' : 'Refresh'}
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={FileText}
              onClick={() => navigate('/app/meetings')}
            >
              Meeting Notes
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={Calendar}
              onClick={() => navigate('/app/events')}
            >
              All Events
            </Button>
          </div>
        </div>

        {/* Perspective Switcher Tabs */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none">
            <span className="text-xs font-semibold text-slate-400 mr-2 shrink-0 hidden md:inline">
              Perspective:
            </span>
            {PERSPECTIVES.map((p) => {
              const Icon = p.icon;
              const isActive = selectedPerspective === p.id;
              const isUserRole = activeRole?.toUpperCase() === p.id;

              return (
                <button
                  key={p.id}
                  onClick={() => setSelectedPerspective(p.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap border ${
                    isActive
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-slate-50 text-slate-600 border-slate-200/80 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                  title={p.desc}
                >
                  <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                  <span>{p.label}</span>
                  {isUserRole && (
                    <span
                      className={`text-[10px] px-1.5 py-0.2 rounded-full font-medium ${
                        isActive
                          ? 'bg-emerald-700/80 text-emerald-100'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      You
                    </span>
                  )}
                </button>
              );
            })}
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            Active view:{' '}
            <span className="text-emerald-700 font-bold">
              {PERSPECTIVES.find((p) => p.id === selectedPerspective)?.label}
            </span>{' '}
            • {PERSPECTIVES.find((p) => p.id === selectedPerspective)?.desc}
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-center justify-between text-xs text-red-800">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={loadMetrics}>
            Retry
          </Button>
        </div>
      )}

      {/* Loading Skeleton */}
      {loading && !dashboardData && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-24 bg-slate-100 rounded-2xl border border-slate-200/80" />
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 h-72 bg-slate-100 rounded-2xl border border-slate-200/80" />
            <div className="h-72 bg-slate-100 rounded-2xl border border-slate-200/80" />
          </div>
        </div>
      )}

      {/* Render Current Perspective Component */}
      {dashboardData && (
        <div>
          {selectedPerspective === 'PRESIDENT' && (
            <PresidentDashboard
              data={dashboardData.data || dashboardData.president_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}

          {(selectedPerspective === 'CLUB_HEAD' || selectedPerspective === 'ORGANIZER') && (
            <ClubHeadDashboard
              data={dashboardData.data || dashboardData.club_head_data || dashboardData.organizer_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}

          {selectedPerspective === 'TEAM_LEAD' && (
            <TeamLeadDashboard
              data={dashboardData.data || dashboardData.team_lead_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}

          {selectedPerspective === 'VOLUNTEER' && (
            <VolunteerDashboard
              data={dashboardData.data || dashboardData.volunteer_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}
        </div>
      )}
    </div>
  );
}

