import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';
import Song from '../src/models/Song.js';
import Playlist from '../src/models/Playlist.js';

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

async function runPlaylistTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('       Vibely Playlists Test Suite      ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  // Create two distinct test users for ownership verification
  const timestamp = Date.now();
  const user1Email = `playlist_user1_${timestamp}@example.com`;
  const user2Email = `playlist_user2_${timestamp}@example.com`;
  const password = 'Password123!';

  let user1Token = null;
  let user2Token = null;
  let user1Id = null;
  let user2Id = null;
  let createdPlaylistId = null;
  let sampleSong = null;

  try {
    // Setup test users
    console.log(colors.yellow('1. Setting up test users and seed song:'));
    const reg1Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Playlist User 1', email: user1Email, password }),
    });
    const reg1Data = await reg1Res.json();
    user1Token = reg1Data.token;
    user1Id = reg1Data.user.id;

    const reg2Res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Playlist User 2', email: user2Email, password }),
    });
    const reg2Data = await reg2Res.json();
    user2Token = reg2Data.token;
    user2Id = reg2Data.user.id;

    sampleSong = await Song.findOne();
    assert(!!sampleSong, 'Catalogue song found for playlist tests');

    // 2. Reject unauthenticated playlist operations
    console.log(colors.yellow('\n2. Testing unauthenticated access control:'));
    const unauthCreate = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Unauth Playlist' }),
    });
    assert(unauthCreate.status === 401, 'POST /api/playlists rejected without token (401)');

    const unauthMine = await fetch(`${BASE_URL}/playlists/mine`);
    assert(unauthMine.status === 401, 'GET /api/playlists/mine rejected without token (401)');

    // 3. Create playlist while authenticated
    console.log(colors.yellow('\n3. Testing playlist creation:'));
    const createRes = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Late Night Coding',
        description: 'Atmospheric beats and lofi tracks',
        isPublic: true,
      }),
    });
    const createData = await createRes.json();
    assert(createRes.status === 201, 'POST /api/playlists returns HTTP 201 Created');
    assert(createData.success === true, 'Response contains success: true');
    assert(createData.data.name === 'Late Night Coding', 'Playlist name matches input');
    assert(createData.data.owner === user1Id, 'Owner is derived from authenticated user ID');
    assert(Array.isArray(createData.data.songs) && createData.data.songs.length === 0, 'New playlist starts empty');
    createdPlaylistId = createData.data.id || createData.data._id;

    // Invalid creation input
    const invalidCreate = await fetch(`${BASE_URL}/playlists`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: '' }),
    });
    assert(invalidCreate.status === 400, 'Empty playlist name rejected with HTTP 400 Bad Request');

    // 4. List current user's playlists
    console.log(colors.yellow('\n4. Testing GET /api/playlists/mine:'));
    const mineRes = await fetch(`${BASE_URL}/playlists/mine`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const mineData = await mineRes.json();
    assert(mineRes.status === 200, 'GET /api/playlists/mine returns HTTP 200 OK');
    assert(mineData.count === 1, 'Returns exactly 1 playlist for User 1');
    assert(mineData.data[0].id === createdPlaylistId, 'Returns created playlist');

    // User 2 should have 0 playlists
    const user2Mine = await fetch(`${BASE_URL}/playlists/mine`, {
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    const user2MineData = await user2Mine.json();
    assert(user2MineData.count === 0, 'User 2 sees 0 playlists in their library');

    // 5. Add song to playlist
    console.log(colors.yellow('\n5. Testing adding songs to playlist:'));
    const addSongRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ songId: sampleSong._id.toString() }),
    });
    const addSongData = await addSongRes.json();
    assert(addSongRes.status === 200, 'POST /api/playlists/:id/songs returns HTTP 200 OK');
    assert(addSongData.data.songs.length === 1, 'Playlist now contains 1 song');
    assert(addSongData.data.songs[0].title === sampleSong.title, 'Song details populated in response');

    // Duplicate song prevention
    const duplicateSongRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ songId: sampleSong._id.toString() }),
    });
    assert(duplicateSongRes.status === 409, 'Duplicate song rejected with HTTP 409 Conflict');

    // Add nonexistent song
    const nonExistentSongRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ songId: '507f1f77bcf86cd799439011' }),
    });
    assert(nonExistentSongRes.status === 404, 'Adding nonexistent song returns HTTP 404 Not Found');

    // 6. Get playlist details
    console.log(colors.yellow('\n6. Testing GET /api/playlists/:id details:'));
    const detailRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}`, {
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'GET /api/playlists/:id returns HTTP 200 OK');
    assert(detailData.data.songs.length === 1, 'Details contains populated songs');
    assert(detailData.data.owner.name === 'Playlist User 1', 'Populates playlist owner details');

    // 7. Update playlist details
    console.log(colors.yellow('\n7. Testing updating playlist:'));
    const updateRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({
        name: 'Deep Focus Beats',
        description: 'Updated description for focused study sessions',
      }),
    });
    const updateData = await updateRes.json();
    assert(updateRes.status === 200, 'PATCH /api/playlists/:id returns HTTP 200 OK');
    assert(updateData.data.name === 'Deep Focus Beats', 'Playlist name updated successfully');

    // 8. Cross-user authorization checks (User 2 attempting to modify User 1's playlist)
    console.log(colors.yellow('\n8. Testing cross-user authorization enforcement:'));
    const unauthorizedUpdate = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({ name: 'Hacked Playlist Name' }),
    });
    assert(unauthorizedUpdate.status === 403, 'User 2 rejected from modifying User 1 playlist (403)');

    const unauthorizedAddSong = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}/songs`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user2Token}`,
      },
      body: JSON.stringify({ songId: sampleSong._id.toString() }),
    });
    assert(unauthorizedAddSong.status === 403, 'User 2 rejected from adding songs to User 1 playlist (403)');

    const unauthorizedDelete = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user2Token}` },
    });
    assert(unauthorizedDelete.status === 403, 'User 2 rejected from deleting User 1 playlist (403)');

    // 9. Remove song from playlist
    console.log(colors.yellow('\n9. Testing removing songs from playlist:'));
    const removeSongRes = await fetch(
      `${BASE_URL}/playlists/${createdPlaylistId}/songs/${sampleSong._id.toString()}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      }
    );
    const removeSongData = await removeSongRes.json();
    assert(removeSongRes.status === 200, 'DELETE /api/playlists/:id/songs/:songId returns HTTP 200 OK');
    assert(removeSongData.data.songs.length === 0, 'Song removed from playlist');

    // Removing already removed song
    const removeAgainRes = await fetch(
      `${BASE_URL}/playlists/${createdPlaylistId}/songs/${sampleSong._id.toString()}`,
      {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${user1Token}` },
      }
    );
    assert(removeAgainRes.status === 404, 'Removing non-present song returns HTTP 404 Not Found');

    // 10. Profile Update validation
    console.log(colors.yellow('\n10. Testing profile update (/api/auth/profile):'));
    const profileUpdateRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'Alex Rivers Updated', email: 'attempted_hack@example.com' }),
    });
    const profileData = await profileUpdateRes.json();
    assert(profileUpdateRes.status === 200, 'Profile update returns HTTP 200 OK');
    assert(profileData.user.name === 'Alex Rivers Updated', 'Display name updated');
    assert(profileData.user.email === user1Email, 'Email change was ignored and preserved');

    // Invalid profile update (short name)
    const invalidProfileRes = await fetch(`${BASE_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${user1Token}`,
      },
      body: JSON.stringify({ name: 'A' }),
    });
    assert(invalidProfileRes.status === 400, 'Name < 2 characters rejected with HTTP 400 Bad Request');

    // 11. Delete playlist
    console.log(colors.yellow('\n11. Testing playlist deletion:'));
    const deleteRes = await fetch(`${BASE_URL}/playlists/${createdPlaylistId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${user1Token}` },
    });
    assert(deleteRes.status === 200, 'DELETE /api/playlists/:id returns HTTP 200 OK');

    const verifyDeleted = await Playlist.findById(createdPlaylistId);
    assert(!verifyDeleted, 'Playlist confirmed deleted from MongoDB');

    // 12. Cleanup test users
    console.log(colors.yellow('\n12. Cleaning up test artifacts:'));
    await User.findByIdAndDelete(user1Id);
    await User.findByIdAndDelete(user2Id);
    assert(true, 'Test users cleaned up');

  } catch (error) {
    console.error(colors.red('\nUnexpected error during playlist test execution:'), error);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Playlist Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runPlaylistTests();
