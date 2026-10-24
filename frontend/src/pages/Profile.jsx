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
  Upload,
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
          <img
            src="/vibely-logo.png"
            alt="Vibely logo"
            className="w-14 h-14 mx-auto rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-800/80 object-contain"
          />
          <h2 className="text-xl font-bold text-white">Sign In Required</h2>
          <p className="text-xs text-slate-400">
            Please log in to view and manage your account settings.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs"
            >
              Go to Login
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

      await checkAuth(); // Sync AuthContext user state
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

    // Reset input value so selecting the same file again triggers change event
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

      await checkAuth(); // Sync AuthContext user state across the entire application
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

      await checkAuth(); // Sync AuthContext user state
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
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-xl">
        <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          {/* Avatar Container with Cloudinary Upload UI */}
          <div className="flex flex-col items-center gap-2.5 shrink-0">
            <div className="relative group w-28 h-28 rounded-3xl overflow-hidden shadow-2xl shadow-emerald-500/10 ring-2 ring-emerald-500/20 hover:ring-emerald-400/50 transition-all bg-slate-950 flex items-center justify-center">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={user.name}
                  className="w-full h-full object-cover rounded-3xl"
                />
              ) : (
                <div className="w-full h-full rounded-3xl bg-gradient-to-tr from-emerald-500 via-teal-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-3xl uppercase shadow-xl shadow-emerald-500/20">
                  {user.name.charAt(0)}
                </div>
              )}

              {/* Hover Overlay Button to Change Avatar */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingAvatar || deletingAvatar}
                className="absolute inset-0 bg-slate-950/75 backdrop-blur-[2px] opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1 cursor-pointer disabled:cursor-not-allowed"
                title="Click to change profile picture"
              >
                <Camera className="w-6 h-6 text-emerald-400" />
                <span className="text-[10px] font-bold text-slate-200 uppercase tracking-wider">
                  {user.avatar ? 'Change' : 'Upload'}
                </span>
              </button>

              {/* Uploading Spinner Overlay */}
              {uploadingAvatar && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-20">
                  <Loader2 className="w-6 h-6 text-emerald-400 animate-spin" />
                  <span className="text-[10px] font-semibold text-emerald-300">Uploading...</span>
                </div>
              )}

              {/* Deleting Spinner Overlay */}
              {deletingAvatar && (
                <div className="absolute inset-0 bg-slate-950/85 backdrop-blur-sm flex flex-col items-center justify-center gap-1.5 z-20">
                  <Loader2 className="w-6 h-6 text-rose-400 animate-spin" />
                  <span className="text-[10px] font-semibold text-rose-300">Removing...</span>
                </div>
              )}
            </div>

            {/* Hidden Native File Input */}
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
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
              >
                <Camera className="w-3 h-3 text-emerald-400" />
                {user.avatar ? 'Change' : 'Upload'}
              </button>

              {user.avatar && (
                <button
                  type="button"
                  onClick={handleDeleteAvatar}
                  disabled={uploadingAvatar || deletingAvatar}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-rose-950/30 hover:bg-rose-950/60 text-rose-400 hover:text-rose-300 border border-rose-500/30 text-[11px] font-semibold transition-all cursor-pointer disabled:opacity-50"
                  title="Remove profile picture"
                >
                  <Trash2 className="w-3 h-3" />
                  Remove
                </button>
              )}
            </div>
            <span className="text-[10px] text-slate-500 text-center font-mono">
              JPEG, PNG, WebP • Max 5MB
            </span>
          </div>

          <div className="flex-1 space-y-2 text-center sm:text-left">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Verified Listener
            </span>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              {user.name}
            </h1>

            <p className="text-xs sm:text-sm text-slate-400 font-mono">
              {user.email}
            </p>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-2 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                Joined {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'Recently'}
              </span>
              <span className="flex items-center gap-1.5">
                <ListMusic className="w-3.5 h-3.5 text-cyan-400" />
                {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800/80 hover:bg-rose-950/60 text-slate-300 hover:text-rose-300 border border-slate-700 hover:border-rose-500/40 text-xs font-semibold transition-all self-center sm:self-start cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5" />
            Sign Out
          </button>
        </div>
      </div>

      {/* Edit Profile Form & Settings */}
      <div className="bg-slate-900/60 border border-slate-800 rounded-2xl sm:rounded-3xl p-5 sm:p-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div>
            <h2 className="text-base font-bold text-white">Account Details</h2>
            <p className="text-xs text-slate-400">Manage your public listener credentials</p>
          </div>

          {!isEditing && (
            <button
              onClick={() => {
                setName(user.name);
                setIsEditing(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors self-start sm:self-auto cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              Edit Display Name
            </button>
          )}
        </div>

        {successMsg && (
          <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {isEditing ? (
          <form onSubmit={handleUpdateProfile} className="space-y-4 max-w-md">
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-300">
                Display Name
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your full name"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-400">
                Email Address (read-only)
              </label>
              <input
                type="email"
                disabled
                value={user.email}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/50 border border-slate-800/60 text-slate-500 text-sm cursor-not-allowed"
              />
              <span className="text-[10px] text-slate-500">
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
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving || !name.trim()}
                className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
              >
                {saving && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Save Changes
              </button>
            </div>
          </form>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Display Name</span>
              <span className="font-bold text-slate-200 text-sm truncate block">{user.name}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Email Address</span>
              <span className="font-mono text-slate-200 text-sm truncate block">{user.email}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Unique User ID</span>
              <span className="font-mono text-slate-400 break-all">{user.id}</span>
            </div>

            <div className="p-4 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1">
              <span className="text-slate-500 block">Session Protection</span>
              <span className="text-emerald-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span>HTTP-Only Cookie Encrypted</span>
              </span>
            </div>
          </div>
        )}

        {/* Quick Links */}
        <div className="pt-4 border-t border-slate-800/80 flex flex-wrap items-center gap-3">
          <Link
            to="/library"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <ListMusic className="w-3.5 h-3.5" />
            Go to Your Library
            <ArrowRight className="w-3 h-3" />
          </Link>
          <Link
            to="/"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-colors"
          >
            <Music className="w-3.5 h-3.5" />
            Explore Music Catalogue
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>
    </div>
  );
};

export default Profile;
