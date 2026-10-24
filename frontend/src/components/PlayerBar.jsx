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
  const progressPercent = currentDuration > 0 ? (seekValue / currentDuration) * 100 : 0;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-slate-950/95 border-t border-slate-800/90 backdrop-blur-xl px-4 py-3 sm:px-6 shadow-2xl">
      {/* Playback Alert / Error Banner */}
      {playbackError && (
        <div className="max-w-7xl mx-auto mb-2 px-3 py-1.5 rounded-lg bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
          <span className="truncate">{playbackError}</span>
        </div>
      )}

      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Left: Track Information */}
        <div className="flex items-center gap-3 w-full md:w-1/4 min-w-0">
          <img
            src={currentTrack.coverUrl}
            alt={currentTrack.title}
            className="w-12 h-12 rounded-xl object-cover shrink-0 shadow-md border border-slate-800"
          />
          <div className="min-w-0">
            <h4 className="text-sm font-bold text-slate-100 truncate hover:text-emerald-400 transition-colors">
              {currentTrack.title}
            </h4>
            <p className="text-xs text-slate-400 truncate">
              {currentTrack.artist}
            </p>
          </div>
        </div>

        {/* Center: Controls & Progress Scrubber */}
        <div className="flex flex-col items-center w-full md:w-2/4 max-w-xl">
          {/* Action Buttons */}
          <div className="flex items-center gap-4 mb-1">
            <button
              onClick={prevTrack}
              aria-label="Previous Track"
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
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
              className="p-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              <SkipForward className="w-5 h-5 fill-current" />
            </button>
          </div>

          {/* Scrubber Bar */}
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
                className="w-full h-1.5 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 hover:h-2 transition-all focus:outline-none"
              />
            </div>

            <span className="w-9 text-left shrink-0">{formatTime(currentDuration)}</span>
          </div>
        </div>

        {/* Right: Volume & Queue Position */}
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
            className="text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
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
            className="w-20 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-emerald-400 focus:outline-none"
          />
        </div>
      </div>
    </div>
  );
};

export default PlayerBar;
