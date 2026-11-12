/* eslint-disable */
// Crash-reporting gate test: node scripts/test-crash-reporting.js
//
// Loads the real utils/crashReporting.ts (transpiled with sucrase) with
// @sentry/react-native and the logger stubbed, and checks that Sentry is only
// initialised for a release build with a DSN, and that a missing/bad DSN never
// throws (the app must still start).

const fs = require('fs');
const path = require('path');
const { transform } = require('sucrase');

const root = path.resolve(__dirname, '..');
const calls = { init: [], capture: [] };
let initThrows = false;

const sentryStub = {
  init: (opts) => {
    if (initThrows) throw new Error('Invalid Sentry Dsn');
    calls.init.push(opts);
  },
  captureException: (e) => calls.capture.push(e),
  reactNativeErrorHandlersIntegration: (o) => ({ name: 'ReactNativeErrorHandlers', options: o }),
};
const loggerStub = { logger: { error() {}, info() {}, warn() {} } };

function load() {
  const file = path.join(root, 'utils/crashReporting.ts');
  const { code } = transform(fs.readFileSync(file, 'utf8'), { transforms: ['typescript', 'imports'] });
  const mod = { exports: {} };
  const req = (s) => (s === '@sentry/react-native' ? sentryStub : s === './logger' ? loggerStub : require(s));
  global.__DEV__ = false;
  new Function('require', 'module', 'exports', code)(req, mod, mod.exports);
  return mod.exports;
}

const results = [];
function check(name, fn) {
  calls.init = [];
  calls.capture = [];
  initThrows = false;
  try {
    fn(load());
    results.push(['PASS', name]);
  } catch (e) {
    results.push(['FAIL', `${name} -> ${e.message}`]);
  }
}
const assert = (c, m) => {
  if (!c) throw new Error(m);
};

check('missing DSN: disabled, Sentry.init not called', (m) => {
  assert(m.initCrashReporting({ dsn: undefined, isDev: false }) === false, 'returned enabled');
  assert(calls.init.length === 0, 'init called');
  m.reportError(new Error('x'));
  assert(calls.capture.length === 0, 'captured while disabled');
});
check('empty DSN: disabled', (m) => {
  assert(m.initCrashReporting({ dsn: '  ', isDev: false }) === false, 'returned enabled');
  assert(calls.init.length === 0, 'init called');
});
check('dev build with DSN: disabled', (m) => {
  assert(m.initCrashReporting({ dsn: 'https://k@o.ingest.sentry.io/1', isDev: true }) === false, 'enabled in dev');
  assert(calls.init.length === 0, 'init called');
});
check('release build with DSN: enabled, global handlers on', (m) => {
  assert(m.initCrashReporting({ dsn: 'https://k@o.ingest.sentry.io/1', isDev: false }) === true, 'not enabled');
  assert(calls.init.length === 1 && calls.init[0].dsn === 'https://k@o.ingest.sentry.io/1', 'dsn not passed');
  const h = calls.init[0].integrations.find((i) => i.name === 'ReactNativeErrorHandlers');
  assert(h && h.options.onerror && h.options.onunhandledrejection, 'handlers not enabled');
  assert(calls.init[0].sendDefaultPii === false, 'PII on');
  m.reportError(new Error('boom'));
  assert(calls.capture.length === 1, 'reportError did not capture');
});
check('invalid DSN (init throws): no crash, disabled', (m) => {
  initThrows = true;
  assert(m.initCrashReporting({ dsn: 'not-a-dsn', isDev: false }) === false, 'enabled after throw');
});

for (const [r, n] of results) console.log(`${r}  ${n}`);
const failed = results.filter(([r]) => r === 'FAIL').length;
console.log(`\n${results.length - failed}/${results.length} passed`);
process.exit(failed ? 1 : 0);
