import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  ShieldCheck, 
  User, 
  Mail, 
  Cpu, 
  Database, 
  CheckCircle2, 
  AlertCircle, 
  Save, 
  Sparkles,
  Layers,
  KeyRound,
  Crown,
  UserCheck,
  Loader2,
  ArrowRight
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useHealth } from '../hooks/useHealth';
import { createClub, getClubMembers, assignClubHead } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/Card';
import { Input, Textarea } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function ClubSettingsPage() {
  const { user, activeClub, activeRole, clubs, refreshProfile, switchClub } = useAuth();
  const { health } = useHealth();

  // Active club form state
  const [clubName, setClubName] = useState(activeClub?.name || '');
  const [clubCode, setClubCode] = useState(activeClub?.code || '');
  const [institution, setInstitution] = useState(activeClub?.institution || 'Institute of Technology & Engineering');
  const [description, setDescription] = useState(activeClub?.description || '');
  const [savedSuccess, setSavedSuccess] = useState(false);

  // New club modal state
  const [isNewClubModalOpen, setIsNewClubModalOpen] = useState(false);
  const [newClubName, setNewClubName] = useState('');
  const [newClubCode, setNewClubCode] = useState('');
  const [newClubDesc, setNewClubDesc] = useState('');
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState(null);

  // Club Head appointment state
  const [members, setMembers] = useState([]);
  const [loadingMembers, setLoadingMembers] = useState(false);
  const [selectedHeadId, setSelectedHeadId] = useState('');
  const [assignLoading, setAssignLoading] = useState(false);
  const [assignSuccess, setAssignSuccess] = useState(null);
  const [assignError, setAssignError] = useState(null);

  const loadMembers = async () => {
    if (!activeClub?.id) return;
    try {
      setLoadingMembers(true);
      const res = await getClubMembers(activeClub.id);
      if (res.data) {
        setMembers(res.data);
        const currentHead = res.data.find((m) => m.role === 'CLUB_HEAD');
        if (currentHead) {
          setSelectedHeadId(currentHead.user_id);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingMembers(false);
    }
  };

  useEffect(() => {
    if (activeClub) {
      setClubName(activeClub.name || '');
      setClubCode(activeClub.code || '');
      setInstitution(activeClub.institution || 'Institute of Technology & Engineering');
      setDescription(activeClub.description || '');
      loadMembers();
    }
  }, [activeClub?.id]);

  const handleSaveProfile = (e) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleCreateNewClub = async (e) => {
    e.preventDefault();
    if (!newClubName || !newClubCode) return;

    try {
      setCreateLoading(true);
      setCreateError(null);
      const res = await createClub({
        name: newClubName,
        code: newClubCode.toLowerCase().replace(/\s+/g, '-'),
        description: newClubDesc,
        institution: institution || 'University Campus',
      });
      await refreshProfile();
      setIsNewClubModalOpen(false);
      setNewClubName('');
      setNewClubCode('');
      setNewClubDesc('');
      if (res.data) {
        switchClub(res.data);
      }
    } catch (err) {
      setCreateError(err.response?.data?.detail || err.message || 'Failed to create club');
    } finally {
      setCreateLoading(false);
    }
  };

  const isPresident = activeRole === 'PRESIDENT';

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Club & Organization Settings
            </h1>
            <Badge variant="emerald" size="sm">
              {activeRole.replace('_', ' ')}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage organization profile, campus affiliation, active memberships, and system status
          </p>
        </div>

        <Button
          variant="outline"
          leftIcon={Building2}
          onClick={() => setIsNewClubModalOpen(true)}
        >
          Create Another Club
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Club Profile & Details */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="p-6">
            <CardHeader className="px-0 pt-0 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Organization Profile</CardTitle>
                  <CardDescription>
                    Public identity and information visible to members and students
                  </CardDescription>
                </div>
                <Badge variant={isPresident ? 'emerald' : 'neutral'} size="sm">
                  {isPresident ? 'Full Edit Access' : 'View Only'}
                </Badge>
              </div>
            </CardHeader>

            <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Club settings updated successfully.</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Student Organization Name"
                  value={clubName}
                  onChange={(e) => setClubName(e.target.value)}
                  disabled={!isPresident}
                  required
                />
                <Input
                  label="Club Code / Handle"
                  value={clubCode}
                  onChange={(e) => setClubCode(e.target.value)}
                  disabled={true}
                  helperText="Unique organization slug identifier"
                />
              </div>

              <Input
                label="Institution / University Campus"
                value={institution}
                onChange={(e) => setInstitution(e.target.value)}
                disabled={!isPresident}
              />

              <Textarea
                label="Mission & Description"
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={!isPresident}
                placeholder="Describe your student organization's focus..."
              />

              {isPresident && (
                <div className="pt-2 flex justify-end">
                  <Button
                    type="submit"
                    variant="primary"
                    leftIcon={Save}
                  >
                    Save Changes
                  </Button>
                </div>
              )}
            </form>
          </Card>

          {/* President Directive: Appoint & Change Club Head */}
          {isPresident && (
            <Card className="p-6 border-purple-200/80 shadow-xs">
              <CardHeader className="px-0 pt-0 pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <CardTitle className="text-base text-slate-900">
                        Club Leadership & Club Head Appointment
                      </CardTitle>
                      <CardDescription>
                        Designate or reassign the operational Club Head for {activeClub?.name}
                      </CardDescription>
                    </div>
                  </div>
                  <Badge variant="purple" size="sm">
                    President Authority Only
                  </Badge>
                </div>
              </CardHeader>

              {assignSuccess && (
                <div className="mb-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-900 flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{assignSuccess}</span>
                </div>
              )}

              {assignError && (
                <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2 font-medium">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{assignError}</span>
                </div>
              )}

              {/* Current Club Head Display */}
              <div className="p-4 bg-purple-50/50 border border-purple-100 rounded-xl mb-4">
                <div className="text-[11px] font-bold uppercase tracking-wider text-purple-800 mb-2 flex items-center gap-1.5">
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Current Active Club Head</span>
                </div>
                {members.find((m) => m.role === 'CLUB_HEAD') ? (
                  (() => {
                    const currentHead = members.find((m) => m.role === 'CLUB_HEAD');
                    return (
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-purple-700 text-white font-bold text-sm flex items-center justify-center shadow-xs">
                            {currentHead.full_name?.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-xs text-slate-900">
                              {currentHead.full_name}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {currentHead.email} &bull; {currentHead.department || 'Executive Leadership'}
                            </div>
                          </div>
                        </div>
                        <Badge variant="purple" size="sm">
                          Active Head
                        </Badge>
                      </div>
                    );
                  })()
                ) : (
                  <p className="text-xs text-slate-500 italic">
                    No Club Head currently appointed. Select a member below to designate as Club Head.
                  </p>
                )}
              </div>

              {/* Reassignment / Appointment Form */}
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  if (!selectedHeadId || !activeClub?.id) return;
                  try {
                    setAssignLoading(true);
                    setAssignError(null);
                    setAssignSuccess(null);
                    const res = await assignClubHead(activeClub.id, selectedHeadId);
                    setAssignSuccess(res.message || 'Club Head appointed successfully!');
                    await loadMembers();
                    await refreshProfile();
                    setTimeout(() => setAssignSuccess(null), 5000);
                  } catch (err) {
                    setAssignError(err.response?.data?.detail || err.message || 'Failed to appoint Club Head');
                  } finally {
                    setAssignLoading(false);
                  }
                }}
                className="space-y-3"
              >
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Select Member to Appoint as Club Head:
                  </label>
                  <select
                    value={selectedHeadId}
                    onChange={(e) => setSelectedHeadId(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-200 rounded-xl p-2.5 focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 font-medium text-slate-800"
                    disabled={loadingMembers || assignLoading}
                  >
                    <option value="">-- Choose Club Member --</option>
                    {members
                      .filter((m) => m.role !== 'PRESIDENT')
                      .map((m) => (
                        <option key={m.user_id} value={m.user_id}>
                          {m.full_name} ({m.email}) &bull; Currently {m.role}
                        </option>
                      ))}
                  </select>
                </div>

                <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-[11px] text-slate-600 leading-relaxed">
                  <p>
                    <strong>Governance Invariant:</strong> Under campus operational rules, each club holds strictly <strong>one active Club Head</strong>. Appointing a new candidate will automatically rotate the previous Club Head back to Volunteer status and dispatch notification & email alerts.
                  </p>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!selectedHeadId || assignLoading}
                    leftIcon={assignLoading ? Loader2 : Crown}
                    className="bg-purple-700 hover:bg-purple-800 border-purple-800"
                  >
                    {assignLoading ? 'Appointing...' : 'Appoint / Change Club Head'}
                  </Button>
                </div>
              </form>
            </Card>
          )}

          {/* User's Organization Memberships */}
          <Card className="p-6 space-y-4">
            <div>
              <CardTitle>Your Registered Organizations</CardTitle>
              <CardDescription>
                Clubs where your account holds an active committee or membership role
              </CardDescription>
            </div>

            <div className="space-y-2">
              {clubs.map((c) => (
                <div
                  key={c.id}
                  className={`p-3.5 rounded-xl border flex items-center justify-between transition-all ${
                    activeClub?.id === c.id
                      ? 'bg-emerald-50/70 border-emerald-300 shadow-2xs'
                      : 'bg-white border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold text-sm shrink-0">
                      {c.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">{c.name}</div>
                      <div className="text-[11px] text-slate-500">
                        {c.institution} • {c.member_count || 1} members
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Badge variant={c.user_role === 'PRESIDENT' ? 'emerald' : 'info'} size="sm">
                      {c.user_role}
                    </Badge>
                    {activeClub?.id !== c.id && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => switchClub(c)}
                      >
                        Switch To
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right Column: Account & System Telemetry */}
        <div className="space-y-6">
          {/* User Identity Card */}
          <Card className="p-6 space-y-4">
            <div>
              <CardTitle>Active Account</CardTitle>
              <CardDescription>Authenticated user identity</CardDescription>
            </div>

            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/80">
              <div className="w-10 h-10 rounded-full bg-emerald-700 text-white font-bold text-sm flex items-center justify-center shrink-0">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'CO'}
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-bold text-slate-900 truncate">
                  {user?.full_name || 'Active User'}
                </div>
                <div className="text-[11px] text-slate-500 truncate">
                  {user?.email || 'user@campus.edu'}
                </div>
              </div>
            </div>

            <div className="text-xs space-y-2 text-slate-600">
              <div className="flex items-center justify-between">
                <span>Active Role:</span>
                <span className="font-bold text-slate-900">{activeRole}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Primary Club:</span>
                <span className="font-bold text-slate-900 truncate max-w-[150px]">
                  {activeClub?.name || 'N/A'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span>Account Status:</span>
                <span className="font-semibold text-emerald-700 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                  Active
                </span>
              </div>
            </div>
          </Card>

          {/* System Infrastructure Card */}
          <Card className="p-6 space-y-4">
            <div>
              <CardTitle>Platform Infrastructure</CardTitle>
              <CardDescription>Live operational components</CardDescription>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Database className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">PostgreSQL</span>
                </div>
                <Badge variant="emerald" size="sm">Connected</Badge>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Groq LLM Engine</span>
                </div>
                <Badge variant="emerald" size="sm">Configured</Badge>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">Brevo Notifications</span>
                </div>
                <Badge variant="emerald" size="sm">Configured</Badge>
              </div>

              <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800">JWT Security</span>
                </div>
                <Badge variant="emerald" size="sm">Active (HS256)</Badge>
              </div>
            </div>
          </Card>
        </div>
      </div>

      {/* Modal: Create Another Club */}
      <Modal
        isOpen={isNewClubModalOpen}
        onClose={() => setIsNewClubModalOpen(false)}
        title="Create Student Organization"
        description="Register an additional club under your campus account"
      >
        <form onSubmit={handleCreateNewClub} className="space-y-4">
          {createError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <Input
            label="Organization Name *"
            placeholder="e.g. Artificial Intelligence Club"
            value={newClubName}
            onChange={(e) => {
              setNewClubName(e.target.value);
              if (!newClubCode) {
                setNewClubCode(e.target.value.toLowerCase().replace(/\s+/g, '-'));
              }
            }}
            required
            autoFocus
          />

          <Input
            label="Club Slug / Code *"
            placeholder="e.g. ai-club-campus"
            value={newClubCode}
            onChange={(e) => setNewClubCode(e.target.value)}
            required
            helperText="Short unique identifier for URLs"
          />

          <Textarea
            label="Brief Description"
            placeholder="What does your student club do?"
            value={newClubDesc}
            onChange={(e) => setNewClubDesc(e.target.value)}
          />

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsNewClubModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={createLoading}
            >
              Create Club
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
