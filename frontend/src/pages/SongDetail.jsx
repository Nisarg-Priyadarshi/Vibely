import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import {
  Play,
  Pause,
  Heart,
  Clock,
  Bookmark,
  BookmarkCheck,
  ListPlus,
  ArrowLeft,
  Calendar,
  Tag,
  Disc3,
  Loader2,
  AlertCircle,
  Share2,
  Music2,
  Sparkles,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { usePlayer } from '../context/PlayerContext';
import { useSongLists } from '../context/SongListContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';
import { SongCard } from '../components/SongCard';

export const SongDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { isFavorite, toggleFavorite, isInPlayLater, togglePlayLater } = useSongLists();

  const [song, setSong] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [playlistModalOpen, setPlaylistModalOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [relatedSongs, setRelatedSongs] = useState([]);

  useEffect(() => {
    let isMounted = true;
    const fetchSong = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`${API_BASE_URL}/songs/${id}`);
        const json = await res.json();
        if (!isMounted) return;

        if (res.ok && json.success && json.data) {
          setSong(json.data);
          // Fetch related tracks by genre
          if (json.data.genre) {
            try {
              const relRes = await fetch(
                `${API_BASE_URL}/songs?genre=${encodeURIComponent(json.data.genre)}&limit=6`
              );
              const relJson = await relRes.json();
              if (relJson.success && Array.isArray(relJson.data)) {
                setRelatedSongs(
                  relJson.data.filter((s) => (s.id || s._id).toString() !== id.toString())
                );
              }
            } catch (relErr) {
              console.warn('Could not fetch related songs:', relErr.message);
            }
          }
        } else {
          throw new Error(json.error?.message || 'Song not found.');
        }
      } catch (err) {
        if (!isMounted) return;
        setError(err.message || 'Failed to load song details.');
        setSong(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    fetchSong();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const sId = song ? (song.id || song._id).toString() : null;
  const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
  const isCurrentPlaying = isCurrent && isPlaying;
  const fav = song ? isFavorite(sId) : false;
  const playLater = song ? isInPlayLater(sId) : false;

  const handlePlayClick = () => {
    if (!song) return;
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, relatedSongs.length > 0 ? [song, ...relatedSongs] : [song]);
    }
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center min-h-[50vh]">
        <Loader2 className="w-10 h-10 text-emerald-400 animate-spin mb-4" />
        <p className="text-xs font-mono text-slate-400 tracking-wider uppercase animate-pulse">
          Loading track details...
        </p>
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-20 text-center space-y-5">
        <div className="w-16 h-16 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-xl">
          <AlertCircle className="w-8 h-8" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-white">Track Unavailable</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            {error || 'The requested song does not exist or has been removed from the catalogue.'}
          </p>
        </div>
        <div className="pt-2">
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold transition-all shadow-md cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Explore
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-10 pb-32">
      {/* Back button */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800/80 text-xs font-semibold transition-all cursor-pointer min-h-[40px]"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Main Track Hero Section */}
      <div className="relative rounded-3xl bg-slate-900/60 border border-slate-800/80 p-5 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-xl">
        {/* Ambient background glow from artwork */}
        <div
          className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{
            backgroundImage: `radial-gradient(circle, #10b981 0%, transparent 70%)`,
          }}
        />

        <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Cover Art */}
          <div className="relative w-44 sm:w-64 max-w-full aspect-square rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-slate-700/60 group bg-slate-950">
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            {isCurrentPlaying && (
              <div className="absolute bottom-3 right-3 bg-slate-950/80 backdrop-blur-md px-2.5 py-1.5 rounded-lg flex items-center gap-1 border border-emerald-500/30">
                <span className="w-1.5 h-3.5 bg-emerald-400 animate-pulse rounded-full"></span>
                <span className="w-1.5 h-5 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
                <span className="w-1.5 h-2.5 bg-emerald-400 animate-pulse delay-150 rounded-full"></span>
              </div>
            )}
          </div>

          {/* Details & Action Controls */}
          <div className="flex-1 flex flex-col justify-between gap-6 w-full text-center md:text-left">
            <div className="space-y-3">
              {/* Genre Pill & Metadata */}
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  {song.genre}
                </span>
                <span className="text-slate-500 text-xs">&bull;</span>
                <span className="text-xs text-slate-400 flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-slate-500" />
                  {formatTime(song.duration)}
                </span>
                {song.createdAt && (
                  <>
                    <span className="text-slate-500 text-xs hidden sm:inline">&bull;</span>
                    <span className="text-xs text-slate-400 items-center gap-1 hidden sm:inline-flex">
                      <Calendar className="w-3.5 h-3.5 text-slate-500" />
                      {new Date(song.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Artist */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight leading-tight">
                  {song.title}
                </h1>
                <p className="text-base sm:text-lg text-emerald-400/90 font-semibold mt-1">
                  {song.artist}
                </p>
              </div>

              {/* Album info */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-slate-400">
                <Disc3 className="w-4 h-4 text-slate-500" />
                <span>Album:</span>
                <span className="font-semibold text-slate-200">
                  {song.album || 'Single Release'}
                </span>
              </div>

              {/* Tags */}
              {song.tags && song.tags.length > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap pt-1">
                  <Tag className="w-3.5 h-3.5 text-slate-500 mr-1" />
                  {song.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2.5 py-0.5 rounded-lg bg-slate-800/80 text-slate-400 border border-slate-700/50"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons Row */}
            <div className="flex items-center justify-center md:justify-start gap-3 flex-wrap pt-2">
              {/* Big Play / Pause Button */}
              <button
                onClick={handlePlayClick}
                className="inline-flex items-center gap-2.5 px-6 py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-black text-sm shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isCurrentPlaying ? (
                  <>
                    <Pause className="w-5 h-5 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 fill-current ml-0.5" />
                    <span>Play Track</span>
                  </>
                )}
              </button>

              {/* Favourite Heart Button */}
              <button
                onClick={() => toggleFavorite(song)}
                title={fav ? 'Remove from Favourites' : 'Add to Favourites'}
                aria-label={fav ? 'Remove from Favourites' : 'Add to Favourites'}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  fav
                    ? 'bg-rose-500/15 border-rose-500/40 text-rose-400 hover:bg-rose-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                <Heart
                  className={`w-4 h-4 ${fav ? 'fill-rose-500 text-rose-500' : 'text-slate-400'}`}
                />
                <span className="hidden sm:inline">{fav ? 'Favourited' : 'Favourite'}</span>
              </button>

              {/* Play Later Button */}
              <button
                onClick={() => togglePlayLater(song)}
                title={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
                aria-label={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
                className={`inline-flex items-center gap-2 px-4 py-3 rounded-2xl border text-xs font-semibold transition-all cursor-pointer ${
                  playLater
                    ? 'bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25'
                    : 'bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-800'
                }`}
              >
                {playLater ? (
                  <BookmarkCheck className="w-4 h-4 text-amber-400" />
                ) : (
                  <Bookmark className="w-4 h-4 text-slate-400" />
                )}
                <span className="hidden sm:inline">{playLater ? 'In Play Later' : 'Play Later'}</span>
              </button>

              {/* Add to Playlist Button */}
              <button
                onClick={() => setPlaylistModalOpen(true)}
                title="Add to Playlist"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <ListPlus className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">Add to Playlist</span>
              </button>

              {/* Share / Copy Link */}
              <button
                onClick={handleShare}
                title="Copy Link to Track"
                className="inline-flex items-center gap-2 px-4 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
              >
                <Share2 className="w-4 h-4 text-slate-400" />
                <span className="hidden sm:inline">{copied ? 'Link Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recommended / Related in Genre */}
      {relatedSongs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              <h2 className="text-base sm:text-lg font-bold text-white">
                More in <span className="text-emerald-400">{song.genre}</span>
              </h2>
            </div>
            <Link
              to="/"
              className="text-xs text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Explore all tracks &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
            {relatedSongs.map((relSong) => (
              <SongCard
                key={relSong.id || relSong._id}
                song={relSong}
                queue={[relSong, ...relatedSongs]}
              />
            ))}
          </div>
        </div>
      )}

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={song}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </div>
  );
};

export default SongDetail;
