import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  UserPlus, 
  ArrowRight, 
  Mail, 
  Lock, 
  User, 
  Building2, 
  Phone, 
  Sparkles, 
  CheckCircle2, 
  AlertCircle,
  HeartHandshake
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPublicClubs } from '../services/api';
import Button from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import Select from '../components/ui/Select';
import Textarea from '../components/ui/Textarea';
import Badge from '../components/ui/Badge';
import { APP_NAME } from '../utils/constants';

export default function SignupPage() {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedClubId, setSelectedClubId] = useState('');
  const [skills, setSkills] = useState('');
  const [message, setMessage] = useState('');
  
  const [clubs, setClubs] = useState([]);
  const [loadingClubs, setLoadingClubs] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [submittedSuccess, setSubmittedSuccess] = useState(false);

  const { signup } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchClubs = async () => {
      try {
        setLoadingClubs(true);
        const res = await getPublicClubs();
        const clubList = res.data || [];
        setClubs(clubList);
        if (clubList.length > 0) {
          setSelectedClubId(clubList[0].id);
        }
      } catch (err) {
        console.error('Failed to load campus clubs:', err);
      } finally {
        setLoadingClubs(false);
      }
    };
    fetchClubs();
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      setError('Please fill in all required fields.');
      return;
    }
    if (!selectedClubId) {
      setError('Please select which campus club you wish to volunteer for.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await signup({
        full_name: fullName,
        email,
        password,
        phone_number: phone || undefined,
        target_club_id: selectedClubId,
        skills: skills || undefined,
        message: message || undefined,
        role: 'VOLUNTEER',
      });
      setSubmittedSuccess(true);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  const selectedClub = clubs.find((c) => c.id === selectedClubId);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col lg:flex-row">
      {/* Left Branding Panel (Desktop) */}
      <div className="hidden lg:flex lg:w-5/12 bg-slate-900 text-white p-12 flex-col justify-between relative overflow-hidden">
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
            <HeartHandshake className="w-3.5 h-3.5 text-emerald-400" />
            Join Your Campus Organization
          </div>
        </div>

        <div className="relative z-10 space-y-5 max-w-sm">
          <h1 className="text-3xl font-extrabold tracking-tight leading-snug">
            Volunteer & Shape Memorable Events
          </h1>
          <p className="text-xs text-slate-400 leading-relaxed">
            Gain official event execution experience, tag your specialized skills, participate in live war rooms,
            and build verified campus leadership credentials.
          </p>

          <div className="space-y-2.5 pt-2">
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Skill-Matched Track Assignments (Audio, Logistics, PR)</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>1-Click Event Day Check-ins & Digital Badges</span>
            </div>
            <div className="flex items-center gap-2.5 text-xs text-slate-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>Automated Recognition on Volunteer Leaderboard</span>
            </div>
          </div>
        </div>

        <div className="relative z-10 pt-6 border-t border-slate-800 text-xs text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-emerald-400 font-bold hover:underline">
            Sign In Here
          </Link>
        </div>
      </div>

      {/* Right Form Panel */}
      <div className="flex-1 flex flex-col justify-center px-4 sm:px-8 lg:px-12 py-10">
        <div className="w-full max-w-xl mx-auto space-y-6">
          <div className="lg:hidden text-center space-y-2 mb-2">
            <Link to="/" className="inline-flex items-center justify-center gap-2.5">
              <img src="/clubops-logo.png" alt="ClubOps" className="h-9 w-auto object-contain" />
              <span className="font-bold text-lg text-slate-900">{APP_NAME}</span>
            </Link>
          </div>

          <div>
            <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
              Student Volunteer Registration
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Apply to join a university club's volunteer squad. The Club Head will review your profile.
            </p>
          </div>

          <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200/90 shadow-2xs space-y-5">
            {submittedSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-2xs">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-slate-900">
                    Application Submitted Successfully!
                  </h3>
                  <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                    Your profile has been created and linked to <strong>{selectedClub?.name || 'the selected club'}</strong>.
                    The Club Head will review your application details.
                  </p>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Button variant="primary" size="md" onClick={() => navigate('/app')} rightIcon={ArrowRight}>
                    Enter Portal
                  </Button>
                  <Button variant="outline" size="md" onClick={() => navigate('/login')}>
                    Sign In
                  </Button>
                </div>
              </div>
            ) : (
              <>
                {error && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={handleSignup} className="space-y-4">
                  <Input
                    label="Full Legal Name *"
                    placeholder="e.g. Jordan Lee"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    leftIcon={User}
                    required
                  />

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Input
                      label="Campus Email *"
                      type="email"
                      placeholder="jordan@campus.edu"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      leftIcon={Mail}
                      required
                    />

                    <Input
                      label="Phone Number"
                      type="tel"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      leftIcon={Phone}
                    />
                  </div>

                  <Input
                    label="Account Password *"
                    type="password"
                    placeholder="Minimum 8 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    leftIcon={Lock}
                    required
                  />

                  {/* Target Club Selector */}
                  <Select
                    label="Select Campus Club *"
                    value={selectedClubId}
                    onChange={(e) => setSelectedClubId(e.target.value)}
                    placeholder={loadingClubs ? 'Loading clubs...' : 'Select a university club'}
                    disabled={loadingClubs}
                    options={clubs.map((c) => ({ value: c.id, label: `${c.name} (${c.code})` }))}
                  />

                  <Input
                    label="Skills & Expertise (Comma-separated)"
                    placeholder="e.g. Audio/Visual, Python, Photography, Registration, Logistics"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    helperText="Used by AI Matchmaker to suggest relevant event tracks"
                  />

                  <Textarea
                    label="Volunteer Introduction (Optional)"
                    rows={2}
                    placeholder="Tell the Club Head about your past experience or interests..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                  />

                  <Button
                    type="submit"
                    variant="primary"
                    size="md"
                    className="w-full font-bold"
                    loading={loading}
                    rightIcon={UserPlus}
                  >
                    Submit Volunteer Registration
                  </Button>
                </form>
              </>
            )}
          </div>

          <div className="text-center text-xs text-slate-500">
            Already have an active account?{' '}
            <Link to="/login" className="text-emerald-700 font-bold hover:underline">
              Sign In to Your Club
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
