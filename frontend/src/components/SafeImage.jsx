import React, { useState, useEffect } from 'react';
import {
  DEFAULT_FALLBACK_COVER,
  getBundledCoverForSong,
  isUnreliableUrl,
  markUrlFailed,
  hasUrlFailed,
} from '../utils/imageFallback.js';

/**
 * SafeImage Component
 *
 * Resilient image component that:
 * 1. Handles missing, blocked (e.g. Unsplash), or invalid URLs seamlessly.
 * 2. Caches failed URLs to prevent repeated network requests across renders.
 * 3. Gracefully tries bundled song artwork before falling back to default SVG placeholder.
 * 4. Prevents infinite onError retry loops.
 * 5. Preserves all image layout, styling, and aspect ratios.
 */
export const SafeImage = ({
  src,
  alt = '',
  fallbackSrc,
  songTitle,
  className = '',
  loading = 'lazy',
  onError,
  onLoad,
  ...rest
}) => {
  const getInitialSrc = () => {
    // If explicit songTitle provided, check if bundled cover should be used when src is missing/unreliable
    const bundled = songTitle ? getBundledCoverForSong(songTitle) : null;
    const defaultFallback = fallbackSrc || bundled || DEFAULT_FALLBACK_COVER;

    if (!src || isUnreliableUrl(src) || hasUrlFailed(src)) {
      return defaultFallback;
    }
    return src;
  };

  const [currentSrc, setCurrentSrc] = useState(getInitialSrc);
  const [retryStage, setRetryStage] = useState(0); // 0: primary, 1: bundled/fallback, 2: default svg, 3: give up

  // Re-sync if the src prop changes
  useEffect(() => {
    const nextInitial = getInitialSrc();
    setCurrentSrc(nextInitial);
    setRetryStage(nextInitial === src ? 0 : 1);
  }, [src, songTitle, fallbackSrc]);

  const handleError = (e) => {
    if (currentSrc) {
      markUrlFailed(currentSrc);
    }

    if (retryStage === 0) {
      // Primary failed -> try bundled cover or explicit fallback
      const bundled = songTitle ? getBundledCoverForSong(songTitle) : null;
      const nextFallback = (fallbackSrc && fallbackSrc !== currentSrc)
        ? fallbackSrc
        : (bundled && bundled !== currentSrc)
          ? bundled
          : DEFAULT_FALLBACK_COVER;

      setRetryStage(1);
      setCurrentSrc(nextFallback);
    } else if (retryStage === 1 && currentSrc !== DEFAULT_FALLBACK_COVER) {
      // Bundled or explicit fallback failed -> try default SVG
      setRetryStage(2);
      setCurrentSrc(DEFAULT_FALLBACK_COVER);
    } else {
      // Final stop: prevent infinite loop
      setRetryStage(3);
    }

    if (typeof onError === 'function') {
      onError(e);
    }
  };

  const handleLoad = (e) => {
    if (typeof onLoad === 'function') {
      onLoad(e);
    }
  };

  // If even the default SVG failed (or empty), render an accessible styled placeholder container
  if (retryStage >= 3) {
    return (
      <div
        role="img"
        aria-label={alt || 'Image unavailable'}
        className={`bg-[#181818] flex items-center justify-center text-[#666666] ${className}`}
        {...rest}
      >
        <svg
          className="w-1/3 h-1/3 opacity-40 text-current"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
        >
          <rect x="2" y="2" width="20" height="20" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  return (
    <img
      src={currentSrc}
      alt={alt}
      loading={loading}
      onError={handleError}
      onLoad={handleLoad}
      className={className}
      {...rest}
    />
  );
};

export default SafeImage;
