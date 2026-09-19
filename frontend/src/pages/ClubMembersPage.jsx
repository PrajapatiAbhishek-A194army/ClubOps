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
  Edit2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { addClubMember, getClubMembers, removeClubMember, updateMemberRole } from '../services/api';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Card } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import Modal from '../components/ui/Modal';
import Tabs from '../components/ui/Tabs';

export default function ClubMembersPage() {
  const { activeClub, activeRole } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filterRole, setFilterRole] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Add Member Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('MEMBER');
  const [newDepartment, setNewDepartment] = useState('General');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState(null);

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

  useEffect(() => {
    fetchMembers();
  }, [activeClub?.id]);

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

  const isPresident = activeRole === 'PRESIDENT';

  const filteredMembers = members.filter((m) => {
    const matchesRole = filterRole === 'ALL' || m.role === filterRole;
    const matchesSearch =
      m.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (m.department && m.department.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesRole && matchesSearch;
  });

  const roleColors = {
    PRESIDENT: 'emerald',
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
              Club Member Roster
            </h1>
            <Badge variant="emerald" size="sm">
              {activeClub?.name || 'Active Club'}
            </Badge>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Manage committee roles, volunteer permissions, and team assignments
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

      {/* Filter & Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {['ALL', 'PRESIDENT', 'ORGANIZER', 'TEAM_LEAD', 'VOLUNTEER', 'MEMBER'].map((r) => (
            <button
              key={r}
              onClick={() => setFilterRole(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold shrink-0 transition-all cursor-pointer ${
                filterRole === r
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-white hover:bg-slate-100 text-slate-600 border border-slate-200'
              }`}
            >
              {r === 'ALL' ? 'All Members' : r.replace('_', ' ')}
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
                          {member.full_name.slice(0, 2).toUpperCase()}
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
                  <span className="font-medium">Committee / Dept:</span>
                  <span className="font-semibold text-slate-800 bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200/60">
                    {member.department || 'General'}
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

      {/* Add Member Modal */}
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
              <option value="ORGANIZER">Event Organizer</option>
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
