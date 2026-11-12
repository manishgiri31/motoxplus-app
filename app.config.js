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
//  - No expo-blur on Android. Only NavBarBackground.ios.tsx imports it, so
//    the Android JS bundle never touches the native module.
//  - No Fresco GIF/WebP decoders (libgifimage, libanimation-decoder-gif,
//    libstatic-webp). Those only serve react-native's <Image>; the app shows
//    remote images through expo-image (Glide), and its one RN <Image> is a
//    local PNG. Android decodes static WebP natively on minSdk 24 anyway.
//  - No BouncyCastle Picnic tables (~1.2 MB of .properties files). They come
//    with expo-updates' bcutil jar, which R8 can shrink as code but not as
//    resources. Picnic is a post-quantum signature scheme nothing here uses.
const { withAppBuildGradle, withGradleProperties, withSettingsGradle } = require('expo/config-plugins');

const RELEASE_ABIS = ['armeabi-v7a', 'arm64-v8a'];
const ANDROID_EXCLUDED_MODULES = [
  'expo-dev-client',
  'expo-dev-launcher',
  'expo-dev-menu',
  'expo-dev-menu-interface',
  'expo-blur',
];
const GRADLE_PROPERTIES = { 'expo.gif.enabled': 'false', 'expo.webp.enabled': 'false' };

function withExcludedAndroidModules(config) {
  return withSettingsGradle(config, (cfg) => {
    const anchor = 'expoAutolinking.useExpoModules()';
    const contents = cfg.modResults.contents;
    if (!contents.includes(anchor)) {
      throw new Error(`app.config.js: "${anchor}" not found in settings.gradle; cannot exclude modules.`);
    }
    if (!contents.includes('expoAutolinking.exclude')) {
      cfg.modResults.contents = contents.replace(
        anchor,
        `expoAutolinking.exclude = ${JSON.stringify(ANDROID_EXCLUDED_MODULES)}\n${anchor}`
      );
    }
    return cfg;
  });
}

function withSlimGradleProperties(config) {
  return withGradleProperties(config, (cfg) => {
    for (const [key, value] of Object.entries(GRADLE_PROPERTIES)) {
      const item = cfg.modResults.find((p) => p.type === 'property' && p.key === key);
      if (item) item.value = value;
      else cfg.modResults.push({ type: 'property', key, value });
    }
    return cfg;
  });
}

const PACKAGING_MARKER = '// slim-release: resource excludes';

function withSlimPackaging(config) {
  return withAppBuildGradle(config, (cfg) => {
    if (!cfg.modResults.contents.includes(PACKAGING_MARKER)) {
      cfg.modResults.contents += `
${PACKAGING_MARKER}
android {
    packagingOptions {
        resources {
            excludes += ["org/bouncycastle/pqc/crypto/picnic/**"]
        }
    }
}
`;
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
  return withSlimPackaging(withSlimGradleProperties(withExcludedAndroidModules({ ...config, plugins })));
};
