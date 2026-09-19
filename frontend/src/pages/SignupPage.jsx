import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { UserPlus, ArrowRight, Mail, Lock, User, Building2, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { APP_NAME } from '../utils/constants';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clubName, setClubName] = useState('');
  const [clubCode, setClubCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const { signup } = useAuth();
  const navigate = useNavigate();

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signup({
        full_name: fullName,
        email,
        password,
        club_name: clubName || undefined,
        club_code: clubCode || undefined,
        role: 'PRESIDENT',
      });
      navigate('/app');
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
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
          Create Your ClubOps Account
        </h2>
        <p className="text-xs text-slate-500">
          Set up your organization and empower your student team
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl sm:px-10 space-y-5">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSignup} className="space-y-4">
            <Input
              label="Full Name *"
              placeholder="e.g. Jordan Lee"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              icon={User}
              required
            />

            <Input
              label="Campus Email Address *"
              type="email"
              placeholder="e.g. jordan@campus.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              icon={Mail}
              required
            />

            <Input
              label="Password *"
              type="password"
              placeholder="At least 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              icon={Lock}
              required
            />

            <div className="pt-2 border-t border-slate-100 space-y-3">
              <span className="text-xs font-bold text-slate-700 block">
                Club Details (Optional — can create later)
              </span>
              <Input
                label="Student Organization / Club Name"
                placeholder="e.g. Coding Society"
                value={clubName}
                onChange={(e) => {
                  setClubName(e.target.value);
                  if (!clubCode) {
                    setClubCode(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                  }
                }}
                icon={Building2}
              />
              <Input
                label="Club Slug / Code"
                placeholder="e.g. coding-society"
                value={clubCode}
                onChange={(e) => setClubCode(e.target.value)}
                helperText="Unique identifier for your club URL"
              />
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              loading={loading}
              rightIcon={ArrowRight}
            >
              Register & Launch
            </Button>
          </form>

          <div className="text-center pt-2">
            <p className="text-xs text-slate-500">
              Already have an account?{' '}
              <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
