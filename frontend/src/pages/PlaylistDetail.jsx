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
  Heart,
  Bookmark,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { usePlaylists } from '../context/PlaylistContext';
import { useSongLists } from '../context/SongListContext';
import { formatTime } from '../utils/format';

export const PlaylistDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { deletePlaylist, updatePlaylist, removeSongFromPlaylist } = usePlaylists();
  const { isFavorite, toggleFavorite, isInPlayLater, togglePlayLater } = useSongLists();

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
        <Loader2 className="w-7 h-7 text-[#00e599] animate-spin" />
      </div>
    );
  }

  if (error || !playlist) {
    return (
      <div className="flex-1 max-w-lg mx-auto px-4 py-20 text-center space-y-4">
        <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-[#ffffff]">Playlist Unavailable</h2>
        <p className="text-xs text-[#999999]">{error || 'This playlist could not be found.'}</p>
        <Link
          to="/library"
          className="btn-graphite text-xs px-4 py-2"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
          Back to Library
        </Link>
      </div>
    );
  }

  const songs = playlist.songs || [];
  const firstCover = songs.length > 0 && songs[0]?.coverUrl ? songs[0].coverUrl : null;

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 pb-32">
      {/* Top back navigation */}
      <div>
        <Link
          to="/library"
          className="inline-flex items-center gap-1.5 text-xs text-[#999999] hover:text-[#ffffff] transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Your Library
        </Link>
      </div>

      {/* Playlist Hero Banner */}
      <div className="relative rounded-[6px] overflow-hidden bg-[#181818] border border-white/[0.08] p-6 sm:p-8 shadow-2xl">
        {firstCover && (
          <div
            className="absolute top-0 right-0 w-96 h-96 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none scale-125"
            style={{ backgroundImage: `url(${firstCover})` }}
          />
        )}

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-end gap-6 sm:gap-8">
          {/* Big Cover Artwork */}
          <div className="relative w-44 h-44 sm:w-52 sm:h-52 rounded-[6px] overflow-hidden shadow-2xl bg-[#141414] border border-white/10 shrink-0 flex items-center justify-center">
            {firstCover ? (
              <img src={firstCover} alt={playlist.name} className="w-full h-full object-cover" />
            ) : (
              <ListMusic className="w-16 h-16 text-[#666666]" />
            )}
          </div>

          {/* Playlist Metadata */}
          <div className="flex-1 space-y-3 text-center md:text-left min-w-0">
            <div className="flex items-center justify-center md:justify-start gap-2">
              <span className="text-[10px] font-mono uppercase tracking-widest text-[#ff7a1a] font-bold">
                Playlist
              </span>
              <span className="text-[10px] font-medium px-2 py-0.5 rounded-[2px] bg-[#222222] text-[#cccccc] border border-white/10 flex items-center gap-1">
                {playlist.isPublic ? <Globe className="w-2.5 h-2.5" /> : <Lock className="w-2.5 h-2.5" />}
                {playlist.isPublic ? 'Public' : 'Private'}
              </span>
            </div>

            <h1 className="text-3xl sm:text-5xl font-extralight text-white tracking-tight leading-tight">
              {playlist.name}
            </h1>

            {playlist.description && (
              <p className="text-xs sm:text-sm text-[#cccccc] max-w-2xl leading-relaxed">
                {playlist.description}
              </p>
            )}

            <div className="text-xs text-[#999999] flex items-center justify-center md:justify-start gap-2 pt-1">
              <span className="font-semibold text-white">
                {playlist.owner?.name || 'Vibely User'}
              </span>
              <span>&bull;</span>
              <span>
                {songs.length} {songs.length === 1 ? 'song' : 'songs'}
              </span>
              <span>&bull;</span>
              <span className="font-mono">{formatTime(totalDuration)} total</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action Controls Bar */}
      <div className="flex items-center justify-between gap-4 border-b border-white/[0.08] pb-6">
        <div className="flex items-center gap-4">
          {songs.length > 0 && (
            <button
              onClick={handlePlayAll}
              className="btn-accent text-xs px-5 py-2.5 flex items-center gap-2 shadow-lg cursor-pointer"
              aria-label="Play All Songs"
            >
              <Play className="w-4 h-4 fill-current ml-0.5" />
              <span>Play All</span>
            </button>
          )}

          {isOwner && (
            <>
              <button
                onClick={() => setEditOpen(true)}
                className="btn-graphite text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
              >
                <Edit2 className="w-3.5 h-3.5" />
                Edit
              </button>

              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="btn-danger text-xs px-3.5 py-2 flex items-center gap-1.5 cursor-pointer"
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
        <div className="text-center py-16 space-y-3 bg-[#181818] border border-white/[0.06] rounded-[4px] p-8">
          <Music className="w-8 h-8 text-[#666666] mx-auto" />
          <h3 className="text-sm font-semibold text-[#ffffff]">This playlist is empty</h3>
          <p className="text-xs text-[#999999] max-w-sm mx-auto">
            Explore the music catalogue and click the playlist button on any track to add it here.
          </p>
          <div className="pt-2">
            <Link
              to="/"
              className="btn-white text-xs px-4 py-2"
            >
              Explore Music
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#181818] border border-white/[0.08] rounded-[4px] overflow-hidden shadow-xl">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-white/[0.08] text-[#777777] font-mono text-[11px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">#</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4 hidden md:table-cell">Album</th>
                <th className="py-3 px-4 hidden sm:table-cell">Genre</th>
                <th className="py-3 px-4 text-center w-28">Actions</th>
                <th className="py-3 px-4 text-right w-20">
                  <Clock className="w-3.5 h-3.5 inline ml-auto" />
                </th>
                {isOwner && <th className="py-3 px-4 w-12 text-center"></th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {songs.map((song, index) => {
                const sId = (song.id || song._id).toString();
                const isCurrent =
                  currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
                const isCurrentPlaying = isCurrent && isPlaying;
                const fav = isFavorite(sId);
                const playLater = isInPlayLater(sId);

                return (
                  <tr
                    key={sId}
                    onClick={() => handlePlaySong(song)}
                    className={`group hover:bg-[#202020] transition-colors cursor-pointer ${
                      isCurrent ? 'bg-[#222222]' : ''
                    }`}
                  >
                    {/* Track Number / Play Trigger */}
                    <td className="py-3 px-4 text-center text-[#777777] font-mono">
                      <div className="flex items-center justify-center">
                        {isCurrentPlaying ? (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-[#ff7a1a] vbar vbar-1 rounded-sm" />
                            <span className="w-1 h-4 bg-[#ff7a1a] vbar vbar-3 rounded-sm" />
                            <span className="w-1 h-2 bg-[#ff7a1a] vbar vbar-5 rounded-sm" />
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
                          className="w-10 h-10 rounded-[4px] object-cover shrink-0 bg-[#242424]"
                        />
                        <div className="min-w-0">
                          <div
                            className={`font-semibold truncate ${
                              isCurrent ? 'text-[#ff7a1a]' : 'text-white group-hover:text-[#ff7a1a]'
                            }`}
                          >
                            {song.title}
                          </div>
                          <div className="text-[#999999] truncate text-[11px]">
                            {song.artist}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Album */}
                    <td className="py-3 px-4 text-[#999999] hidden md:table-cell truncate">
                      {song.album || 'Single'}
                    </td>

                    {/* Genre */}
                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded-[2px] bg-[#222222] text-[#cccccc] border border-white/[0.06]">
                        {song.genre}
                      </span>
                    </td>

                    {/* Actions: Favorite & Play Later */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleFavorite(song)}
                          aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
                          title={fav ? 'Favorited' : 'Favorite'}
                          className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                            fav ? 'text-rose-500' : 'text-[#777777] hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
                        </button>

                        <button
                          onClick={() => togglePlayLater(song)}
                          aria-label={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
                          title={playLater ? 'In Play Later' : 'Play Later'}
                          className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                            playLater ? 'text-[#ff7a1a]' : 'text-[#777777] hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Bookmark className={`w-3.5 h-3.5 ${playLater ? 'fill-current' : ''}`} />
                        </button>
                      </div>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-right text-[#999999] font-mono">
                      {formatTime(song.duration)}
                    </td>

                    {/* Owner Action: Remove Track */}
                    {isOwner && (
                      <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={(e) => handleRemoveSong(e, sId)}
                          aria-label="Remove from playlist"
                          title="Remove from playlist"
                          className="text-[#777777] hover:text-rose-400 transition-colors p-1"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-xs">
          <div className="w-full max-w-md bg-[#1e1e1e] border border-[rgba(255,255,255,0.1)] rounded-[4px] p-6 sm:p-8 shadow-2xl relative">
            <button
              onClick={() => setEditOpen(false)}
              className="absolute top-4 right-4 p-1.5 rounded-[4px] text-[#999999] hover:text-[#ffffff] hover:bg-[#282828] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>

            <form onSubmit={handleSaveEdit} className="space-y-4">
              <h3 className="text-base font-bold text-[#ffffff]">Edit Playlist Details</h3>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#cccccc]">Name</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full input-flat text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#cccccc]">Description</label>
                <textarea
                  rows="3"
                  value={editDesc}
                  onChange={(e) => setEditDesc(e.target.value)}
                  className="w-full input-flat text-xs resize-none"
                />
              </div>

              <div className="flex items-center justify-between p-3 rounded-[4px] bg-[#161616] border border-[rgba(255,255,255,0.06)]">
                <span className="text-xs font-semibold text-[#ffffff]">Public Playlist</span>
                <input
                  type="checkbox"
                  checked={editPublic}
                  onChange={(e) => setEditPublic(e.target.checked)}
                  className="w-4 h-4 accent-[#00e599] cursor-pointer"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditOpen(false)}
                  className="btn-ghost text-xs px-3 py-2"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updating || !editName.trim()}
                  className="btn-white text-xs px-4 py-2 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {updating && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#000000]/80 backdrop-blur-xs">
          <div className="w-full max-w-sm bg-[#1e1e1e] border border-[rgba(255,255,255,0.1)] rounded-[4px] p-6 text-center space-y-4 shadow-2xl">
            <div className="w-10 h-10 rounded-[4px] bg-rose-950/40 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <Trash2 className="w-5 h-5" />
            </div>
            <h3 className="text-sm font-bold text-[#ffffff]">Delete "{playlist.name}"?</h3>
            <p className="text-xs text-[#999999] leading-relaxed">
              This will permanently delete this playlist from your library. This action cannot be undone.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setDeleteConfirmOpen(false)}
                className="btn-ghost text-xs px-4 py-2"
              >
                Cancel
              </button>
              <button
                onClick={handleDeletePlaylist}
                disabled={deleting}
                className="btn-white text-xs px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white disabled:opacity-50"
              >
                {deleting && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1" />}
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
