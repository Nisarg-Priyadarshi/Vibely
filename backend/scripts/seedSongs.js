import 'dotenv/config';
import dns from 'dns';
import mongoose from 'mongoose';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

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

import Song from '../src/models/Song.js';

export const demoSongs = [
  {
    title: 'Echoes of Starlight',
    artist: 'Nova Aurora',
    album: 'Celestial Visions',
    genre: 'Synthwave',
    duration: 372,
    coverUrl: 'https://images.unsplash.com/photo-1614613535308-eb5fbd3d2c17?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
    tags: ['synthwave', 'energetic', 'focus'],
  },
  {
    title: 'Midnight Rain',
    artist: 'Lofi Dreamer',
    album: 'Cozy Afternoons',
    genre: 'Lofi',
    duration: 423,
    coverUrl: 'https://images.unsplash.com/photo-1487180144351-b8472da7d491?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
    tags: ['chill', 'lofi', 'relax', 'study'],
  },
  {
    title: 'Solar Horizons',
    artist: 'Aether Pulse',
    album: 'Deep Frequencies',
    genre: 'Ambient',
    duration: 342,
    coverUrl: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-3.mp3',
    tags: ['ambient', 'calm', 'meditation'],
  },
  {
    title: 'Electric Skyline',
    artist: 'Cyber Grid',
    album: 'Future City',
    genre: 'Electronic',
    duration: 302,
    coverUrl: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-4.mp3',
    tags: ['electronic', 'dance', 'workout'],
  },
  {
    title: 'Velvet Groove',
    artist: 'The Jazz Collective',
    album: 'Blue Room Sessions',
    genre: 'Jazz',
    duration: 326,
    coverUrl: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-8.mp3',
    tags: ['jazz', 'smooth', 'cozy'],
  },
  {
    title: 'Golden Hour Glow',
    artist: 'Acoustic Whispers',
    album: 'Timber & Strings',
    genre: 'Acoustic',
    duration: 350,
    coverUrl: 'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-9.mp3',
    tags: ['acoustic', 'warm', 'peaceful'],
  },
  {
    title: 'Neon Mirage',
    artist: 'Vapor Knight',
    album: 'Retrowave Odyssey',
    genre: 'Synthwave',
    duration: 298,
    coverUrl: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-10.mp3',
    tags: ['synthwave', 'retro', 'nightdrive'],
  },
  {
    title: 'Breeze & Bass',
    artist: 'Subtle Pulse',
    album: 'Liquid Horizons',
    genre: 'Electronic',
    duration: 334,
    coverUrl: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?w=600&auto=format&fit=crop&q=80',
    audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-16.mp3',
    tags: ['electronic', 'deep', 'groove'],
  },
];

export async function seedCatalogue() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error('❌ MONGODB_URI is not configured in backend/.env');
    process.exit(1);
  }

  const dbName = process.env.DB_NAME || 'Vibely';
  console.log(`Connecting to MongoDB (${dbName})...`);
  await mongoose.connect(uri, { dbName });
  console.log('Connected to MongoDB.');

  console.log(`\nSeeding ${demoSongs.length} demo tracks into catalogue...`);

  let createdCount = 0;
  let updatedCount = 0;

  for (const songData of demoSongs) {
    const existing = await Song.findOne({
      title: songData.title,
      artist: songData.artist,
    });

    if (existing) {
      // Update existing record idempotently
      await Song.updateOne({ _id: existing._id }, { $set: songData });
      updatedCount++;
      console.log(`  ↻ Updated: "${songData.title}" by ${songData.artist}`);
    } else {
      // Create new track
      await Song.create(songData);
      createdCount++;
      console.log(`  + Created: "${songData.title}" by ${songData.artist}`);
    }
  }

  const total = await Song.countDocuments();
  console.log(`\n✅ Seeding complete! (${createdCount} created, ${updatedCount} updated, total tracks: ${total})`);

  await mongoose.disconnect();
}

// Execute if run directly from CLI
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  seedCatalogue().catch((err) => {
    console.error('Seeding failed:', err);
    process.exit(1);
  });
}
