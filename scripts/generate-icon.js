// Derives every OTHER app-icon/splash asset from the real brand mark at
// assets/images/icon.png (placed directly, not generated — this script does
// NOT touch that file). Run with:
//   node scripts/generate-icon.js
const sharp = require('sharp');
const path = require('path');

const PAPER = '#FBFAF8';
const INK = '#17181A';

const OUT_DIR = path.resolve(__dirname, '../assets/images');
const SOURCE = path.join(OUT_DIR, 'icon.png');
const CANVAS = 1024;
// Mark occupies the center ~60% of the canvas — comfortably inside
// Android's adaptive-icon safe zone (artwork within the center 66dp of the
// 108dp grid, ~61%) so it isn't clipped by circle/squircle/rounded-square
// OS masks.
const MARK_SIZE = 620;

async function markOnTransparentSquare() {
  const resized = await sharp(SOURCE)
    .resize(MARK_SIZE, MARK_SIZE, { fit: 'inside', withoutEnlargement: false })
    .toBuffer();
  const meta = await sharp(resized).metadata();
  return sharp({
    create: { width: CANVAS, height: CANVAS, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } },
  })
    .composite([{ input: resized, left: Math.round((CANVAS - meta.width) / 2), top: Math.round((CANVAS - meta.height) / 2) }])
    .png();
}

(async () => {
  // Android adaptive icon foreground: the real mark, centered, transparent.
  await (await markOnTransparentSquare()).toFile(path.join(OUT_DIR, 'android-icon-foreground.png'));
  console.log('wrote android-icon-foreground.png');

  // Android adaptive icon background: flat paper, matches the mark's own
  // white background so the composited result looks the same as icon.png.
  await sharp({ create: { width: CANVAS, height: CANVAS, channels: 4, background: PAPER } })
    .png()
    .toFile(path.join(OUT_DIR, 'android-icon-background.png'));
  console.log('wrote android-icon-background.png');

  // Android 13+ themed (monochrome) icon: the mark's alpha shape only, as a
  // single flat color — the OS re-tints this entirely, so the source mark's
  // own red/black/shading is irrelevant here, only its silhouette matters.
  // extractChannel + joinChannel is sharp's standard "recolor, keep alpha
  // mask" pattern — far less error-prone than manual raw-buffer math.
  const markBuf = await (await markOnTransparentSquare()).toBuffer();
  const alpha = await sharp(markBuf).ensureAlpha().extractChannel(3).toBuffer();
  const flatInk = await sharp({
    create: { width: CANVAS, height: CANVAS, channels: 3, background: INK },
  })
    .png()
    .toBuffer();
  await sharp(flatInk)
    .joinChannel(alpha)
    .png()
    .toFile(path.join(OUT_DIR, 'android-icon-monochrome.png'));
  console.log('wrote android-icon-monochrome.png');

  // Splash — same transparent mark, sits over the paper/dark splash
  // background already configured in app.json's expo-splash-screen plugin.
  await (await markOnTransparentSquare()).toFile(path.join(OUT_DIR, 'splash-icon.png'));
  console.log('wrote splash-icon.png');
})();
