import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const BASE_URL = 'http://localhost:5000/api/songs';

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

async function runSongTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('       Vibely Songs Test Suite         ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  try {
    // 1. Paginated song listing
    console.log(colors.yellow('1. Testing song listing and pagination:'));
    const listRes = await fetch(`${BASE_URL}?page=1&limit=4`);
    const listData = await listRes.json();

    assert(listRes.status === 200, 'GET /api/songs returns HTTP 200 OK');
    assert(listData.success === true, 'Response contains success: true');
    assert(Array.isArray(listData.data), 'Response data is an array of songs');
    assert(listData.count === 4, 'Limit parameter accurately restricts count to 4');
    assert(listData.total >= 8, 'Total count reflects full catalogue');
    assert(listData.page === 1, 'Current page is 1');
    assert(listData.totalPages >= 2, 'Total pages calculated correctly');

    const sampleSong = listData.data[0];
    assert(typeof sampleSong.title === 'string', 'Song has title');
    assert(typeof sampleSong.artist === 'string', 'Song has artist');
    assert(typeof sampleSong.coverUrl === 'string', 'Song has coverUrl');
    assert(typeof sampleSong.audioUrl === 'string', 'Song has audioUrl');
    assert(typeof sampleSong.duration === 'number', 'Song has numeric duration');

    // 2. Genre listing & filtering
    console.log(colors.yellow('\n2. Testing genre endpoints and filtering:'));
    const genresRes = await fetch(`${BASE_URL}/genres`);
    const genresData = await genresRes.json();
    assert(genresRes.status === 200, 'GET /api/songs/genres returns HTTP 200 OK');
    assert(Array.isArray(genresData.data) && genresData.data.length > 0, 'Returns list of distinct genres');

    const testGenre = 'Lofi';
    const genreFilterRes = await fetch(`${BASE_URL}?genre=${testGenre}`);
    const genreFilterData = await genreFilterRes.json();
    assert(genreFilterRes.status === 200, 'Filtered genre returns HTTP 200 OK');
    assert(
      genreFilterData.data.every((s) => s.genre.toLowerCase() === testGenre.toLowerCase()),
      'All returned tracks match requested genre filter'
    );

    // 3. Search endpoint
    console.log(colors.yellow('\n3. Testing search capabilities:'));
    const searchRes = await fetch(`${BASE_URL}/search?q=Midnight`);
    const searchData = await searchRes.json();
    assert(searchRes.status === 200, 'GET /api/songs/search?q=Midnight returns HTTP 200 OK');
    assert(
      searchData.data.some((s) => s.title.includes('Midnight') || s.artist.includes('Midnight')),
      'Search successfully matched target song'
    );

    const emptySearchRes = await fetch(`${BASE_URL}/search?q=`);
    const emptySearchData = await emptySearchRes.json();
    assert(emptySearchRes.status === 200, 'Empty search query returns HTTP 200 OK');
    assert(emptySearchData.count === 0, 'Empty search returns 0 results');

    // 4. Single song retrieval
    console.log(colors.yellow('\n4. Testing single song details:'));
    const songId = sampleSong.id || sampleSong._id;
    const detailRes = await fetch(`${BASE_URL}/${songId}`);
    const detailData = await detailRes.json();
    assert(detailRes.status === 200, 'GET /api/songs/:id returns HTTP 200 OK');
    assert(detailData.data.title === sampleSong.title, 'Returned details match requested song');

    // 5. Error handling: invalid ID and not found
    console.log(colors.yellow('\n5. Testing error scenarios:'));
    const invalidIdRes = await fetch(`${BASE_URL}/invalid-song-id-123`);
    assert(invalidIdRes.status === 400, 'Malformed ID returns HTTP 400 Bad Request');

    const nonExistentIdRes = await fetch(`${BASE_URL}/507f1f77bcf86cd799439011`);
    assert(nonExistentIdRes.status === 404, 'Non-existent ID returns HTTP 404 Not Found');

  } catch (error) {
    console.error(colors.red('\nUnexpected error during song test execution:'), error);
    failedCount++;
  } finally {
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Song Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runSongTests();
