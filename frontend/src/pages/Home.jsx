import { useState, useEffect, useMemo } from 'react';
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
    <div className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 flex flex-col gap-10 pb-36">
      {/* Top Session Indicator (Subtle, Darkroom Style) */}
      {user && (
        <div className="bg-[#181818] border border-[rgba(255,255,255,0.08)] rounded-[4px] px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-2 h-2 rounded-full bg-[#00e599]" />
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[#999999]">Connected as</span>
              <span className="font-semibold text-[#ffffff]">{user.name}</span>
            </div>
          </div>
          <span className="text-[11px] font-mono text-[#777777] hidden sm:inline">
            Stage online
          </span>
        </div>
      )}

      {/* Featured Editorial Spotlight Banner */}
      {featuredTrack && !searchQuery && selectedGenre === 'All' && (
        <div className="relative rounded-[4px] overflow-hidden bg-[#181818] border border-[rgba(255,255,255,0.08)] p-6 sm:p-10 flex flex-col md:flex-row items-center gap-8">
          {/* Cover Art Tile */}
          <div className="relative w-44 h-44 sm:w-56 sm:h-56 rounded-[4px] overflow-hidden shrink-0 bg-[#222222]">
            <img
              src={featuredTrack.coverUrl}
              alt={featuredTrack.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-[2px] bg-[#121212]/90 text-[10px] font-bold text-[#ffffff] uppercase tracking-wider border border-[rgba(255,255,255,0.1)]">
              Spotlight
            </div>
          </div>

          {/* Editorial Content */}
          <div className="flex-1 space-y-3.5 text-center md:text-left z-10">
            <div className="text-[11px] font-mono uppercase tracking-widest text-[#00e599]">
              Featured Recording
            </div>

            <h1 className="text-3xl sm:text-5xl font-extralight tracking-tight text-[#ffffff] leading-tight">
              {featuredTrack.title}
            </h1>

            <p className="text-[#cccccc] text-sm font-medium">
              By <span className="text-[#ffffff] font-semibold">{featuredTrack.artist}</span> &bull; {featuredTrack.genre} &bull; {featuredTrack.album || 'Single'}
            </p>

            <p className="text-xs text-[#999999] max-w-xl leading-relaxed">
              Synchronized real-time playback streaming directly in high fidelity. Share listening rooms and discover new tracks with low latency.
            </p>

            <div className="pt-2 flex items-center justify-center md:justify-start gap-3">
              <button
                onClick={handlePlayFeatured}
                className="btn-white text-xs px-6 py-2.5"
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
            <h2 className="text-xl sm:text-2xl font-semibold text-[#ffffff] tracking-tight">
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
              className="w-full pl-3.5 pr-10 py-2.5 rounded-[4px] bg-[#222222] border border-[rgba(255,255,255,0.08)] text-[#ffffff] placeholder-[#777777] text-xs focus:outline-none focus:border-[rgba(255,255,255,0.25)] transition-colors"
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
                className={`px-3 py-1.5 rounded-[4px] text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  selectedGenre === genre
                    ? 'bg-[#ffffff] text-[#121212]'
                    : 'bg-[#1e1e1e] hover:bg-[#282828] text-[#cccccc] border border-[rgba(255,255,255,0.06)]'
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
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {[...Array(12)].map((_, i) => (
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
        ) : error ? (
          // Error State
          <div className="p-8 rounded-[4px] bg-[#1a1515] border border-rose-500/30 text-center space-y-3 max-w-md mx-auto">
            <AlertCircle className="w-7 h-7 text-rose-400 mx-auto" />
            <h3 className="font-semibold text-[#ffffff] text-sm">Unable to Load Catalogue</h3>
            <p className="text-xs text-rose-300/80">{error}</p>
            <button
              onClick={fetchSongs}
              className="btn-graphite text-xs px-4 py-2 mt-2"
            >
              <RefreshCw className="w-3.5 h-3.5 mr-1.5" />
              Retry Connection
            </button>
          </div>
        ) : songs.length === 0 ? (
          // Empty State
          <div className="p-12 rounded-[4px] bg-[#181818] border border-[rgba(255,255,255,0.06)] text-center space-y-3 max-w-md mx-auto">
            <Music className="w-8 h-8 text-[#666666] mx-auto" />
            <h3 className="font-semibold text-[#ffffff] text-sm">No tracks found</h3>
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
          // Track Grid (6 columns on large screens with 16px gap, matching DESIGN.md)
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
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
