import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';
import Song from '../src/models/Song.js';

const BASE_URL = 'http://localhost:5000/api';

const colors = {
  green: (text) => `\x1b[32m${text}\x1b[0m`,
  red: (text) => `\x1b[31m${text}\x1b[0m`,
  cyan: (text) => `\x1b[36m${text}\x1b[0m`,
  yellow: (text) => `\x1b[33m${text}\x1b[0m`,
};

let passedCount = 0;
let failedCount = 0;

function assert(condition, testName, detail = '') {
  if (condition) {
    console.log(`  ${colors.green('✔')} ${testName}`);
    passedCount++;
  } else {
    console.error(`  ${colors.red('✖')} ${testName} - ${detail}`);
    failedCount++;
  }
}

async function runTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('  Vibely Favourites & Play Later Tests ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  let user1Token = null;
  let user1Id = null;
  let user2Token = null;
  let user2Id = null;
  let testSong1 = null;
  let testSong2 = null;

  try {
    // 1. Setup test users and songs
    console.log(colors.yellow('1. Setting up test users and catalog songs:'));
    const timestamp = Date.now();
    const u1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Music Fan 1',
        email: `fan1_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    const u1Data = await u1Res.json();
    user1Token = u1Data.token;
    user1Id = u1Data.user.id;
    assert(u1Res.status === 201 && user1Token, 'Registered User 1 successfully');

    const u2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Music Fan 2',
        email: `fan2_${timestamp}@example.com`,
        password: 'Password123!',
      }),
    });
    const u2Data = await u2Res.json();
    user2Token = u2Data.token;
    user2Id = u2Data.user.id;
    assert(u2Res.status === 201 && user2Token, 'Registered User 2 successfully');

    const songs = await Song.find().limit(2);
    assert(songs.length >= 1, 'Catalogue has at least one song available for testing');
    testSong1 = songs[0];
    testSong2 = songs.length > 1 ? songs[1] : songs[0];
    const song1Id = testSong1._id.toString();
    const song2Id = testSong2._id.toString();

    // 2. Testing unauthenticated access
    console.log(colors.yellow('\n2. Testing unauthenticated access control (401 enforcement):'));
    const unauthFavGet = await fetch(`${BASE_URL}/favorites`);
    assert(unauthFavGet.status === 401, 'GET /api/favorites rejected without token (401)');

    const unauthFavPost = await fetch(`${BASE_URL}/favorites/${song1Id}`, { method: 'POST' });
    assert(unauthFavPost.status === 401, 'POST /api/favorites/:id rejected without token (401)');

    const unauthFavDel = await fetch(`${BASE_URL}/favorites/${song1Id}`, { method: 'DELETE' });
    assert(unauthFavDel.status === 401, 'DELETE /api/favorites/:id rejected without token (401)');

    const unauthPlayLaterGet = await fetch(`${BASE_URL}/play-later`);
    assert(unauthPlayLaterGet.status === 401, 'GET /api/play-later rejected without token (401)');

    const unauthPlayLaterPost = await fetch(`${BASE_URL}/play-later/${song1Id}`, { method: 'POST' });
    assert(unauthPlayLaterPost.status === 401, 'POST /api/play-later/:id rejected without token (401)');

    const unauthPlayLaterDel = await fetch(`${BASE_URL}/play-later/${song1Id}`, { method: 'DELETE' });
    assert(unauthPlayLaterDel.status === 401, 'DELETE /api/play-later/:id rejected without token (401)');

    // 3. Validation: Invalid song ID format
    console.log(colors.yellow('\n3. Testing invalid song ID validations (400 Bad Request):'));
    const invalidFavRes = await fetch(`${BASE_URL}/favorites/invalid-mongo-id`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(invalidFavRes.status === 400, 'POST /api/favorites/invalid-id returns 400 Bad Request');

    const invalidPlayLaterRes = await fetch(`${BASE_URL}/play-later/invalid-mongo-id`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(invalidPlayLaterRes.status === 400, 'POST /api/play-later/invalid-id returns 400 Bad Request');

    // 4. Validation: Non-existent song ID (404 Not Found)
    console.log(colors.yellow('\n4. Testing nonexistent song ID handling (404 Not Found):'));
    const fakeId = new mongoose.Types.ObjectId().toString();
    const notFoundFavRes = await fetch(`${BASE_URL}/favorites/${fakeId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(notFoundFavRes.status === 404, 'POST /api/favorites with nonexistent ID returns 404');

    const notFoundPlayLaterRes = await fetch(`${BASE_URL}/play-later/${fakeId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(notFoundPlayLaterRes.status === 404, 'POST /api/play-later with nonexistent ID returns 404');

    // 5. Adding to Favourites & Duplicate Prevention
    console.log(colors.yellow('\n5. Testing adding to favourites and duplicate prevention:'));
    const addFavRes = await fetch(`${BASE_URL}/favorites/${song1Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const addFavData = await addFavRes.json();
    assert(addFavRes.status === 200, 'Add to favorites returns HTTP 200 OK');
    assert(addFavData.success === true, 'Returns success: true');
    assert(addFavData.isFavorite === true, 'Returns isFavorite: true');
    assert(addFavData.data && (addFavData.data.id || addFavData.data._id) === song1Id, 'Returns song data');

    // Duplicate addition should succeed idempotently without creating duplicate entries
    const dupFavRes = await fetch(`${BASE_URL}/songs/${song1Id}/favorite`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(dupFavRes.status === 200, 'Adding same song to favorites again is idempotent (HTTP 200)');

    // Verify User 1 favourites list
    const getFav1Res = await fetch(`${BASE_URL}/favorites`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const getFav1Data = await getFav1Res.json();
    assert(getFav1Res.status === 200, 'GET /api/favorites returns HTTP 200 OK');
    assert(getFav1Data.count === 1, 'Favorites count is exactly 1 (no duplicates)');
    assert(getFav1Data.songIds.includes(song1Id), 'User 1 favorites includes added song');
    assert(getFav1Data.data[0].title === testSong1.title, 'Populated song metadata is returned');

    // Also verify /api/songs/favorites/mine route alias
    const getFavMineRes = await fetch(`${BASE_URL}/songs/favorites/mine`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const getFavMineData = await getFavMineRes.json();
    assert(getFavMineRes.status === 200 && getFavMineData.count === 1, 'GET /api/songs/favorites/mine works identically');

    // 6. User Isolation / Ownership check
    console.log(colors.yellow('\n6. Testing user isolation and data ownership:'));
    const user2FavRes = await fetch(`${BASE_URL}/favorites`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const user2FavData = await user2FavRes.json();
    assert(user2FavRes.status === 200, 'User 2 fetches their own favorites (HTTP 200)');
    assert(user2FavData.count === 0, 'User 2 does NOT see User 1 favourites (count is 0)');

    // 7. Removing from Favourites
    console.log(colors.yellow('\n7. Testing removal from favourites:'));
    const delFavRes = await fetch(`${BASE_URL}/favorites/${song1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const delFavData = await delFavRes.json();
    assert(delFavRes.status === 200, 'DELETE /api/favorites/:id returns HTTP 200 OK');
    assert(delFavData.isFavorite === false, 'Returns isFavorite: false');

    const checkDelRes = await fetch(`${BASE_URL}/favorites`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const checkDelData = await checkDelRes.json();
    assert(checkDelData.count === 0, 'User 1 favorites count is now 0 after deletion');

    // 8. Play Later Addition, Persistence, and Duplicate Handling
    console.log(colors.yellow('\n8. Testing Play Later add, persistence & duplicate prevention:'));
    const addPlayLaterRes = await fetch(`${BASE_URL}/play-later/${song1Id}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const addPlayLaterData = await addPlayLaterRes.json();
    assert(addPlayLaterRes.status === 200, 'POST /api/play-later/:id returns HTTP 200 OK');
    assert(addPlayLaterData.isInPlayLater === true, 'Returns isInPlayLater: true');

    // Duplicate addition
    const dupPlayLaterRes = await fetch(`${BASE_URL}/songs/${song1Id}/play-later`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(dupPlayLaterRes.status === 200, 'Duplicate add to Play Later succeeds idempotently (HTTP 200)');

    // Verify Play Later list
    const getPlayLaterRes = await fetch(`${BASE_URL}/play-later`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const getPlayLaterData = await getPlayLaterRes.json();
    assert(getPlayLaterRes.status === 200, 'GET /api/play-later returns HTTP 200 OK');
    assert(getPlayLaterData.count === 1, 'Play Later count is exactly 1 (no duplicates)');
    assert(getPlayLaterData.songIds.includes(song1Id), 'Play Later includes added song ID');
    assert(getPlayLaterData.data[0].title === testSong1.title, 'Populated song metadata is returned in Play Later');

    // Play Later user isolation
    const user2PlayLaterRes = await fetch(`${BASE_URL}/play-later`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const user2PlayLaterData = await user2PlayLaterRes.json();
    assert(user2PlayLaterData.count === 0, 'User 2 Play Later is completely isolated (count is 0)');

    // 9. Play Later Removal
    console.log(colors.yellow('\n9. Testing Play Later removal:'));
    const delPlayLaterRes = await fetch(`${BASE_URL}/play-later/${song1Id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const delPlayLaterData = await delPlayLaterRes.json();
    assert(delPlayLaterRes.status === 200, 'DELETE /api/play-later/:id returns HTTP 200 OK');
    assert(delPlayLaterData.isInPlayLater === false, 'Returns isInPlayLater: false');

    const checkPlayLaterDel = await fetch(`${BASE_URL}/play-later`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const checkPlayLaterDelData = await checkPlayLaterDel.json();
    assert(checkPlayLaterDelData.count === 0, 'Play Later list is now empty (count is 0)');

    // 10. Individual Song Details Endpoint (GET /api/songs/:id)
    console.log(colors.yellow('\n10. Testing Individual Song Details endpoint (/api/songs/:id):'));
    const songDetailRes = await fetch(`${BASE_URL}/songs/${song1Id}`);
    const songDetailData = await songDetailRes.json();
    assert(songDetailRes.status === 200, 'GET /api/songs/:id returns HTTP 200 OK');
    assert(songDetailData.success === true, 'Returns success: true');
    assert(songDetailData.data.title === testSong1.title, 'Returns correct song title');
    assert(songDetailData.data.artist === testSong1.artist, 'Returns correct artist name');
    assert(songDetailData.data.genre === testSong1.genre, 'Returns correct genre');
    assert(typeof songDetailData.data.duration === 'number', 'Returns numeric duration');
    assert(typeof songDetailData.data.coverUrl === 'string', 'Returns cover image URL');
    assert(typeof songDetailData.data.audioUrl === 'string', 'Returns audio URL');

    const badIdRes = await fetch(`${BASE_URL}/songs/not-valid-id`);
    assert(badIdRes.status === 400, 'GET /api/songs/not-valid-id returns 400 Bad Request');

    const notFoundSongRes = await fetch(`${BASE_URL}/songs/${fakeId}`);
    assert(notFoundSongRes.status === 404, 'GET /api/songs/:nonexistentId returns 404 Not Found');

    // 11. Handling removed/missing songs gracefully
    console.log(colors.yellow('\n11. Testing graceful handling of deleted/missing songs:'));
    // Add song to User 1 favorites in DB
    const ghostSongId = new mongoose.Types.ObjectId();
    await User.findByIdAndUpdate(user1Id, { $push: { favorites: ghostSongId } });

    // Fetch favorites via API
    const ghostFetchRes = await fetch(`${BASE_URL}/favorites`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const ghostFetchData = await ghostFetchRes.json();
    assert(ghostFetchRes.status === 200, 'Fetch favorites succeeds even if referenced song is missing');
    assert(
      !ghostFetchData.songIds.includes(ghostSongId.toString()),
      'Missing/deleted song was filtered out cleanly from returned favorites'
    );

    // 12. Cleanup
    console.log(colors.yellow('\n12. Cleaning up test users:'));
    await User.findByIdAndDelete(user1Id);
    await User.findByIdAndDelete(user2Id);
    assert(true, 'Cleaned up test users from database');

  } catch (error) {
    console.error(colors.red('\nUnexpected error during test execution:'), error);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Favourites & Play Later Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
