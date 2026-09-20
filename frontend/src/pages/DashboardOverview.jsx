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
import VolunteerDashboard from '../components/dashboards/VolunteerDashboard';

export default function DashboardOverview() {
  const navigate = useNavigate();
  const { activeClub, activeRole, user } = useAuth();

  const isPlatformPresident = user?.is_superuser || user?.email === 'president@clubops.ai' || activeRole?.toUpperCase() === 'PRESIDENT';

  const resolveUserRole = (role) => {
    const roleUpper = (role || '').toUpperCase();
    if (isPlatformPresident || roleUpper === 'PRESIDENT') return 'PRESIDENT';
    if (roleUpper === 'ORGANIZER' || roleUpper === 'CLUB_HEAD') return 'CLUB_HEAD';
    return 'VOLUNTEER';
  };

  const userRole = resolveUserRole(activeRole);

  const roleMeta = {
    PRESIDENT: {
      label: 'President Executive Dashboard',
      icon: Crown,
      desc: 'Multi-club strategic governance, high-level approvals, and active risk radar.',
      badgeVariant: 'emerald',
    },
    CLUB_HEAD: {
      label: 'Club Head Operations Dashboard',
      icon: ClipboardList,
      desc: 'Active event pipelines, Kanban tasks, meeting intelligence, and squad assignments.',
      badgeVariant: 'info',
    },
    VOLUNTEER: {
      label: 'Volunteer Squad Dashboard',
      icon: HeartHandshake,
      desc: 'Assigned deliverables, squad velocity, upcoming shifts, and live check-in.',
      badgeVariant: 'warning',
    },
  }[userRole] || {
    label: 'Operations Dashboard',
    icon: Sparkles,
    desc: 'Campus event operations telemetry.',
    badgeVariant: 'default',
  };

  const RoleIcon = roleMeta.icon;

  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadMetrics = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getDashboardMetrics(activeClub.id, userRole);
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
  }, [activeClub?.id, userRole]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Welcome Bar */}
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

        {/* User Role Indicator Banner */}
        <div className="pt-3 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500">Your Dashboard:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold bg-emerald-50 text-emerald-900 border border-emerald-200/80">
              <RoleIcon className="w-3.5 h-3.5 text-emerald-700" />
              {roleMeta.label}
            </span>
          </div>

          <div className="text-[11px] text-slate-500 font-medium">
            {roleMeta.desc}
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

      {/* Render Exclusively Current User's Role Dashboard */}
      {dashboardData && (
        <div>
          {userRole === 'PRESIDENT' && (
            <PresidentDashboard
              data={dashboardData.data || dashboardData.president_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}

          {userRole === 'CLUB_HEAD' && (
            <ClubHeadDashboard
              data={dashboardData.data || dashboardData.club_head_data || dashboardData.organizer_data || dashboardData}
              clubId={activeClub?.id}
              onRefresh={loadMetrics}
            />
          )}

          {userRole === 'VOLUNTEER' && (
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

