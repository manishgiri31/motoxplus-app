const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');
const { withNativeWind } = require('nativewind/metro');

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

const { resolveRequest: defaultResolveRequest } = config.resolver;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && ZUSTAND_CJS_ENTRIES[moduleName]) {
    return { type: 'sourceFile', filePath: ZUSTAND_CJS_ENTRIES[moduleName] };
  }
  return defaultResolveRequest
    ? defaultResolveRequest(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: './global.css' });
