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
  ChevronUp,
  ChevronDown,
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
  const [mobileExpanded, setMobileExpanded] = useState(false);

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
  const progressPercent =
    currentDuration > 0
      ? Math.min(100, Math.max(0, (seekValue / currentDuration) * 100))
      : 0;

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl shadow-2xl transition-all duration-300"
      role="region"
      aria-label="Audio Player"
    >
      {/* Top Slim Progress Bar for Mobile Glance */}
      <div className="md:hidden absolute top-0 left-0 right-0 h-1 bg-slate-800/80">
        <div
          className="h-full bg-emerald-400 transition-all duration-150"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Playback Alert / Error Banner */}
      {playbackError && (
        <div className="max-w-7xl mx-auto px-4 pt-2">
          <div className="px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
            <span className="truncate">{playbackError}</span>
          </div>
        </div>
      )}

      {/* Expanded Controls Drawer on Mobile */}
      {mobileExpanded && (
        <div className="md:hidden border-b border-slate-800/80 px-4 py-3 bg-slate-900/90 space-y-3 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
              {queue && queue.length > 0 ? (
                <span>
                  Track {queueIndex + 1} of {queue.length}
                </span>
              ) : (
                <span>Single Track</span>
              )}
            </span>
            <button
              onClick={() => setMobileExpanded(false)}
              className="text-slate-400 hover:text-white p-1 text-xs"
              aria-label="Collapse player controls"
            >
              <ChevronDown className="w-4 h-4" />
            </button>
          </div>

          {/* Full Scrubber on Mobile */}
          <div className="space-y-1">
            <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
              <span>{formatTime(seekValue)}</span>
              <span>{formatTime(currentDuration)}</span>
            </div>
            <input
              type="range"
              min="0"
              max={currentDuration || 100}
              step="0.5"
              value={seekValue}
              onChange={handleSeekChange}
              onMouseUp={handleSeekCommit}
              onTouchEnd={handleSeekCommit}
              aria-label="Seek track"
              style={{
                background: `linear-gradient(to right, #34d399 ${progressPercent}%, #1e293b ${progressPercent}%)`,
              }}
              className="w-full h-2 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
            />
          </div>

          {/* Volume Slider on Mobile */}
          <div className="flex items-center justify-between gap-3 pt-1">
            <button
              onClick={toggleMute}
              aria-label={isMuted ? 'Unmute audio' : 'Mute audio'}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 text-slate-300 hover:text-white"
            >
              {isMuted || volume === 0 ? (
                <VolumeX className="w-4 h-4 text-rose-400" />
              ) : volume < 0.5 ? (
                <Volume1 className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4" />
              )}
            </button>
            <div className="flex-1 flex items-center">
              <input
                type="range"
                min="0"
                max="1"
                step="0.02"
                value={isMuted ? 0 : volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                aria-label="Volume slider"
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
              />
            </div>
            <span className="text-[10px] font-mono text-slate-400 w-8 text-right">
              {Math.round((isMuted ? 0 : volume) * 100)}%
            </span>
          </div>
        </div>
      )}

      {/* Main Player Bar */}
      <div className="max-w-7xl mx-auto px-3 sm:px-6 py-2.5 sm:py-3 flex items-center justify-between gap-2 sm:gap-4">
        {/* Left: Track Information */}
        <div className="flex items-center gap-2.5 sm:gap-3 flex-1 md:w-1/4 md:flex-initial min-w-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl object-cover shrink-0 shadow-md border border-slate-800"
          />
          <div className="min-w-0 flex-1">
            <h4 className="text-xs sm:text-sm font-bold text-slate-100 truncate hover:text-emerald-400 transition-colors">
              {currentTrack.title}
            </h4>
            <p className="text-[11px] sm:text-xs text-slate-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Center: Desktop Controls & Progress Scrubber */}
        <div className="hidden md:flex flex-col items-center w-2/4 max-w-xl">
          {/* Action Buttons */}
          <div className="flex items-center gap-4 mb-1">
            <button
              onClick={prevTrack}
              aria-label="Previous Track"
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800/50"
            >
              <SkipBack className="w-5 h-5 fill-current" />
            </button>

            <button
              onClick={togglePlay}
              aria-label={isPlaying ? 'Pause' : 'Play'}
              className="w-10 h-10 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              onClick={nextTrack}
              aria-label="Next Track"
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-lg hover:bg-slate-800/50"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Desktop Scrubber Bar */}
          <div className="w-full flex items-center gap-3 text-[11px] font-mono text-slate-400">
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
                aria-label="Seek track"
                style={{
                  background: `linear-gradient(to right, #34d399 ${progressPercent}%, #1e293b ${progressPercent}%)`,
                }}
                className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:h-2 transition-all focus:outline-none"
              />
            </div>

            <span className="w-9 text-left shrink-0">{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Right: Desktop Volume & Queue Position */}
        <div className="hidden md:flex items-center justify-end gap-3 w-1/4">
          {queue && queue.length > 0 && (
            <div className="flex items-center gap-1 text-[11px] font-mono text-slate-500 mr-2">
              <ListMusic className="w-3.5 h-3.5 text-emerald-400" />
              <span>
                {queueIndex + 1}/{queue.length}
              </span>
            </div>
          )}

          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'Unmute' : 'Mute'}
            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
            aria-label="Volume slider"
            className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
          />
        </div>

        {/* Mobile Right Controls: Prev, Play/Pause, Next, and Expand Button (< md) */}
        <div className="flex md:hidden items-center gap-1 shrink-0">
          <button
            onClick={prevTrack}
            aria-label="Previous Track"
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-xl active:bg-slate-800"
          >
            <SkipBack className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={togglePlay}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="w-11 h-11 rounded-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 flex items-center justify-center shadow-lg shadow-emerald-500/25 transition-transform active:scale-95 cursor-pointer"
          >
            {isLoading ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : isPlaying ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>

          <button
            onClick={nextTrack}
            aria-label="Next Track"
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer rounded-xl active:bg-slate-800"
          >
            <SkipForward className="w-4 h-4 fill-current" />
          </button>

          <button
            onClick={() => setMobileExpanded(!mobileExpanded)}
            aria-label={mobileExpanded ? 'Collapse player' : 'Expand player options'}
            aria-expanded={mobileExpanded}
            className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-white rounded-xl active:bg-slate-800 transition-colors"
          >
            {mobileExpanded ? (
              <ChevronDown className="w-4 h-4 text-emerald-400" />
            ) : (
              <ChevronUp className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
