import React from 'react';
import { ShieldCheck, Activity, Terminal } from 'lucide-react';
import { APP_NAME } from '../utils/constants';

export default function Navbar({ health, loading, error }) {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/20">
            CO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">{APP_NAME}</span>
              <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Phase 1
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">Event Operations Operating System</p>
          </div>
        </div>

        {/* System Health Badge */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium bg-slate-50 border-slate-200">
            <Activity className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
            <span className="text-slate-600 hidden md:inline">Backend API:</span>
            {loading ? (
              <span className="text-amber-600 font-semibold">Connecting...</span>
            ) : error ? (
              <span className="text-rose-600 font-semibold">Offline</span>
            ) : (
              <span className="text-emerald-700 font-semibold capitalize flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block"></span>
                {health?.status || 'Online'} (v{health?.version})
              </span>
            )}
          </div>

          <a
            href="http://127.0.0.1:8000/docs"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 transition-colors"
          >
            <Terminal className="w-3.5 h-3.5" />
            API Docs
          </a>
        </div>
      </div>
    </header>
  );
}
