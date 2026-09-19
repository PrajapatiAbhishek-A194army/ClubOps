import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, Terminal, ArrowRight, LayoutDashboard } from 'lucide-react';
import { APP_NAME } from '../utils/constants';
import Button from './ui/Button';

export default function Navbar({ health, loading, error }) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-emerald-100/80 shadow-2xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-emerald-600/20 shrink-0">
            CO
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-lg tracking-tight text-slate-900">{APP_NAME}</span>
              <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200">
                Enterprise
              </span>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block">Campus Operations Operating System</p>
          </div>
        </Link>

        {/* Center Nav Links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
          <a href="#workflow" className="hover:text-emerald-700 transition-colors">
            How It Works
          </a>
          <a href="#features" className="hover:text-emerald-700 transition-colors">
            Core Features
          </a>
          <Link to="/app" className="hover:text-emerald-700 transition-colors">
            Live Preview
          </Link>
        </nav>

        {/* Action Buttons & Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[11px] font-medium bg-slate-50 border-slate-200">
            <span
              className={`w-2 h-2 rounded-full ${
                loading ? 'bg-amber-500' : error ? 'bg-rose-500' : 'bg-emerald-500 animate-pulse'
              }`}
            />
            <span className="text-slate-600 font-semibold">
              {loading ? 'Connecting...' : error ? 'System Offline' : 'System Online'}
            </span>
          </div>


          <Button
            size="sm"
            variant="primary"
            rightIcon={ArrowRight}
            onClick={() => navigate('/app')}
          >
            Launch Dashboard
          </Button>
        </div>
      </div>
    </header>
  );
}

