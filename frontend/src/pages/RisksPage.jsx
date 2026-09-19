import React, { useState, useEffect } from 'react';
import {
  AlertTriangle,
  ShieldAlert,
  ShieldCheck,
  RefreshCw,
  Clock,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Users,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getClubEvents, getEventRisks, scanEventRisks, resolveRisk } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardContent } from '../components/ui/Card';

export default function RisksPage() {
  const { activeClub, activeRole } = useAuth();
  const [events, setEvents] = useState([]);
  const [selectedEventId, setSelectedEventId] = useState('');
  const [risks, setRisks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState(null);
  const [msg, setMsg] = useState(null);

  const isManagement = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!activeClub?.id) return;
      try {
        const res = await getClubEvents(activeClub.id);
        if (res.success && res.data?.length > 0) {
          setEvents(res.data);
          setSelectedEventId(res.data[0].id);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
  }, [activeClub?.id]);

  const loadRisks = async (eventId) => {
    if (!eventId) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getEventRisks(eventId);
      if (res.success) {
        setRisks(res.data || []);
      }
    } catch (err) {
      setError('Failed to load risks.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (selectedEventId) {
      loadRisks(selectedEventId);
    }
  }, [selectedEventId]);

  const handleRunScan = async () => {
    if (!selectedEventId) return;
    setScanning(true);
    setError(null);
    try {
      const res = await scanEventRisks(selectedEventId);
      if (res.success) {
        setRisks(res.data || []);
        setMsg(`Radar scan completed. ${res.data?.length || 0} active risks detected.`);
      }
    } catch (err) {
      setError('Failed to execute risk radar scan.');
    } finally {
      setScanning(false);
    }
  };

  const handleResolveRisk = async (riskId) => {
    try {
      const res = await resolveRisk(riskId);
      if (res.success) {
        setRisks((prev) =>
          prev.map((r) => (r.id === riskId ? { ...r, status: 'RESOLVED' } : r))
        );
        setMsg('Risk marked as resolved.');
      }
    } catch (e) {
      setError('Failed to resolve risk.');
    }
  };

  const getSeverityBadge = (severity) => {
    switch (severity) {
      case 'CRITICAL':
        return <Badge variant="error">CRITICAL RISK</Badge>;
      case 'HIGH':
        return <Badge variant="error">HIGH RISK</Badge>;
      case 'MEDIUM':
        return <Badge variant="warning">MEDIUM RISK</Badge>;
      default:
        return <Badge variant="info">LOW RISK</Badge>;
    }
  };

  const openRisks = risks.filter((r) => r.status === 'OPEN');
  const criticalCount = openRisks.filter((r) => r.severity === 'CRITICAL' || r.severity === 'HIGH').length;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200/90 shadow-xs">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-rose-100 text-rose-800">
              Deterministic Radar
            </span>
            <span className="text-xs text-slate-500">Autonomous Anomaly Detector</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-rose-600" />
            Proactive Risk & Deadlines Radar
          </h1>
          <p className="text-sm text-slate-600 mt-1">
            Background detection of blocked critical paths, overdue task chains, and volunteer staffing shortages.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {events.length > 0 && (
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="text-xs font-semibold px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 focus:outline-emerald-500"
            >
              {events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.title}
                </option>
              ))}
            </select>
          )}

          {isManagement && (
            <Button
              variant="primary"
              onClick={handleRunScan}
              disabled={scanning || !selectedEventId}
              leftIcon={RefreshCw}
              className={scanning ? 'animate-pulse' : ''}
            >
              {scanning ? 'Scanning State...' : 'Run Risk Radar'}
            </Button>
          )}
        </div>
      </div>

      {msg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{msg}</span>
          </div>
          <button onClick={() => setMsg(null)} className="text-emerald-700 font-bold">✕</button>
        </div>
      )}

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-rose-50 flex items-center justify-center text-rose-600 shrink-0">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Critical / High Alerts</p>
              <p className="text-lg font-bold text-rose-600">{criticalCount}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-50 flex items-center justify-center text-amber-600 shrink-0">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total Open Risks</p>
              <p className="text-lg font-bold text-slate-900">{openRisks.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center text-emerald-600 shrink-0">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Resolved / Mitigated</p>
              <p className="text-lg font-bold text-emerald-700">
                {risks.filter((r) => r.status === 'RESOLVED').length}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Risks List */}
      <div className="space-y-4">
        <h2 className="text-sm font-bold text-slate-800">
          Detected Operational Anomalies ({openRisks.length} Active)
        </h2>

        {openRisks.length > 0 ? (
          openRisks.map((r) => (
            <div
              key={r.id}
              className={`p-5 rounded-2xl border transition-all ${
                r.severity === 'CRITICAL' || r.severity === 'HIGH'
                  ? 'bg-rose-50/40 border-rose-200 shadow-2xs'
                  : 'bg-white border-slate-200'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getSeverityBadge(r.severity)}
                    <span className="font-bold text-base text-slate-900">{r.title}</span>
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                      Source: {r.source}
                    </span>
                  </div>

                  <p className="text-xs text-slate-700 leading-relaxed font-medium">
                    {r.description}
                  </p>

                  <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-1">
                    <span>Detected: {new Date(r.detected_at).toLocaleString()}</span>
                    {r.related_task_id && <span>Linked to Task Deliverable</span>}
                  </div>
                </div>

                {isManagement && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleResolveRisk(r.id)}
                    leftIcon={ShieldCheck}
                  >
                    Resolve Risk
                  </Button>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-400 text-xs flex flex-col items-center">
            <ShieldCheck className="w-10 h-10 text-emerald-500 mb-2" />
            <span className="font-semibold text-slate-700">No active risks detected!</span>
            <span className="text-[11px] mt-1">All task deadlines, dependencies, and staffing minimums are currently on track.</span>
          </div>
        )}
      </div>
    </div>
  );
}
