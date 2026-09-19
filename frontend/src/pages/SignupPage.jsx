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
  HelpCircle,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { getPublicClubs } from '../services/api';
import Button from '../components/ui/Button';
import { Input, Textarea } from '../components/ui/Input';
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
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-lg text-center space-y-2">
        <Link to="/" className="inline-flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-emerald-600/20">
            CO
          </div>
          <span className="font-extrabold text-2xl text-slate-900 tracking-tight">
            {APP_NAME}
          </span>
        </Link>
        <h2 className="text-2xl font-bold text-slate-900">
          Student Volunteer Registration
        </h2>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Sign up as a student volunteer to participate in campus events, coordinate activities, and collaborate with club leadership.
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-lg px-4 sm:px-0">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200/90 rounded-2xl sm:px-10 space-y-5">
          {submittedSuccess ? (
            <div className="text-center py-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="w-16 h-16 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto shadow-xs">
                <CheckCircle2 className="w-9 h-9" />
              </div>
              <div className="space-y-1">
                <h3 className="text-lg font-bold text-slate-900">
                  Volunteer Application Submitted!
                </h3>
                <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                  Your volunteer profile has been registered and a membership request was dispatched to the <strong>Club Head</strong> of <strong>{selectedClub?.name || 'the selected club'}</strong>.
                </p>
              </div>

              <div className="p-4 bg-emerald-50/60 border border-emerald-200 rounded-xl text-xs text-emerald-900 space-y-2 text-left">
                <div className="font-bold flex items-center gap-1.5 text-emerald-950">
                  <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Next Steps:</span>
                </div>
                <p className="text-[11px] leading-relaxed">
                  &bull; The Club Head will review your application details and skill profile.<br />
                  &bull; Upon approval, your account status will automatically activate with active volunteer privileges.<br />
                  &bull; An email notification will confirm your acceptance.
                </p>
              </div>

              <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3">
                <Button
                  variant="primary"
                  onClick={() => navigate('/app')}
                  rightIcon={ArrowRight}
                >
                  Enter Portal
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/login')}
                >
                  Return to Sign In
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
                {/* Full Name */}
                <Input
                  label="Full Legal Name *"
                  placeholder="e.g. Jordan Lee"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  icon={User}
                  required
                />

                {/* Email & Phone */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Input
                    label="Campus Email *"
                    type="email"
                    placeholder="jordan@campus.edu"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    icon={Mail}
                    required
                  />

                  <Input
                    label="Phone Number"
                    type="tel"
                    placeholder="+91 98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    icon={Phone}
                    helperText="For event day coordinator dispatch"
                  />
                </div>

                {/* Password */}
                <Input
                  label="Password *"
                  type="password"
                  placeholder="At least 8 characters"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  icon={Lock}
                  required
                />

                {/* Target Club Selection */}
                <div className="space-y-1.5 pt-2 border-t border-slate-100">
                  <label className="block text-xs font-semibold text-slate-700">
                    Which Student Organization do you want to volunteer for? *
                  </label>
                  {loadingClubs ? (
                    <div className="p-3 text-xs text-slate-400 bg-slate-50 rounded-xl">
                      Loading registered clubs...
                    </div>
                  ) : (
                    <select
                      value={selectedClubId}
                      onChange={(e) => setSelectedClubId(e.target.value)}
                      required
                      className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium text-slate-800"
                    >
                      {clubs.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} ({c.institution})
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="text-[10px] text-slate-400">
                    Your volunteer membership request will be routed directly to this club's Club Head.
                  </p>
                </div>

                {/* Skills & Experience */}
                <Input
                  label="Skills / Interests"
                  placeholder="e.g. Photography, Web Dev, Registration Desk, Stage AV"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                  icon={Sparkles}
                  helperText="AI matchmaker uses these tags for event volunteer staffing"
                />

                {/* Application Message */}
                <Textarea
                  label="Short Motivation (Optional)"
                  rows={2}
                  placeholder="Brief note to the Club Head on why you want to join..."
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                />

                <Button
                  type="submit"
                  variant="primary"
                  size="lg"
                  className="w-full mt-2"
                  loading={loading}
                  rightIcon={ArrowRight}
                >
                  Submit Volunteer Application
                </Button>
              </form>

              <div className="text-center pt-2">
                <p className="text-xs text-slate-500">
                  Already a registered member?{' '}
                  <Link to="/login" className="font-semibold text-emerald-700 hover:text-emerald-800">
                    Sign In here
                  </Link>
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
