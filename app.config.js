// app.json holds the app config. This file only adds size cuts for release
// builds, switched on by SLIM_RELEASE_BUILD=1 (set for the preview and
// production profiles in eas.json). Development builds are left untouched so
// they keep working on x86 emulators and keep the dev launcher.
//
//  - ARM-only native libraries. x86/x86_64 are emulator ABIs; shipping them
//    roughly doubles an APK's native code.
//  - No expo-dev-client on Android. Unlike iOS (where it is debug-only), its
//    dev launcher is compiled into release builds and brings ML Kit's barcode
//    scanner (libbarhopper, 3-6 MB per ABI, plus its models), Compose and
//    Apollo. Excluding it from autolinking matches a project that never
//    installed it; expo-updates only looks for it in debug builds.
const { withSettingsGradle } = require('expo/config-plugins');

const RELEASE_ABIS = ['armeabi-v7a', 'arm64-v8a'];
const DEV_CLIENT_MODULES = ['expo-dev-client', 'expo-dev-launcher', 'expo-dev-menu', 'expo-dev-menu-interface'];

function withoutDevClientOnAndroid(config) {
  return withSettingsGradle(config, (cfg) => {
    const anchor = 'expoAutolinking.useExpoModules()';
    const contents = cfg.modResults.contents;
    if (!contents.includes(anchor)) {
      throw new Error(`app.config.js: "${anchor}" not found in settings.gradle; cannot exclude expo-dev-client.`);
    }
    if (!contents.includes('expoAutolinking.exclude')) {
      cfg.modResults.contents = contents.replace(
        anchor,
        `expoAutolinking.exclude = ${JSON.stringify(DEV_CLIENT_MODULES)}\n${anchor}`
      );
    }
    return cfg;
  });
}

module.exports = ({ config }) => {
  if (process.env.SLIM_RELEASE_BUILD !== '1') return config;

  const plugins = config.plugins.map((plugin) =>
    Array.isArray(plugin) && plugin[0] === 'expo-build-properties'
      ? [plugin[0], { ...plugin[1], android: { ...plugin[1].android, buildArchs: RELEASE_ABIS } }]
      : plugin
  );
  return withoutDevClientOnAndroid({ ...config, plugins });
};
