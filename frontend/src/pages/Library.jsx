import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  ListMusic,
  Plus,
  Play,
  X,
  Loader2,
  LogIn,
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
      <div className="flex-1 flex items-center justify-center px-4 py-[4rem]">
        <div className="max-w-md w-full bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-[1.5rem] sm:p-[2rem] text-center space-y-[1rem]">
          <div className="w-[3.5rem] h-[3.5rem] rounded-[4px] bg-[#303030] text-[#cccccc] flex items-center justify-center mx-auto">
            <ListMusic className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-semibold text-white">Your Music Library</h2>
          <p className="text-xs text-[#999999] leading-relaxed">
            Sign in to create, organize, and stream your personalized music playlists.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="btn-white text-xs px-5 py-2.5"
            >
              <LogIn className="w-4 h-4 mr-1.5" />
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
    <div className="flex-1 max-w-7xl w-full mx-auto px-[2rem] sm:px-[3rem] pt-[3rem] pb-32 flex flex-col gap-[2rem]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[rgba(255,255,255,0.07)] pb-[1.5rem]">
        <div>
          <div className="text-[11px] font-mono uppercase tracking-widest text-[#999999] mb-[0.5rem]">
            Personal Library
          </div>
          <h1 className="text-2xl sm:text-3xl font-light text-white tracking-tight">
            Your Playlists
          </h1>
          <p className="mt-[0.5rem] text-xs text-[#999999]">
            Organize personal queues and shared community tracklists
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          className="btn-white text-xs px-4 py-2.5 gap-2"
        >
          <Plus className="w-4 h-4" />
          Create Playlist
        </button>
      </div>

      {/* Playlists Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="p-2.5 rounded-[4px] space-y-3 animate-pulse"
            >
              <div className="aspect-square bg-[#222222] rounded-[4px]"></div>
              <div className="h-3.5 bg-[#262626] rounded-[2px] w-3/4"></div>
              <div className="h-3 bg-[#1e1e1e] rounded-[2px] w-1/2"></div>
            </div>
          ))}
        </div>
      ) : playlists.length === 0 ? (
        <div className="p-12 rounded-[4px] bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] text-center space-y-4 max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-[4px] bg-[#303030] flex items-center justify-center text-[#666666] mx-auto">
            <ListMusic className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-medium text-[#ffffff]">No playlists yet</h3>
          <p className="text-xs text-[#999999] leading-relaxed">
            Create your first playlist to group your favorite songs together and play them sequentially.
          </p>
          <button
            onClick={() => setModalOpen(true)}
            className="btn-white text-xs px-5 py-2.5 gap-2"
          >
            <Plus className="w-4 h-4" />
            Create Your First Playlist
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {playlists.map((playlist) => {
            const plId = playlist.id || playlist._id;
            const songs = playlist.songs || [];
            const firstCover = songs.length > 0 && songs[0]?.coverUrl ? songs[0].coverUrl : null;

            return (
              <div
                key={plId}
                onClick={() => navigate(`/playlists/${plId}`)}
                className="group relative p-3.5 rounded-[4px] bg-[#1e1e1e] hover:bg-[#242424] border border-[rgba(255,255,255,0.07)] transition-colors duration-150 cursor-pointer flex flex-col justify-between"
              >
                {/* Artwork Thumbnail (1:1 aspect, 4px radius) */}
                <div className="relative aspect-square w-full rounded-[4px] overflow-hidden mb-3 bg-[#222222] flex items-center justify-center">
                  {firstCover ? (
                    <img
                      src={firstCover}
                      alt={playlist.name}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                  ) : (
                    <ListMusic className="w-10 h-10 text-[#666666] group-hover:text-[#ffffff] transition-colors" />
                  )}

                  {/* Play Overlay */}
                  {songs.length > 0 && (
                    <div className="absolute inset-0 bg-[#000000]/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <button
                        onClick={(e) => handlePlayPlaylist(e, playlist)}
                        aria-label="Play playlist"
                        className="w-11 h-11 rounded-full bg-[#ffffff] text-[#121212] flex items-center justify-center hover:scale-105 active:scale-95 transition-transform shadow-lg"
                      >
                        <Play className="w-5 h-5 fill-current ml-0.5" />
                      </button>
                    </div>
                  )}

                  {/* Privacy Badge */}
                  <div className="absolute top-2 left-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-0.5 rounded-[2px] bg-[#121212]/85 text-[#cccccc] border border-[rgba(255,255,255,0.08)] flex items-center gap-1">
                      {playlist.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                      {playlist.isPublic ? 'Public' : 'Private'}
                    </span>
                  </div>
                </div>

                {/* Info */}
                <div className="space-y-1">
                  <h3 className="font-semibold text-sm text-[#ffffff] group-hover:text-[#ffffff] truncate">
                    {playlist.name}
                  </h3>
                  <p className="text-xs text-[#999999] truncate">
                    {playlist.description || `${songs.length} tracks`}
                  </p>
                  <div className="text-[11px] font-mono text-[#666666] pt-0.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#1e1e1e] border border-[rgba(255,255,255,0.1)] rounded-[4px] p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-[4px] text-[#999999] hover:text-[#ffffff] hover:bg-[#282828] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-bold text-[#ffffff]">Create New Playlist</h3>
                <p className="text-xs text-[#999999]">
                  Give your playlist a title and an optional description
                </p>
              </div>

              {formError && (
                <div className="p-3 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
                  {formError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#cccccc]">
                    Playlist Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Midnight Beats"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full input-flat text-xs"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-[#cccccc]">
                    Description (optional)
                  </label>
                  <textarea
                    rows="3"
                    placeholder="What is the mood of this playlist?"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full input-flat text-xs resize-none"
                  />
                </div>

                <div className="flex items-center justify-between p-3 rounded-[4px] bg-[#161616] border border-[rgba(255,255,255,0.06)]">
                  <div className="text-xs">
                    <span className="font-semibold text-[#ffffff] block">Public Playlist</span>
                    <span className="text-[11px] text-[#777777]">
                      Allow other listeners to view and stream this playlist
                    </span>
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isPublic}
                    onChange={(e) => setFormData({ ...formData, isPublic: e.target.checked })}
                    className="w-4 h-4 accent-[#ffffff] cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalOpen(false)}
                    className="btn-ghost text-xs px-3 py-2"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating || !formData.name.trim()}
                    className="btn-white text-xs px-5 py-2.5 disabled:opacity-50"
                  >
                    {creating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
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
