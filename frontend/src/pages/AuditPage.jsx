import React, { useState, useEffect, useCallback } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Lock,
  Download,
  RefreshCw,
  Search,
  Filter,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Clock,
  ChevronDown,
  ChevronRight,
  Code,
  Users,
  Eye,
  Check,
  X,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  getAuditLogs,
  verifyAuditIntegrity,
  getSecuritySummary,
  getGovernanceMatrix,
  downloadAuditReport,
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/Card';

export default function AuditPage() {
  const { activeClub, activeRole } = useAuth();

  const [activeTab, setActiveTab] = useState('LOGS'); // 'LOGS' | 'GOVERNANCE'
  const [logs, setLogs] = useState([]);
  const [totalLogs, setTotalLogs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const [integrityReport, setIntegrityReport] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [governanceMatrix, setGovernanceMatrix] = useState(null);
  const [exporting, setExporting] = useState(false);

  // Filters
  const [search, setSearch] = useState('');
  const [selectedEntityType, setSelectedEntityType] = useState('ALL');
  const [selectedResult, setSelectedResult] = useState('ALL');
  const [expandedLogId, setExpandedLogId] = useState(null);

  const loadData = useCallback(async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      const [logsRes, summaryRes, integrityRes, govRes] = await Promise.all([
        getAuditLogs(activeClub.id, {
          entity_type: selectedEntityType,
          result: selectedResult,
          search: search || undefined,
          limit: 50,
        }),
        getSecuritySummary(activeClub.id),
        verifyAuditIntegrity(activeClub.id),
        getGovernanceMatrix(activeClub.id),
      ]);

      if (logsRes.success && logsRes.data) {
        setLogs(logsRes.data.entries || []);
        setTotalLogs(logsRes.data.total || 0);
      }
      if (summaryRes.success) setSummary(summaryRes.data);
      if (integrityRes.success) setIntegrityReport(integrityRes.data);
      if (govRes.success) setGovernanceMatrix(govRes.data);
    } catch (err) {
      console.error('Failed to load audit telemetry:', err);
    } finally {
      setLoading(false);
    }
  }, [activeClub?.id, selectedEntityType, selectedResult, search]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleVerifyIntegrity = async () => {
    if (!activeClub?.id) return;
    try {
      setVerifying(true);
      const res = await verifyAuditIntegrity(activeClub.id);
      if (res.success && res.data) {
        setIntegrityReport(res.data);
      }
    } catch (err) {
      console.error('Integrity verification failed:', err);
    } finally {
      setVerifying(false);
    }
  };

  const handleExportCSV = async () => {
    if (!activeClub?.id) return;
    try {
      setExporting(true);
      const blob = await downloadAuditReport(activeClub.id);
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `clubops_audit_chain_${activeClub.code || 'export'}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Failed to export audit report:', err);
    } finally {
      setExporting(false);
    }
  };

  const toggleExpand = (id) => {
    setExpandedLogId((prev) => (prev === id ? null : id));
  };

  const ENTITY_TYPES = ['ALL', 'EVENT', 'TASK', 'MEMBER', 'SECURITY', 'CLUB'];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Top Header */}
      <div className="bg-white rounded-2xl p-5 sm:p-7 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Lock className="w-3.5 h-3.5 text-emerald-600" />
            Immutable Cryptographic Governance
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight mt-1">
            Audit Trail & Governance Portal
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Tamper-evident SHA-256 chain verification, separation of duties matrix, and historical state diffs.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            leftIcon={RefreshCw}
            onClick={handleVerifyIntegrity}
            disabled={verifying || loading}
          >
            {verifying ? 'Re-Verifying Chain...' : 'Verify Chain Integrity'}
          </Button>

          <Button
            variant="primary"
            size="sm"
            leftIcon={Download}
            onClick={handleExportCSV}
            disabled={exporting || loading}
          >
            {exporting ? 'Exporting...' : 'Export Compliance CSV'}
          </Button>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Chain Integrity
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {integrityReport?.is_valid ? 'VERIFIED' : 'TAMPERED'}
              </span>
              <Badge variant={integrityReport?.is_valid ? 'success' : 'error'} size="sm" dot>
                SHA-256
              </Badge>
            </div>
            <p className="text-[11px] text-emerald-700 font-medium mt-0.5">
              {integrityReport?.verified_records || 0} blocks mathematically linked
            </p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Events Logged
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">
              {summary?.total_events_logged || totalLogs}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Immutable audit actions recorded</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Denied Attempts
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="flex items-center gap-2">
              <span className="text-2xl font-black text-slate-900">
                {summary?.denied_access_attempts || 0}
              </span>
              {summary?.denied_access_attempts > 0 && (
                <Badge variant="warning" size="sm">
                  Blocked
                </Badge>
              )}
            </div>
            <p className="text-[11px] text-slate-500 mt-0.5">Separation of duties enforcements</p>
          </div>
        </Card>

        <Card className="p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Security Policy
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="mt-2">
            <div className="text-2xl font-black text-slate-900">DENY-FIRST</div>
            <p className="text-[11px] text-purple-700 font-medium mt-0.5">
              Strict campus role capabilities
            </p>
          </div>
        </Card>
      </div>

      {/* Main Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('LOGS')}
          className={`px-4 py-2.5 text-xs font-bold cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'LOGS'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>Immutable Audit Trail</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-100 text-slate-600">
            {totalLogs}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('GOVERNANCE')}
          className={`px-4 py-2.5 text-xs font-bold cursor-pointer border-b-2 transition-all flex items-center gap-2 ${
            activeTab === 'GOVERNANCE'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-900'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Separation of Duties & Policy Matrix</span>
        </button>
      </div>

      {/* TAB 1: Immutable Audit Trail */}
      {activeTab === 'LOGS' && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200/90 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="flex-1 relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="Search actions, actors, or entity IDs..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-1.5 text-xs border border-slate-200 rounded-xl focus:outline-none focus:border-emerald-500 bg-slate-50/50"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1 overflow-x-auto">
                {ENTITY_TYPES.map((type) => (
                  <button
                    key={type}
                    onClick={() => setSelectedEntityType(type)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors cursor-pointer ${
                      selectedEntityType === type
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>

              <select
                value={selectedResult}
                onChange={(e) => setSelectedResult(e.target.value)}
                className="px-2.5 py-1 text-xs border border-slate-200 rounded-xl bg-white text-slate-700 focus:outline-none focus:border-emerald-500 font-medium"
              >
                <option value="ALL">All Results</option>
                <option value="SUCCESS">Success Only</option>
                <option value="DENIED">Denied / Blocked</option>
              </select>
            </div>
          </div>

          {/* Audit Logs Table */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3.5 pl-5">Timestamp (UTC)</th>
                    <th className="p-3.5">Action Verb</th>
                    <th className="p-3.5">Actor</th>
                    <th className="p-3.5">Entity</th>
                    <th className="p-3.5">Result</th>
                    <th className="p-3.5">Cryptographic Hash</th>
                    <th className="p-3.5 pr-5 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        <RefreshCw className="w-4 h-4 animate-spin inline mr-2" />
                        Loading immutable audit trail...
                      </td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="p-8 text-center text-slate-400">
                        No audit records match the selected filters.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => {
                      const isExpanded = expandedLogId === log.id;
                      const isDenied = log.result === 'DENIED';

                      return (
                        <React.Fragment key={log.id}>
                          <tr
                            onClick={() => toggleExpand(log.id)}
                            className={`cursor-pointer transition-colors ${
                              isDenied
                                ? 'bg-red-50/40 hover:bg-red-50/70'
                                : 'hover:bg-slate-50/80'
                            }`}
                          >
                            <td className="p-3.5 pl-5 whitespace-nowrap text-slate-500 text-[11px]">
                              {new Date(log.created_at).toLocaleString([], {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit',
                                second: '2-digit',
                              })}
                            </td>

                            <td className="p-3.5 font-bold text-slate-900">
                              <span className="font-mono text-[11px]">{log.action}</span>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="font-bold text-slate-800">{log.actor_name || 'System'}</span>
                                {log.actor_role && (
                                  <span className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold bg-slate-100 text-slate-600">
                                    {log.actor_role}
                                  </span>
                                )}
                              </div>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <Badge variant="neutral" size="sm">
                                {log.entity_type}
                              </Badge>
                            </td>

                            <td className="p-3.5 whitespace-nowrap">
                              <Badge
                                variant={isDenied ? 'error' : 'success'}
                                size="sm"
                                dot={isDenied}
                              >
                                {log.result}
                              </Badge>
                            </td>

                            <td className="p-3.5 whitespace-nowrap font-mono text-[10px] text-slate-400">
                              {log.integrity_hash?.substring(0, 16)}...
                            </td>

                            <td className="p-3.5 pr-5 text-right">
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-emerald-600 inline" />
                              ) : (
                                <ChevronRight className="w-4 h-4 text-slate-400 inline" />
                              )}
                            </td>
                          </tr>

                          {/* Expanded JSON Diff Payload */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-y border-slate-200/80">
                              <td colSpan="7" className="p-4 pl-6 space-y-3">
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
                                  <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                                      Previous Hash (Parent Signature)
                                    </span>
                                    <span className="font-mono text-slate-600 break-all text-[10px]">
                                      {log.prev_hash || 'None'}
                                    </span>
                                  </div>
                                  <div>
                                    <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px]">
                                      Block Signature (SHA-256)
                                    </span>
                                    <span className="font-mono text-emerald-700 font-bold break-all text-[10px]">
                                      {log.integrity_hash || 'None'}
                                    </span>
                                  </div>
                                </div>

                                <div>
                                  <span className="font-bold text-slate-400 uppercase tracking-wider block text-[10px] mb-1">
                                    State Diff Payload (JSON)
                                  </span>
                                  <pre className="p-3 rounded-xl bg-slate-900 text-emerald-400 text-[11px] font-mono overflow-x-auto max-h-48 scrollbar-thin">
                                    {JSON.stringify(log.diff_payload || {}, null, 2)}
                                  </pre>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Separation of Duties & Governance Matrix */}
      {activeTab === 'GOVERNANCE' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">
                Campus Student Organization Role Capability Matrix
              </h2>
            </div>
            <p className="text-xs text-slate-500 leading-relaxed">
              ClubOps AI enforces a strict <strong>Deny-by-Default</strong> security policy. Actions
              must be explicitly authorized by role capability. High-risk actions (e.g. presidency
              transfer, event cancellation) require dual-tier verification.
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50/80 border-b border-slate-100 text-slate-500 font-bold uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="p-4 pl-5">Protected Operation</th>
                    <th className="p-4">Category</th>
                    <th className="p-4 text-center">President</th>
                    <th className="p-4 text-center">Club Head</th>
                    <th className="p-4 text-center">Team Lead</th>
                    <th className="p-4 text-center">Volunteer</th>
                    <th className="p-4 pr-5 text-center">Member</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {governanceMatrix?.rules?.map((rule, idx) => {
                    const renderStatusBadge = (val) => {
                      if (val === 'ALLOW') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-800 border border-emerald-200">
                            <Check className="w-3 h-3 text-emerald-600" />
                            Allow
                          </span>
                        );
                      }
                      if (val === 'APPROVAL_REQUIRED') {
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Review
                          </span>
                        );
                      }
                      return (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-400">
                          <X className="w-3 h-3 text-slate-400" />
                          Deny
                        </span>
                      );
                    };

                    return (
                      <tr key={idx} className="hover:bg-slate-50/60 transition-colors">
                        <td className="p-4 pl-5">
                          <div className="font-bold text-slate-900">{rule.operation}</div>
                          <div className="text-[11px] text-slate-400 mt-0.5">{rule.description}</div>
                        </td>
                        <td className="p-4">
                          <Badge variant="neutral" size="sm">
                            {rule.category}
                          </Badge>
                        </td>
                        <td className="p-4 text-center">{renderStatusBadge(rule.president)}</td>
                        <td className="p-4 text-center">{renderStatusBadge(rule.club_head || rule.organizer)}</td>
                        <td className="p-4 text-center">{renderStatusBadge(rule.team_lead)}</td>
                        <td className="p-4 text-center">{renderStatusBadge(rule.volunteer)}</td>
                        <td className="p-4 pr-5 text-center">{renderStatusBadge(rule.member)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
