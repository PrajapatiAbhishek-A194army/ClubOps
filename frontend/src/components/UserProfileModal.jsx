import React, { useState, useEffect } from 'react';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  Image as ImageIcon, 
  ShieldCheck, 
  Save, 
  Loader2, 
  CheckCircle2, 
  Building2 
} from 'lucide-react';
import Modal from './ui/Modal';
import Button from './ui/Button';
import { Input } from './ui/Input';
import Badge from './ui/Badge';
import { updateUserProfile } from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function UserProfileModal({ isOpen, onClose }) {
  const { user, activeRole, refreshProfile } = useAuth();

  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);

  useEffect(() => {
    if (user && isOpen) {
      setFullName(user.full_name || '');
      setPhone(user.phone_number || '');
      setAvatarUrl(user.avatar_url || '');
      setPassword('');
      setError(null);
      setSuccessMsg(null);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!fullName.trim()) {
      setError('Full Name is required.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccessMsg(null);

      const payload = {
        full_name: fullName.trim(),
        phone_number: phone.trim() || undefined,
        avatar_url: avatarUrl.trim() || undefined,
      };
      if (password.trim()) {
        payload.password = password.trim();
      }

      await updateUserProfile(payload);
      await refreshProfile();
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => {
        setSuccessMsg(null);
        onClose();
      }, 1200);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="User Profile Settings">
      <div className="space-y-5">
        {/* Header Avatar Preview */}
        <div className="flex items-center gap-3.5 p-4 bg-slate-50 border border-slate-100 rounded-xl">
          <div className="w-12 h-12 rounded-full bg-emerald-700 text-white font-extrabold text-base flex items-center justify-center shadow-xs shrink-0">
            {fullName ? fullName.slice(0, 2).toUpperCase() : 'CO'}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="font-bold text-sm text-slate-900 truncate">
              {user?.full_name || 'User Profile'}
            </h4>
            <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            <div className="flex items-center gap-1.5 mt-1">
              <Badge variant="emerald" size="sm">
                {activeRole ? activeRole.replace('_', ' ') : 'Member'}
              </Badge>
              {user?.memberships?.length > 0 && (
                <span className="text-[10px] text-slate-500 font-medium">
                  &bull; {user.memberships[0].club_name}
                </span>
              )}
            </div>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 font-medium">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Campus Email Address
            </label>
            <Input
              value={user?.email || ''}
              disabled
              icon={Mail}
              className="bg-slate-100 text-slate-500 cursor-not-allowed text-xs"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Primary campus email is linked to organizational records and cannot be altered.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Full Name *
            </label>
            <Input
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="e.g. Alex President"
              icon={User}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Contact / Mobile Phone
            </label>
            <Input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. +91 98765 43210"
              icon={Phone}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Avatar Image URL
            </label>
            <Input
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://..."
              icon={ImageIcon}
            />
          </div>

          <div className="pt-2 border-t border-slate-100">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Change Password (optional)
            </label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              icon={Lock}
            />
          </div>

          <div className="pt-3 flex items-center justify-end gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={loading}
              leftIcon={loading ? Loader2 : Save}
            >
              {loading ? 'Saving...' : 'Save Profile Changes'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
