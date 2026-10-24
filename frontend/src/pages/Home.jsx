import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Music,
  Search,
  X,
  Play,
  Pause,
  RefreshCw,
  AlertCircle,
  Heart,
  Bookmark,
  ListPlus,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { useSongLists } from '../context/SongListContext';
import { SongCard } from '../components/SongCard';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

export const Home = () => {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { isFavorite, toggleFavorite, isInPlayLater, togglePlayLater } = useSongLists();

  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [featuredModalOpen, setFeaturedModalOpen] = useState(false);

  // Fetch genres
  useEffect(() => {
    const fetchGenres = async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/songs/genres`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setGenres(['All', ...json.data]);
        }
      } catch (err) {
        console.warn('Could not fetch genres:', err.message);
      }
    };
    fetchGenres();
  }, []);

  // Fetch songs based on genre and search
  const fetchSongs = async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (selectedGenre && selectedGenre !== 'All') {
        params.append('genre', selectedGenre);
      }
      if (searchQuery.trim()) {
        params.append('q', searchQuery.trim());
      }

      const res = await fetch(`${API_BASE_URL}/songs?${params.toString()}`);
      if (!res.ok) {
        throw new Error(`Failed to load songs (HTTP ${res.status})`);
      }
      const json = await res.json();
      if (json.success) {
        setSongs(json.data || []);
      } else {
        throw new Error(json.error?.message || 'Could not retrieve songs.');
      }
    } catch (err) {
      setError(err.message || 'An error occurred while loading music.');
      setSongs([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const timeout = setTimeout(() => {
      fetchSongs();
    }, 250);

    return () => clearTimeout(timeout);
  }, [selectedGenre, searchQuery]);

  // Featured track (first song in catalogue)
  const featuredTrack = useMemo(() => {
    if (songs.length === 0) return null;
    return songs[0];
  }, [songs]);

  const featuredTrackId = featuredTrack ? (featuredTrack.id || featuredTrack._id).toString() : '';
  const isFeaturedPlaying =
    featuredTrack &&
    currentTrack &&
    (currentTrack.id || currentTrack._id).toString() === featuredTrackId &&
    isPlaying;

  const featuredIsFav = featuredTrack ? isFavorite(featuredTrackId) : false;
  const featuredIsPlayLater = featuredTrack ? isInPlayLater(featuredTrackId) : false;

  const handlePlayFeatured = () => {
    if (!featuredTrack) return;
    if (currentTrack && (currentTrack.id || currentTrack._id).toString() === featuredTrackId) {
      togglePlay();
    } else {
      playTrack(featuredTrack, songs);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-[24px] sm:px-[40px] pt-[32px] sm:pt-[40px] pb-32 flex flex-col gap-[40px] sm:gap-[56px]">
      {/* Logged-out Welcome Banner (only shown if not authenticated) */}
      {!user && (
        <div className="relative rounded-[6px] overflow-hidden bg-gradient-to-r from-[#181818] via-[#1c1c1c] to-[#161616] border border-white/[0.08] p-[24px] sm:p-[32px] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[24px] shadow-xl">
          <div className="flex items-center gap-[20px]">
            <img
              src="/vibely-logo.png"
              alt="Vibely"
              className="w-[56px] h-[56px] rounded-[6px] object-contain shrink-0 shadow-lg"
            />
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[12px] font-bold text-[#ff7a1a] uppercase tracking-wider">
                  Listen Together In Sync
                </span>
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a1a] animate-ping" />
              </div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-white mt-[6px]">
                Stream Music Collaboratively in Real-Time
              </h2>
              <p className="text-[14px] leading-relaxed text-[#999999] mt-[6px] max-w-xl">
                Create synchronized listening rooms, chat with friends, and discover royalty-free tracks with zero latency.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-[12px] shrink-0 self-stretch sm:self-auto">
            <Link
              to="/login"
              className="btn-graphite text-[14px] px-[20px] py-[11px] flex-1 sm:flex-initial text-center"
            >
              Sign In
            </Link>
            <Link
              to="/register"
              className="btn-accent text-[14px] px-[22px] py-[11px] flex-1 sm:flex-initial text-center shadow-lg"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      {/* Featured Spotlight Track Banner */}
      {featuredTrack && !searchQuery && selectedGenre === 'All' && (
        <div className="relative rounded-[6px] overflow-hidden bg-[#161616] border border-white/[0.08] p-[28px] sm:p-[40px] shadow-2xl">
          {/* Ambient blurred glow from cover artwork */}
          <div
            className="absolute -top-12 -left-12 w-96 h-96 bg-cover bg-center filter blur-3xl opacity-20 pointer-events-none scale-125"
            style={{ backgroundImage: `url(${featuredTrack.coverUrl})` }}
          />

            <div className="relative z-10 flex flex-col md:flex-row items-center md:items-start gap-y-[32px] md:gap-y-0 md:gap-x-[48px]">
            {/* Artwork Card */}
            <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-[6px] overflow-hidden shrink-0 shadow-2xl border border-white/10 group">
              <img
                src={featuredTrack.coverUrl}
                alt={featuredTrack.title}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute top-2.5 left-2.5 px-2.5 py-1 rounded-[3px] bg-[#121212]/90 backdrop-blur-md text-[10px] font-bold text-white uppercase tracking-wider border border-white/10 flex items-center gap-1.5 shadow-md">
                <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a1a] animate-pulse" />
                Featured
              </div>
            </div>

            {/* Track Info & Actions */}
            <div className="flex-1 space-y-[16px] text-center md:text-left min-w-0">
              <div className="flex items-center justify-center md:justify-start gap-2">
                <span className="text-[11px] font-mono uppercase tracking-widest text-[#ff7a1a] font-semibold">
                  Spotlight Recording
                </span>
                <span className="text-white/20">&bull;</span>
                <span className="text-xs text-[#cccccc] font-medium px-2 py-0.5 rounded-[3px] bg-white/[0.05] border border-white/10">
                  {featuredTrack.genre}
                </span>
              </div>

              <h1 className="text-3xl sm:text-5xl font-extralight tracking-tight text-white leading-tight">
                {featuredTrack.title}
              </h1>

              <p className="text-[#cccccc] text-sm">
                By <span className="text-white font-semibold">{featuredTrack.artist}</span> &bull; {featuredTrack.album || 'Single'}
              </p>

              <p className="text-[14px] text-[#999999] max-w-xl leading-relaxed">
                Synchronized real-time playback streaming directly in high fidelity. Share listening rooms and discover new tracks with low latency.
              </p>

              {/* Action Buttons Toolbar */}
              <div className="pt-[8px] flex flex-wrap items-center justify-center md:justify-start gap-[12px]">
                <button
                  onClick={handlePlayFeatured}
                  className="btn-accent text-[14px] px-[22px] py-[12px] flex items-center gap-[8px] shadow-lg"
                >
                  {isFeaturedPlaying ? (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pause Playback</span>
                    </>
                  ) : (
                    <>
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                      <span>Play Now</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => toggleFavorite(featuredTrack)}
                  aria-label={featuredIsFav ? 'Remove from favourites' : 'Add to favourites'}
                  className={`btn-graphite text-[14px] px-[18px] py-[12px] flex items-center gap-[8px] transition-all ${
                    featuredIsFav
                      ? 'text-rose-500 border-rose-500/40 bg-rose-500/10'
                      : 'text-[#cccccc] hover:text-white'
                  }`}
                >
                  <Heart className={`w-4 h-4 transition-transform active:scale-125 ${featuredIsFav ? 'fill-rose-500 text-rose-500' : ''}`} />
                  <span>{featuredIsFav ? 'Favorited' : 'Favorite'}</span>
                </button>

                <button
                  onClick={() => togglePlayLater(featuredTrack)}
                  aria-label={featuredIsPlayLater ? 'Remove from Play Later' : 'Save to Play Later'}
                  className={`btn-graphite text-[14px] px-[18px] py-[12px] flex items-center gap-[8px] transition-all ${
                    featuredIsPlayLater
                      ? 'text-[#ff7a1a] border-[#ff7a1a]/40 bg-[#ff7a1a]/10'
                      : 'text-[#cccccc] hover:text-white'
                  }`}
                >
                  <Bookmark className={`w-4 h-4 transition-transform active:scale-125 ${featuredIsPlayLater ? 'fill-[#ff7a1a] text-[#ff7a1a]' : ''}`} />
                  <span>{featuredIsPlayLater ? 'In Play Later' : 'Play Later'}</span>
                </button>

                <button
                  onClick={() => setFeaturedModalOpen(true)}
                  className="btn-graphite text-[14px] px-[18px] py-[12px] flex items-center gap-[8px] text-[#cccccc] hover:text-white"
                >
                  <ListPlus className="w-4 h-4" />
                  <span>Add to Playlist</span>
                </button>

                <Link
                  to={`/songs/${featuredTrackId}`}
                  className="btn-ghost text-[14px] px-[14px] py-[12px] flex items-center gap-[8px] text-[#999999] hover:text-white ml-auto"
                >
                  <span>Track Details</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          </div>

          <AddToPlaylistModal
            song={featuredTrack}
            isOpen={featuredModalOpen}
            onClose={() => setFeaturedModalOpen(false)}
          />
        </div>
      )}

      {/* Music Catalogue Header & Controls */}
      <div className="space-y-[24px] sm:space-y-[28px]">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-[20px]">
          <div>
            <h2 className="text-[26px] sm:text-[30px] font-light text-white tracking-tight flex items-center gap-[10px]">
              Trending Catalogue
              <span className="w-1.5 h-1.5 rounded-full bg-[#ff7a1a]" />
            </h2>
            <p className="text-[14px] text-[#999999] mt-[8px]">
              Stream royalty-free tracks and discover community selections
            </p>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search artists, tracks, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[4px] bg-[#1e1e1e] border border-white/10 text-white placeholder-[#666666] text-xs focus:outline-none focus:border-[#ff7a1a]/60 transition-colors shadow-inner"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999999] hover:text-white cursor-pointer"
                aria-label="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            ) : (
              <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-[#999999]">
                <Search className="w-4 h-4" />
              </div>
            )}
          </div>
        </div>

        {/* Genre Filter Tabs */}
        {genres.length > 0 && (
          <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
            {genres.map((genre) => {
              const active = selectedGenre === genre;
              return (
                <button
                  key={genre}
                  onClick={() => setSelectedGenre(genre)}
                  className={`px-3.5 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-all cursor-pointer ${
                    active
                      ? 'bg-white text-[#121212] font-semibold shadow-md'
                      : 'bg-[#1c1c1c] hover:bg-[#252525] text-[#cccccc] hover:text-white border border-white/[0.06]'
                  }`}
                >
                  {genre}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Track Grid */}
      <div>
        {loading ? (
          // Loading Skeleton Grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {[...Array(12)].map((_, i) => (
              <div
                key={i}
                className="bg-[#181818] border border-white/5 rounded-[6px] p-2.5 space-y-3 animate-pulse"
              >
                <div className="aspect-square bg-[#242424] rounded-[4px]"></div>
                <div className="h-3.5 bg-[#282828] rounded-[2px] w-3/4"></div>
                <div className="h-3 bg-[#202020] rounded-[2px] w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 rounded-[6px] bg-[#1a1515] border border-rose-500/30 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
            <h3 className="font-medium text-white text-sm">Unable to Load Catalogue</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
            <button
              onClick={fetchSongs}
              className="btn-graphite text-xs px-4 py-2 mt-2 inline-flex items-center justify-center cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Connection
            </button>
          </div>
        ) : songs.length === 0 ? (
          // Empty State
          <div className="p-12 rounded-[6px] bg-[#181818] border border-white/5 text-center space-y-3 max-w-md mx-auto">
            <Music className="w-8 h-8 text-[#666666] mx-auto" />
            <h3 className="font-medium text-white text-sm">No tracks found</h3>
            <p className="text-xs text-[#999999]">
              {searchQuery
                ? `No music matches "${searchQuery}". Try a different keyword.`
                : 'No songs are available in this genre.'}
            </p>
            {(searchQuery || selectedGenre !== 'All') && (
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedGenre('All');
                }}
                className="btn-graphite text-xs px-4 py-2 cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          // Responsive 6-column Track Grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4 sm:gap-5">
            {songs.map((song) => (
              <SongCard key={song.id || song._id} song={song} queue={songs} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
