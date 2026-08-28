// Generates every app-icon/splash asset from one vector mark definition, so
// the identity is regenerable rather than hand-edited PNGs. Run with:
//   node scripts/generate-icon.js
//
// Mark: a symmetric double-peak "M" (for MotoXplus) with a red plus nested
// in the center notch — a simplified, flat-color redraw of the existing
// motoxplus-web angular "M+" logo (public/motoxplus/logo.png), keeping its
// two recognizable elements (the M shape, the red plus) but dropping the
// glow/gradient treatment, which doesn't survive being scaled down to
// launcher-icon sizes. Chosen as the app-icon direction on 2026-08-xx.
const sharp = require('sharp');
const path = require('path');

const PAPER = '#FBFAF8';
const INK = '#17181A';
const RED = '#D01F25';

const OUT_DIR = path.resolve(__dirname, '../assets/images');
const CANVAS = 1024;
// Mark occupies the center ~60% of the canvas — comfortably inside
// Android's adaptive-icon safe zone (artwork within the center 66dp of the
// 108dp grid, ~61%) so it isn't clipped by circle/squircle/rounded-square
// OS masks.
const MARK_SIZE = 620;
const OFFSET = (CANVAS - MARK_SIZE) / 2;

// Local 400x400 coordinate space, scaled up to MARK_SIZE at render time.
function markPaths(inkColor, redColor) {
  return `
    <path d="M 40 360 L 130 60 L 200 260 L 270 60 L 360 360 L 290 360 L 270 220 L 200 360 L 130 220 L 110 360 Z" fill="${inkColor}"/>
    <g fill="${redColor}">
      <rect x="220" y="60" width="24" height="70" />
      <rect x="203" y="83" width="58" height="24" />
    </g>
  `;
}

// Monochrome silhouette — both the M and the plus become one flat shape,
// since Android 13+ themed icons re-tint this single-color layer entirely
// with the system's accent color; there's no red/ink distinction to keep.
function markSilhouette(color) {
  return `
    <path d="M 40 360 L 130 60 L 200 260 L 270 60 L 360 360 L 290 360 L 270 220 L 200 360 L 130 220 L 110 360 Z" fill="${color}"/>
    <g fill="${color}">
      <rect x="220" y="60" width="24" height="70" />
      <rect x="203" y="83" width="58" height="24" />
    </g>
  `;
}

function svgDoc({ bg, inner }) {
  const bgRect = bg ? `<rect width="${CANVAS}" height="${CANVAS}" fill="${bg}"/>` : '';
  return `<svg width="${CANVAS}" height="${CANVAS}" viewBox="0 0 ${CANVAS} ${CANVAS}" xmlns="http://www.w3.org/2000/svg">
    ${bgRect}
    <g transform="translate(${OFFSET},${OFFSET}) scale(${MARK_SIZE / 400})">${inner}</g>
  </svg>`;
}

async function render(svg, outFile) {
  await sharp(Buffer.from(svg)).png().toFile(path.join(OUT_DIR, outFile));
  console.log('wrote', outFile);
}

(async () => {
  // 1024x1024 top-level icon (iOS + fallback) — paper mark on red, for
  // maximum contrast/brand presence in a home-screen icon grid.
  await render(svgDoc({ bg: RED, inner: markPaths(PAPER, PAPER) }), 'icon.png');

  // Android adaptive icon: transparent foreground (ink mark, red plus) +
  // solid red background layer, composited by the OS.
  await render(svgDoc({ bg: null, inner: markPaths(INK, RED) }), 'android-icon-foreground.png');
  await render(svgDoc({ bg: RED, inner: '' }), 'android-icon-background.png');

  // Android 13+ themed (monochrome) icon — transparent, single-color silhouette.
  await render(svgDoc({ bg: null, inner: markSilhouette(INK) }), 'android-icon-monochrome.png');

  // Splash — ink mark + red plus on transparent, sits over the paper
  // background already configured in app.json's expo-splash-screen plugin.
  await render(svgDoc({ bg: null, inner: markPaths(INK, RED) }), 'splash-icon.png');
})();
