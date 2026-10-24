import React from 'react';

/**
 * 20 Subtle Floating Particles with coordinated positions and animations
 */
const PARTICLES = [
  { id: 1, left: '10%', top: '22%', size: 4, color: '#ff2a8d', duration: '5.2s', delay: '0s', distance: '-18px', opacity: 0.7 },
  { id: 2, left: '22%', top: '68%', size: 3, color: '#c084fc', duration: '6.4s', delay: '1.2s', distance: '16px', opacity: 0.55 },
  { id: 3, left: '32%', top: '18%', size: 5, color: '#22d3ee', duration: '4.8s', delay: '0.6s', distance: '-22px', opacity: 0.8 },
  { id: 4, left: '42%', top: '80%', size: 3, color: '#f43f5e', duration: '7.1s', delay: '2.1s', distance: '14px', opacity: 0.5 },
  { id: 5, left: '16%', top: '48%', size: 4, color: '#38bdf8', duration: '5.8s', delay: '1.8s', distance: '-15px', opacity: 0.65 },
  { id: 6, left: '26%', top: '34%', size: 2.5, color: '#ffffff', duration: '4.2s', delay: '0.4s', distance: '-12px', opacity: 0.75 },
  { id: 7, left: '60%', top: '15%', size: 4, color: '#a855f7', duration: '6.0s', delay: '1.5s', distance: '18px', opacity: 0.65 },
  { id: 8, left: '74%', top: '74%', size: 4.5, color: '#2dd4bf', duration: '5.5s', delay: '0.8s', distance: '-20px', opacity: 0.75 },
  { id: 9, left: '84%', top: '26%', size: 3, color: '#ff2a8d', duration: '6.8s', delay: '2.4s', distance: '16px', opacity: 0.6 },
  { id: 10, left: '90%', top: '64%', size: 4, color: '#22d3ee', duration: '4.6s', delay: '0.2s', distance: '-16px', opacity: 0.75 },
  { id: 11, left: '52%', top: '84%', size: 3.5, color: '#c084fc', duration: '6.2s', delay: '1.1s', distance: '15px', opacity: 0.55 },
  { id: 12, left: '78%', top: '40%', size: 2.5, color: '#ffffff', duration: '4.9s', delay: '2.0s', distance: '-14px', opacity: 0.7 },
  { id: 13, left: '12%', top: '86%', size: 4, color: '#818cf8', duration: '7.5s', delay: '0.5s', distance: '19px', opacity: 0.55 },
  { id: 14, left: '86%', top: '14%', size: 3.5, color: '#f43f5e', duration: '5.7s', delay: '1.7s', distance: '-17px', opacity: 0.65 },
  { id: 15, left: '48%', top: '14%', size: 3, color: '#2dd4bf', duration: '6.6s', delay: '2.8s', distance: '14px', opacity: 0.6 },
  { id: 16, left: '68%', top: '36%', size: 2, color: '#ffffff', duration: '4.1s', delay: '0.9s', distance: '-10px', opacity: 0.85 },
  { id: 17, left: '34%', top: '88%', size: 3.5, color: '#ff2a8d', duration: '6.9s', delay: '1.4s', distance: '-18px', opacity: 0.55 },
  { id: 18, left: '94%', top: '42%', size: 3, color: '#a855f7', duration: '5.4s', delay: '2.2s', distance: '15px', opacity: 0.65 },
  { id: 19, left: '4%', top: '38%', size: 3, color: '#38bdf8', duration: '6.1s', delay: '1.0s', distance: '12px', opacity: 0.5 },
  { id: 20, left: '96%', top: '82%', size: 3.5, color: '#ff2a8d', duration: '5.9s', delay: '2.6s', distance: '-15px', opacity: 0.6 },
];

/**
 * Animated Vibely Loading Screen Component
 *
 * Implements the official visual design:
 * - Dark navy/black background with ambient purple, magenta & cyan glows
 * - 5-bar live pulsing audio visualizer waveform (pink-to-purple-to-cyan)
 * - Flowing neon music-wave ribbons layered in the background
 * - Floating glowing particles and breathing logo aura
 * - White "Vibely" wordmark with restrained neon glow
 * - Completely free of generic linear progress bars
 * - Full support for error state & retry action
 * - Honors prefers-reduced-motion for accessibility
 */
export const LoadingScreen = ({ error = null, onRetry = null }) => {
  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-[#060813] text-slate-100 overflow-hidden select-none"
      role="status"
      aria-live="polite"
      aria-label="Loading Vibely"
    >
      {/* ====================================================================
          1. Ambient Background Lighting Orbs
          ==================================================================== */}
      <div
        className="absolute -top-36 -left-36 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full bg-fuchsia-600/15 blur-[120px] pointer-events-none vibely-ambient-orb-1"
        aria-hidden="true"
      />
      <div
        className="absolute -bottom-36 -right-36 w-96 sm:w-[540px] h-96 sm:h-[540px] rounded-full bg-cyan-500/15 blur-[140px] pointer-events-none vibely-ambient-orb-2"
        aria-hidden="true"
      />
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] rounded-full bg-violet-600/10 blur-[130px] pointer-events-none"
        aria-hidden="true"
      />

      {/* ====================================================================
          2. Layered Neon Music-Wave Ribbons (Flowing Horizontally)
          ==================================================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none flex items-center justify-center">
        {/* Wave Ribbon 1 (Upper Wave: Pink/Purple Gradient) */}
        <div className="absolute w-[2000px] h-64 -top-8 sm:top-2 opacity-50 vibely-wave-1">
          <svg
            className="w-full h-full"
            viewBox="0 0 2000 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vibelyWaveGrad1" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ff2a8d" stopOpacity="0.8" />
                <stop offset="25%" stopColor="#c084fc" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="75%" stopColor="#c084fc" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#ff2a8d" stopOpacity="0.8" />
              </linearGradient>
            </defs>
            <path
              d="M 0 120 C 250 50, 250 190, 500 120 C 750 50, 750 190, 1000 120 C 1250 50, 1250 190, 1500 120 C 1750 50, 1750 190, 2000 120"
              stroke="url(#vibelyWaveGrad1)"
              strokeWidth="3.5"
              strokeLinecap="round"
            />
          </svg>
        </div>

        {/* Wave Ribbon 2 (Center Wave: Cyan/Purple/Pink Neon Wave passing behind logo) */}
        <div className="absolute w-[2000px] h-72 top-1/2 -translate-y-1/2 opacity-65 vibely-wave-2">
          <svg
            className="w-full h-full"
            viewBox="0 0 2000 320"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vibelyWaveGrad2" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.9" />
                <stop offset="25%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#ec4899" stopOpacity="0.95" />
                <stop offset="75%" stopColor="#818cf8" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.9" />
              </linearGradient>
            </defs>
            {/* Primary glowing stroke */}
            <path
              d="M 0 160 C 180 60, 320 260, 500 160 C 680 60, 820 260, 1000 160 C 1180 60, 1320 260, 1500 160 C 1680 60, 1820 260, 2000 160"
              stroke="url(#vibelyWaveGrad2)"
              strokeWidth="4"
              strokeLinecap="round"
            />
            {/* Ambient secondary glow echo */}
            <path
              d="M 0 160 C 180 60, 320 260, 500 160 C 680 60, 820 260, 1000 160 C 1180 60, 1320 260, 1500 160 C 1680 60, 1820 260, 2000 160"
              stroke="url(#vibelyWaveGrad2)"
              strokeWidth="12"
              strokeLinecap="round"
              opacity="0.25"
            />
          </svg>
        </div>

        {/* Wave Ribbon 3 (Lower Wave: Purple/Teal/Cyan undulating wave) */}
        <div className="absolute w-[2000px] h-64 -bottom-10 sm:-bottom-4 opacity-55 vibely-wave-3">
          <svg
            className="w-full h-full"
            viewBox="0 0 2000 240"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            preserveAspectRatio="none"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id="vibelyWaveGrad3" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.85" />
                <stop offset="30%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="60%" stopColor="#2dd4bf" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.85" />
              </linearGradient>
            </defs>
            <path
              d="M 0 120 C 220 180, 280 60, 500 120 C 720 180, 780 60, 1000 120 C 1220 180, 1280 60, 1500 120 C 1720 180, 1780 60, 2000 120"
              stroke="url(#vibelyWaveGrad3)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      {/* ====================================================================
          3. Floating Neon Particles
          ==================================================================== */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        {PARTICLES.map((p) => (
          <span
            key={p.id}
            className="absolute rounded-full vibely-particle"
            style={{
              left: p.left,
              top: p.top,
              width: `${p.size}px`,
              height: `${p.size}px`,
              backgroundColor: p.color,
              boxShadow: `0 0 10px ${p.color}, 0 0 18px ${p.color}`,
              '--base-opacity': p.opacity,
              '--float-distance': p.distance,
              '--float-duration': p.duration,
              '--float-delay': p.delay,
            }}
          />
        ))}
      </div>

      {/* ====================================================================
          4. Center Brand Stage: 5-Bar Waveform & Vibely Wordmark
          ==================================================================== */}
      <div className="relative z-20 flex flex-col items-center justify-center">
        {/* Waveform Bars Container */}
        <div className="relative flex items-center justify-center gap-2 sm:gap-3.5 h-32 sm:h-44 px-4 sm:px-8">
          {/* Breathing Aura Behind the 5 Bars */}
          <div
            className="absolute inset-0 m-auto w-40 sm:w-60 h-32 sm:h-44 rounded-full bg-gradient-to-tr from-pink-500/25 via-purple-500/30 to-cyan-400/25 blur-3xl pointer-events-none vibely-logo-aura"
            aria-hidden="true"
          />

          {/* Bar 1: Pink/Rose (Leftmost) */}
          <div
            className="relative w-2 sm:w-3 h-14 sm:h-20 rounded-full bg-gradient-to-b from-[#ff2a8d] via-[#f43f5e] to-[#ec4899] shadow-[0_0_16px_rgba(255,42,141,0.7)] vibely-bar-1"
            aria-hidden="true"
          />

          {/* Bar 2: Magenta/Purple */}
          <div
            className="relative w-2 sm:w-3 h-20 sm:h-30 rounded-full bg-gradient-to-b from-[#f43f5e] via-[#c084fc] to-[#a855f7] shadow-[0_0_20px_rgba(244,63,94,0.75)] vibely-bar-2"
            aria-hidden="true"
          />

          {/* Bar 3: Tallest Center - Pink-Purple through Violet to Cyan */}
          <div
            className="relative w-2.5 sm:w-3.5 h-28 sm:h-40 rounded-full bg-gradient-to-b from-[#ec4899] via-[#a855f7] to-[#06b6d4] shadow-[0_0_26px_rgba(168,85,247,0.85)] vibely-bar-3"
            aria-hidden="true"
          />

          {/* Bar 4: Violet/Blue to Cyan */}
          <div
            className="relative w-2 sm:w-3 h-20 sm:h-30 rounded-full bg-gradient-to-b from-[#a855f7] via-[#6366f1] to-[#06b6d4] shadow-[0_0_20px_rgba(99,102,241,0.75)] vibely-bar-4"
            aria-hidden="true"
          />

          {/* Bar 5: Electric Blue/Cyan to Teal (Rightmost) */}
          <div
            className="relative w-2 sm:w-3 h-14 sm:h-20 rounded-full bg-gradient-to-b from-[#3b82f6] via-[#06b6d4] to-[#14b8a6] shadow-[0_0_16px_rgba(6,182,212,0.7)] vibely-bar-5"
            aria-hidden="true"
          />
        </div>

        {/* Vibely Typography Wordmark (Directly Underneath) */}
        <div className="mt-4 sm:mt-6 text-center select-none z-20 px-2">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-white tracking-[0.18em] sm:tracking-[0.22em] uppercase vibely-wordmark">
            Vibely
          </h1>
          <p className="text-[9px] sm:text-xs font-bold tracking-[0.3em] sm:tracking-[0.35em] text-cyan-300/80 uppercase mt-2">
            Listen Together
          </p>
        </div>

        {/* Optional Error & Retry Action */}
        {error && (
          <div className="mt-8 flex flex-col items-center gap-3 z-30 max-w-sm px-4 text-center">
            <p className="text-xs text-rose-300 bg-rose-950/60 border border-rose-500/30 px-4 py-2 rounded-2xl backdrop-blur-md">
              {error}
            </p>
            {onRetry && (
              <button
                type="button"
                onClick={onRetry}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold text-xs shadow-lg shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all cursor-pointer"
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
