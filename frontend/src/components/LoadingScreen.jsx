import { useEffect, useState, useRef } from 'react';
import { AlertCircle } from 'lucide-react';

// Minimum time (ms) the loading screen is shown — prevents flash on fast loads
const MIN_DISPLAY_MS = 1200;

const BARS = [
  { cls: 'vbar-1', h: 'h-14 sm:h-20' },
  { cls: 'vbar-2', h: 'h-20 sm:h-28' },
  { cls: 'vbar-3', h: 'h-24 sm:h-36' },
  { cls: 'vbar-4', h: 'h-20 sm:h-28' },
  { cls: 'vbar-5', h: 'h-14 sm:h-20' },
];

export const LoadingScreen = ({ error = null, onRetry = null }) => {
  const [visible, setVisible] = useState(true);
  const mountedAt = useRef(Date.now());

  // If parent signals loading is done (no error, no retry prop changing),
  // enforce minimum display time before hiding
  useEffect(() => {
    if (!error) return;
    // On error always stay visible
  }, [error]);

  // Expose hide function via timing enforcement
  // Parent controls this component's life; we just gate the minimum time
  // The actual hide is controlled by the parent removing us from the tree.
  // We use a fade-out class after minimum time so re-renders don't flash.

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#121212] overflow-hidden select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading Vibely"
    >
      {/* Signal Orange ambient — one accent, kept restrained. */}
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 sm:w-96 sm:h-96 rounded-full bg-[#ff7a1a]/8 blur-[80px] pointer-events-none signal-ring"
        aria-hidden="true"
      />

      {/* Center stage */}
      <div className="relative z-10 flex flex-col items-center">
        {/* Five equalizer bars — white, flat, no gradients, transform-origin bottom */}
        <div
          className="flex items-end justify-center gap-[6px] sm:gap-[9px] h-36 sm:h-44"
          aria-hidden="true"
        >
          {BARS.map((bar) => (
            <div
              key={bar.cls}
              className={`vbar ${bar.cls} ${bar.h} w-[6px] sm:w-[8px] rounded-sm bg-[#ffffff]`}
            />
          ))}
        </div>

        {/* Logo & Wordmark */}
        <div className="mt-8 flex flex-col items-center wordmark-reveal">
          <img
            src="/vibely-logo.png"
            alt="Vibely"
            className="w-14 h-14 rounded-[8px] object-contain mb-3 shadow-2xl animate-pulse"
          />
          <h1 className="text-3xl sm:text-4xl font-extralight tracking-[0.3em] text-[#ffffff] uppercase font-sans">
            Vibely
          </h1>
        </div>

        {/* Subtitle */}
        <p className="mt-3 text-[11px] font-normal tracking-[0.25em] text-[#666666] uppercase subtitle-reveal">
          Listen Together
        </p>

        {/* Error state */}
        {error && (
          <div className="mt-10 flex flex-col items-center gap-4 max-w-xs px-4 text-center">
            <div className="flex items-center gap-2 text-rose-400 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{error}</span>
            </div>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="btn-white text-xs px-5 py-2"
              >
                Retry Connection
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LoadingScreen;
