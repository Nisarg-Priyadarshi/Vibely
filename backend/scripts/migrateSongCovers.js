import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import Song from '../src/models/Song.js';

try {
  const dnsServers = process.env.DNS_SERVERS
    ? process.env.DNS_SERVERS.split(',').map((s) => s.trim())
    : ['8.8.8.8', '8.8.4.4', '1.1.1.1'];
  dns.setServers(dnsServers);
} catch (err) {
  console.warn('⚠️  [DNS] Could not set custom DNS servers:', err.message);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

/**
 * Verified permanent HTTPS Cloudinary cover artworks for catalog songs.
 * Replaces unreliable external hosts (e.g., Unsplash) with high-availability CDN assets.
 */
export const stableArtworkMap = {
  'Echoes of Starlight': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003143/vibely/covers/echoes_of_starlight.jpg',
  'Midnight Rain': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003145/vibely/covers/midnight_rain.jpg',
  'Solar Horizons': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003147/vibely/covers/solar_horizons.jpg',
  'Electric Skyline': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003148/vibely/covers/electric_skyline.jpg',
  'Velvet Groove': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003150/vibely/covers/velvet_groove.jpg',
  'Golden Hour Glow': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003152/vibely/covers/golden_hour_glow.jpg',
  'Neon Mirage': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003154/vibely/covers/neon_mirage.jpg',
  'Breeze & Bass': 'https://res.cloudinary.com/hjk7yzk2/image/upload/v1793003155/vibely/covers/breeze_and_bass.jpg',
};

export async function migrateSongCovers() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not configured in backend/.env');
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'Vibely';
  console.log(`Connecting to MongoDB (${dbName})...`);
  await mongoose.connect(uri, { dbName });
  console.log('Connected to MongoDB.');

  let updatedCount = 0;
  let alreadyUpToDate = 0;

  for (const [title, coverUrl] of Object.entries(stableArtworkMap)) {
    const song = await Song.findOne({ title });
    if (!song) {
      console.warn(`  ⚠️  Song "${title}" not found in catalogue`);
      continue;
    }

    if (song.coverUrl === coverUrl) {
      alreadyUpToDate++;
      console.log(`  ✓ Already up-to-date: "${title}"`);
    } else {
      console.log(`  ↻ Migrating "${title}":\n      From: ${song.coverUrl}\n      To:   ${coverUrl}`);
      await Song.updateOne({ _id: song._id }, { $set: { coverUrl } });
      updatedCount++;
    }
  }

  console.log(`\n✅ Migration complete! (${updatedCount} updated, ${alreadyUpToDate} already up-to-date)`);
  await mongoose.disconnect();
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  migrateSongCovers().catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  });
}
