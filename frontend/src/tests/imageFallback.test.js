import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  DEFAULT_FALLBACK_COVER,
  BUNDLED_COVERS_MAP,
  isUnreliableUrl,
  markUrlFailed,
  hasUrlFailed,
  getBundledCoverForSong,
  resolveSongCover,
} from '../utils/imageFallback.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
};

let passed = 0;
let failed = 0;

function assert(condition, name) {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${name}`);
    passed++;
  } else {
    console.error(`  ${colors.red('✖')} ${name}`);
    failed++;
  }
}

console.log(`\n${colors.cyan('========================================')}`);
console.log(`${colors.cyan('    Frontend Image Fallback Tests       ')}`);
console.log(`${colors.cyan('========================================')}\n`);

// 1. Unreliable URL detection
assert(isUnreliableUrl(null) === true, 'Null URL is identified as unreliable');
assert(isUnreliableUrl('') === true, 'Empty string is identified as unreliable');
assert(isUnreliableUrl('   ') === true, 'Whitespace string is identified as unreliable');
assert(
  isUnreliableUrl('https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600') === true,
  'Unsplash CDN URL is identified as unreliable (blocked/reset on mobile/ISP networks)'
);
assert(
  isUnreliableUrl('https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003143/vibely/covers/echoes_of_starlight.jpg') === false,
  'Valid Cloudinary HTTPS URL is considered reliable'
);

// 2. Bundled covers mapping for demo tracks
const demoTitles = [
  'Echoes of Starlight',
  'Midnight Rain',
  'Solar Horizons',
  'Electric Skyline',
  'Velvet Groove',
  'Golden Hour Glow',
  'Neon Mirage',
  'Breeze & Bass',
];

for (const title of demoTitles) {
  const bundled = getBundledCoverForSong(title);
  assert(
    bundled && bundled.startsWith('/covers/'),
    `getBundledCoverForSong maps "${title}" to bundled cover: ${bundled}`
  );
}

assert(
  getBundledCoverForSong('echoes of starlight') === '/covers/echoes-of-starlight.jpg',
  'Case-insensitive title matching works correctly'
);
assert(
  getBundledCoverForSong('Unknown Song Nonexistent') === DEFAULT_FALLBACK_COVER,
  'Unknown song title falls back to DEFAULT_FALLBACK_COVER'
);

// 3. Resilient cover resolution
const failingSong = {
  title: 'Golden Hour Glow',
  coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600',
};
assert(
  resolveSongCover(failingSong) === '/covers/golden-hour-glow.jpg',
  'resolveSongCover replaces failing Unsplash URL with bundled cover for known demo song'
);

const reliableSong = {
  title: 'Golden Hour Glow',
  coverUrl: 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003152/vibely/covers/golden_hour_glow.jpg',
};
assert(
  resolveSongCover(reliableSong) === reliableSong.coverUrl,
  'resolveSongCover preserves reliable Cloudinary HTTPS URL'
);

assert(
  resolveSongCover(null) === DEFAULT_FALLBACK_COVER,
  'resolveSongCover safely returns default SVG for null song'
);

// 4. Failed URL session caching (infinite retry loop prevention)
const testFailUrl = 'https://broken-domain.test/nonexistent-cover.jpg';
assert(hasUrlFailed(testFailUrl) === false, 'Fresh URL is not marked failed');
markUrlFailed(testFailUrl);
assert(hasUrlFailed(testFailUrl) === true, 'Failed URL is cached to prevent duplicate requests');

const failingUnknownSong = {
  title: 'Random Track',
  coverUrl: testFailUrl,
};
assert(
  resolveSongCover(failingUnknownSong) === DEFAULT_FALLBACK_COVER,
  'resolveSongCover falls back to default cover when URL is in failedUrlCache'
);

// 5. Verify physical existence of bundled assets on disk
const publicDir = path.resolve(__dirname, '../../public');
const defaultSvgPath = path.join(publicDir, 'default-cover.svg');
assert(fs.existsSync(defaultSvgPath), 'default-cover.svg exists in frontend/public');

for (const [, relativePath] of Object.entries(BUNDLED_COVERS_MAP)) {
  const assetPath = path.join(publicDir, relativePath);
  assert(fs.existsSync(assetPath), `Bundled cover exists on disk: ${relativePath}`);
}

console.log(`\n${colors.cyan('========================================')}`);
console.log(`Image Fallback Tests Finished: ${colors.green(`${passed} passed`)}, ${failed} failed`);
console.log(`${colors.cyan('========================================')}\n`);

process.exit(failed > 0 ? 1 : 0);
