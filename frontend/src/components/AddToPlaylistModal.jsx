import { useState } from 'react';
import { Link } from 'react-router-dom';
import { X, Plus, Check, AlertCircle, ListMusic, Loader2, LogIn } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { usePlaylists } from '../context/PlaylistContext';

export const AddToPlaylistModal = ({ song, isOpen, onClose }) => {
  const { user } = useAuth();
  const { playlists, addSongToPlaylist, createPlaylist } = usePlaylists();

  const [addingId, setAddingId] = useState(null);
  const [successMsg, setSuccessMsg] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [creating, setCreating] = useState(false);

  if (!isOpen || !song) return null;

  const handleAddToPlaylist = async (playlistId) => {
    setAddingId(playlistId);
    setErrorMsg(null);
    setSuccessMsg(null);

    const songId = song.id || song._id;
    const result = await addSongToPlaylist(playlistId, songId);

    setAddingId(null);
    if (result.success) {
      setSuccessMsg(result.message || 'Added to playlist!');
      setTimeout(() => {
        onClose();
        setSuccessMsg(null);
      }, 1200);
    } else {
      setErrorMsg(result.error);
    }
  };

  const handleCreateAndAdd = async (e) => {
    e.preventDefault();
    if (!newPlaylistName.trim()) return;

    setCreating(true);
    setErrorMsg(null);

    const createRes = await createPlaylist({ name: newPlaylistName.trim() });
    if (createRes.success) {
      const newPlaylistId = createRes.data.id || createRes.data._id;
      const songId = song.id || song._id;
      const addRes = await addSongToPlaylist(newPlaylistId, songId);
      setCreating(false);

      if (addRes.success) {
        setSuccessMsg(`Created playlist and added "${song.title}"!`);
        setNewPlaylistName('');
        setShowCreate(false);
        setTimeout(() => {
          onClose();
          setSuccessMsg(null);
        }, 1200);
      } else {
        setErrorMsg(addRes.error);
      }
    } else {
      setCreating(false);
      setErrorMsg(createRes.error);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-6 relative">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          aria-label="Close"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3 mb-5 pr-8">
          <img
            src={song.coverUrl}
            alt={song.title}
            className="w-12 h-12 rounded-[4px] object-cover shrink-0 bg-[#282828]"
          />
          <div className="min-w-0">
            <h3 className="text-sm font-bold text-[#ffffff] truncate">Add to Playlist</h3>
            <p className="text-xs text-[#999999] truncate">
              {song.title} &bull; {song.artist}
            </p>
          </div>
        </div>

        {/* Feedback alerts */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-[4px] bg-[#122b1f] border border-[#00e599]/30 text-[#00e599] text-xs flex items-center gap-2">
            <Check className="w-4 h-4 text-[#00e599] shrink-0" />
            <span>{successMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="mb-4 p-3 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Body content */}
        {!user ? (
          <div className="text-center py-6 space-y-3">
            <p className="text-xs text-[#999999]">
              Please sign in to save songs and manage your playlists.
            </p>
            <Link
              to="/login"
              onClick={onClose}
              className="btn-white text-xs px-4 py-2"
            >
              <LogIn className="w-3.5 h-3.5 mr-1.5" />
              Sign In
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {/* Create new playlist toggle/form */}
            {showCreate ? (
              <form onSubmit={handleCreateAndAdd} className="p-3.5 rounded-[4px] bg-[#161616] border border-[rgba(255,255,255,0.08)] space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-[#ffffff]">New Playlist</span>
                  <button
                    type="button"
                    onClick={() => setShowCreate(false)}
                    className="text-[11px] text-[#999999] hover:text-[#ffffff]"
                  >
                    Cancel
                  </button>
                </div>
                <input
                  type="text"
                  placeholder="e.g. Late Night Drives"
                  value={newPlaylistName}
                  onChange={(e) => setNewPlaylistName(e.target.value)}
                  autoFocus
                  className="w-full input-flat text-xs py-2"
                />
                <button
                  type="submit"
                  disabled={creating || !newPlaylistName.trim()}
                  className="w-full btn-white text-xs py-2 flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  {creating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                  Create and Add Track
                </button>
              </form>
            ) : (
              <button
                onClick={() => setShowCreate(true)}
                className="w-full py-2.5 px-3 rounded-[4px] border border-dashed border-[rgba(255,255,255,0.15)] hover:border-[#ffffff] bg-[#161616] text-[#cccccc] hover:text-[#ffffff] text-xs font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Create New Playlist
              </button>
            )}

            {/* Playlists list */}
            <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
              {playlists.length === 0 ? (
                <div className="text-center py-4 text-xs text-[#777777]">
                  No playlists yet. Create your first playlist above.
                </div>
              ) : (
                playlists.map((pl) => {
                  const plId = pl.id || pl._id;
                  const isAdding = addingId === plId;
                  const songCount = pl.songs ? pl.songs.length : 0;

                  return (
                    <button
                      key={plId}
                      onClick={() => handleAddToPlaylist(plId)}
                      disabled={isAdding}
                      className="w-full p-2.5 rounded-[4px] bg-[#161616] hover:bg-[#252525] border border-[rgba(255,255,255,0.06)] hover:border-[rgba(255,255,255,0.12)] flex items-center justify-between transition-colors group text-left cursor-pointer"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-8 h-8 rounded-[3px] bg-[#222222] flex items-center justify-center text-[#999999] group-hover:text-[#ffffff] shrink-0">
                          <ListMusic className="w-4 h-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="text-xs font-semibold text-[#f2f2f2] truncate group-hover:text-[#ffffff]">
                            {pl.name}
                          </div>
                          <div className="text-[10px] text-[#777777] font-mono">
                            {songCount} {songCount === 1 ? 'track' : 'tracks'}
                          </div>
                        </div>
                      </div>

                      <div className="shrink-0 text-[#777777] group-hover:text-[#ffffff]">
                        {isAdding ? (
                          <Loader2 className="w-4 h-4 animate-spin text-[#00e599]" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AddToPlaylistModal;
