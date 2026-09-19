import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Mail, 
  ShieldCheck, 
  MoreVertical, 
  Filter, 
  Search, 
  CheckCircle2, 
  AlertCircle,
  Building2,
  Trash2,
  Edit2,
  Phone,
  Clock,
  Check,
  X,
  UserCheck,
  ClipboardList
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { 
  addClubMember, 
  getClubMembers, 
  removeClubMember, 
  updateMemberRole,
  getClubJoinRequests,
  reviewJoinRequest
} from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';

export default function ClubMembersPage() {
  const { activeClub, activeRole } = useAuth();
  const [activeTab, setActiveTab] = useState('members'); // 'members' | 'applications'
  
  // Members State
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Volunteer Join Requests State
  const [joinRequests, setJoinRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [filterReqStatus, setFilterReqStatus] = useState('ALL');
  const [reviewingId, setReviewingId] = useState(null);
  const [actionSuccess, setActionSuccess] = useState(null);

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [newDepartment, setNewDepartment] = useState('General');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

  const isPresident = activeRole === 'PRESIDENT';
  const isLeadership = ['PRESIDENT', 'CLUB_HEAD', 'ORGANIZER'].includes(activeRole);

  const fetchMembers = async () => {
    if (!activeClub?.id) return;
    try {
      setLoading(true);
      setError(null);
      const res = await getClubMembers(activeClub.id);
      setMembers(res.data || []);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  const fetchJoinRequests = async () => {
    if (!activeClub?.id || !isLeadership) return;
    try {
      setRequestsLoading(true);
      const res = await getClubJoinRequests(activeClub.id);
      setJoinRequests(res.data || []);
    } catch (err) {
      console.error('Failed to load join requests:', err);
    } finally {
      setRequestsLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
    if (isLeadership) {
      fetchJoinRequests();
    }
  }, [activeClub?.id, isLeadership]);

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newEmail) return;

    try {
      setAddLoading(true);
      setAddError(null);
      await addClubMember(activeClub.id, {
        email: newEmail,
        role: newRole,
        department: newDepartment,
      });
      setIsAddModalOpen(false);
      setNewEmail('');
      setNewDepartment('General');
      await fetchMembers();
    } catch (err) {
      setAddError(err.response?.data?.detail || err.message || 'Failed to add member');
    } finally {
      setAddLoading(false);
    }
  };

  const handleRoleChange = async (membershipId, updatedRole) => {
    try {
      await updateMemberRole(activeClub.id, membershipId, { role: updatedRole });
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update member role');
    }
  };

  const handleRemove = async (membershipId, memberName) => {
    if (!window.confirm(`Are you sure you want to remove ${memberName} from this club?`)) return;
    try {
      await removeClubMember(activeClub.id, membershipId);
      await fetchMembers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to remove member');
    }
  };

  const handleReviewRequest = async (requestId, status) => {
    try {
      setReviewingId(requestId);
      setActionSuccess(null);
      await reviewJoinRequest(activeClub.id, requestId, status);
      setActionSuccess(`Application successfully ${status.toLowerCase()}!`);
      setTimeout(() => setActionSuccess(null), 4000);
      await fetchJoinRequests();
      if (status === 'APPROVED') {
        await fetchMembers();
      }
    } catch (err) {
      alert(err.response?.data?.detail || `Failed to ${status.toLowerCase()} request`);
    } finally {
      setReviewingId(null);
    }
  };

  const pendingRequestsCount = joinRequests.filter(r => r.status === 'PENDING').length;

  const filteredMembers = members.filter((m) => {
    const matchesRole = filterRole === 'ALL' || m.role === filterRole;
    const matchesSearch =
      m.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const filteredRequests = joinRequests.filter((r) => {
    if (filterReqStatus !== 'ALL' && r.status !== filterReqStatus) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return (
        r.user_name?.toLowerCase().includes(q) ||
        r.user_email?.toLowerCase().includes(q) ||
        r.message?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const roleColors = {
    PRESIDENT: 'emerald',
    CLUB_HEAD: 'info',
    ORGANIZER: 'info',
    TEAM_LEAD: 'purple',
    VOLUNTEER: 'warning',
    MEMBER: 'neutral',
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200/90 shadow-2xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
              Club Members & Volunteer Applications
            </h1>
            <Badge variant="emerald" size="sm">
              {activeClub?.name || 'Active Club'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage committee rosters, review volunteer applicant requests, and assign team responsibilities
          </p>
        </div>

        {isPresident && (
          <Button
            variant="primary"
            leftIcon={UserPlus}
            onClick={() => setIsAddModalOpen(true)}
          >
            Add Club Member
          </Button>
        )}
      </div>

      {/* Success Notification Alert */}
      {actionSuccess && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2 shadow-2xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Primary Section Tabs */}
      <div className="flex items-center border-b border-slate-200 gap-6">
        <button
          onClick={() => setActiveTab('members')}
          className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
            activeTab === 'members'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-500 hover:text-slate-700'
          }`}
        >
          <Users className="w-4 h-4" />
          Active Roster
          <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-bold">
            {members.length}
          </span>
        </button>

        {isLeadership && (
          <button
            onClick={() => setActiveTab('applications')}
            className={`pb-3 text-sm font-semibold flex items-center gap-2 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'applications'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-700'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            Volunteer Applications
            {pendingRequestsCount > 0 ? (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">
                {pendingRequestsCount} pending
              </span>
            ) : (
              <span className="ml-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                {joinRequests.length}
              </span>
            )}
          </button>
        )}
      </div>

      {/* TAB 1: ACTIVE MEMBERS */}
      {activeTab === 'members' && (
        <div className="space-y-4">
          {/* Filter & Search Bar */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['ALL', 'PRESIDENT', 'CLUB_HEAD', 'ORGANIZER', 'TEAM_LEAD', 'VOLUNTEER', 'MEMBER'].map((r) => (
                <button
                  key={r}
                  onClick={() => setFilterRole(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    filterRole === r
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {r === 'ALL' ? 'All Roles' : r.replace('_', ' ')}
                </button>
              ))}
            </div>

            <div className="w-full md:w-72">
              <Input
                placeholder="Search by name, email, or team..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
            </div>
          </div>

          {/* Member Cards Grid */}
          {loading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              Loading club roster...
            </div>
          ) : error ? (
            <div className="p-6 text-center text-xs text-rose-700 bg-rose-50 rounded-2xl border border-rose-200">
              {error}
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <Users className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No members match your filter.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMembers.map((member) => (
                <Card key={member.membership_id} hover className="p-5 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 overflow-hidden shrink-0">
                          {member.avatar_url ? (
                            <img
                              src={member.avatar_url}
                              alt={member.full_name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-slate-700 text-xs">
                              {member.full_name?.slice(0, 2).toUpperCase() || 'U'}
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {member.full_name}
                          </h3>
                          <p className="text-[11px] text-slate-500 truncate max-w-[180px]">
                            {member.email}
                          </p>
                        </div>
                      </div>

                      <Badge variant={roleColors[member.role] || 'emerald'} size="sm">
                        {member.role.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span className="font-medium">Department / Team:</span>
                      <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                        {member.department || 'General Volunteer'}
                      </span>
                    </div>
                  </div>

                  {/* Role Action Controls (President only) */}
                  {isPresident && (
                    <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(member.membership_id, e.target.value)}
                        className="text-[11px] font-medium bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-slate-700 focus:outline-none focus:border-emerald-500 cursor-pointer"
                      >
                        <option value="PRESIDENT">President</option>
                        <option value="CLUB_HEAD">Club Head</option>
                        <option value="ORGANIZER">Organizer</option>
                        <option value="TEAM_LEAD">Team Lead</option>
                        <option value="VOLUNTEER">Volunteer</option>
                        <option value="MEMBER">Member</option>
                      </select>

                      <button
                        onClick={() => handleRemove(member.membership_id, member.full_name)}
                        className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                        title="Remove from club"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: VOLUNTEER APPLICATIONS (Club Head & President) */}
      {activeTab === 'applications' && isLeadership && (
        <div className="space-y-4">
          {/* Filter pills */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
              {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map((st) => (
                <button
                  key={st}
                  onClick={() => setFilterReqStatus(st)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                    filterReqStatus === st
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {st === 'ALL' ? 'All Applications' : st}
                </button>
              ))}
            </div>

            <div className="w-full md:w-72">
              <Input
                placeholder="Search applicant or skills..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                icon={Search}
              />
            </div>
          </div>

          {requestsLoading ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200">
              Loading volunteer applications...
            </div>
          ) : filteredRequests.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
              <UserCheck className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-700">No volunteer applications found.</p>
              <p className="text-[11px] text-slate-400">
                Incoming student volunteer signups targeting this club will appear here for review.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredRequests.map((req) => (
                <Card key={req.id} hover className="p-5 flex flex-col justify-between space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-50 border border-emerald-200 overflow-hidden shrink-0 flex items-center justify-center font-bold text-emerald-800 text-xs">
                          {req.user_name ? req.user_name.slice(0, 2).toUpperCase() : 'V'}
                        </div>
                        <div>
                          <h3 className="text-sm font-bold text-slate-900 leading-tight">
                            {req.user_name || 'Volunteer Applicant'}
                          </h3>
                          <p className="text-[11px] text-slate-500">{req.user_email}</p>
                          {req.user_phone && (
                            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                              <Phone className="w-3 h-3 text-slate-400" />
                              {req.user_phone}
                            </p>
                          )}
                        </div>
                      </div>

                      <Badge
                        variant={
                          req.status === 'APPROVED'
                            ? 'emerald'
                            : req.status === 'REJECTED'
                            ? 'rose'
                            : 'warning'
                        }
                        size="sm"
                      >
                        {req.status}
                      </Badge>
                    </div>

                    {req.message && (
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs text-slate-700 space-y-1">
                        <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Application Statement / Skills:
                        </div>
                        <p className="italic leading-relaxed">{req.message}</p>
                      </div>
                    )}

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>
                        Applied: {new Date(req.requested_at).toLocaleDateString(undefined, {
                          year: 'numeric',
                          month: 'short',
                          day: 'numeric'
                        })}
                      </span>
                    </div>
                  </div>

                  {/* Actions for Pending Requests */}
                  {req.status === 'PENDING' && (
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        leftIcon={X}
                        disabled={reviewingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'REJECTED')}
                        className="text-rose-600 hover:bg-rose-50 border-rose-200"
                      >
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        leftIcon={Check}
                        loading={reviewingId === req.id}
                        onClick={() => handleReviewRequest(req.id, 'APPROVED')}
                      >
                        Approve Volunteer
                      </Button>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add Member Modal (President only) */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title="Invite / Add Club Member"
        description="Add a student by campus email to join your organization roster"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          {addError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{addError}</span>
            </div>
          )}

          <Input
            label="Campus Email Address *"
            type="email"
            placeholder="student@campus.edu"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required
            autoFocus
          />

          <div className="space-y-1.5 text-left">
            <label className="block text-xs font-semibold text-slate-700">
              Assigned Role *
            </label>
            <select
              value={newRole}
              onChange={(e) => setNewRole(e.target.value)}
              className="block w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500 cursor-pointer"
            >
              <option value="MEMBER">Club Member</option>
              <option value="VOLUNTEER">Volunteer</option>
              <option value="TEAM_LEAD">Team Lead</option>
              <option value="ORGANIZER">Organizer</option>
              <option value="PRESIDENT">Club President</option>
            </select>
          </div>

          <Input
            label="Committee / Department"
            placeholder="e.g. Technical, Logistics, Media, Sponsorship"
            value={newDepartment}
            onChange={(e) => setNewDepartment(e.target.value)}
          />

          <div className="pt-3 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={addLoading}
            >
              Confirm Member
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
