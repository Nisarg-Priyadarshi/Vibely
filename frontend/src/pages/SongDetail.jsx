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
    return () => { isMounted = false; };
  }, [id]);

  const sId = song ? (song.id || song._id).toString() : null;
  const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
  const isCurrentPlaying = isCurrent && isPlaying;
  const fav = song ? isFavorite(sId) : false;
  const playLater = song ? isInPlayLater(sId) : false;

  const handlePlayClick = () => {
    if (!song) return;
    if (isCurrent) togglePlay();
    else playTrack(song, relatedSongs.length > 0 ? [song, ...relatedSongs] : [song]);
  };

  const handleShare = () => {
    navigator.clipboard?.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center min-h-[50vh]">
        <Loader2 className="w-8 h-8 text-[#cccccc] animate-spin" />
      </div>
    );
  }

  if (error || !song) {
    return (
      <div className="flex-1 max-w-md mx-auto w-full px-4 py-20 text-center space-y-5">
        <div className="w-14 h-14 rounded-[4px] bg-[#1e1e1e] border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
          <AlertCircle className="w-7 h-7" />
        </div>
        <div className="space-y-1">
          <h2 className="text-xl font-medium text-white">Track Unavailable</h2>
          <p className="text-xs text-[#999999] leading-relaxed">
            {error || 'The requested song does not exist or has been removed from the catalogue.'}
          </p>
        </div>
        <button
          onClick={() => navigate('/')}
          className="btn-graphite text-xs px-5 py-2.5 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Explore
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-10 flex flex-col gap-8 pb-32">
      {/* Back */}
      <div>
        <button
          onClick={() => navigate(-1)}
          className="btn-ghost text-xs px-3 py-2 gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
      </div>

      {/* Hero Card */}
      <div className="bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-5 sm:p-8">
        <div className="flex flex-col md:flex-row items-center md:items-start gap-6 sm:gap-8">
          {/* Cover Art */}
          <div className="relative w-44 sm:w-60 max-w-full aspect-square rounded-[4px] overflow-hidden shrink-0 bg-[#121212]">
            <img
              src={song.coverUrl}
              alt={song.title}
              className="w-full h-full object-cover transition-transform duration-500 hover:scale-105"
            />
            {isCurrentPlaying && (
              <div className="absolute bottom-3 right-3 bg-[#121212]/90 px-2 py-1.5 rounded-[2px] flex items-end gap-0.5 border border-[rgba(255,255,255,0.1)]">
                <span className="w-1 h-2.5 bg-white vbar vbar-1 rounded-sm" />
                <span className="w-1 h-3.5 bg-white vbar vbar-3 rounded-sm" />
                <span className="w-1 h-2 bg-white vbar vbar-5 rounded-sm" />
              </div>
            )}
          </div>

          {/* Details */}
          <div className="flex-1 flex flex-col justify-between gap-6 w-full text-center md:text-left">
            <div className="space-y-3">
              {/* Genre & Metadata chips */}
              <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap">
                <span className="text-[10px] font-semibold uppercase tracking-widest px-2 py-0.5 rounded-[2px] bg-[#303030] text-[#cccccc]">
                  {song.genre}
                </span>
                <span className="text-[#666666] text-xs">&bull;</span>
                <span className="text-xs text-[#999999] flex items-center gap-1 font-mono">
                  <Clock className="w-3.5 h-3.5 text-[#666666]" />
                  {formatTime(song.duration)}
                </span>
                {song.createdAt && (
                  <>
                    <span className="text-[#666666] text-xs hidden sm:inline">&bull;</span>
                    <span className="text-xs text-[#999999] items-center gap-1 hidden sm:inline-flex font-mono">
                      <Calendar className="w-3.5 h-3.5 text-[#666666]" />
                      {new Date(song.createdAt).toLocaleDateString(undefined, {
                        year: 'numeric', month: 'short', day: 'numeric',
                      })}
                    </span>
                  </>
                )}
              </div>

              {/* Title & Artist */}
              <div>
                <h1 className="text-2xl sm:text-4xl font-thin text-white tracking-tight leading-tight">
                  {song.title}
                </h1>
                <p className="text-base sm:text-lg text-[#cccccc] font-medium mt-1">
                  {song.artist}
                </p>
              </div>

              {/* Album */}
              <div className="flex items-center justify-center md:justify-start gap-2 text-xs text-[#999999]">
                <Disc3 className="w-4 h-4 text-[#666666]" />
                <span>Album:</span>
                <span className="font-medium text-[#ffffff]">{song.album || 'Single Release'}</span>
              </div>

              {/* Tags */}
              {song.tags && song.tags.length > 0 && (
                <div className="flex items-center justify-center md:justify-start gap-1.5 flex-wrap pt-1">
                  <Tag className="w-3.5 h-3.5 text-[#666666]" />
                  {song.tags.map((t, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] px-2 py-0.5 rounded-[2px] bg-[#303030] text-[#999999]"
                    >
                      #{t}
                    </span>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-center md:justify-start gap-2 flex-wrap pt-2">
              {/* Play/Pause */}
              <button
                onClick={handlePlayClick}
                className="btn-white text-xs px-5 py-2.5 gap-2"
              >
                {isCurrentPlaying ? (
                  <><Pause className="w-4 h-4 fill-current" /><span>Pause</span></>
                ) : (
                  <><Play className="w-4 h-4 fill-current ml-0.5" /><span>Play Track</span></>
                )}
              </button>

              {/* Favourite */}
              <button
                onClick={() => toggleFavorite(song)}
                title={fav ? 'Remove from Favourites' : 'Add to Favourites'}
                aria-label={fav ? 'Remove from Favourites' : 'Add to Favourites'}
                className={`btn-graphite text-xs px-4 py-2.5 gap-2 ${fav ? 'text-rose-400' : ''}`}
              >
                <Heart className={`w-4 h-4 ${fav ? 'fill-rose-400 text-rose-400' : ''}`} />
                <span className="hidden sm:inline">{fav ? 'Favourited' : 'Favourite'}</span>
              </button>

              {/* Play Later */}
              <button
                onClick={() => togglePlayLater(song)}
                title={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
                aria-label={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
                className={`btn-graphite text-xs px-4 py-2.5 gap-2 ${playLater ? 'text-[#ff7a1a]' : ''}`}
              >
                {playLater ? (
                  <BookmarkCheck className="w-4 h-4 text-[#ff7a1a]" />
                ) : (
                  <Bookmark className="w-4 h-4" />
                )}
                <span className="hidden sm:inline">{playLater ? 'In Play Later' : 'Play Later'}</span>
              </button>

              {/* Add to Playlist */}
              <button
                onClick={() => setPlaylistModalOpen(true)}
                title="Add to Playlist"
                className="btn-graphite text-xs px-4 py-2.5 gap-2"
              >
                <ListPlus className="w-4 h-4" />
                <span className="hidden sm:inline">Add to Playlist</span>
              </button>

              {/* Share */}
              <button
                onClick={handleShare}
                title="Copy Link"
                className="btn-graphite text-xs px-4 py-2.5 gap-2"
              >
                <Share2 className="w-4 h-4" />
                <span className="hidden sm:inline">{copied ? 'Copied!' : 'Share'}</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Related Tracks */}
      {relatedSongs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b border-[rgba(255,255,255,0.07)] pb-3">
            <div className="flex items-center gap-2">
              <Music2 className="w-4 h-4 text-[#cccccc]" />
              <h2 className="text-base sm:text-lg font-medium text-white">
                More in <span className="text-[#ffffff]">{song.genre}</span>
              </h2>
            </div>
            <Link to="/" className="text-xs text-[#ff7a1a] hover:underline font-medium">
              Explore all &rarr;
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3.5 sm:gap-4">
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

      <AddToPlaylistModal
        song={song}
        isOpen={playlistModalOpen}
        onClose={() => setPlaylistModalOpen(false)}
      />
    </div>
  );
};

export default SongDetail;
