import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Play, Pause, ListPlus, Heart, Bookmark } from 'lucide-react';
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
        className={`group cursor-pointer flex flex-col p-2.5 rounded-[4px] transition-colors duration-150 ${
          isCurrent
            ? 'bg-[#1e1e1e] shadow-[inset_0_0_0_1px_rgba(255,255,255,0.15)]'
            : 'bg-transparent hover:bg-[#1a1a1a]'
        }`}
      >
        {/* Cover Artwork Container (1:1 aspect, 4px radius) */}
        <div className="relative aspect-square w-full rounded-[4px] overflow-hidden bg-[#181818] mb-3">
          <img
            src={song.coverUrl}
            alt={song.title}
            loading="lazy"
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
          />

          {/* Hover Play Button Overlay */}
          <div
            className={`absolute inset-0 bg-[#000000]/40 transition-opacity duration-150 flex items-center justify-center ${
              isCurrent ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            }`}
          >
            <button
              onClick={handlePlayClick}
              aria-label={isCurrentPlaying ? 'Pause song' : 'Play song'}
              className="w-11 h-11 rounded-full bg-[#ffffff] text-[#121212] hover:scale-105 active:scale-95 transition-transform flex items-center justify-center shadow-lg cursor-pointer"
            >
              {isCurrentPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>
          </div>

          {/* Top Left: Genre Tag */}
          <div className="absolute top-2 left-2">
            <span className="text-[10px] font-semibold tracking-wider uppercase px-2 py-0.5 rounded-[2px] bg-[#121212]/85 text-[#cccccc] border border-[rgba(255,255,255,0.08)]">
              {song.genre}
            </span>
          </div>

          {/* Top Right: Actions Cluster (Favorite, Bookmark, Add to Playlist) */}
          <div className="absolute top-2 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <button
              onClick={handleFavoriteClick}
              aria-label={fav ? 'Remove from favorites' : 'Add to favorites'}
              title={fav ? 'Favorited' : 'Favorite'}
              className={`w-7 h-7 rounded-[4px] bg-[#121212]/85 hover:bg-[#121212] flex items-center justify-center border border-[rgba(255,255,255,0.1)] cursor-pointer transition-colors ${
                fav ? 'text-rose-500' : 'text-[#cccccc] hover:text-[#ffffff]'
              }`}
            >
              <Heart className={`w-3.5 h-3.5 ${fav ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handlePlayLaterClick}
              aria-label={playLater ? 'Remove from play later' : 'Save for later'}
              title={playLater ? 'In Play Later' : 'Play Later'}
              className={`w-7 h-7 rounded-[4px] bg-[#121212]/85 hover:bg-[#121212] flex items-center justify-center border border-[rgba(255,255,255,0.1)] cursor-pointer transition-colors ${
                playLater ? 'text-[#699fff]' : 'text-[#cccccc] hover:text-[#ffffff]'
              }`}
            >
              <Bookmark className={`w-3.5 h-3.5 ${playLater ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleAddClick}
              aria-label="Add to playlist"
              title="Add to playlist"
              className="w-7 h-7 rounded-[4px] bg-[#121212]/85 hover:bg-[#121212] text-[#cccccc] hover:text-[#ffffff] flex items-center justify-center border border-[rgba(255,255,255,0.1)] cursor-pointer transition-colors"
            >
              <ListPlus className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Live Playing Wave Indicator */}
          {isCurrentPlaying && (
            <div className="absolute bottom-2 right-2 bg-[#121212]/90 px-1.5 py-1 rounded-[2px] flex items-end gap-0.5 border border-[rgba(255,255,255,0.08)]">
              <span className="w-1 h-2.5 bg-[#ffffff] vbar vbar-1 rounded-sm" />
              <span className="w-1 h-3.5 bg-[#ffffff] vbar vbar-3 rounded-sm" />
              <span className="w-1 h-2 bg-[#ffffff] vbar vbar-5 rounded-sm" />
            </div>
          )}
        </div>

        {/* Track Title and Artist */}
        <div className="space-y-1">
          <Link
            to={`/songs/${sId}`}
            onClick={(e) => e.stopPropagation()}
            className={`font-semibold text-sm leading-snug truncate block transition-colors ${
              isCurrent ? 'text-[#699fff]' : 'text-[#ffffff] hover:text-[#cccccc]'
            }`}
          >
            {song.title}
          </Link>

          <p className="text-xs text-[#999999] truncate">
            {song.artist}
          </p>

          <div className="flex items-center justify-between text-[11px] text-[#666666] pt-1 font-mono">
            <span className="truncate max-w-[130px]">{song.album || 'Single'}</span>
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
