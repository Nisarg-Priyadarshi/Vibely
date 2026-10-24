import { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Play,
  Pause,
  Trash2,
  Edit2,
  Clock,
  Music,
  ArrowLeft,
  ListMusic,
  Lock,
  Globe,
  AlertCircle,
  Loader2,
  Check,
  X,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { formatTime } from '../utils/format';

export const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { deletePlaylist, updatePlaylist, removeSongFromPlaylist } = usePlaylists();

  const [playlist, setPlaylist] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Edit modal state
  const [editOpen, setEditOpen] = useState(false);
  const [editName, setEditName] = useState('');
  const [editDesc, setEditDesc] = useState('');
  const [editPublic, setEditPublic] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Delete confirmation state
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const fetchPlaylist = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/playlists/${id}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error?.message || 'Could not load playlist');
      }
      setPlaylist(data.data);
      setEditName(data.data.name);
      setEditDesc(data.data.description || '');
      setEditPublic(data.data.isPublic !== undefined ? data.data.isPublic : true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlaylist();
  }, [id]);

  const isOwner = useMemo(() => {
    if (!user || !playlist || !playlist.owner) return false;
    const ownerId = playlist.owner.id || playlist.owner._id || playlist.owner;
    return ownerId.toString() === (user.id || user._id).toString();
  }, [user, playlist]);

  const totalDuration = useMemo(() => {
    if (!playlist || !playlist.songs) return 0;
    return playlist.songs.reduce((acc, song) => acc + (song.duration || 0), 0);
  }, [playlist]);

  const handlePlayAll = () => {
    if (!playlist || !playlist.songs || playlist.songs.length === 0) return;

    const firstSong = playlist.songs[0];
    const isFirstPlaying =
      currentTrack &&
      (currentTrack.id || currentTrack._id) === (firstSong.id || firstSong._id) &&
      isPlaying;

    if (isFirstPlaying) {
      togglePlay();
    } else {
      playTrack(firstSong, playlist.songs);
    }
  };

  const handlePlaySong = (song) => {
    playTrack(song, playlist.songs);
  };

  const handleRemoveSong = async (e, songId) => {
    e.stopPropagation();
    const res = await removeSongFromPlaylist(id, songId);
    if (res.success) {
      setPlaylist((prev) => ({
        ...prev,
        songs: prev.songs.filter((s) => (s.id || s._id) !== songId),
      }));
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editName.trim()) return;

    setUpdating(true);
    const res = await updatePlaylist(id, {
      name: editName.trim(),
      description: editDesc.trim(),
      isPublic: editPublic,
    });
    setUpdating(false);

    if (res.success) {
      setPlaylist(res.data);
      setEditOpen(false);
    }
  };

  const handleDeletePlaylist = async () => {
    setDeleting(true);
    const res = await deletePlaylist(id);
    setDeleting(false);
    if (res.success) {
      navigate('/library');
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex-1 max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-white">Playlist Unavailable</h2>
        <p className="text-xs text-slate-400">{error || 'This playlist could not be found.'}</p>
        <Link
          to="/library"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-slate-200 text-xs font-semibold hover:bg-slate-700"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Library
        </Link>
      </div>
    );
  }

  const songs = playlist.songs || [];
  const firstCover = songs.length > 0 && songs[0]?.coverUrl ? songs[0].coverUrl : null;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-32">
      {/* Top back navigation */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Your Library
        </Link>
      </div>

      {/* Playlist Hero Banner */}
      <div className="flex flex-col md:flex-row items-center md:items-end gap-5 sm:gap-6 bg-gradient-to-b from-slate-900/90 to-slate-950/60 p-5 sm:p-8 rounded-3xl border border-slate-800/80 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        {/* Big Cover Artwork */}
        <div className="relative w-36 h-36 sm:w-52 sm:h-52 rounded-2xl overflow-hidden shadow-2xl bg-slate-900 border border-slate-700/60 shrink-0 flex items-center justify-center">
          {firstCover ? (
            <img src={firstCover} alt={playlist.name} className="w-full h-full object-cover" />
          ) : (
            <ListMusic className="w-16 h-16 text-slate-600" />
          )}
        </div>

        {/* Playlist Metadata */}
        <div className="flex-1 space-y-3 text-center md:text-left z-10 min-w-0">
          <div className="flex items-center justify-center md:justify-start gap-2">
            <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              Playlist
            </span>
            <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 flex items-center gap-1">
              {playlist.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
              {playlist.isPublic ? 'Public' : 'Private'}
            </span>
          </div>

          <h1 className="text-2xl sm:text-5xl font-black text-white tracking-tight leading-tight truncate">
            {playlist.name}
          </h1>

          {playlist.description && (
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              {playlist.description}
            </p>
          )}

          <div className="text-xs text-slate-400 flex items-center justify-center md:justify-start gap-2 pt-1 flex-wrap">
            <span className="font-semibold text-white">
              {playlist.owner?.name || 'Vibely User'}
            </span>
            <span>&bull;</span>
            <span>
              {songs.length} {songs.length === 1 ? 'song' : 'songs'}
            </span>
            <span>&bull;</span>
            <span>{formatTime(totalDuration)} total</span>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          {songs.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-xl shadow-emerald-500/30 transform hover:scale-105 active:scale-95 transition-all cursor-pointer"
              aria-label="Play All Songs"
            >
              <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-current ml-0.5" />
            </button>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => setEditOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer min-h-[40px]"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-rose-950/60 text-slate-400 hover:text-rose-400 border border-slate-800 hover:border-rose-500/40 text-xs font-semibold transition-all cursor-pointer min-h-[40px]"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tracklist Table */}
      {songs.length === 0 ? (
        <div className="text-center py-16 space-y-3 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8">
          <Music className="w-10 h-10 text-slate-600 mx-auto" />
          <h3 className="text-base font-bold text-slate-300">This playlist is empty</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Explore the music catalogue and click the playlist button on any track to add it here.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20"
            >
              Explore Music
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl overflow-x-auto shadow-xl">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-slate-800/80 text-slate-500 font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 hidden md:table-cell">Album</th>
                <th className="py-3 px-4 hidden sm:table-cell">Genre</th>
                <th className="py-3 px-4 text-right w-24">
                  <Clock className="w-3.5 h-3.5 inline ml-auto" />
                </th>
                {isOwner && <th className="py-3 px-4 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {songs.map((song, index) => {
                const sId = song.id || song._id;
                const isCurrent =
                  currentTrack && (currentTrack.id || currentTrack._id) === sId;
                const isCurrentPlaying = isCurrent && isPlaying;

                return (
                  <tr
                    key={sId}
                    onClick={() => handlePlaySong(song)}
                    className={`group hover:bg-slate-800/60 transition-colors cursor-pointer ${
                      isCurrent ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    {/* Track Number / Play Trigger */}
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      <div className="flex items-center justify-center">
                        {isCurrentPlaying ? (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full"></span>
                            <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="w-3.5 h-3.5 fill-current text-white hidden group-hover:block" />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Title & Artist */}
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-10 h-10 rounded-lg object-cover shrink-0 border border-slate-800"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/songs/${sId}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`font-bold truncate hover:underline block ${
                              isCurrent ? 'text-emerald-400' : 'text-slate-100 group-hover:text-white'
                            }`}
                          >
                            {song.title}
                          </Link>
                          <div className="text-slate-400 truncate text-[11px]">
                            {song.artist}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Album */}
                    <td className="py-3 px-4 text-slate-400 hidden md:table-cell truncate">
                      {song.album || 'Single'}
                    </td>

                    {/* Genre */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700/60">
                        {song.genre}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {formatTime(song.duration)}
                    </td>

                    {/* Owner Action: Remove Track */}
                    {isOwner && (
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={(e) => handleRemoveSong(e, sId)}
                          aria-label="Remove from playlist"
                          className="text-slate-500 hover:text-rose-400 transition-colors p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Playlist Modal */}
      {editOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <h3 className="text-lg font-bold text-white">Edit Playlist Details</h3>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-300">Description</label>
                <textarea
                  rows="3"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full px-3.5 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <span className="text-xs font-bold text-slate-200">Public Playlist</span>
                <input
                  type="checkbox"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  className="w-4 h-4 accent-emerald-500 cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="px-5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center space-y-4 shadow-2xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-base font-bold text-white">Delete "{playlist.name}"?</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              This will permanently delete this playlist from your library. This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                disabled={deleting}
                className="px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-600 text-white text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1.5"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                Delete Playlist
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlaylistDetail;
