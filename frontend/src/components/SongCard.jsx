import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ListPlus, Heart, Bookmark } from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useSongLists } from '../context/SongListContext';
import { formatTime } from '../utils/format';
import { AddToPlaylistModal } from './AddToPlaylistModal';
import { SafeImage } from './SafeImage';

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
        className={`group cursor-pointer flex flex-col p-2.5 rounded-[6px] transition-all duration-200 ${
          isCurrent
            ? 'bg-[#1e1e1e] shadow-[inset_0_0_0_1px_rgba(105,159,255,0.4)]'
            : 'bg-[#181818]/70 hover:bg-[#202020] border border-white/[0.04] hover:border-white/[0.12] hover:shadow-lg hover:-translate-y-0.5'
        }`}
      >
        {/* Cover Artwork Container (1:1 aspect, 4px radius) */}
        <div className="relative aspect-square w-full rounded-[4px] overflow-hidden bg-[#141414] mb-2.5 shadow-sm">
          <SafeImage
            src={song.coverUrl}
            alt={song.title}
            songTitle={song.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />

          {/* Top Left: Genre Tag */}
          <div className="absolute top-2 left-2 z-10">
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[2px] bg-[#121212]/90 text-[#e0e0e0] border border-white/10 backdrop-blur-sm">
              {song.genre}
            </span>
          </div>

          {/* Top Right: Favorite Quick Badge (ALWAYS VISIBLE if favorited, else shows on hover) */}
          <div
            className={`absolute top-2 right-2 z-10 transition-opacity duration-200 ${
              fav ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handleFavoriteClick}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
              title={fav ? 'Favorited' : 'Favorite'}
              className={`w-7 h-7 rounded-[4px] flex items-center justify-center transition-all cursor-pointer backdrop-blur-sm shadow-md ${
                fav
                  ? 'bg-rose-500/25 text-rose-500 border border-rose-500/50 hover:bg-rose-500/35'
                  : 'bg-[#121212]/80 text-white/80 hover:text-white hover:bg-[#121212] border border-white/10'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>
          </div>

          {/* Center: Play Button Overlay */}
          <div
            className={`absolute inset-0 bg-black/40 backdrop-blur-[1px] transition-opacity duration-200 flex items-center justify-center ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handlePlayClick}
              aria-label={isCurrentPlaying ? 'Pause song' : 'Play song'}
              className="w-11 h-11 rounded-full bg-white text-[#121212] hover:scale-110 active:scale-95 transition-all flex items-center justify-center shadow-xl cursor-pointer"
            >
              {isCurrentPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Live Playing Wave Indicator */}
          {isCurrentPlaying && (
            <div className="absolute bottom-2 right-2 bg-[#121212]/90 backdrop-blur-sm px-1.5 py-1 rounded-[2px] flex items-end gap-0.5 border border-white/10">
              <span className="w-1 h-2.5 bg-[#ff7a1a] vbar vbar-1 rounded-sm" />
              <span className="w-1 h-3.5 bg-[#ff7a1a] vbar vbar-3 rounded-sm" />
              <span className="w-1 h-2 bg-[#ff7a1a] vbar vbar-5 rounded-sm" />
            </div>
          )}
        </div>

        {/* Track Title, Artist & Quick Action Bar */}
        <div className="space-y-1.5 min-w-0">
          <Link
            to={`/songs/${sId}`}
            onClick={(e) => e.stopPropagation()}
            className={`font-semibold text-sm leading-snug truncate block transition-colors ${
              isCurrent ? 'text-[#ff7a1a]' : 'text-white hover:text-[#ff7a1a]'
            }`}
            title={song.title}
          >
            {song.title}
          </Link>

          <p className="text-xs text-[#999999] truncate" title={song.artist}>
            {song.artist}
          </p>

          {/* Action & Metadata Row */}
          <div className="flex items-center justify-between text-[11px] text-[#777777] pt-1 border-t border-white/[0.04]">
            <span className="font-mono">{formatTime(song.duration)}</span>

            <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={handleFavoriteClick}
                aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
                title={fav ? 'Favorited' : 'Add to favorites'}
                className={`p-1 rounded-[3px] transition-colors cursor-pointer ${
                  fav
                    ? 'text-rose-500 hover:text-rose-400'
                    : 'text-[#888888] hover:text-white hover:bg-white/10'
                }`}
              >
                <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handlePlayLaterClick}
                aria-label={playLater ? 'Remove from play later' : 'Save for later'}
                title={playLater ? 'In Play Later' : 'Save for later'}
                className={`p-1 rounded-[3px] transition-colors cursor-pointer ${
                  playLater
                    ? 'text-[#ff7a1a] hover:text-[#ff9a52]'
                    : 'text-[#888888] hover:text-white hover:bg-white/10'
                }`}
              >
                <Bookmark className={`w-3.5 h-3.5 ${playLater ? 'fill-current' : ''}`} />
              </button>

              <button
                onClick={handleAddClick}
                aria-label="Add to playlist"
                title="Add to playlist"
                className="p-1 rounded-[3px] text-[#888888] hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
              >
                <ListPlus className="w-3.5 h-3.5" />
              </button>
            </div>
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
