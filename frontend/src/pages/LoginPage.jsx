import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, AlertCircle, Sparkles, CheckCircle2, Crown, ClipboardList, HeartHandshake } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { APP_NAME } from '../utils/constants';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) {
      setError('Please provide both email and password.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await login(email, password);
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Login failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const demoAccounts = [
    {
      role: 'Club President',
      email: 'president@clubops.ai',
      desc: 'Multi-club executive oversight & approvals',
      icon: Crown,
      variant: 'emerald',
    },
    {
      role: 'Club Head / Lead',
      email: 'organizer@clubops.ai',
      desc: 'Events, tasks, meeting actions & announcements',
      icon: ClipboardList,
      variant: 'info',
    },
    {
      role: 'Volunteer Squad',
      email: 'volunteer@clubops.ai',
      desc: 'Assigned tasks, shift check-ins & war room chat',
      icon: HeartHandshake,
      variant: 'warning',
    },
  ];

  const selectDemoAccount = async (account) => {
    setEmail(account.email);
    setPassword('ClubOps2026!');
    try {
      setLoading(true);
      setError(null);
      await login(account.email, 'ClubOps2026!');
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Demo login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Branding Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-1/2 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
        {/* Subtle decorative glow */}
        <div className="absolute -top-32 -left-32 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-emerald-800/20 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-4">
          <Link to="/" className="inline-flex items-center gap-3">
            <div className="bg-white/95 backdrop-blur-xs px-3.5 py-2 rounded-2xl shadow-md border border-white/20 hover:bg-white transition-all flex items-center gap-2.5">
              <img src="/clubops-logo.png" alt="ClubOps" className="h-8 w-auto object-contain" />
              <span className="font-extrabold text-xl tracking-tight text-slate-900 pr-1">{APP_NAME}</span>
            </div>
          </Link>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950 text-emerald-400 border border-emerald-800">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            University Club Operations Platform
          </div>
        </div>

        <div className="relative z-10 space-y-6 max-w-lg">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight leading-snug">
            Orchestrate Campus Events with Intelligent Guardrails
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Eliminate scattered WhatsApp groups and outdated spreadsheets. Synchronize your committee,
            automate milestone tracking, and maintain clean institutional audit records.
          </p>

          <div className="space-y-3 pt-2">
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated Meeting Minutes &rarr; Atomic Deliverables</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Milestone Stepper with Real-Time Task Auto-Completion</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>WebSockets Team Live Hub with Online Presence Roster</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-8 border-t border-slate-800 text-xs text-slate-500 flex items-center justify-between">
          <span>Enterprise Campus Security</span>
          <span>© 2026 ClubOps AI</span>
        </div>
      </div>

      {/* Right Login Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-16 py-12">
        <div className="w-full max-w-md mx-auto space-y-6">
          {/* Mobile Header */}
          <div className="lg:hidden text-center space-y-2 mb-4">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5">
              <img src="/clubops-logo.png" alt="ClubOps" className="h-9 w-auto object-contain" />
              <span className="font-bold text-xl text-slate-900">{APP_NAME}</span>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Sign In to Your Club Portal
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select a quick demo role below or enter your registered campus credentials.
            </p>
          </div>

          {/* Quick Demo Accounts */}
          <div className="space-y-2">
            <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              1-Click Demo Profiles
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {demoAccounts.map((acc) => {
                const Icon = acc.icon;
                return (
                  <button
                    key={acc.email}
                    type="button"
                    onClick={() => selectDemoAccount(acc)}
                    className="p-3 rounded-xl border border-slate-200 bg-white hover:border-emerald-500 hover:shadow-sm text-left transition-all cursor-pointer group space-y-1"
                  >
                    <div className="flex items-center justify-between">
                      <Icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-600 transition-colors" />
                      <span className="text-[10px] font-bold text-emerald-700">Quick</span>
                    </div>
                    <div className="text-xs font-bold text-slate-900 truncate">{acc.role}</div>
                    <div className="text-[10px] text-slate-400 truncate">{acc.email}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/90 shadow-2xs space-y-4">
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <Input
                label="Campus Email Address"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. president@clubops.ai"
                leftIcon={Mail}
              />

              <Input
                label="Password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                leftIcon={Lock}
              />

              <Button
                type="submit"
                variant="primary"
                size="md"
                className="w-full font-bold"
                loading={loading}
                rightIcon={ArrowRight}
              >
                Sign In
              </Button>
            </form>
          </div>

          <div className="text-center text-xs text-slate-500">
            Don't have an account?{' '}
            <Link to="/signup" className="text-emerald-700 font-bold hover:underline">
              Create an Account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
