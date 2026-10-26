/**
 * Image Fallback and Asset Resolution Utility for Vibely.
 * Provides resilient fallback resolution, failure caching to prevent duplicate failed requests,
 * and mapping to bundled offline assets for demo tracks.
 */

export const DEFAULT_FALLBACK_COVER = '/default-cover.svg';

export const BUNDLED_COVERS_MAP = {
  'echoes of starlight': '/covers/echoes-of-starlight.jpg',
  'midnight rain': '/covers/midnight-rain.jpg',
  'solar horizons': '/covers/solar-horizons.jpg',
  'electric skyline': '/covers/electric-skyline.jpg',
  'velvet groove': '/covers/velvet-groove.jpg',
  'golden hour glow': '/covers/golden-hour-glow.jpg',
  'neon mirage': '/covers/neon-mirage.jpg',
  'breeze & bass': '/covers/breeze-and-bass.jpg',
  'breeze and bass': '/covers/breeze-and-bass.jpg',
};

// Module-level cache to track URLs that failed across the app session.
// Prevents infinite retry loops and avoids duplicate failing network requests.
const failedUrlCache = new Set();

/**
 * Checks whether a URL is known to be unreachable, invalid, or blocked.
 * @param {string} url
 * @returns {boolean}
 */
export function isUnreliableUrl(url) {
  if (!url || typeof url !== 'string' || !url.trim()) {
    return true;
  }
  const trimmed = url.trim();
  // Unsplash CDN domains are subject to regional ISP net::ERR_CONNECTION_RESET
  if (trimmed.includes('images.unsplash.com')) {
    return true;
  }
  return false;
}

/**
 * Marks a URL as permanently failed for this session.
 * @param {string} url
 */
export function markUrlFailed(url) {
  if (url && typeof url === 'string') {
    failedUrlCache.add(url.trim());
  }
}

/**
 * Checks if a URL has already failed during this session.
 * @param {string} url
 * @returns {boolean}
 */
export function hasUrlFailed(url) {
  if (!url || typeof url !== 'string') return true;
  return failedUrlCache.has(url.trim());
}

/**
 * Finds a suitable bundled asset or fallback cover for a given track title or song object.
 * @param {Object|string} songOrTitle
 * @returns {string}
 */
export function getBundledCoverForSong(songOrTitle) {
  const title = typeof songOrTitle === 'string'
    ? songOrTitle
    : songOrTitle?.title;

  if (title && typeof title === 'string') {
    const key = title.trim().toLowerCase();
    if (BUNDLED_COVERS_MAP[key]) {
      return BUNDLED_COVERS_MAP[key];
    }
  }

  return DEFAULT_FALLBACK_COVER;
}

/**
 * Resolves the best available cover URL for a song.
 * If the primary URL is missing, blocked (e.g. Unsplash), or previously failed,
 * smoothly provides the bundled high-definition cover or default SVG placeholder.
 *
 * @param {Object} song
 * @returns {string}
 */
export function resolveSongCover(song) {
  if (!song) return DEFAULT_FALLBACK_COVER;

  const rawUrl = song.coverUrl;
  const bundled = getBundledCoverForSong(song);

  // If primary URL is invalid, blocked, or previously failed, use bundled asset
  if (!rawUrl || isUnreliableUrl(rawUrl) || hasUrlFailed(rawUrl)) {
    return bundled;
  }

  return rawUrl;
}
