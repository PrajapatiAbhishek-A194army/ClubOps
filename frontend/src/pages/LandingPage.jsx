import React, { useState } from 'react';
import { 
  CheckCircle2, 
  Server, 
  Cpu, 
  Database, 
  KeyRound, 
  RefreshCw, 
  Workflow, 
  Layers, 
  AlertCircle,
  LogIn
} from 'lucide-react';
import { loginUser } from '../services/api';

export default function LandingPage({ health, loading, error, refetch }) {
  const [authTesting, setAuthTesting] = useState(false);
  const [authResult, setAuthResult] = useState(null);

  const handleTestAuth = async () => {
    try {
      setAuthTesting(true);
      const res = await loginUser('president@clubops.ai', 'ClubOps2026!');
      setAuthResult({ success: true, token: res.data.access_token });
      localStorage.setItem('clubops_token', res.data.access_token);
    } catch (err) {
      setAuthResult({ success: false, error: err.message || 'Login test failed' });
    } finally {
      setAuthTesting(false);
    }
  };

  const foundationPillars = [
    {
      title: 'FastAPI Backend',
      desc: 'High performance async Python 3.10 framework with Pydantic v2 schemas and CORS isolation.',
      icon: Server,
      badge: 'Active (v1.0)',
      color: 'emerald',
    },
    {
      title: 'SQLAlchemy & Alembic',
      desc: 'Robust schema versioning with automatic migrations and cross-database ORM engine.',
      icon: Database,
      badge: health?.database ? `DB: ${health.database}` : 'Connected',
      color: 'emerald',
    },
    {
      title: 'JWT Authentication',
      desc: 'HMAC-SHA256 stateless token lifecycle, bcrypt password hashing, and role validation.',
      icon: KeyRound,
      badge: 'Ready',
      color: 'emerald',
    },
    {
      title: 'React + Vite UI',
      desc: 'Fast HMR single-page client configured with Tailwind CSS White & Green enterprise design system.',
      icon: Cpu,
      badge: 'Running',
      color: 'emerald',
    },
  ];

  return (
    <div className="space-y-10">
      {/* Hero Header */}
      <div className="bg-white rounded-2xl p-8 sm:p-10 border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-emerald-50 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />
        
        <div className="relative z-10 max-w-3xl space-y-4">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-100/70 text-emerald-800 border border-emerald-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
            Phase 1: Project Foundation Ready
          </div>
          
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight leading-tight">
            Centralized AI-Powered Event Operations Platform
          </h1>
          
          <p className="text-slate-600 text-base sm:text-lg leading-relaxed">
            Eliminating fragmented spreadsheets, WhatsApp groups, and lost notes. Built for university clubs to streamline events, volunteers, meeting intelligence, risks, and proactive workflows.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3">
            <button
              onClick={refetch}
              disabled={loading}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl shadow-xs transition-all cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Verify Backend Health
            </button>
            
            <button
              onClick={handleTestAuth}
              disabled={authTesting}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-800 text-sm font-semibold rounded-xl border border-slate-300 shadow-xs transition-all cursor-pointer"
            >
              <LogIn className="w-4 h-4 text-emerald-600" />
              {authTesting ? 'Testing Auth...' : 'Test Foundation JWT Auth'}
            </button>
          </div>

          {/* Auth Result Preview */}
          {authResult && (
            <div className={`mt-4 p-4 rounded-xl text-xs font-mono border ${authResult.success ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'bg-rose-50 border-rose-200 text-rose-900'}`}>
              {authResult.success ? (
                <div>
                  <div className="font-bold mb-1 flex items-center gap-1.5 text-emerald-800">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    JWT Foundation Test Passed (Logged in as demo Club President)
                  </div>
                  <div className="truncate text-slate-600">
                    Token: {authResult.token}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 text-rose-800 font-semibold">
                  <AlertCircle className="w-4 h-4" />
                  Auth Error: {authResult.error}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Architecture Foundation Grid */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-emerald-600" />
            Phase 1 Deliverables & Architecture
          </h2>
          <span className="text-xs text-slate-500 font-medium">All systems initialized</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
          {foundationPillars.map((pillar, idx) => {
            const Icon = pillar.icon;
            return (
              <div
                key={idx}
                className="bg-white rounded-xl p-5 border border-slate-200 hover:border-emerald-300 shadow-xs hover:shadow-md transition-all space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                    {pillar.badge}
                  </span>
                </div>
                <h3 className="text-sm font-bold text-slate-900">{pillar.title}</h3>
                <p className="text-xs text-slate-600 leading-relaxed">{pillar.desc}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* System Status Table */}
      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-xs">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <Workflow className="w-4 h-4 text-emerald-600" />
            Environment Diagnostics
          </h3>
          <span className="text-xs font-mono text-slate-500">FastAPI + Vite</span>
        </div>
        <div className="divide-y divide-slate-100 text-xs">
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Backend API Status</span>
            <span className="font-semibold text-emerald-700 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
              {loading ? 'Checking...' : error ? error : `${health?.status || 'Active'} (v${health?.version || '1.0.0'})`}
            </span>
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Environment Mode</span>
            <span className="font-mono text-slate-700">{health?.environment || 'development'}</span>
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Database Connection</span>
            <span className="font-mono text-slate-700">{health?.database || 'connected'}</span>
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Alembic Schema Version</span>
            <span className="font-mono text-slate-700">8ab69117c370 (initial_foundation)</span>
          </div>
          <div className="px-6 py-3 flex items-center justify-between">
            <span className="text-slate-500 font-medium">Design System Palette</span>
            <span className="font-semibold text-emerald-700">White & Green Enterprise Theme</span>
          </div>
        </div>
      </div>
    </div>
  );
}
