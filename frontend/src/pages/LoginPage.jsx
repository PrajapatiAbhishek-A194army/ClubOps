import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogIn, ArrowRight, ShieldCheck, Mail, Lock, AlertCircle, Sparkles, UserCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
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
      desc: 'Full administrative access across clubs and approvals',
      color: 'emerald',
    },
    {
      role: 'Club Head',
      email: 'organizer@clubops.ai',
      desc: 'Operational leadership over club tasks, meetings, and announcements',
      color: 'info',
    },
    {
      role: 'Technical Lead',
      email: 'techlead@clubops.ai',
      desc: 'Team delegation, volunteer allocations, and dependencies',
      color: 'purple',
    },
    {
      role: 'Volunteer',
      email: 'volunteer@clubops.ai',
      desc: 'View personal tasks, shifts, and event check-ins',
      color: 'warning',
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
            CO
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <h2 className="text-xl font-bold text-slate-900">
          Sign In to Your Club Portal
        </h2>
        <p className="text-xs text-slate-500">
          Centralized campus operations for student leaders and volunteers
        </p>
      </div>

      {/* Main Login Card */}
      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0 space-y-6">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl sm:px-10 space-y-6">
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
              placeholder="e.g. president@clubops.ai"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
            />

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full"
              loading={loading}
              rightIcon={ArrowRight}
            >
              Sign In
            </Button>
          </form>

          <div className="relative flex py-1 items-center">
            <div className="flex-grow border-t border-slate-200"></div>
            <span className="flex-shrink mx-3 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              1-Click Demo Accounts
            </span>
            <div className="flex-grow border-t border-slate-200"></div>
          </div>

          {/* Quick Demo Accounts Selection */}
          <div className="grid grid-cols-1 gap-2">
            {demoAccounts.map((account) => (
              <button
                key={account.email}
                type="button"
                onClick={() => selectDemoAccount(account)}
                disabled={loading}
                className="w-full text-left p-3 rounded-xl border border-slate-200 hover:border-emerald-300 hover:bg-emerald-50/50 transition-all flex items-center justify-between group cursor-pointer"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900 group-hover:text-emerald-950">
                      {account.role}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {account.email}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    {account.desc}
                  </div>
                </div>
                <UserCheck className="w-4 h-4 text-slate-300 group-hover:text-emerald-600 shrink-0 transition-colors" />
              </button>
            ))}
          </div>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              New student organization?{' '}
              <Link to="/signup" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Register a new club
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
