import { useState } from 'react';
import { Play, Pause, ListPlus } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from './AddToPlaylistModal';

export const SongCard = ({ song, queue = [] }) => {
  const { currentTrack, isPlaying, playTrack, togglePlay } = usePlayer();
  const [modalOpen, setModalOpen] = useState(false);

  const isCurrent = currentTrack && (currentTrack.id || currentTrack._id) === (song.id || song._id);
  const isCurrentPlaying = isCurrent && isPlaying;

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

  return (
    <>
      <div
        onClick={handlePlayClick}
        className={`group relative p-3.5 rounded-2xl transition-all duration-300 cursor-pointer flex flex-col justify-between ${
          isCurrent
            ? 'bg-slate-800/90 border border-emerald-500/40 shadow-xl shadow-emerald-500/10'
            : 'bg-slate-900/60 hover:bg-slate-800/60 border border-slate-800/80 hover:border-slate-700/80 shadow-md hover:shadow-xl'
        }`}
      >
        {/* Cover Artwork Container */}
        <div className="relative aspect-square w-full rounded-xl overflow-hidden mb-3 bg-slate-950">
          <img
            src={song.coverUrl}
            alt={song.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />

          {/* Hover/Active Play Overlay */}
          <div
            className={`absolute inset-0 bg-slate-950/40 transition-opacity duration-200 flex items-center justify-center ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handlePlayClick}
              aria-label={isCurrentPlaying ? 'Pause song' : 'Play song'}
              className="w-12 h-12 rounded-full flex items-center justify-center shadow-xl transition-all duration-200 transform hover:scale-110 active:scale-95 bg-emerald-500 text-slate-950 shadow-emerald-500/30"
            >
              {isCurrentPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Genre Pill Tag */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-950/70 backdrop-blur-md text-emerald-400 border border-slate-700/60">
              {song.genre}
            </span>
          </div>

          {/* Add to playlist button (top-right hover) */}
          <button
            onClick={handleAddClick}
            aria-label="Add to playlist"
            title="Add to playlist"
            className="absolute top-2 right-2 w-7 h-7 rounded-full bg-slate-950/70 hover:bg-slate-900 text-slate-300 hover:text-emerald-400 backdrop-blur-md flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity border border-slate-700/60 cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5" />
          </button>

          {/* Live Audio Indicator for active playing song */}
          {isCurrentPlaying && (
            <div className="absolute bottom-2 right-2 bg-slate-950/80 backdrop-blur-md px-2 py-1 rounded-md flex items-center gap-1">
              <span className="w-1 h-3 bg-emerald-400 animate-pulse rounded-full"></span>
              <span className="w-1 h-4 bg-emerald-400 animate-pulse delay-75 rounded-full"></span>
              <span className="w-1 h-2 bg-emerald-400 animate-pulse delay-150 rounded-full"></span>
            </div>
          )}
        </div>

        {/* Song Details */}
        <div className="space-y-1">
          <h3
            className={`font-bold text-sm tracking-tight truncate ${
              isCurrent ? 'text-emerald-400 font-extrabold' : 'text-slate-100 group-hover:text-white'
            }`}
          >
            {song.title}
          </h3>

          <p className="text-xs text-slate-400 truncate hover:text-slate-300">
            {song.artist}
          </p>

          <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 font-mono">
            <span className="truncate max-w-[120px]">{song.album || 'Single'}</span>
            <span>{formatTime(song.duration)}</span>
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
