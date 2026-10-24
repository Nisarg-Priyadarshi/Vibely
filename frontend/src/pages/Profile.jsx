import { useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  User,
  Mail,
  Calendar,
  ShieldCheck,
  Edit2,
  Check,
  AlertCircle,
  Loader2,
  LogOut,
  ListMusic,
  ArrowRight,
  Music,
  Camera,
  Trash2,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePlaylists } from '../context/PlaylistContext';

export const Profile = () => {
  const { user, logout, checkAuth } = useAuth();
  const { playlists } = usePlaylists();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [name, setName] = useState(user?.name || '');
  const [isEditing, setIsEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [deletingAvatar, setDeletingAvatar] = useState(false);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl">
          <User className="w-12 h-12 text-slate-600 mx-auto" />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-xs text-slate-400">
            Please log in to view and manage your account settings.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="btn-white text-xs px-5 py-2.5"
            >
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!name.trim() || name.trim().length < 2) {
      setErrorMsg('Name must be at least 2 characters long.');
      return;
    }
    if (name.trim().length > 50) {
      setErrorMsg('Name cannot exceed 50 characters.');
      return;
    }

    setSaving(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({ name: name.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to update profile.');
      }

      await checkAuth();
      setSuccessMsg('Display name updated successfully.');
      setIsEditing(false);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    e.target.value = '';

    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type.toLowerCase())) {
      setErrorMsg('Invalid file type. Only JPEG, PNG, and WebP images are allowed.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('File size exceeds the 5 MB limit. Please upload an image smaller than 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to upload profile picture.');
      }

      await checkAuth();
      setSuccessMsg('Profile picture updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleDeleteAvatar = async () => {
    if (!user.avatar) return;

    setDeletingAvatar(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/profile/avatar`, {
        method: 'DELETE',
        credentials: 'include',
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Failed to remove profile picture.');
      }

      await checkAuth();
      setSuccessMsg('Profile picture removed successfully.');
      setTimeout(() => setSuccessMsg(null), 3500);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setDeletingAvatar(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-10 flex flex-col gap-8 pb-32">
      {/* Profile Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Container with Cloudinary Upload UI */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div className="relative group w-24 h-24 rounded-[4px] overflow-hidden bg-[#242424] flex items-center justify-center border border-[rgba(255,255,255,0.1)]">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-[#2a2a2a] flex items-center justify-center text-[#ffffff] font-bold text-2xl uppercase">
                  {user.name.charAt(0)}
                </div>
              )}

              {/* Hover Change Button */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || deletingAvatar}
                className="absolute inset-0 bg-[#000000]/75 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                title="Change profile picture"
              >
                <Camera className="w-5 h-5 text-[#ffffff]" />
                <span className="text-[10px] font-semibold text-[#cccccc] uppercase tracking-wider">
                  {user.avatar ? 'Change' : 'Upload'}
                </span>
              </button>

              {/* Uploading Spinner */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-[#000000]/80 flex flex-col items-center justify-center gap-1 z-20">
                  <Loader2 className="w-5 h-5 text-[#00e599] animate-spin" />
                  <span className="text-[10px] text-[#00e599]">Uploading...</span>
                </div>
              )}

              {/* Deleting Spinner */}
              {deletingAvatar && (
                <div className="absolute inset-0 bg-[#000000]/80 flex flex-col items-center justify-center gap-1 z-20">
                  <Loader2 className="w-5 h-5 text-rose-400 animate-spin" />
                  <span className="text-[10px] text-rose-300">Removing...</span>
                </div>
              )}
            </div>

            {/* Hidden Input */}
            <input
              type="file"
              ref={fileInputRef}
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarFileChange}
              className="hidden"
            />

            {/* Avatar Action Controls */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || deletingAvatar}
                className="btn-graphite text-[11px] px-2.5 py-1"
              >
                <Camera className="w-3 h-3 mr-1 text-[#00e599]" />
                {user.avatar ? 'Change' : 'Upload'}
              </button>

              {user.avatar && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={uploadingAvatar || deletingAvatar}
                  className="btn-graphite text-[11px] px-2.5 py-1 text-rose-400 hover:text-rose-300"
                  title="Remove picture"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#00e599]">
              Verified Account
            </div>

            <h1 className="text-2xl sm:text-3xl font-extralight tracking-tight text-[#ffffff]">
              {user.name}
            </h1>

            <p className="text-xs text-[#999999] font-mono">
              {user.email}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-[#999999]">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-[#cccccc]" />
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
              </span>
              <span className="flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-[#cccccc]" />
                {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="btn-graphite text-xs px-3.5 py-2 self-center sm:self-start text-[#999999] hover:text-rose-400"
          >
            <LogOut className="w-3.5 h-3.5 mr-1.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Edit Profile Form & Settings */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-sm font-bold text-[#ffffff]">Account Details</h2>
            <p className="text-xs text-[#999999]">Manage your public credentials and profile settings</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => {
                setName(user.name);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
            >
              <Edit2 className="w-3 h-3 mr-1.5" />
              Edit Name
            </button>
          )}
        </div>

        {successMsg && (
          <div className="p-3 rounded-[4px] bg-[#122b1f] border border-[#00e599]/30 text-[#00e599] text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-[#00e599] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#cccccc]">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full input-flat text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-[#777777]">
                Email Address (read-only)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full input-flat text-xs text-[#777777] bg-[#1a1a1a] cursor-not-allowed"
              />
              <span className="text-[10px] text-[#777777]">
                Email addresses are immutable to safeguard room permissions and auth integrity.
              </span>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsEditing(false);
                  setErrorMsg(null);
                }}
                className="btn-ghost text-xs px-3 py-2"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="btn-white text-xs px-4 py-2 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Display Name</span>
              <span className="font-bold text-slate-200 text-sm">{user.name}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Email Address</span>
              <span className="font-mono text-slate-200 text-sm">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Unique User ID</span>
              <span className="font-mono text-slate-400">{user.id}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Session Protection</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4" />
                HTTP-Only Cookie Encrypted
              </span>
            </div>
          </div>
        )}

        {/* Quick Navigation Links */}
        <div className="pt-4 border-t border-[rgba(255,255,255,0.08)] flex flex-wrap items-center gap-3">
          <Link
            to="/library"
            className="btn-graphite text-xs px-3.5 py-2"
          >
            <ListMusic className="w-3.5 h-3.5 mr-1.5" />
            Go to Library
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Link>
          <Link
            to="/"
            className="btn-graphite text-xs px-3.5 py-2"
          >
            <Music className="w-3.5 h-3.5 mr-1.5" />
            Explore Catalogue
            <ArrowRight className="w-3 h-3 ml-1.5" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
