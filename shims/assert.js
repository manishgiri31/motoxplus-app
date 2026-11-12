// Stand-in for Node's `assert` package (see metro.config.js). Its only
// importer in the app bundle is @ide/backoff (via expo-notifications), which
// calls `assert(condition, message)`. The real package drags in `util`,
// `object-is`, `call-bind` and friends (~90 KB of source) for that.
function assert(condition, message) {
  if (!condition) throw new Error(message || 'Assertion failed');
}
assert.ok = assert;
module.exports = assert;
module.exports.default = assert;
