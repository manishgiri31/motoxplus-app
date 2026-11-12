/* eslint-disable */
// Session-retention test for the offline cold-start fix.
//
//   node scripts/test-auth-session.js
//
// The project has no JS test runner, so this loads the REAL api/client.ts
// (transpiled with sucrase, already in node_modules) and auth/sessionPolicy.ts
// under plain Node, with React Native-only modules stubbed and axios driven by
// a scripted adapter. It replays the cold-start call (GET /mobile/auth/me) and
// checks whether the stored tokens survive and whether AuthProvider's
// decision (isSessionRejection) would clear the session.

const fs = require('fs');
const path = require('path');
const Module = require('module');
const { transform } = require('sucrase');
const axios = require('axios');

const root = path.resolve(__dirname, '..');

// ---- stubs -----------------------------------------------------------------
const store = { tokens: null };
const events = { authFailures: 0 };
const stubs = {
  '@/auth/secureStorage': {
    secureStorage: {
      getTokens: async () => store.tokens,
      setTokens: async (t) => {
        store.tokens = { ...t };
      },
      clearTokens: async () => {
        store.tokens = null;
      },
    },
  },
  '@/auth/authEvents': {
    emitAuthFailure: () => {
      events.authFailures += 1;
    },
    emitVerificationRequired: () => {},
  },
  '@/config/env': { env: { apiUrl: 'http://api.test' } },
  '@/utils/haptics': { HapticService: { error: () => {} } },
  '@/utils/logger': {
    logger: { info() {}, request() {}, response() {}, networkError() {} },
  },
};

// ---- tiny TS loader ----------------------------------------------------------
const cache = new Map();
function loadTs(file) {
  if (cache.has(file)) return cache.get(file).exports;
  const src = fs.readFileSync(file, 'utf8');
  const { code } = transform(src, { transforms: ['typescript', 'imports'], filePath: file });
  const mod = { exports: {} };
  cache.set(file, mod);
  const localRequire = (spec) => {
    if (stubs[spec]) return stubs[spec];
    let target = null;
    if (spec.startsWith('@/')) target = path.join(root, spec.slice(2));
    else if (spec.startsWith('.')) target = path.resolve(path.dirname(file), spec);
    if (target) {
      for (const ext of ['.ts', '.tsx']) if (fs.existsSync(target + ext)) return loadTs(target + ext);
    }
    return Module.createRequire(file)(spec);
  };
  new Function('require', 'module', 'exports', code)(localRequire, mod, mod.exports);
  return mod.exports;
}

// ---- scripted network ----------------------------------------------------------
// routes: { 'GET /mobile/auth/me': [step, step, ...] } — each request consumes
// the next step; the last one repeats. A step is a status number or 'network'.
let routes = {};
const calls = [];
axios.defaults.adapter = async (config) => {
  const key = `${(config.method || 'get').toUpperCase()} ${config.url}`;
  calls.push(key);
  const queue = routes[key] || [500];
  const step = queue.length > 1 ? queue.shift() : queue[0];
  if (step === 'network') {
    throw new axios.AxiosError('Network Error', 'ERR_NETWORK', config, {});
  }
  if (step === 'timeout') {
    throw new axios.AxiosError('timeout of 15000ms exceeded', 'ECONNABORTED', config, {});
  }
  const body =
    step === 200 && key === 'POST /mobile/auth/refresh'
      ? { accessToken: 'new-access', refreshToken: 'new-refresh' }
      : step === 200
        ? { ok: true }
        : { error: `status ${step}` };
  const response = { data: body, status: step, statusText: String(step), headers: {}, config, request: {} };
  if (step >= 200 && step < 300) return response;
  throw new axios.AxiosError(`Request failed with status code ${step}`, 'ERR_BAD_RESPONSE', config, {}, response);
};

// Loaded after the adapter is set: axios.create() copies defaults.
const { apiClient } = loadTs(path.join(root, 'api/client.ts'));
const { isSessionRejection } = loadTs(path.join(root, 'auth/sessionPolicy.ts'));

// Mirrors AuthProvider#restoreSession's catch branch.
async function coldStart() {
  try {
    await apiClient.get('/mobile/auth/me');
    return 'signed-in';
  } catch (err) {
    if (isSessionRejection(err)) {
      store.tokens = null; // clearSession()
      return 'logged-out';
    }
    return 'offline';
  }
}

const cases = [
  { name: 'network error keeps tokens', routes: { 'GET /mobile/auth/me': ['network'] }, expect: 'offline', tokensKept: true },
  { name: 'timeout keeps tokens', routes: { 'GET /mobile/auth/me': ['timeout'] }, expect: 'offline', tokensKept: true },
  { name: '500 keeps tokens', routes: { 'GET /mobile/auth/me': [500] }, expect: 'offline', tokensKept: true },
  {
    name: '401, refresh offline -> keeps tokens',
    routes: { 'GET /mobile/auth/me': [401], 'POST /mobile/auth/refresh': ['network'] },
    expect: 'offline',
    tokensKept: true,
  },
  {
    name: '401, refresh 500 -> keeps tokens',
    routes: { 'GET /mobile/auth/me': [401], 'POST /mobile/auth/refresh': [500] },
    expect: 'offline',
    tokensKept: true,
  },
  {
    name: '401, refresh 401 -> clears tokens',
    routes: { 'GET /mobile/auth/me': [401], 'POST /mobile/auth/refresh': [401] },
    expect: 'logged-out',
    tokensKept: false,
    authFailure: true,
  },
  {
    name: '401, refresh 403 -> clears tokens',
    routes: { 'GET /mobile/auth/me': [401], 'POST /mobile/auth/refresh': [403] },
    expect: 'logged-out',
    tokensKept: false,
    authFailure: true,
  },
  { name: '403 on /me clears tokens', routes: { 'GET /mobile/auth/me': [403] }, expect: 'logged-out', tokensKept: false },
  {
    name: '401, refresh ok, replay ok -> signed in',
    routes: { 'GET /mobile/auth/me': [401, 200], 'POST /mobile/auth/refresh': [200] },
    expect: 'signed-in',
    tokensKept: true,
  },
];

(async () => {
  let failed = 0;
  for (const c of cases) {
    store.tokens = { accessToken: 'old-access', refreshToken: 'old-refresh' };
    events.authFailures = 0;
    calls.length = 0;
    routes = JSON.parse(JSON.stringify(c.routes));
    const outcome = await coldStart();
    const kept = store.tokens !== null;
    const problems = [];
    if (outcome !== c.expect) problems.push(`outcome ${outcome}, expected ${c.expect}`);
    if (kept !== c.tokensKept) problems.push(`tokens ${kept ? 'kept' : 'cleared'}`);
    if (c.authFailure && events.authFailures === 0) problems.push('no auth-failure event');
    if (!c.authFailure && events.authFailures > 0) problems.push('unexpected auth-failure event');
    if (problems.length) failed += 1;
    console.log(`${problems.length ? 'FAIL' : 'PASS'}  ${c.name}${problems.length ? '  -> ' + problems.join('; ') : ''}`);
  }
  console.log(`\n${cases.length - failed}/${cases.length} passed`);
  process.exit(failed ? 1 : 0);
})();
