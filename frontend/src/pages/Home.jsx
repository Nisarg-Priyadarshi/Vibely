import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Music,
  Radio,
  Search,
  X,
  Play,
  Pause,
  RefreshCw,
  Sparkles,
  AlertCircle,
  Filter,
  CheckCircle2,
  Volume2,
} from 'lucide-react';
import { API_BASE_URL } from '../config/api';
import { useAuth } from '../context/AuthContext';
import { usePlayer } from '../context/PlayerContext';
import { SongCard } from '../components/SongCard';

export const Home = () => {
  const { user } = useAuth();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();

  const [songs, setSongs] = useState([]);
  const [genres, setGenres] = useState([]);
  const [selectedGenre, setSelectedGenre] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
    }, 250); // Debounce search input

    return () => clearTimeout(timeout);
  }, [selectedGenre, searchQuery]);

  // Choose a featured track (first song or active song)
  const featuredTrack = useMemo(() => {
    if (songs.length === 0) return null;
    return songs[0];
  }, [songs]);

  const isFeaturedPlaying =
    featuredTrack &&
    currentTrack &&
    (currentTrack.id || currentTrack._id) === (featuredTrack.id || featuredTrack._id) &&
    isPlaying;

  const handlePlayFeatured = () => {
    if (!featuredTrack) return;
    if (currentTrack && (currentTrack.id || currentTrack._id) === (featuredTrack.id || featuredTrack._id)) {
      togglePlay();
    } else {
      playTrack(featuredTrack, songs);
    }
  };

  return (
    <div className="flex-1 max-w-7xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-32">
      {/* Top Banner / Auth Welcome */}
      {user ? (
        <div className="bg-gradient-to-r from-emerald-950/40 via-slate-900/60 to-cyan-950/40 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-500 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-sm uppercase shadow-md shadow-emerald-500/20 shrink-0">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">
                Session Active
              </span>
              <span className="text-sm font-bold text-slate-200 truncate block">
                Welcome back, {user.name}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-400 bg-slate-950/60 border border-slate-800 px-3 py-1 rounded-full shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
            <span>Catalogue ready</span>
          </div>
        </div>
      ) : (
        <div className="bg-gradient-to-r from-emerald-950/30 via-slate-900/70 to-teal-950/30 border border-slate-800/90 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/vibely-logo.png"
              alt="Vibely logo"
              className="w-10 h-10 sm:w-11 sm:h-11 rounded-xl object-contain shadow-md border border-slate-800 shrink-0"
            />
            <div>
              <span className="text-xs text-emerald-400 font-semibold uppercase tracking-wider block">
                Listen Together
              </span>
              <span className="text-sm font-bold text-slate-200">
                Welcome to Vibely — Synchronized Music Streaming
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
            <Link
              to="/login"
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 transition-all text-center flex-1 sm:flex-initial"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="px-3.5 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-xs font-bold text-slate-950 transition-all shadow-md shadow-emerald-500/20 text-center flex-1 sm:flex-initial"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      {/* Featured Spotlight Banner */}
      {featuredTrack && !searchQuery && selectedGenre === 'All' && (
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-r from-slate-900 via-slate-900/90 to-emerald-950/40 border border-slate-800/80 shadow-2xl p-5 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative w-36 h-36 sm:w-48 sm:h-48 rounded-2xl overflow-hidden shrink-0 shadow-2xl border border-slate-700/60 group">
            <img
              src={featuredTrack.coverUrl}
              alt={featuredTrack.title}
              className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-slate-950/80 text-[10px] font-bold text-emerald-400 uppercase tracking-wider border border-slate-700/60">
              Featured Track
            </div>
          </div>

          <div className="flex-1 space-y-3 text-center md:text-left z-10">
            <div className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Sparkles className="w-3.5 h-3.5" />
              Spotlight Release
            </div>

            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              {featuredTrack.title}
            </h1>

            <p className="text-slate-300 text-sm font-medium">
              By <span className="text-emerald-400 font-bold">{featuredTrack.artist}</span> &bull; {featuredTrack.genre} &bull; {featuredTrack.album || 'Single'}
            </p>

            <p className="text-xs text-slate-400 max-w-lg leading-relaxed">
              Experience dynamic audio streaming powered by HTML5 Audio. Stream with low latency, seamless seeking, and synchronized playback.
            </p>

            <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
              <button
                onClick={handlePlayFeatured}
                className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm shadow-xl shadow-emerald-500/25 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
              >
                {isFeaturedPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Play Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Catalogue Controls: Search and Genre Tabs */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              Explore Music
            </h2>
            <p className="text-xs text-slate-400">
              Discover royalty-free demo tracks legally playable in your browser
            </p>
          </div>

          {/* Search Bar */}
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              placeholder="Search by title, artist, genre..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-9 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 placeholder-slate-500 text-xs sm:text-sm focus:outline-none focus:border-emerald-500/80 focus:ring-1 focus:ring-emerald-500/30 transition-all"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-white"
                aria-label="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Genre Filter Tabs */}
        {genres.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all duration-150 cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20 font-bold'
                    : 'bg-slate-900/80 hover:bg-slate-800 text-slate-300 border border-slate-800'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Catalogue Grid */}
      <div>
        {loading ? (
          // Loading Skeleton Grid
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
            {[...Array(10)].map((_, i) => (
              <div
                key={i}
                className="bg-slate-900/40 border border-slate-800/60 rounded-2xl p-3 sm:p-3.5 space-y-3 animate-pulse"
              >
                <div className="aspect-square bg-slate-800/60 rounded-xl"></div>
                <div className="h-4 bg-slate-800/80 rounded-md w-3/4"></div>
                <div className="h-3 bg-slate-800/40 rounded-md w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
            <h3 className="font-bold text-slate-200">Unable to Load Catalogue</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
            <button
              onClick={fetchSongs}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry
            </button>
          </div>
        ) : songs.length === 0 ? (
          // Empty State
          <div className="p-12 rounded-2xl bg-slate-900/30 border border-slate-800/60 text-center space-y-3 max-w-md mx-auto">
            <Music className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-300">No tracks found</h3>
            <p className="text-xs text-slate-500">
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
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700 transition-all cursor-pointer"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          // Track Grid
          <div className="grid grid-cols-1 min-[360px]:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3.5 sm:gap-4">
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
