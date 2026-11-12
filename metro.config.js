const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// zustand v5's package.json "exports" map sends web (condition "import")
// to esm/*.mjs, which references `import.meta.env` (a Vite-only construct)
// for its optional Redux DevTools integration. iOS/Android never hit this
// because Metro resolves those through zustand's "react-native" condition
// straight to the plain CJS file — but Metro's web bundle is not loaded as
// a real ES module, so `import.meta` there is a SyntaxError that kills the
// whole bundle before React ever mounts (silent blank page, no error
// overlay). Route web to the exact same CJS files iOS/Android already get,
// bypassing the "exports" map (and its "import" condition) entirely.
const zustandRoot = path.dirname(require.resolve('zustand/package.json'));
const ZUSTAND_CJS_ENTRIES = {
  zustand: path.join(zustandRoot, 'index.js'),
  'zustand/middleware': path.join(zustandRoot, 'middleware.js'),
  'zustand/vanilla': path.join(zustandRoot, 'vanilla.js'),
  'zustand/react': path.join(zustandRoot, 'react.js'),
  'zustand/shallow': path.join(zustandRoot, 'shallow.js'),
};

// Bundle-size shims (Metro does not tree-shake):
//  - `assert`: only @ide/backoff (expo-notifications) uses it, for plain
//    `assert(cond, msg)` checks. See shims/assert.js.
//  - zod's locale barrel: every language, though the app only uses English.
//    See shims/zod-locales.js.
//  - @hookform/resolvers/zod resolves to its CommonJS build, which require()s
//    zod and react-hook-form, so Metro bundled their CJS builds next to the
//    ESM builds the app imports: two copies of each (~550 KB). Point it at its
//    ESM build, and resolve zod subpaths (e.g. zod/v4/core, which otherwise
//    picks its nested package.json's CJS "main") through zod's "import"
//    exports, so everything lands on one ESM copy.
const SHIMS = {
  assert: path.join(__dirname, 'shims/assert.js'),
  zodLocales: path.join(__dirname, 'shims/zod-locales.js'),
};
const HOOKFORM_ZOD_ESM = path.join(
  path.dirname(require.resolve('@hookform/resolvers/package.json')),
  'zod/dist/zod.mjs'
);
const zodRoot = path.dirname(require.resolve('zod/package.json'));
const zodExports = require('zod/package.json').exports;
const ZOD_ESM_ENTRIES = Object.fromEntries(
  Object.entries(zodExports)
    .filter(([subpath, target]) => !subpath.includes('*') && typeof target === 'object' && target.import)
    .map(([subpath, target]) => [path.posix.join('zod', subpath), path.join(zodRoot, target.import)])
);
const ZOD_DIR = `${path.sep}node_modules${path.sep}zod${path.sep}`;

const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ZUSTAND_CJS_ENTRIES[moduleName]) {
    return { type: 'sourceFile', filePath: ZUSTAND_CJS_ENTRIES[moduleName] };
  }
  if (moduleName === 'assert') {
    return { type: 'sourceFile', filePath: SHIMS.assert };
  }
  if (moduleName === '../locales/index.js' && context.originModulePath.includes(ZOD_DIR)) {
    return { type: 'sourceFile', filePath: SHIMS.zodLocales };
  }
  if (moduleName === '@hookform/resolvers/zod') {
    return { type: 'sourceFile', filePath: HOOKFORM_ZOD_ESM };
  }
  if (ZOD_ESM_ENTRIES[moduleName]) {
    return { type: 'sourceFile', filePath: ZOD_ESM_ENTRIES[moduleName] };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
