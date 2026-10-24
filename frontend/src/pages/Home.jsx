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
  CheckCircle2,
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
    }, 250);

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
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col gap-8 pb-32">
      {/* Top Welcome Notification */}
      {user ? (
        <div className="bg-[#181818] border border-white/5 rounded-[4px] p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-[#242424] border border-white/10 flex items-center justify-center text-[#ffffff] font-semibold text-xs uppercase">
              {user.name.charAt(0)}
            </div>
            <div>
              <span className="text-[10px] text-[#00e599] font-mono uppercase tracking-wider block">
                Session Active
              </span>
              <span className="text-sm font-medium text-[#f2f2f2]">
                Welcome back, {user.name}
              </span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-[#999999] bg-[#121212] border border-white/5 px-3 py-1 rounded-[4px]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#00e599]" />
            <span>Catalogue ready</span>
          </div>
        </div>
      ) : (
        <div className="bg-[#181818] border border-white/5 rounded-[4px] p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <img
              src="/vibely-logo.png"
              alt="Vibely logo"
              className="w-10 h-10 rounded-[4px] object-contain border border-white/10 shrink-0 bg-[#121212]"
            />
            <div>
              <span className="text-[10px] text-[#00e599] font-mono uppercase tracking-wider block">
                Listen Together
              </span>
              <span className="text-sm font-medium text-[#f2f2f2]">
                Vibely: High-fidelity synchronized music streaming
              </span>
            </div>
          </div>
          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end shrink-0">
            <Link
              to="/login"
              className="btn-graphite text-xs px-3.5 py-2 text-center flex-1 sm:flex-initial"
            >
              Log In
            </Link>
            <Link
              to="/register"
              className="btn-white text-xs px-3.5 py-2 text-center flex-1 sm:flex-initial"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}

      {/* Featured Editorial Spotlight Banner */}
      {featuredTrack && !searchQuery && selectedGenre === 'All' && (
        <div className="relative rounded-[4px] overflow-hidden bg-[#181818] border border-white/5 p-6 sm:p-8 flex flex-col md:flex-row items-center gap-6">
          <div className="relative w-40 h-40 sm:w-48 sm:h-48 rounded-[4px] overflow-hidden shrink-0 shadow-xl border border-white/10 group">
            <img
              src={featuredTrack.coverUrl}
              alt={featuredTrack.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-[2px] bg-[#121212]/90 text-[10px] font-bold text-[#ffffff] uppercase tracking-wider border border-white/10">
              Spotlight
            </div>
          </div>

          {/* Editorial Content */}
          <div className="flex-1 space-y-3.5 text-center md:text-left z-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#00e599]">
              Featured Recording
            </div>

            <h1 className="text-3xl sm:text-4xl font-extralight tracking-tight text-[#ffffff] leading-tight">
              {featuredTrack.title}
            </h1>

            <p className="text-[#cccccc] text-sm font-normal">
              By <span className="text-[#ffffff] font-medium">{featuredTrack.artist}</span> &bull; {featuredTrack.genre} &bull; {featuredTrack.album || 'Single'}
            </p>

            <p className="text-xs text-[#999999] max-w-xl leading-relaxed">
              Synchronized real-time playback streaming directly in high fidelity. Share listening rooms and discover new tracks with low latency.
            </p>

            <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
              <button
                onClick={handlePlayFeatured}
                className="btn-white text-xs px-6 py-2.5 flex items-center"
              >
                {isFeaturedPlaying ? (
                  <>
                    <Pause className="w-4 h-4 fill-current mr-2" />
                    <span>Pause</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current mr-2" />
                    <span>Play Now</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Music Catalogue Header & Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl sm:text-2xl font-light text-[#ffffff] tracking-tight">
              Trending Catalogue
            </h2>
            <p className="text-xs text-[#999999]">
              Stream royalty-free tracks and discover community selections
            </p>
          </div>

          {/* Search Input (Graphite background, 4px radius, 1px inset hairline) */}
          <div className="relative w-full sm:w-80">
            <input
              type="text"
              placeholder="Search artists, tracks, genres..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[4px] bg-[#1e1e1e] border border-white/5 text-[#ffffff] placeholder-[#666666] text-xs focus:outline-none focus:border-white/20 transition-colors"
            />
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-[#999999] hover:text-[#ffffff]"
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
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
            {genres.map((genre) => (
              <button
                key={genre}
                onClick={() => setSelectedGenre(genre)}
                className={`px-3 py-1.5 rounded-[4px] text-xs font-medium whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-[#ffffff] text-[#121212]'
                    : 'bg-[#1e1e1e] hover:bg-[#282828] text-[#cccccc] border border-white/5'
                }`}
              >
                {genre}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Track Grid */}
      <div>
        {loading ? (
          // Loading Skeleton Grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div
                key={i}
                className="bg-[#181818] border border-white/5 rounded-[4px] p-3.5 space-y-3 animate-pulse"
              >
                <div className="aspect-square bg-[#222222] rounded-[4px]"></div>
                <div className="h-3.5 bg-[#262626] rounded-[2px] w-3/4"></div>
                <div className="h-3 bg-[#1e1e1e] rounded-[2px] w-1/2"></div>
              </div>
            ))}
          </div>
        ) : error ? (
          // Error State
          <div className="p-8 rounded-[4px] bg-[#1a1515] border border-rose-500/30 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
            <h3 className="font-medium text-[#ffffff] text-sm">Unable to Load Catalogue</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
            <button
              onClick={fetchSongs}
              className="btn-graphite text-xs px-4 py-2 mt-2 inline-flex items-center justify-center"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Connection
            </button>
          </div>
        ) : songs.length === 0 ? (
          // Empty State
          <div className="p-12 rounded-[4px] bg-[#181818] border border-white/5 text-center space-y-3 max-w-md mx-auto">
            <Music className="w-8 h-8 text-[#666666] mx-auto" />
            <h3 className="font-medium text-[#ffffff] text-sm">No tracks found</h3>
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
                className="btn-graphite text-xs px-4 py-2"
              >
                Reset Filters
              </button>
            )}
          </div>
        ) : (
          // Track Grid
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-4">
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
