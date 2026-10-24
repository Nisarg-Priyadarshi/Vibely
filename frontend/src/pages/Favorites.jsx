import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Heart,
  Play,
  Pause,
  Clock,
  Music,
  Trash2,
  LogIn,
  Bookmark,
  BookmarkCheck,
  ListPlus,
  Loader2,
  AlertCircle,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSongLists } from '../context/SongListContext';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

export const Favorites = () => {
  const { user } = useAuth();
  const { favorites, loadingFavorites, errorFavorites, toggleFavorite, isInPlayLater, togglePlayLater, fetchFavorites } =
    useSongLists();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const navigate = useNavigate();

  const [activeModalSong, setActiveModalSong] = useState(null);

  // Unauthenticated view
  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-4 py-20">
        <div className="max-w-md w-full bg-slate-900/80 border border-slate-800 rounded-3xl p-8 text-center space-y-4 shadow-2xl backdrop-blur-xl">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto shadow-lg shadow-rose-500/10">
            <Heart className="w-7 h-7 fill-rose-500/20" />
          </div>
          <h2 className="text-xl font-bold text-white">Your Favourite Tracks</h2>
          <p className="text-xs text-slate-400 leading-relaxed">
            Sign in to save and stream your favourite music in one personalized collection.
          </p>
          <div className="pt-2">
            <Link
              to="/login"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all hover:scale-105"
            >
              <LogIn className="w-4 h-4" />
              Sign In to View Favourites
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = favorites.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = () => {
    if (favorites.length > 0) {
      playTrack(favorites[0], favorites);
    }
  };

  const handleSongPlay = (song) => {
    const sId = (song.id || song._id).toString();
    const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, favorites);
    }
  };

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-3.5 sm:px-6 py-6 sm:py-8 flex flex-col gap-6 sm:gap-8 pb-32">
      {/* Header Banner */}
      <div className="relative rounded-3xl bg-gradient-to-r from-rose-950/40 via-slate-900/80 to-slate-900/60 border border-rose-500/20 p-5 sm:p-8 overflow-hidden shadow-2xl backdrop-blur-xl">
        <div
          className="absolute -top-12 -left-12 w-64 h-64 rounded-full opacity-20 blur-3xl pointer-events-none"
          style={{ backgroundImage: `radial-gradient(circle, #f43f5e 0%, transparent 70%)` }}
        />

        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5 sm:gap-6">
          <div className="flex items-center gap-3.5 sm:gap-6">
            <div className="w-14 h-14 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-rose-600 to-pink-500 flex items-center justify-center shadow-xl shadow-rose-500/25 shrink-0 ring-4 ring-rose-500/20">
              <Heart className="w-7 h-7 sm:w-10 sm:h-10 text-white fill-white" />
            </div>
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[11px] font-bold uppercase tracking-wider">
                <Sparkles className="w-3 h-3" />
                Personal Collection
              </div>
              <h1 className="text-xl sm:text-3xl font-black text-white tracking-tight truncate">
                Favorite Tracks
              </h1>
              <p className="text-xs text-slate-400">
                {favorites.length} {favorites.length === 1 ? 'track' : 'tracks'} &bull;{' '}
                {formatTime(totalDuration)} total playtime
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={fetchFavorites}
              title="Refresh Favourites"
              className="p-2.5 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs transition-all cursor-pointer min-h-[40px] min-w-[40px] flex items-center justify-center"
            >
              <RefreshCw className={`w-4 h-4 ${loadingFavorites ? 'animate-spin' : ''}`} />
            </button>

            {favorites.length > 0 && (
              <button
                onClick={handlePlayAll}
                className="flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Play className="w-4 h-4 fill-current ml-0.5" />
                Play All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Loading state */}
      {loadingFavorites && favorites.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-rose-400 animate-spin mx-auto" />
          <p className="text-xs text-slate-400 font-mono">Loading your favourites...</p>
        </div>
      ) : errorFavorites ? (
        <div className="text-center py-16 space-y-3 bg-slate-900/40 border border-rose-500/20 rounded-2xl p-6">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">{errorFavorites}</p>
          <button
            onClick={fetchFavorites}
            className="text-xs text-emerald-400 hover:underline font-semibold"
          >
            Try Again
          </button>
        </div>
      ) : favorites.length === 0 ? (
        /* Empty State */
        <div className="text-center py-20 space-y-4 bg-slate-900/30 border border-slate-800/60 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-full bg-slate-800/80 flex items-center justify-center mx-auto text-slate-500">
            <Heart className="w-8 h-8 text-slate-500" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-200">No favourite tracks yet</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              Explore music and click the heart icon on any track to save it here for quick access.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs shadow-md shadow-emerald-500/20 transition-all hover:scale-105"
            >
              Explore Music Catalogue
            </Link>
          </div>
        </div>
      ) : (
        /* Tracklist Table */
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
                <th className="py-3 px-4 w-32 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {favorites.map((song, index) => {
                const sId = (song.id || song._id).toString();
                const isCurrent =
                  currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
                const isCurrentPlaying = isCurrent && isPlaying;
                const inPlayLater = isInPlayLater(sId);

                return (
                  <tr
                    key={sId}
                    onClick={() => handleSongPlay(song)}
                    className={`group hover:bg-slate-800/60 transition-colors cursor-pointer ${
                      isCurrent ? 'bg-slate-800/40' : ''
                    }`}
                  >
                    {/* Number / Play Indicator */}
                    <td className="py-3 px-4 text-center text-slate-500 font-mono">
                      <div className="flex items-center justify-center">
                        {isCurrentPlaying ? (
                          <div className="flex items-center gap-0.5">
                            <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full"></span>
                            <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
                            <span className="w-1 h-3.5 bg-emerald-400 animate-pulse delay-150 rounded-full"></span>
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="w-3.5 h-3.5 fill-current text-white hidden group-hover:block ml-0.5" />
                          </>
                        )}
                      </div>
                    </td>

                    {/* Artwork, Title & Artist */}
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
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/70 text-emerald-400 border border-slate-700/60">
                        {song.genre}
                      </span>
                    </td>

                    {/* Duration */}
                    <td className="py-3 px-4 text-right text-slate-400 font-mono">
                      {formatTime(song.duration)}
                    </td>

                    {/* Actions */}
                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Play Later Toggle */}
                        <button
                          onClick={() => togglePlayLater(song)}
                          title={inPlayLater ? 'In Play Later' : 'Add to Play Later'}
                          className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                            inPlayLater
                              ? 'bg-amber-500/15 border-amber-500/40 text-amber-400'
                              : 'hover:bg-slate-700 text-slate-400 hover:text-slate-200 border-transparent'
                          }`}
                        >
                          {inPlayLater ? (
                            <BookmarkCheck className="w-3.5 h-3.5" />
                          ) : (
                            <Bookmark className="w-3.5 h-3.5" />
                          )}
                        </button>

                        {/* Add to Playlist */}
                        <button
                          onClick={() => setActiveModalSong(song)}
                          title="Add to Playlist"
                          className="p-1.5 rounded-lg hover:bg-slate-700 text-slate-400 hover:text-emerald-400 transition-all cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>

                        {/* Remove from Favourites */}
                        <button
                          onClick={() => toggleFavorite(song)}
                          title="Remove from Favourites"
                          className="p-1.5 rounded-lg hover:bg-rose-950/40 text-rose-400 hover:text-rose-300 transition-all cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add To Playlist Modal */}
      {activeModalSong && (
        <AddToPlaylistModal
          song={activeModalSong}
          isOpen={!!activeModalSong}
          onClose={() => setActiveModalSong(null)}
        />
      )}
    </div>
  );
};

export default Favorites;
