import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';
import { isCloudinaryConfigured } from '../src/config/cloudinary.js';
import { uploadAvatarToCloudinary } from '../src/services/cloudinaryService.js';


const BASE_URL = 'http://localhost:5000/api/auth';

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

// 1x1 pixel PNG
const validPngBuffer = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

// 1x1 pixel JPEG
const validJpegBuffer = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////wgALCAABAAEBAREA/8QAFBABAAAAAAAAAAAAAAAAAAAAAP/aAAgBAQABPxA=',
  'base64'
);

async function runTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('    Vibely Cloudinary Avatar Tests     ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  const testEmail = `avatar_tester_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Avatar Tester';
  let authToken = null;
  let testUserId = null;

  try {
    // Setup test user
    console.log(colors.yellow('1. Setting up authenticated test user:'));
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: testName, email: testEmail, password: testPassword }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201 && regData.token, 'Registered test user successfully');
    authToken = regData.token;
    testUserId = regData.user.id;

    // 2. Authentication Protection
    console.log(colors.yellow('\n2. Testing authentication enforcement on avatar endpoints:'));
    const unauthUpload = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
    });
    assert(unauthUpload.status === 401, 'POST /profile/avatar rejected without token (401)');

    const unauthDelete = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'DELETE',
    });
    assert(unauthDelete.status === 401, 'DELETE /profile/avatar rejected without token (401)');

    // 3. Validation: Missing file
    console.log(colors.yellow('\n3. Testing validation for missing file:'));
    const emptyForm = new FormData();
    const noFileRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: emptyForm,
    });
    const noFileData = await noFileRes.json();
    assert(noFileRes.status === 400, 'Upload without file returns HTTP 400 Bad Request');
    assert(noFileData.success === false, 'Returns success: false for missing file');

    // 4. Validation: Invalid MIME type
    console.log(colors.yellow('\n4. Testing validation for disallowed MIME type:'));
    const textBlob = new Blob(['Plain text file content'], { type: 'text/plain' });
    const invalidMimeForm = new FormData();
    invalidMimeForm.append('avatar', textBlob, 'notes.txt');

    const invalidMimeRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: invalidMimeForm,
    });
    const invalidMimeData = await invalidMimeRes.json();
    assert(invalidMimeRes.status === 400, 'Disallowed MIME type returns HTTP 400 Bad Request');
    assert(
      invalidMimeData.error?.message?.includes('Only JPEG, PNG, and WebP'),
      'Clear error message specifying allowed MIME types'
    );

    // 5. Validation: File size limit (> 5 MB)
    console.log(colors.yellow('\n5. Testing file size limit (> 5 MB):'));
    // Create oversized buffer (5.2 MB)
    const oversizedBuffer = Buffer.alloc(5.2 * 1024 * 1024, 0);
    const oversizedBlob = new Blob([oversizedBuffer], { type: 'image/png' });
    const oversizedForm = new FormData();
    oversizedForm.append('avatar', oversizedBlob, 'giant.png');

    const oversizedRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: oversizedForm,
    });
    const oversizedData = await oversizedRes.json();
    assert(oversizedRes.status === 400, 'Oversized file returns HTTP 400 Bad Request');
    assert(
      oversizedData.error?.message?.includes('5 MB'),
      'Clear error message mentioning 5 MB limit'
    );

    // 6. Cloudinary Configuration check (Missing credentials error)
    console.log(colors.yellow('\n6. Testing missing Cloudinary credentials handling:'));
    const originalApiKey = process.env.CLOUDINARY_API_KEY;
    try {
      // Temporarily blank out the API key in the environment
      delete process.env.CLOUDINARY_API_KEY;

      assert(isCloudinaryConfigured() === false, 'isCloudinaryConfigured correctly detects missing credential');

      let configErrorCaught = null;
      try {
        await uploadAvatarToCloudinary(validPngBuffer);
      } catch (err) {
        configErrorCaught = err;
      }

      assert(configErrorCaught !== null, 'uploadAvatarToCloudinary throws error on missing credentials');
      assert(configErrorCaught?.statusCode === 500, 'Missing credentials error status code is 500');
      assert(
        configErrorCaught?.message?.includes('Cloudinary configuration is missing'),
        'Returns clear configuration error without exposing secret credentials'
      );
    } finally {
      process.env.CLOUDINARY_API_KEY = originalApiKey;
    }


    // 7. Successful Image Upload (PNG)
    console.log(colors.yellow('\n7. Testing successful avatar upload to Cloudinary:'));
    const pngBlob = new Blob([validPngBuffer], { type: 'image/png' });
    const uploadForm = new FormData();
    uploadForm.append('avatar', pngBlob, 'avatar.png');

    const uploadRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: uploadForm,
    });
    const uploadData = await uploadRes.json();
    assert(uploadRes.status === 200, 'Upload returns HTTP 200 OK');
    assert(uploadData.success === true, 'Upload returns success: true');
    assert(
      typeof uploadData.user?.avatar === 'string' && uploadData.user.avatar.startsWith('https://res.cloudinary.com'),
      'Returns HTTPS Cloudinary image URL'
    );
    assert(typeof uploadData.user?.avatarPublicId === 'string', 'Returns avatar public ID in safe user object');
    assert(uploadData.user?.password === undefined, 'Password is NOT exposed in safe user response');
    assert(uploadData.user?.email === testEmail.toLowerCase(), 'User email preserved in response');

    const firstAvatarUrl = uploadData.user.avatar;
    const firstPublicId = uploadData.user.avatarPublicId;

    // Verify in MongoDB Atlas directly
    const dbUserAfterUpload = await User.findById(testUserId);
    assert(dbUserAfterUpload.avatar === firstAvatarUrl, 'MongoDB User document stores resulting image URL');
    assert(
      dbUserAfterUpload.avatarPublicId === firstPublicId,
      'MongoDB User document stores Cloudinary public ID'
    );

    // 8. Image Replacement (upload new JPEG avatar)
    console.log(colors.yellow('\n8. Testing avatar replacement:'));
    const jpegBlob = new Blob([validJpegBuffer], { type: 'image/jpeg' });
    const replaceForm = new FormData();
    replaceForm.append('avatar', jpegBlob, 'replacement.jpg');

    const replaceRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${authToken}` },
      body: replaceForm,
    });
    const replaceData = await replaceRes.json();
    assert(replaceRes.status === 200, 'Replacement upload returns HTTP 200 OK');
    assert(replaceData.success === true, 'Replacement returns success: true');
    assert(
      replaceData.user?.avatar && replaceData.user.avatar !== firstAvatarUrl,
      'Avatar URL updated to new Cloudinary image'
    );
    assert(
      replaceData.user?.avatarPublicId && replaceData.user.avatarPublicId !== firstPublicId,
      'Avatar public ID updated to new asset'
    );

    const secondPublicId = replaceData.user.avatarPublicId;

    // 9. Profile picture deletion
    console.log(colors.yellow('\n9. Testing avatar deletion:'));
    const deleteRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const deleteData = await deleteRes.json();
    assert(deleteRes.status === 200, 'DELETE /profile/avatar returns HTTP 200 OK');
    assert(deleteData.success === true, 'DELETE returns success: true');
    assert(deleteData.user?.avatar === null, 'User avatar reset to null in response');
    assert(deleteData.user?.avatarPublicId === null, 'User avatarPublicId reset to null in response');

    // Verify in MongoDB Atlas directly
    const dbUserAfterDelete = await User.findById(testUserId);
    assert(dbUserAfterDelete.avatar === null, 'MongoDB User document avatar is null');
    assert(dbUserAfterDelete.avatarPublicId === null, 'MongoDB User document avatarPublicId is null');

    // 10. Deletion when no avatar exists
    console.log(colors.yellow('\n10. Testing repeated deletion gracefully:'));
    const repeatDeleteRes = await fetch(`${BASE_URL}/profile/avatar`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${authToken}` },
    });
    assert(repeatDeleteRes.status === 200, 'Repeated deletion returns HTTP 200 OK without errors');

    // Clean up test user
    console.log(colors.yellow('\n11. Cleaning up test user:'));
    await User.findByIdAndDelete(testUserId);
    const cleaned = await User.findById(testUserId);
    assert(!cleaned, 'Test user deleted from database');

  } catch (error) {
    console.error(colors.red('\nUnexpected error during avatar test execution:'), error);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Avatar Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
