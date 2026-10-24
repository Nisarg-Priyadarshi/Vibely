import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ListPlus, Heart, Bookmark, BookmarkCheck } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useSongLists } from '../context/SongListContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from './AddToPlaylistModal';

export const SongCard = ({ song, queue = [] }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const { isFavorite, toggleFavorite, isInPlayLater, togglePlayLater } = useSongLists();
  const [modalOpen, setModalOpen] = useState(false);

  const sId = (song.id || song._id).toString();
  const isCurrent = currentTrack && (currentTrack.id || currentTrack._id).toString() === sId;
  const isCurrentPlaying = isCurrent && isPlaying;
  const fav = isFavorite(sId);
  const playLater = isInPlayLater(sId);

  const handlePlayClick = (e) => {
    e.stopPropagation();
    if (isCurrent) {
      togglePlay();
    } else {
      playTrack(song, queue);
    }
  };

  const handleAddClick = (e) => {
    e.stopPropagation();
    setModalOpen(true);
  };

  const handleFavoriteClick = (e) => {
    e.stopPropagation();
    toggleFavorite(song);
  };

  const handlePlayLaterClick = (e) => {
    e.stopPropagation();
    togglePlayLater(song);
  };

  return (
    <>
      <div
        onClick={handlePlayClick}
        className={`group relative p-3 sm:p-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between ${
          isCurrent
            ? 'bg-slate-800/95 border border-emerald-500/40 shadow-xl shadow-emerald-500/10'
            : 'bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 shadow-md hover:shadow-xl'
        }`}
      >
        {/* Cover Artwork Container */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-2.5 sm:mb-3 bg-slate-950">
          <img
            src={song.coverUrl}
            alt={song.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Play Overlay (Visible on hover on desktop, or when active song, with touch-accessible tap) */}
          <div
            className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-200 flex items-center justify-center ${
              isCurrent ? 'opacity-100' : 'opacity-0 sm:group-hover:opacity-100 pointer-events-none sm:pointer-events-auto'
            }`}
          >
            <button
              onClick={handlePlayClick}
              aria-label={isCurrentPlaying ? 'Pause song' : 'Play song'}
              className="w-11 h-11 sm:w-12 sm:h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95 bg-emerald-500 text-slate-950 shadow-emerald-500/30 cursor-pointer pointer-events-auto"
            >
              {isCurrentPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Genre Pill Tag */}
          <div className="absolute top-2 left-2 z-10 max-w-[45%]">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-md text-emerald-400 border border-slate-700/60 truncate block">
              {song.genre}
            </span>
          </div>

          {/* Top-Right Action Controls (Playlist, Play Later, Favorite) */}
          {/* Note: Visible by default on mobile (opacity-90), subtle hover on desktop (sm:opacity-0 sm:group-hover:opacity-100) */}
          <div className="absolute top-1.5 right-1.5 sm:top-2 sm:right-2 flex items-center gap-1 z-10">
            {/* Play Later Toggle */}
            <button
              onClick={handlePlayLaterClick}
              aria-label={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
              title={playLater ? 'In Play Later' : 'Save to Play Later'}
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all border border-slate-700/60 cursor-pointer active:scale-90 ${
                playLater
                  ? 'bg-amber-500/90 text-slate-950 opacity-100 shadow-sm'
                  : 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-amber-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              {playLater ? (
                <BookmarkCheck className="w-3.5 h-3.5" />
              ) : (
                <Bookmark className="w-3.5 h-3.5" />
              )}
            </button>

            {/* Favorite Toggle */}
            <button
              onClick={handleFavoriteClick}
              aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
              title={fav ? 'Favourited' : 'Add to favourites'}
              className={`w-8 h-8 sm:w-7 sm:h-7 rounded-full backdrop-blur-md flex items-center justify-center transition-all border border-slate-700/60 cursor-pointer active:scale-90 ${
                fav
                  ? 'bg-slate-950/90 text-rose-500 opacity-100 shadow-sm'
                  : 'bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-rose-400 opacity-90 sm:opacity-0 sm:group-hover:opacity-100'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>

            {/* Add to playlist button */}
            <button
              onClick={handleAddClick}
              aria-label="Add to playlist"
              title="Add to playlist"
              className="w-8 h-8 sm:w-7 sm:h-7 rounded-full bg-slate-950/80 hover:bg-slate-900 text-slate-300 hover:text-emerald-400 backdrop-blur-md flex items-center justify-center opacity-90 sm:opacity-0 sm:group-hover:opacity-100 transition-all border border-slate-700/60 cursor-pointer active:scale-90"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Audio Indicator for active playing song */}
          {isCurrentPlaying && (
            <div className="absolute bottom-2 right-2 bg-slate-950/85 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1 z-10 border border-emerald-500/30">
              <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full"></span>
              <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
              <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150 rounded-full"></span>
            </div>
          )}
        </div>

        {/* Song Details */}
        <div className="space-y-1 min-w-0">
          <Link
            to={`/songs/${sId}`}
            onClick={(e) => e.stopPropagation()}
            title={`View ${song.title} details`}
            className={`font-bold text-xs sm:text-sm tracking-tight truncate hover:underline block ${
              isCurrent ? 'text-emerald-400 font-extrabold' : 'text-slate-100 group-hover:text-white'
            }`}
          >
            {song.title}
          </Link>

          <p className="text-[11px] sm:text-xs text-slate-400 truncate hover:text-slate-300">
            {song.artist}
          </p>

          <div className="flex items-center justify-between text-[10px] sm:text-[11px] text-slate-500 pt-0.5 font-mono">
            <span className="truncate max-w-[65%]">{song.album || 'Single'}</span>
            <span className="shrink-0">{formatTime(song.duration)}</span>
          </div>
        </div>
      </div>

      {/* Add To Playlist Modal */}
      <AddToPlaylistModal
        song={song}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
};

export default SongCard;
