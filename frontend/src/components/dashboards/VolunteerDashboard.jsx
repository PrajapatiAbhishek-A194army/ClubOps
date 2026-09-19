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
            ? '✅ Checked in successfully! Your event shift status is active.'
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
        <Card className="lg:col-span-1 border-emerald-200 shadow-sm overflow-hidden">
          <CardHeader className="bg-emerald-50/50 pb-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-800 flex items-center gap-1.5">
                <QrCode className="w-4 h-4 text-emerald-600" />
                Shift Check-In Station
              </span>
              <Badge variant={isCheckedIn ? 'success' : 'neutral'} size="sm">
                {isCheckedIn ? 'Checked In' : 'Not Checked In'}
              </Badge>
            </div>
            <CardTitle className="text-base mt-2">
              {isCheckedIn ? 'You are On Duty' : 'Ready for Your Shift?'}
            </CardTitle>
            <CardDescription>
              Confirm your presence at the event venue for official participation credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-4">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
              <div className="text-slate-500 font-medium">Assigned Event Venue:</div>
              <div className="font-bold text-slate-900 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                {activeEvent?.location || 'Main Campus Auditorium'}
              </div>
            </div>

            <Button
              variant={isCheckedIn ? 'outline' : 'primary'}
              leftIcon={UserCheck}
              loading={checkInLoading}
              onClick={handleToggleCheckIn}
              className={`w-full text-xs font-bold py-2.5 shadow-xs ${
                isCheckedIn ? 'border-emerald-300 text-emerald-800 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-300' : ''
              }`}
            >
              {isCheckedIn ? 'Check Out from Shift' : 'One-Click Check In Now'}
            </Button>
          </CardContent>
        </Card>

        {/* Assigned Tasks Summary & Duty Timeline (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">My Tasks</p>
                <h3 className="text-2xl font-bold text-slate-900 mt-1">{myTasks.length}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Pending</p>
                <h3 className="text-2xl font-bold text-amber-700 mt-1">{pendingCount}</h3>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4 text-center">
                <p className="text-[11px] font-semibold text-slate-500 uppercase">Completed</p>
                <h3 className="text-2xl font-bold text-emerald-700 mt-1">{completedCount}</h3>
              </CardContent>
            </Card>
          </div>

          {/* Today's Shift Schedule */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-emerald-600" />
                Today's Shift & Operations Schedule
              </CardTitle>
              <CardDescription>Confirmed duty hours and meeting locations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {todayShifts.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No shifts scheduled for today.
                </div>
              ) : (
                todayShifts.map((sh, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-emerald-50/60 border border-emerald-200/80 rounded-xl flex items-center justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="font-bold text-slate-900">{sh.event_title}</div>
                      <div className="text-[11px] text-emerald-900 font-medium">{sh.role}</div>
                      <div className="text-[10px] text-slate-500">{sh.location}</div>
                    </div>
                    <Badge variant="emerald" size="sm">
                      {sh.shift_time}
                    </Badge>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Row 2: Assigned Tasks Checklist & Club Notices */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Tasks Checklist (2 cols) */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="flex items-center gap-1.5">
                  <CheckSquare className="w-4 h-4 text-blue-600" />
                  My Assigned Tasks Checklist
                </CardTitle>
                <CardDescription>Track deliverables and mark tasks complete as you finish them</CardDescription>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/app/tasks')}
                className="text-xs"
              >
                Kanban View <ArrowRight className="w-3.5 h-3.5 ml-1" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-2.5">
              {myTasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-slate-400">
                  You have no tasks assigned at the moment. Enjoy the event or volunteer for open roles!
                </div>
              ) : (
                myTasks.map((t) => {
                  const isDone = t.status === 'DONE' || t.status === 'COMPLETED';
                  return (
                    <div
                      key={t.id}
                      className={`p-3.5 border rounded-xl flex items-center justify-between text-xs transition-all ${
                        isDone
                          ? 'bg-slate-50 border-slate-200 opacity-70'
                          : 'bg-white border-slate-200 hover:border-emerald-300'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className={`font-bold ${isDone ? 'line-through text-slate-500' : 'text-slate-900'}`}>
                            {t.title}
                          </span>
                          {t.event_title && (
                            <span className="text-[10px] text-slate-400">({t.event_title})</span>
                          )}
                        </div>
                        {t.due_datetime && (
                          <div className="text-[11px] text-slate-400 flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Due: {new Date(t.due_datetime).toLocaleDateString()}
                          </div>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <Badge variant={t.priority === 'HIGH' ? 'error' : 'neutral'} size="sm">
                          {t.priority}
                        </Badge>

                        {!isDone && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={CheckCircle2}
                            loading={taskUpdatingId === t.id}
                            onClick={() => handleCompleteTask(t.id)}
                            className="text-[11px] px-2 py-1 h-7"
                          >
                            Mark Done
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </CardContent>
          </Card>
        </div>

        {/* Club Notices Stream (1 col) */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-sm">Club Notices & Announcements</CardTitle>
                <CardDescription>Live updates from organizers</CardDescription>
              </div>
              <Radio className="w-4 h-4 text-emerald-600 animate-pulse" />
            </CardHeader>
            <CardContent className="space-y-2.5">
              {announcements.length === 0 ? (
                <div className="text-center py-4 text-xs text-slate-400">
                  No new announcements.
                </div>
              ) : (
                announcements.map((ann) => (
                  <div key={ann.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                    <div className="font-bold text-slate-900 leading-tight">{ann.title}</div>
                    <div className="text-[10px] text-slate-500 flex items-center gap-1">
                      <span className="text-emerald-700 font-semibold">{ann.category}</span>
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
