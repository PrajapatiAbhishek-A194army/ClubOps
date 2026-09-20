import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare,
  UserCheck,
  Calendar,
  Clock,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  QrCode,
  Radio,
  RefreshCw
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../ui/Card';
import StatCard from '../ui/StatCard';
import Button from '../ui/Button';
import Badge from '../ui/Badge';
import { volunteerCheckIn, updateTaskStatus } from '../../services/api';

export default function VolunteerDashboard({ data, clubId, onRefresh }) {
  const navigate = useNavigate();
  const d = data || {};

  const myTasks = d.my_tasks || [];
  const initialCheckin = d.my_checkin_status || 'NOT_CHECKED_IN';
  const todayShifts = d.today_shifts || [];
  const activeEvent = d.active_event || null;
  const announcements = d.recent_announcements || [];

  const [isCheckedIn, setIsCheckedIn] = useState(initialCheckin === 'CHECKED_IN');
  const [checkInLoading, setCheckInLoading] = useState(false);
  const [checkInMessage, setCheckInMessage] = useState(null);
  const [taskUpdatingId, setTaskUpdatingId] = useState(null);

  const handleToggleCheckIn = async () => {
    if (!clubId) return;
    try {
      setCheckInLoading(true);
      const nextStatus = isCheckedIn ? 'NOT_CHECKED_IN' : 'CHECKED_IN';
      const res = await volunteerCheckIn(clubId, nextStatus, activeEvent?.id);
      if (res.success) {
        setIsCheckedIn(nextStatus === 'CHECKED_IN');
        setCheckInMessage(
          nextStatus === 'CHECKED_IN'
            ? 'Checked in successfully! Your shift status is currently active.'
            : 'Checked out from shift.'
        );
        setTimeout(() => setCheckInMessage(null), 4000);
        if (onRefresh) onRefresh();
      }
    } catch (err) {
      console.error(err);
      setCheckInMessage('Failed to update check-in status.');
    } finally {
      setCheckInLoading(false);
    }
  };

  const handleCompleteTask = async (taskId) => {
    if (!clubId) return;
    try {
      setTaskUpdatingId(taskId);
      await updateTaskStatus(clubId, taskId, 'DONE');
      if (onRefresh) onRefresh();
    } catch (err) {
      console.error(err);
    } finally {
      setTaskUpdatingId(null);
    }
  };

  const completedCount = myTasks.filter((t) => t.status === 'DONE' || t.status === 'COMPLETED').length;
  const pendingCount = myTasks.length - completedCount;

  return (
    <div className="space-y-6">
      {/* Top Banner Message */}
      {checkInMessage && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-900 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{checkInMessage}</span>
        </div>
      )}

      {/* Row 1: Check-in Card & Duty Metrics */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Interactive Event Check-In Station Card */}
        <Card className="lg:col-span-1 border-emerald-200 shadow-2xs overflow-hidden">
          <CardHeader className="bg-emerald-50/50 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Shift Check-In Station
              </span>
              <Badge variant={isCheckedIn ? 'success' : 'neutral'} size="sm" dot>
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </Badge>
            </div>
            <CardTitle className="text-base mt-2">
              {activeEvent?.title || 'Active Campus Program'}
            </CardTitle>
            <CardDescription>
              {activeEvent?.location ? `Venue: ${activeEvent.location}` : 'Campus Center'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4">
            <div className="text-xs text-slate-500 leading-relaxed">
              Verify your presence when reporting for duty. Your check-in is logged on the organizer's active roster.
            </div>

            <Button
              variant={isCheckedIn ? 'outline' : 'primary'}
              size="md"
              className="w-full font-bold"
              onClick={handleToggleCheckIn}
              loading={checkInLoading}
              leftIcon={isCheckedIn ? CheckCircle2 : QrCode}
            >
              {isCheckedIn ? 'Complete Shift & Check Out' : 'Check In to Shift'}
            </Button>
          </CardContent>
        </Card>

        {/* Volunteer Duty Metrics using StatCard */}
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          <StatCard
            title="My Assigned Tasks"
            value={pendingCount}
            subtitle={`${completedCount} deliverables completed`}
            icon={CheckSquare}
            badge={pendingCount === 0 ? 'All Clear' : `${pendingCount} Pending`}
            badgeVariant={pendingCount === 0 ? 'emerald' : 'warning'}
          />

          <StatCard
            title="Today's Shifts"
            value={todayShifts.length}
            subtitle={isCheckedIn ? 'Currently on duty' : 'Awaiting check-in'}
            icon={Calendar}
            badge={isCheckedIn ? 'Active Duty' : 'Ready'}
            badgeVariant={isCheckedIn ? 'emerald' : 'neutral'}
          />
        </div>
      </div>

      {/* Row 2: Assigned Tasks List & Live War Room Shortcut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: My Tasks (2 cols) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base flex items-center gap-2">
                  <CheckSquare className="w-4 h-4 text-emerald-600" />
                  My Task Deliverables
                </CardTitle>
                <CardDescription>Direct responsibilities assigned to your volunteer profile</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                rightIcon={ArrowRight}
              >
                Kanban View
              </Button>
            </CardHeader>
            <CardContent>
              {myTasks.length === 0 ? (
                <div className="p-8 text-center text-slate-400 space-y-1">
                  <p className="text-xs font-medium">No active tasks assigned to you.</p>
                  <p className="text-[11px]">The Club Head will match you to upcoming event tracks.</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100">
                  {myTasks.map((t) => {
                    const isDone = t.status === 'DONE' || t.status === 'COMPLETED';
                    return (
                      <div
                        key={t.id}
                        className="py-3 flex items-center justify-between gap-3 hover:bg-slate-50/70 p-2 rounded-xl transition-colors"
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-bold ${isDone ? 'line-through text-slate-400' : 'text-slate-900'} truncate`}>
                              {t.title}
                            </span>
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
                          <div className="text-[11px] text-slate-400">
                            {t.due_datetime
                              ? `Due: ${new Date(t.due_datetime).toLocaleDateString()}`
                              : 'No set deadline'}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {!isDone && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleCompleteTask(t.id)}
                              loading={taskUpdatingId === t.id}
                              leftIcon={CheckCircle2}
                            >
                              Mark Done
                            </Button>
                          )}
                          <Badge variant={isDone ? 'success' : 'neutral'} size="sm">
                            {t.status}
                          </Badge>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column: Live Hub & Team Roster (1 col) */}
        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <Radio className="w-4 h-4 text-emerald-600" />
                Live Hub War Room
              </CardTitle>
              <CardDescription>Instant coordination with squad leads</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-xs text-slate-500 leading-relaxed">
                Connect directly to the <strong># Volunteer Pool</strong> or dedicated event war room for real-time announcements, questions, and shift handovers.
              </p>

              <Button
                variant="primary"
                size="sm"
                className="w-full"
                onClick={() => navigate('/app/collaboration')}
                rightIcon={ArrowRight}
              >
                Enter Team Live Hub
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
