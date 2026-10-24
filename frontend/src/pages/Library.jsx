import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ListMusic,
  Plus,
  Play,
  X,
  Loader2,
  LogIn,
  Sparkles,
  Music,
  Lock,
  Globe,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlaylists } from '../context/PlaylistContext';
import { usePlayer } from '../context/PlayerContext';

export const Library = () => {
  const { user } = useAuth();
  const { playlists, loading, error, createPlaylist } = usePlaylists();
  const { playTrack } = usePlayer();
  const navigate = useNavigate();

  const [modalOpen, setModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    isPublic: true,
  });
  const [creating, setCreating] = useState(false);
  const [formError, setFormError] = useState(null);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <img
            src="/vibely-logo.png"
            alt="Vibely logo"
            className="w-14 h-14 mx-auto rounded-2xl shadow-xl shadow-emerald-500/10 border border-slate-800/80 object-contain"
          />
          <h2 className="text-xl font-bold text-white">Your Music Library</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in to create, organize, and stream your personalized music playlists.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all"
            >
              <LogIn className="w-4 h-4" />
              Sign In to Access Library
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const handleCreateSubmit = async (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      setFormError('Playlist name is required');
      return;
    }

    setCreating(true);
    setFormError(null);

    const result = await createPlaylist({
      name: formData.name.trim(),
      description: formData.description.trim(),
      isPublic: formData.isPublic,
    });

    setCreating(false);

    if (result.success) {
      setFormData({ name: '', description: '', isPublic: true });
      setModalOpen(false);
      const newId = result.data.id || result.data._id;
      navigate(`/playlists/${newId}`);
    } else {
      setFormError(result.error);
    }
  };

  const handlePlayPlaylist = (e, playlist) => {
    e.stopPropagation();
    if (playlist.songs && playlist.songs.length > 0) {
      playTrack(playlist.songs[0], playlist.songs);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-32">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Your Collection
          </div>
          <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight">
            Your Playlists
          </h1>
          <p className="text-xs text-slate-400">
            Manage your curated music sessions and shared listening queues
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer min-h-[40px]"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Playlists Grid */}
      {loading ? (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-4 space-y-3 animate-pulse"
            >
              <div className="aspect-square bg-slate-800/60 rounded-xl"></div>
              <div className="h-4 bg-slate-800/80 rounded w-3/4"></div>
              <div className="h-3 bg-slate-800/40 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="p-8 sm:p-12 rounded-3xl bg-slate-900/40 border border-slate-800/80 text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-2xl bg-slate-800 flex items-center justify-center text-slate-500 mx-auto">
            <ListMusic className="w-8 h-8" />
          </div>
          <h3 className="text-base sm:text-lg font-bold text-slate-200">No playlists yet</h3>
          <p className="text-xs text-slate-400 leading-relaxed">
            Create your first playlist to group your favorite songs together and play them sequentially.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 sm:gap-4">
          {playlists.map((playlist) => {
            const plId = playlist.id || playlist._id;
            const songs = playlist.songs || [];
            const firstCover = songs.length > 0 && songs[0]?.coverUrl ? songs[0].coverUrl : null;

            return (
              <div
                key={plId}
                onClick={() => navigate(`/playlists/${plId}`)}
                className="group relative p-3 sm:p-3.5 rounded-2xl bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 shadow-md hover:shadow-xl transition-all duration-300 cursor-pointer flex flex-col justify-between"
              >
                {/* Artwork Thumbnail */}
                <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-gradient-to-tr from-slate-950 to-slate-800 flex items-center justify-center">
                  {firstCover ? (
                    <img
                      src={firstCover}
                      alt={playlist.name}
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                  ) : (
                    <ListMusic className="w-12 h-12 text-slate-600 group-hover:text-emerald-400 transition-colors" />
                  )}

                  {/* Play Overlay */}
                  {songs.length > 0 && (
                    <div className="absolute inset-0 bg-slate-950/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => handlePlayPlaylist(e, playlist)}
                        aria-label="Play playlist"
                        className="w-12 h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform hover:scale-110 active:scale-95 transition-all"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                  )}

                  {/* Privacy Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-slate-300 border border-slate-700/60 flex items-center gap-1">
                      {playlist.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      {playlist.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="font-bold text-sm text-slate-100 group-hover:text-white truncate">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-slate-400 truncate">
                    {playlist.description || `${songs.length} tracks`}
                  </p>
                  <div className="text-[11px] font-mono text-emerald-400 pt-0.5">
                    {songs.length} {songs.length === 1 ? 'song' : 'songs'}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Create Playlist Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-xl font-bold text-white">Create New Playlist</h3>
                <p className="text-xs text-slate-400">
                  Give your playlist a title and an optional description
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Playlist Name <span className="text-emerald-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Synthwave Nightdrive"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">
                    Description (optional)
                  </label>
                  <textarea
                    rows="3"
                    placeholder="What is the vibe of this playlist?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950/80 border border-slate-800 text-slate-100 placeholder-slate-600 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div className="text-xs">
                    <span className="font-bold text-slate-200 block">Public Playlist</span>
                    <span className="text-[11px] text-slate-500">
                      Allow other Vibely users to view this playlist
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4 h-4 accent-emerald-500 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="px-4 py-2 rounded-xl text-slate-400 hover:text-white text-xs font-semibold transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !formData.name.trim()}
                    className="px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg shadow-emerald-500/20 disabled:opacity-50 cursor-pointer"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                    Create Playlist
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Library;
