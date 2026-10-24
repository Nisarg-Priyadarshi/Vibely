import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Bookmark,
  Play,
  Pause,
  Clock,
  Trash2,
  LogIn,
  Heart,
  ListPlus,
  Loader2,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useSongLists } from '../context/SongListContext';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from '../components/AddToPlaylistModal';

export const PlayLater = () => {
  const { user } = useAuth();
  const {
    playLater,
    loadingPlayLater,
    errorPlayLater,
    togglePlayLater,
    isFavorite,
    toggleFavorite,
    fetchPlayLater,
  } = useSongLists();
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [activeModalSong, setActiveModalSong] = useState(null);

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center px-[24px] py-[64px]">
        <div className="max-w-[560px] w-full bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-[32px] sm:p-[40px] text-center space-y-[20px]">
          <div className="w-[64px] h-[64px] rounded-[4px] bg-[#303030] text-[#ff7a1a] flex items-center justify-center mx-auto">
            <Bookmark className="w-[30px] h-[30px]" />
          </div>
          <h2 className="text-[24px] font-medium text-white">Your Play Later Queue</h2>
          <p className="text-[15px] text-[#999999] leading-relaxed">
            Sign in to bookmark tracks and build your personal listen-later queue.
          </p>
          <div className="pt-[4px]">
            <Link to="/login" className="btn-white text-[14px] px-[24px] py-[12px] gap-[8px]">
              <LogIn className="w-[18px] h-[18px]" />
              Sign In to View Play Later
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const totalDuration = playLater.reduce((acc, s) => acc + (s.duration || 0), 0);

  const handlePlayAll = () => {
    if (playLater.length > 0) playTrack(playLater[0], playLater);
  };

  const handleSongPlay = (song) => {
    const sId = (song.id || song._id).toString();
    const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
    if (isCurrent) togglePlay();
    else playTrack(song, playLater);
  };

  return (
    <div className="flex-1 max-w-6xl w-full mx-auto px-[1.5rem] sm:px-[2rem] py-[2rem] sm:py-[2.5rem] flex flex-col gap-[2rem] pb-32">
      {/* Header */}
      <div className="bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-[1.75rem] sm:p-[2rem]">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-[1.5rem]">
          <div className="flex items-center gap-[1.25rem]">
            <div className="w-[4.5rem] h-[4.5rem] rounded-[4px] bg-[#303030] flex items-center justify-center shrink-0">
              <Bookmark className="w-[2rem] h-[2rem] text-[#ff7a1a]" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-mono uppercase tracking-widest text-[#999999] mb-[0.5rem]">
                Saved for Later
              </div>
              <h1 className="text-2xl sm:text-3xl font-thin text-white tracking-tight">
                Play Later
              </h1>
              <p className="text-sm text-[#999999] mt-[0.5rem]">
                {playLater.length} {playLater.length === 1 ? 'saved track' : 'saved tracks'} &bull;{' '}
                {formatTime(totalDuration)} total
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchPlayLater}
              title="Refresh"
              className="btn-graphite text-xs p-2.5"
            >
              <RefreshCw className={`w-4 h-4 ${loadingPlayLater ? 'animate-spin' : ''}`} />
            </button>
            {playLater.length > 0 && (
              <button onClick={handlePlayAll} className="btn-white text-xs px-4 py-2.5 gap-2">
                <Play className="w-4 h-4 fill-current ml-0.5" />
                Play All
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content states */}
      {loadingPlayLater && playLater.length === 0 ? (
        <div className="text-center py-20 space-y-3">
          <Loader2 className="w-8 h-8 text-[#cccccc] animate-spin mx-auto" />
          <p className="text-xs text-[#999999] font-mono">Loading saved tracks...</p>
        </div>
      ) : errorPlayLater ? (
        <div className="text-center py-16 space-y-3 bg-[#1e1e1e] border border-rose-500/20 rounded-[4px] p-6">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <p className="text-xs text-rose-300">{errorPlayLater}</p>
          <button
            onClick={fetchPlayLater}
            className="text-xs text-[#ff7a1a] hover:underline font-medium"
          >
            Try Again
          </button>
        </div>
      ) : playLater.length === 0 ? (
        <div className="text-center py-[3rem] space-y-[1.5rem] bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] p-[2rem]">
          <div className="w-[4.5rem] h-[4.5rem] rounded-[4px] bg-[#303030] flex items-center justify-center mx-auto">
            <Bookmark className="w-[2rem] h-[2rem] text-[#888888]" />
          </div>
          <div className="space-y-[0.5rem]">
            <h3 className="text-lg font-medium text-[#ffffff]">Your Play Later list is empty</h3>
            <p className="text-sm text-[#999999] max-w-md mx-auto leading-relaxed">
              Bookmark songs as you explore to easily find and listen to them when you have time.
            </p>
          </div>
          <div className="pt-[0.5rem]">
            <Link to="/" className="btn-white text-sm px-6 py-3">
              Explore Music Catalogue
            </Link>
          </div>
        </div>
      ) : (
        <div className="bg-[#1e1e1e] border border-[rgba(255,255,255,0.07)] rounded-[4px] overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[500px]">
            <thead>
              <tr className="border-b border-[rgba(255,255,255,0.07)] text-[#666666] font-mono text-[11px] uppercase tracking-wider">
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
            <tbody className="divide-y divide-[rgba(255,255,255,0.04)]">
              {playLater.map((song, index) => {
                const sId = (song.id || song._id).toString();
                const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
                const isCurrentPlaying = isCurrent && isPlaying;
                const fav = isFavorite(sId);

                return (
                  <tr
                    key={sId}
                    onClick={() => handleSongPlay(song)}
                    className={`group hover:bg-[rgba(255,255,255,0.03)] transition-colors cursor-pointer ${
                      isCurrent ? 'bg-[rgba(255,255,255,0.04)]' : ''
                    }`}
                  >
                    <td className="py-3 px-4 text-center text-[#666666] font-mono">
                      <div className="flex items-center justify-center">
                        {isCurrentPlaying ? (
                          <div className="flex items-end gap-0.5 h-3.5">
                            <span className="w-0.5 h-2 bg-white vbar vbar-1 rounded-sm" />
                            <span className="w-0.5 h-3 bg-white vbar vbar-3 rounded-sm" />
                            <span className="w-0.5 h-2 bg-white vbar vbar-5 rounded-sm" />
                          </div>
                        ) : (
                          <>
                            <span className="group-hover:hidden">{index + 1}</span>
                            <Play className="w-3.5 h-3.5 fill-current text-white hidden group-hover:block ml-0.5" />
                          </>
                        )}
                      </div>
                    </td>

                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <img
                          src={song.coverUrl}
                          alt={song.title}
                          className="w-9 h-9 rounded-[3px] object-cover shrink-0 border border-[rgba(255,255,255,0.07)]"
                        />
                        <div className="min-w-0">
                          <Link
                            to={`/songs/${sId}`}
                            onClick={(e) => e.stopPropagation()}
                            className={`font-semibold truncate hover:underline block ${
                              isCurrent ? 'text-[#ff7a1a]' : 'text-[#ffffff] group-hover:text-white'
                            }`}
                          >
                            {song.title}
                          </Link>
                          <div className="text-[#999999] truncate text-[11px]">{song.artist}</div>
                        </div>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-[#999999] hidden md:table-cell truncate">
                      {song.album || 'Single'}
                    </td>

                    <td className="py-3 px-4 hidden sm:table-cell">
                      <span className="text-[10px] font-medium px-2 py-0.5 rounded-[2px] bg-[#303030] text-[#cccccc]">
                        {song.genre}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right text-[#999999] font-mono">
                      {formatTime(song.duration)}
                    </td>

                    <td className="py-3 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => toggleFavorite(song)}
                          title={fav ? 'Favourited' : 'Add to Favourites'}
                          className={`p-1.5 rounded-[3px] transition-colors cursor-pointer ${
                            fav
                              ? 'text-rose-400 bg-rose-950/30'
                              : 'text-[#666666] hover:text-[#cccccc] hover:bg-[rgba(255,255,255,0.06)]'
                          }`}
                        >
                          <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-rose-400' : ''}`} />
                        </button>

                        <button
                          onClick={() => setActiveModalSong(song)}
                          title="Add to Playlist"
                          className="p-1.5 rounded-[3px] text-[#666666] hover:text-[#cccccc] hover:bg-[rgba(255,255,255,0.06)] transition-colors cursor-pointer"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>

                        <button
                          onClick={() => togglePlayLater(song)}
                          title="Remove from Play Later"
                          className="p-1.5 rounded-[3px] text-[#ff7a1a] hover:text-[#ff9a52] hover:bg-[#ff7a1a]/10 transition-colors cursor-pointer"
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

export default PlayLater;
