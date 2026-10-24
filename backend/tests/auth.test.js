import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import User from '../src/models/User.js';
import { signToken } from '../src/services/authService.js';

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

async function runTests() {
  console.log(`\n${colors.cyan('========================================')}`);
  console.log(`${colors.cyan('       Vibely Auth Test Suite          ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  // Connect to DB for direct model inspection
  await mongoose.connect(process.env.MONGODB_URI, { dbName: process.env.DB_NAME || 'Vibely' });

  const testEmail = `vibely_tester_${Date.now()}@example.com`;
  const testPassword = 'SecurePassword123!';
  const testName = 'Test User';
  let authToken = null;
  let authCookie = null;
  let createdUserId = null;

  try {
    // 1. Invalid input validation on registration
    console.log(colors.yellow('\n1. Testing input validation on registration:'));
    const invalidInputs = [
      { body: { name: '', email: testEmail, password: testPassword }, desc: 'Empty name' },
      { body: { name: testName, email: 'not-an-email', password: testPassword }, desc: 'Invalid email' },
      { body: { name: testName, email: testEmail, password: '123' }, desc: 'Short password (<6 chars)' },
    ];

    for (const testCase of invalidInputs) {
      const res = await fetch(`${BASE_URL}/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(testCase.body),
      });
      const data = await res.json();
      assert(res.status === 400 && data.success === false, `Rejected invalid input (${testCase.desc}) with 400`);
    }

    // 2. Successful Registration
    console.log(colors.yellow('\n2. Testing successful registration:'));
    const regRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regData = await regRes.json();
    assert(regRes.status === 201, 'Registration returns HTTP 201 Created');
    assert(regData.success === true, 'Registration returns success: true');
    assert(regData.user && regData.user.id, 'Response contains user id');
    assert(regData.user.email === testEmail.toLowerCase(), 'User email is properly normalized');
    assert(regData.user.password === undefined, 'Password is NOT exposed in response user object');
    assert(typeof regData.token === 'string', 'Registration returns signed JWT token');

    // Check Set-Cookie header
    const setCookieHeader = regRes.headers.get('set-cookie');
    assert(
      setCookieHeader && setCookieHeader.includes('token=') && setCookieHeader.toLowerCase().includes('httponly'),
      'Registration response sets secure HTTP-only cookie'
    );

    createdUserId = regData.user.id;
    authToken = regData.token;
    authCookie = setCookieHeader ? setCookieHeader.split(';')[0] : '';

    // 3. Password Hashing Verification in Database
    console.log(colors.yellow('\n3. Testing password hashing in MongoDB Atlas:'));
    const dbUser = await User.findById(createdUserId).select('+password');
    assert(!!dbUser, 'User is persisted in MongoDB Atlas');
    assert(dbUser.password !== testPassword, 'Stored password is NOT plaintext');
    assert(
      dbUser.password.startsWith('$2a$') || dbUser.password.startsWith('$2b$'),
      'Stored password is a valid bcrypt hash'
    );

    // 4. Duplicate Email Registration
    console.log(colors.yellow('\n4. Testing duplicate email rejection:'));
    const dupRes = await fetch(`${BASE_URL}/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Another User',
        email: testEmail.toUpperCase(), // Testing case-insensitive uniqueness
        password: 'AnotherPassword123!',
      }),
    });
    const dupData = await dupRes.json();
    assert(dupRes.status === 409, 'Duplicate registration returns HTTP 409 Conflict');
    assert(dupData.success === false, 'Duplicate registration returns success: false');

    // 5. Login Validations
    console.log(colors.yellow('\n5. Testing login credentials and validations:'));
    // Missing credentials
    const emptyLoginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail }),
    });
    assert(emptyLoginRes.status === 400, 'Missing password returns HTTP 400 Bad Request');

    // Incorrect password
    const wrongPassRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: 'WrongPassword999' }),
    });
    assert(wrongPassRes.status === 401, 'Incorrect password returns HTTP 401 Unauthorized');

    // Successful login
    const loginRes = await fetch(`${BASE_URL}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: testEmail, password: testPassword }),
    });
    const loginData = await loginRes.json();
    assert(loginRes.status === 200, 'Correct credentials return HTTP 200 OK');
    assert(loginData.success === true, 'Login returns success: true');
    assert(loginData.user.email === testEmail.toLowerCase(), 'Login returns matching safe user object');
    assert(loginData.user.password === undefined, 'Password is NOT exposed in login response');
    assert(typeof loginData.token === 'string', 'Login returns signed JWT token');

    const loginCookieHeader = loginRes.headers.get('set-cookie');
    assert(
      loginCookieHeader && loginCookieHeader.includes('token=') && loginCookieHeader.toLowerCase().includes('httponly'),
      'Login sets secure HTTP-only cookie'
    );

    // 6. Accessing Protected Route /api/auth/me
    console.log(colors.yellow('\n6. Testing protected route /api/auth/me:'));
    // Unauthenticated (logged out access)
    const unauthRes = await fetch(`${BASE_URL}/me`, {
      headers: { Origin: 'http://localhost:5173' },
    });
    const unauthData = await unauthRes.json();
    assert(unauthRes.status === 401, 'Unauthenticated /api/auth/me returns HTTP 401 Unauthorized');
    assert(unauthData.success === false, 'Unauthenticated /api/auth/me returns success: false');
    assert(
      unauthData.error?.message === 'Authentication required. No token provided.',
      'Unauthenticated /api/auth/me returns clear authentication required error message'
    );

    // CORS & COOP Headers verification
    const coopHeader = unauthRes.headers.get('cross-origin-opener-policy');
    assert(
      coopHeader === 'same-origin-allow-popups',
      'API sets Cross-Origin-Opener-Policy: same-origin-allow-popups for Google OAuth support'
    );
    assert(
      unauthRes.headers.get('access-control-allow-credentials') === 'true',
      'CORS response permits credentials from frontend origin'
    );
    assert(
      unauthRes.headers.get('access-control-allow-origin') === 'http://localhost:5173',
      'CORS response allows origin http://localhost:5173'
    );

    // Cross-origin request from 127.0.0.1
    const altOriginRes = await fetch(`${BASE_URL}/me`, {
      headers: { Origin: 'http://127.0.0.1:5173' },
    });
    assert(
      altOriginRes.headers.get('access-control-allow-origin') === 'http://127.0.0.1:5173',
      'CORS dynamically supports 127.0.0.1:5173 with credentials'
    );

    // Authenticated via Bearer Token header
    const authHeaderRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${authToken}` },
    });
    const authHeaderData = await authHeaderRes.json();
    assert(authHeaderRes.status === 200, 'Authenticated via Bearer header returns HTTP 200 OK');
    assert(authHeaderData.user.id === createdUserId, 'Returns correct user profile via Bearer token');

    // Authenticated via Cookie
    const cookieRes = await fetch(`${BASE_URL}/me`, {
      headers: { Cookie: authCookie },
    });
    const cookieData = await cookieRes.json();
    assert(cookieRes.status === 200, 'Authenticated via HTTP-only Cookie returns HTTP 200 OK');
    assert(cookieData.user.id === createdUserId, 'Returns correct user profile via Cookie');

    // Malformed token in Bearer header
    const malformedHeaderRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: 'Bearer this.is.an.invalid.token' },
    });
    const malformedHeaderData = await malformedHeaderRes.json();
    assert(malformedHeaderRes.status === 401, 'Malformed Bearer token returns HTTP 401 Unauthorized');
    assert(malformedHeaderData.error?.message === 'Invalid authentication token.', 'Malformed token returns invalid token message');

    // Malformed token in Cookie
    const malformedCookieRes = await fetch(`${BASE_URL}/me`, {
      headers: { Cookie: 'token=invalid.token.payload' },
    });
    assert(malformedCookieRes.status === 401, 'Malformed cookie token returns HTTP 401 Unauthorized');
    const malformedCookieHeader = malformedCookieRes.headers.get('set-cookie');
    assert(
      malformedCookieHeader && (malformedCookieHeader.includes('Expires=Thu, 01 Jan 1970') || malformedCookieHeader.includes('Max-Age=0')),
      'Malformed cookie token triggers cookie invalidation / clear'
    );

    // Expired token testing
    console.log(colors.yellow('\n6b. Testing expired token handling:'));
    const expiredToken = signToken({ id: createdUserId, email: testEmail }, { expiresIn: '-1s' });

    // Expired Bearer token
    const expiredHeaderRes = await fetch(`${BASE_URL}/me`, {
      headers: { Authorization: `Bearer ${expiredToken}` },
    });
    const expiredHeaderData = await expiredHeaderRes.json();
    assert(expiredHeaderRes.status === 401, 'Expired Bearer token returns HTTP 401 Unauthorized');
    assert(
      expiredHeaderData.error?.message === 'Authentication token has expired. Please log in again.',
      'Expired token returns descriptive expired message'
    );

    // Expired Cookie token
    const expiredCookieRes = await fetch(`${BASE_URL}/me`, {
      headers: { Cookie: `token=${expiredToken}` },
    });
    const expiredCookieData = await expiredCookieRes.json();
    assert(expiredCookieRes.status === 401, 'Expired Cookie token returns HTTP 401 Unauthorized');
    assert(
      expiredCookieData.error?.message === 'Authentication token has expired. Please log in again.',
      'Expired cookie token returns descriptive expired message'
    );
    const expiredCookieHeader = expiredCookieRes.headers.get('set-cookie');
    assert(
      expiredCookieHeader && (expiredCookieHeader.includes('Expires=Thu, 01 Jan 1970') || expiredCookieHeader.includes('Max-Age=0')),
      'Expired cookie triggers cookie clear to prevent stale session loop'
    );


    // 7. Testing Logout
    console.log(colors.yellow('\n7. Testing logout endpoint:'));
    const logoutRes = await fetch(`${BASE_URL}/logout`, {
      method: 'POST',
      headers: { Cookie: authCookie },
    });
    const logoutData = await logoutRes.json();
    assert(logoutRes.status === 200, 'Logout returns HTTP 200 OK');
    assert(logoutData.success === true, 'Logout returns success: true');

    const logoutCookieHeader = logoutRes.headers.get('set-cookie');
    assert(
      logoutCookieHeader && (logoutCookieHeader.includes('Expires=Thu, 01 Jan 1970') || logoutCookieHeader.includes('Max-Age=0')),
      'Logout response invalidates session by clearing auth cookie'
    );

    // 8. Cleaning up test user
    console.log(colors.yellow('\n8. Cleaning up test artifacts:'));
    if (createdUserId) {
      await User.findByIdAndDelete(createdUserId);
      const verifyDeleted = await User.findById(createdUserId);
      assert(!verifyDeleted, 'Test user cleaned up from database');
    }

  } catch (error) {
    console.error(colors.red('\nUnexpected error during test execution:'), error);
    failedCount++;
  } finally {
    await mongoose.disconnect();
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
