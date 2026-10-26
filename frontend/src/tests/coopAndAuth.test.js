import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDir = path.resolve(__dirname, '../../');

console.log('\n========================================');
console.log('    COOP & Google OAuth Policy Tests    ');
console.log('========================================\n');

let passed = 0;
let failed = 0;

function test(description, fn) {
  try {
    fn();
    console.log(`  ✔ ${description}`);
    passed++;
  } catch (err) {
    console.error(`  ✖ ${description}`);
    console.error(`    ${err.message}`);
    failed++;
  }
}

// 1. Test vercel.json configuration
test('vercel.json exists in frontend root', () => {
  const vercelPath = path.join(frontendDir, 'vercel.json');
  assert(fs.existsSync(vercelPath), 'frontend/vercel.json must exist');
});

test('vercel.json configures Cross-Origin-Opener-Policy: same-origin-allow-popups', () => {
  const vercelPath = path.join(frontendDir, 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  assert(Array.isArray(vercelConfig.headers), 'vercel.json must define headers array');

  const coopHeaderRule = vercelConfig.headers.find(rule => 
    rule.headers?.some(h => h.key === 'Cross-Origin-Opener-Policy' && h.value === 'same-origin-allow-popups')
  );
  assert(coopHeaderRule, 'vercel.json must include Cross-Origin-Opener-Policy: same-origin-allow-popups');
});

test('vercel.json configures SPA rewrites for client-side routing', () => {
  const vercelPath = path.join(frontendDir, 'vercel.json');
  const vercelConfig = JSON.parse(fs.readFileSync(vercelPath, 'utf8'));
  assert(Array.isArray(vercelConfig.rewrites), 'vercel.json must define rewrites array');

  const spaRewrite = vercelConfig.rewrites.find(r => r.source === '/(.*)' && r.destination === '/index.html');
  assert(spaRewrite, 'vercel.json must rewrite all routes to /index.html for SPA routing');
});

// 2. Test vite.config.js dev server headers
test('vite.config.js includes same-origin-allow-popups in server headers', () => {
  const vitePath = path.join(frontendDir, 'vite.config.js');
  const viteContent = fs.readFileSync(vitePath, 'utf8');
  assert(viteContent.includes("'Cross-Origin-Opener-Policy': 'same-origin-allow-popups'"),
    'vite.config.js must set Cross-Origin-Opener-Policy in server.headers'
  );
});

// 3. Test Google Identity Services initialization in Login.jsx
test('Login.jsx initializes Google Identity Services with use_fedcm_for_prompt: true', () => {
  const loginPath = path.join(frontendDir, 'src/pages/Login.jsx');
  const loginContent = fs.readFileSync(loginPath, 'utf8');
  assert(loginContent.includes('use_fedcm_for_prompt: true'), 'Login.jsx must enable use_fedcm_for_prompt');
  assert(loginContent.includes('client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID'), 'Login.jsx must use client ID from env');
});

// 4. Test Google Identity Services initialization in Register.jsx
test('Register.jsx initializes Google Identity Services with use_fedcm_for_prompt: true', () => {
  const registerPath = path.join(frontendDir, 'src/pages/Register.jsx');
  const registerContent = fs.readFileSync(registerPath, 'utf8');
  assert(registerContent.includes('use_fedcm_for_prompt: true'), 'Register.jsx must enable use_fedcm_for_prompt');
  assert(registerContent.includes('client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID'), 'Register.jsx must use client ID from env');
});

// 5. Test GSI client script tag in index.html
test('index.html loads accounts.google.com/gsi/client with async defer', () => {
  const indexPath = path.join(frontendDir, 'index.html');
  const indexContent = fs.readFileSync(indexPath, 'utf8');
  assert(indexContent.includes('https://accounts.google.com/gsi/client'), 'index.html must load Google Identity Services');
  assert(indexContent.includes('async') && indexContent.includes('defer'), 'GSI script tag must have async and defer');
});

console.log(`\n========================================`);
console.log(`COOP & Google OAuth Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================\n`);

if (failed > 0) {
  process.exit(1);
}
