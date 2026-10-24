import { useState, useEffect } from 'react';
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
} from 'lucide-react';
import { usePlayer } from '../context/PlayerContext';
import { formatTime } from '../utils/format';

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

  const handleSeekChange = (e) => {
    setIsSeeking(true);
    setSeekValue(parseFloat(e.target.value));
  };

  const handleSeekCommit = (e) => {
    const newTime = parseFloat(e.target.value);
    seek(newTime);
    setIsSeeking(false);
  };

  const currentDuration = duration || currentTrack.duration || 0;
  const progressPercent = currentDuration > 0
    ? Math.min(100, Math.max(0, (seekValue / currentDuration) * 100))
    : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-[#121212] border-t border-[rgba(255,255,255,0.08)] px-4 py-3 sm:px-8 shadow-2xl">
      {/* Playback Alert / Error Banner */}
      {playbackError && (
        <div className="max-w-7xl mx-auto mb-2 px-3 py-1.5 rounded-[4px] bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span className="truncate">{playbackError}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3.5 w-full md:w-1/4 min-w-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-11 h-11 rounded-[4px] object-cover shrink-0 bg-[#222222]"
          />
          <div className="min-w-0">
            <h4 className="text-xs font-bold text-[#ffffff] truncate">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] text-[#999999] truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Center: Controls & Scrubber */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-xl">
          {/* Action Buttons */}
          <div className="flex items-center gap-5 mb-1.5">
            <button
              onClick={prevTrack}
              aria-label="Previous Track"
              className="text-[#999999] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              <SkipBack className="w-4 h-4 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-9 h-9 rounded-full bg-[#ffffff] hover:scale-105 active:scale-95 text-[#121212] flex items-center justify-center transition-all cursor-pointer shadow-md"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin text-[#121212]" />
              ) : isPlaying ? (
                <Pause className="w-4 h-4 fill-current text-[#121212]" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5 text-[#121212]" />
              )}
            </button>

            <button
              onClick={nextTrack}
              aria-label="Next Track"
              className="text-[#999999] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              <SkipForward className="w-4 h-4 fill-current" />
            </button>
          </div>

          {/* Scrubber Bar */}
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
                  background: `linear-gradient(to right, #ffffff ${progressPercent}%, #2e2e2e ${progressPercent}%)`,
                }}
                className="w-full h-1 rounded-[2px] appearance-none cursor-pointer accent-[#ffffff] hover:h-1.5 transition-all focus:outline-none"
              />
            </div>

            <span className="w-9 text-left shrink-0">{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Right: Volume & Queue Position */}
        <div className="hidden md:flex items-center justify-end gap-4 w-1/4">
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
              className="text-[#999999] hover:text-[#ffffff] transition-colors cursor-pointer"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>

            <input
              type="range"
              min="0"
              max="1"
              step="0.02"
              value={isMuted ? 0 : volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              style={{
                background: `linear-gradient(to right, #cccccc ${(isMuted ? 0 : volume) * 100}%, #2e2e2e ${(isMuted ? 0 : volume) * 100}%)`,
              }}
              className="w-20 h-1 rounded-[2px] appearance-none cursor-pointer accent-[#ffffff] focus:outline-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
