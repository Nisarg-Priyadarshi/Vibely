import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Play,
  Pause,
  SkipBack,
  SkipForward,
  Volume2,
  Volume1,
  VolumeX,
  AlertCircle,
  Loader2,
  ListMusic,
  Heart,
  Bookmark,
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { useSongLists } from '../context/SongListContext';
import { useRoom } from '../context/RoomContext';
import { formatTime } from '../utils/format';
import { SafeImage } from './SafeImage';

export const PlayerBar = () => {
  const {
    currentTrack,
    isPlaying,
    currentTime,
    duration,
    volume,
    isMuted,
    isLoading,
    playbackError,
    queue,
    queueIndex,
    togglePlay,
    seek,
    setVolume,
    toggleMute,
    nextTrack,
    prevTrack,
  } = usePlayer();

  const { isFavorite, toggleFavorite, isInPlayLater, togglePlayLater } = useSongLists();
  const { currentRoom, isHost, roomState, hostControl } = useRoom();

  const [isSeeking, setIsSeeking] = useState(false);
  const [seekValue, setSeekValue] = useState(0);

  useEffect(() => {
    if (!isSeeking) {
      setSeekValue(currentTime);
    }
  }, [currentTime, isSeeking]);

  if (!currentTrack) {
    return null;
  }

  const isPlayerPlaying = currentRoom ? (roomState?.isPlaying ?? isPlaying) : isPlaying;

  const sId = (currentTrack.id || currentTrack._id || '').toString();
  const fav = isFavorite(sId);
  const playLater = isInPlayLater(sId);

  const handleTogglePlay = async () => {
    if (currentRoom && isHost) {
      const action = isPlayerPlaying ? 'pause' : 'play';
      const payload = { position: currentTime };
      try {
        await hostControl({ action, payload });
      } catch (err) {
        console.warn('Host control toggle failed:', err.message);
      }
      return;
    }
    togglePlay();
  };

  const handleSeekChange = (e) => {
    setIsSeeking(true);
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekCommit = async (e) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
    setIsSeeking(false);
    if (currentRoom && isHost) {
      try {
        await hostControl({ action: 'seek', payload: { position: newTime } });
      } catch (err) {
        console.warn('Host control seek failed:', err.message);
      }
    }
  };

  const currentDuration = duration || currentTrack.duration || 0;
  const progressPercent = currentDuration > 0
    ? Math.min(100, Math.max(0, (seekValue / currentDuration) * 100))
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212]/95 backdrop-blur-md border-t border-white/[0.08] px-4 py-3 sm:px-8 shadow-2xl">
      {/* Playback Alert / Error Banner */}
      {playbackError && (
        <div className="max-w-7xl mx-auto mb-2 px-3 py-1.5 rounded-[4px] bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span className="truncate">{playbackError}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information with Favorite & Play Later Actions */}
        <div className="flex items-center gap-3.5 w-full md:w-1/3 min-w-0">
          <Link to={`/songs/${sId}`} className="shrink-0 group">
            <SafeImage
              src={currentTrack.coverUrl}
              alt={currentTrack.title}
              songTitle={currentTrack.title}
              className="w-12 h-12 rounded-[4px] object-cover bg-[#222222] border border-white/10 group-hover:border-[#ff7a1a]/60 transition-colors shadow-sm"
            />
          </Link>
          <div className="min-w-0 flex-1">
            <Link
              to={`/songs/${sId}`}
              className="text-xs font-bold text-white truncate block hover:text-[#ff7a1a] transition-colors"
            >
              {currentTrack.title}
            </Link>
            <p className="text-[11px] text-[#999999] truncate">
              {currentTrack.artist}
            </p>
          </div>

          {/* Quick Favorite & Play Later Toolbar */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => toggleFavorite(currentTrack)}
              aria-label={fav ? 'Remove from favourites' : 'Add to favourites'}
              title={fav ? 'In Favourites' : 'Add to Favourites'}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                fav
                  ? 'text-rose-500 bg-rose-500/10 hover:bg-rose-500/20'
                  : 'text-[#888888] hover:text-white hover:bg-white/10'
              }`}
            >
              <Heart className={`w-5 h-5 transition-transform active:scale-125 ${fav ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={() => togglePlayLater(currentTrack)}
              aria-label={playLater ? 'Remove from Play Later' : 'Save to Play Later'}
              title={playLater ? 'In Play Later' : 'Save to Play Later'}
              className={`w-10 h-10 flex items-center justify-center rounded-full transition-all cursor-pointer ${
                playLater
                  ? 'text-[#ff7a1a] bg-[#ff7a1a]/10 hover:bg-[#ff7a1a]/20'
                  : 'text-[#888888] hover:text-white hover:bg-white/10'
              }`}
            >
              <Bookmark className={`w-5 h-5 transition-transform active:scale-125 ${playLater ? 'fill-current' : ''}`} />
            </button>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center w-full md:w-5/12 max-w-xl">
          {/* Action Buttons */}
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={prevTrack}
              aria-label="Previous Track"
              className="w-10 h-10 flex items-center justify-center text-[#999999] hover:text-white transition-colors cursor-pointer"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={handleTogglePlay}
              aria-label={isPlayerPlaying ? 'Pause' : 'Play'}
              className="w-11 h-11 rounded-full bg-white hover:scale-105 active:scale-95 text-[#121212] flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-[#121212]" />
              ) : isPlayerPlaying ? (
                <Pause className="w-5 h-5 fill-current text-[#121212]" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5 text-[#121212]" />
              )}
            </button>

            <button
              onClick={nextTrack}
              aria-label="Next Track"
              className="w-10 h-10 flex items-center justify-center text-[#999999] hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Scrubber Bar with orange progress */}
          <div className="w-full flex items-center gap-3 text-[11px] font-mono text-[#999999]">
            <span className="w-9 text-right shrink-0">{formatTime(seekValue)}</span>

            <div className="relative flex-1 flex items-center group cursor-pointer">
              <input
                type="range"
                min="0"
                max={currentDuration || 100}
                step="0.5"
                value={seekValue}
                onChange={handleSeekChange}
                onMouseUp={handleSeekCommit}
                onTouchEnd={handleSeekCommit}
                style={{
                  background: `linear-gradient(to right, #ff7a1a ${progressPercent}%, #2e2e2e ${progressPercent}%)`,
                }}
                className="w-full h-1 rounded-[2px] appearance-none cursor-pointer accent-[#ff7a1a] hover:h-1.5 transition-all focus:outline-none"
              />
            </div>

            <span className="w-9 text-left shrink-0">{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Right: Volume & Queue Position */}
        <div className="hidden md:flex items-center justify-end gap-4 w-1/4 min-w-0">
          {queue && queue.length > 0 && (
            <div className="flex items-center gap-1.5 text-[11px] font-mono text-[#777777] mr-1">
              <ListMusic className="w-3.5 h-3.5 text-[#999999]" />
              <span>
                {queueIndex + 1}/{queue.length}
              </span>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute' : 'Mute'}
              className="w-10 h-10 shrink-0 flex items-center justify-center text-[#999999] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-5 h-5 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-5 h-5" />
              ) : (
                <Volume2 className="w-5 h-5" />
              )}
            </button>

            <input
              type="range"
              aria-label="Volume"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #cccccc ${(isMuted ? 0 : volume) * 100}%, #2e2e2e ${(isMuted ? 0 : volume) * 100}%)`,
              }}
              className="w-28 h-1.5 shrink-0 rounded-[2px] appearance-none cursor-pointer accent-[#ffffff] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
