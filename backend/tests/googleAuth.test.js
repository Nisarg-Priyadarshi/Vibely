import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

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
  console.log(`${colors.cyan('      Vibely Google OAuth Tests        ')}`);
  console.log(`${colors.cyan('========================================')}\n`);

  try {
    // 1. Missing credential and code validation
    console.log(colors.yellow('1. Testing input validation on POST /api/auth/google:'));
    const emptyRes = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const emptyData = await emptyRes.json();
    assert(emptyRes.status === 400, 'POST /google without body returns HTTP 400 Bad Request');
    assert(emptyData.success === false, 'POST /google returns success: false on missing credential');
    assert(
      emptyData.error?.message?.includes('credential or authorization code is required'),
      'Clear error message on missing credential'
    );

    // 2. Invalid Google token rejected
    console.log(colors.yellow('\n2. Testing invalid Google token handling:'));
    const invalidTokenRes = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ credential: 'invalid.google.jwt.token' }),
    });
    const invalidTokenData = await invalidTokenRes.json();
    assert(invalidTokenRes.status === 401, 'Invalid Google token returns HTTP 401 Unauthorized');
    assert(invalidTokenData.success === false, 'Invalid Google token returns success: false');
    assert(
      invalidTokenData.error?.message?.includes('Invalid Google credential'),
      'Clear error message rejecting invalid credential'
    );

    // 3. Alternative field name: idToken
    console.log(colors.yellow('\n3. Testing alternative parameter names (idToken / code):'));
    const idTokenRes = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ idToken: 'invalid.google.jwt.token' }),
    });
    assert(idTokenRes.status === 401, 'POST /google accepts idToken parameter');

    // 4. Invalid authorization code rejected
    const invalidCodeRes = await fetch(`${BASE_URL}/google`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ code: 'invalid_auth_code_123' }),
    });
    assert(
      invalidCodeRes.status === 401 || invalidCodeRes.status === 400,
      'Invalid authorization code rejected with 400 or 401'
    );

    // 5. Google redirect flow: GET /api/auth/google
    console.log(colors.yellow('\n4. Testing server-side redirect flow:'));
    const redirectRes = await fetch(`${BASE_URL}/google`, {
      method: 'GET',
      redirect: 'manual', // do not follow redirect
    });
    assert(
      redirectRes.status === 302,
      'GET /api/auth/google returns HTTP 302 Found redirect'
    );
    const location = redirectRes.headers.get('location');
    assert(
      location && location.startsWith('https://accounts.google.com/o/oauth2/v2/auth'),
      'Redirects to Google OAuth 2.0 authorization endpoint'
    );
    assert(
      location && location.includes('client_id='),
      'Redirect URL includes client_id parameter'
    );
    assert(
      location && location.includes('redirect_uri='),
      'Redirect URL includes redirect_uri parameter'
    );

    // 6. Google callback error handling: GET /api/auth/google/callback?error=access_denied
    console.log(colors.yellow('\n5. Testing OAuth callback error handling:'));
    const callbackErrRes = await fetch(`${BASE_URL}/google/callback?error=access_denied`, {
      method: 'GET',
      redirect: 'manual',
    });
    assert(
      callbackErrRes.status === 302,
      'GET /api/auth/google/callback with error returns HTTP 302 redirect'
    );
    const callbackErrLoc = callbackErrRes.headers.get('location');
    assert(
      callbackErrLoc && callbackErrLoc.includes('/login?error=access_denied'),
      'Redirects back to frontend /login with error query param'
    );

    // 7. Google callback missing code handling
    const callbackNoCodeRes = await fetch(`${BASE_URL}/google/callback`, {
      method: 'GET',
      redirect: 'manual',
    });
    assert(
      callbackNoCodeRes.status === 302,
      'GET /api/auth/google/callback without code returns HTTP 302 redirect'
    );
    const callbackNoCodeLoc = callbackNoCodeRes.headers.get('location');
    assert(
      callbackNoCodeLoc && callbackNoCodeLoc.includes('/login?error=missing_auth_code'),
      'Redirects back to frontend /login with missing_auth_code error'
    );

  } catch (error) {
    console.error(colors.red('\nUnexpected error during Google Auth test:'), error);
    failedCount++;
  } finally {
    console.log(`\n${colors.cyan('========================================')}`);
    console.log(
      `Google OAuth Tests Finished: ${colors.green(`${passedCount} passed`)}, ${failedCount > 0 ? colors.red(`${failedCount} failed`) : '0 failed'}`
    );
    console.log(`${colors.cyan('========================================')}\n`);
    process.exit(failedCount > 0 ? 1 : 0);
  }
}

runTests();
