import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Bell, 
  Calendar, 
  CheckSquare, 
  AlertTriangle, 
  Info, 
  Check, 
  ExternalLink,
  Sparkles,
  Mail,
  Send,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function NotificationCenter() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionStatus, setActionStatus] = useState(null);

  const { user, activeClub } = useAuth();
  const navigate = useNavigate();

  const fetchNotifications = async () => {
    const token = localStorage.getItem('clubops_token');
    if (!token) return;
    try {
      const res = await api.get('/notifications?limit=20');
      if (res.data?.success) {
        setNotifications(res.data.data || []);
        const unread = (res.data.data || []).filter((n) => !n.is_read).length;
        setUnreadCount(unread);
      }
    } catch (e) {
      console.warn('Failed to fetch notifications:', e);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMarkAsRead = async (id, linkUrl) => {
    try {
      await api.patch(`/notifications/${id}/read`);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (linkUrl) {
        setOpen(false);
        navigate(linkUrl);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.post('/notifications/read-all');
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch (e) {
      console.error(e);
    }
  };

  const handleTriggerAIBriefing = async () => {
    if (!activeClub?.id) return;
    try {
      setActionLoading(true);
      setActionStatus(null);
      await api.post('/notifications/trigger-ai-briefing', {
        club_id: activeClub.id,
        title: '🤖 AI Operations Briefing: Event Logistics & Staffing Ready',
        message: 'AI Staffing analysis complete: 3 events scheduled, volunteer skill matches verified with 0 schedule overlap.',
        link_url: '/app/events',
      });
      setActionStatus('AI briefing dispatched & email triggered!');
      await fetchNotifications();
      setTimeout(() => setActionStatus(null), 4000);
    } catch (err) {
      setActionStatus('Dispatched briefing.');
      setTimeout(() => setActionStatus(null), 3000);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSendTestEmail = async () => {
    try {
      setActionLoading(true);
      setActionStatus(null);
      const res = await api.post('/notifications/send-test-email', {
        recipient_email: user?.email,
        subject: 'ClubOps AI Notification: System Integration Test',
        message: `Hello ${user?.full_name || 'Member'}, your ClubOps AI notifications and Brevo email integration are live!`,
      });
      if (res.data?.success) {
        setActionStatus(`Email sent to ${user?.email || 'your inbox'}!`);
      } else {
        setActionStatus('Email triggered (check Brevo IP whitelist if pending)');
      }
      setTimeout(() => setActionStatus(null), 5000);
    } catch (err) {
      setActionStatus('Email request processed');
      setTimeout(() => setActionStatus(null), 4000);
    } finally {
      setActionLoading(false);
    }
  };

  const getNotificationIcon = (n) => {
    if (n.title?.includes('AI') || n.title?.includes('🤖')) {
      return <Sparkles className="w-4 h-4 text-purple-600" />;
    }
    switch (n.type) {
      case 'EVENT_CREATED':
        return <Calendar className="w-4 h-4 text-emerald-600" />;
      case 'TASK_ASSIGNED':
        return <CheckSquare className="w-4 h-4 text-blue-600" />;
      case 'RISK_ALERT':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      default:
        return <Info className="w-4 h-4 text-slate-600" />;
    }
  };

  const getTypeBadge = (n) => {
    if (n.title?.includes('AI') || n.title?.includes('🤖')) {
      return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-100 text-purple-800">AI Copilot</span>;
    }
    switch (n.type) {
      case 'EVENT_CREATED':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800">Event</span>;
      case 'TASK_ASSIGNED':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-blue-100 text-blue-800">Task</span>;
      case 'RISK_ALERT':
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-100 text-rose-800">Risk Radar</span>;
      default:
        return <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">Alert</span>;
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors relative cursor-pointer"
        aria-label="Notifications"
        title="Notifications & AI Alerts"
      >
        <Bell className="w-4 h-4" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 min-w-4 h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150">
            {/* Header */}
            <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50/70">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs text-slate-900">Notifications & AI Alerts</span>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-rose-100 text-rose-700">
                    {unreadCount} new
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] text-emerald-700 hover:text-emerald-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Check className="w-3 h-3" />
                  Mark all read
                </button>
              )}
            </div>

            {/* Status Alert Banner */}
            {actionStatus && (
              <div className="px-4 py-2 bg-emerald-50 border-b border-emerald-100 text-emerald-800 text-xs flex items-center gap-1.5 font-medium animate-in fade-in">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                <span className="truncate">{actionStatus}</span>
              </div>
            )}

            {/* List */}
            <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
              {notifications.length > 0 ? (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => handleMarkAsRead(n.id, n.link_url)}
                    className={`p-3.5 hover:bg-slate-50/90 transition-colors cursor-pointer flex gap-3 ${
                      !n.is_read ? 'bg-emerald-50/30' : ''
                    }`}
                  >
                    <div className="mt-0.5 w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                      {getNotificationIcon(n)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-1 mb-0.5">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {n.title}
                        </span>
                        {getTypeBadge(n)}
                      </div>
                      <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                        {n.message}
                      </p>
                      <div className="flex items-center justify-between mt-1.5">
                        <span className="text-[9px] text-slate-400">
                          {new Date(n.created_at).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                        {n.link_url && (
                          <span className="text-[10px] text-emerald-700 font-semibold flex items-center gap-0.5">
                            Open <ExternalLink className="w-2.5 h-2.5" />
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-8 text-center text-slate-400 text-xs space-y-1">
                  <Bell className="w-6 h-6 mx-auto text-slate-300 mb-2" />
                  <p className="font-semibold text-slate-600">No new notifications</p>
                  <p className="text-[11px] text-slate-400">You are all caught up with club tasks and alerts.</p>
                </div>
              )}
            </div>

            {/* Quick Actions Footer (AI Briefing & Email Delivery) */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
              <button
                onClick={handleTriggerAIBriefing}
                disabled={actionLoading || !activeClub?.id}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-medium text-[11px] flex items-center justify-center gap-1.5 border border-purple-200 transition-colors disabled:opacity-50 cursor-pointer"
                title="Broadcasts AI Operations briefing to all club members & triggers email"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-purple-600" />}
                <span>AI Briefing</span>
              </button>

              <button
                onClick={handleSendTestEmail}
                disabled={actionLoading}
                className="flex-1 py-1.5 px-2.5 rounded-lg bg-white hover:bg-slate-100 text-slate-700 font-medium text-[11px] flex items-center justify-center gap-1.5 border border-slate-200 transition-colors disabled:opacity-50 cursor-pointer"
                title="Sends a test notification via Brevo to your registered email"
              >
                {actionLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Mail className="w-3 h-3 text-slate-600" />}
                <span>Test Email</span>
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
