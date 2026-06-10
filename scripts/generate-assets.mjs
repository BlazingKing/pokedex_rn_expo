/**
 * Generates app icon and splash screen assets for the Pokédex app.
 * Theme: dark navy bg (#080F1E), Pokéball design, indigo accent (#818CF8)
 *
 * Run: node scripts/generate-assets.mjs
 */

import { Jimp, intToRGBA, rgbaToInt } from 'jimp';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ASSETS = path.join(__dirname, '..', 'assets');

// ─── Colour palette ───────────────────────────────────────────────────────────
const BG_DARK   = 0x080F1EFF; // main dark navy
const BG_CARD   = 0x0F172AFF; // slightly lighter
const ACCENT    = 0x818CF8FF; // indigo
const RED       = 0xEF4444FF; // pokéball red
const WHITE     = 0xF1F5F9FF;
const DARK_LINE = 0x1E293BFF;

// ─── Helper: draw a filled circle ────────────────────────────────────────────
function fillCircle(img, cx, cy, r, color) {
  for (let y = cy - r; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        if (x >= 0 && y >= 0 && x < img.bitmap.width && y < img.bitmap.height) {
          img.setPixelColor(color, x, y);
        }
      }
    }
  }
}

// ─── Helper: draw a filled rectangle ─────────────────────────────────────────
function fillRect(img, x1, y1, x2, y2, color) {
  for (let y = y1; y <= y2; y++) {
    for (let x = x1; x <= x2; x++) {
      if (x >= 0 && y >= 0 && x < img.bitmap.width && y < img.bitmap.height) {
        img.setPixelColor(color, x, y);
      }
    }
  }
}

// ─── Pokéball drawing function ────────────────────────────────────────────────
function drawPokeball(img, cx, cy, r) {
  // Outer glow ring (subtle)
  fillCircle(img, cx, cy, r + 4, 0xFFFFFF10);

  // Top half — red
  for (let y = cy - r; y <= cy; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        img.setPixelColor(RED, x, y);
      }
    }
  }

  // Bottom half — white/light
  for (let y = cy; y <= cy + r; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 <= r * r) {
        img.setPixelColor(WHITE, x, y);
      }
    }
  }

  // Horizontal band (dark stripe)
  const band = Math.round(r * 0.12);
  fillRect(img, cx - r, cy - band, cx + r, cy + band, DARK_LINE);

  // Clip band to circle
  for (let y = cy - band; y <= cy + band; y++) {
    for (let x = cx - r; x <= cx + r; x++) {
      if ((x - cx) ** 2 + (y - cy) ** 2 > r * r) {
        img.setPixelColor(0x00000000, x, y);
      }
    }
  }

  // Inner button circle
  const btnR = Math.round(r * 0.22);
  fillCircle(img, cx, cy, btnR + 3, DARK_LINE);
  fillCircle(img, cx, cy, btnR, 0xE2E8F0FF);
  fillCircle(img, cx, cy, Math.round(btnR * 0.55), ACCENT);
}

// ─── 1. App Icon  1024×1024 ───────────────────────────────────────────────────
async function makeIcon() {
  const SIZE = 1024;
  const img = new Jimp({ width: SIZE, height: SIZE, color: BG_DARK });

  // Subtle radial gradient feel — lighten center slightly
  const centerR = Math.round(SIZE * 0.42);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      const dist = Math.sqrt((x - SIZE / 2) ** 2 + (y - SIZE / 2) ** 2);
      if (dist < centerR) {
        const t = 1 - dist / centerR;
        const blend = Math.round(t * 18);
        const r = 0x08 + blend;
        const g = 0x0F + blend;
        const b = 0x1E + blend;
        img.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
      }
    }
  }

  // Pokéball — centred, radius ~38% of canvas
  const ballR = Math.round(SIZE * 0.38);
  drawPokeball(img, SIZE / 2, SIZE / 2, ballR);

  await img.write(path.join(ASSETS, 'icon.png'));
  console.log('✅  icon.png  (1024×1024)');

  // Android foreground (same ball, slightly smaller for safe zone)
  const fg = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });
  drawPokeball(fg, SIZE / 2, SIZE / 2, Math.round(SIZE * 0.33));
  await fg.write(path.join(ASSETS, 'android-icon-foreground.png'));
  console.log('✅  android-icon-foreground.png');

  // Android background
  const bg = new Jimp({ width: SIZE, height: SIZE, color: BG_DARK });
  await bg.write(path.join(ASSETS, 'android-icon-background.png'));
  console.log('✅  android-icon-background.png');

  // Android monochrome (white ball on transparent)
  const mono = new Jimp({ width: SIZE, height: SIZE, color: 0x00000000 });
  fillCircle(mono, SIZE / 2, SIZE / 2, Math.round(SIZE * 0.33), 0xFFFFFFFF);
  const monoR = Math.round(SIZE * 0.33);
  const monoBand = Math.round(monoR * 0.12);
  fillRect(mono, SIZE / 2 - monoR, SIZE / 2 - monoBand, SIZE / 2 + monoR, SIZE / 2 + monoBand, 0x080F1EFF);
  const monoBtnR = Math.round(monoR * 0.22);
  fillCircle(mono, SIZE / 2, SIZE / 2, monoBtnR + 3, 0x080F1EFF);
  fillCircle(mono, SIZE / 2, SIZE / 2, monoBtnR, 0xFFFFFFFF);
  await mono.write(path.join(ASSETS, 'android-icon-monochrome.png'));
  console.log('✅  android-icon-monochrome.png');
}

// ─── 2. Splash screen  1284×2778  (iPhone 14 Pro Max native) ─────────────────
async function makeSplash() {
  const W = 1284, H = 2778;
  const img = new Jimp({ width: W, height: H, color: BG_DARK });

  // Soft radial glow at top-centre (accent colour)
  const glowCX = W / 2, glowCY = H * 0.35;
  const glowR = W * 0.75;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dist = Math.sqrt((x - glowCX) ** 2 + (y - glowCY) ** 2);
      if (dist < glowR) {
        const t = Math.max(0, 1 - dist / glowR) * 0.08;
        const orig = intToRGBA(img.getPixelColor(x, y));
        const r = Math.min(255, orig.r + Math.round(t * (0x81 - orig.r)));
        const g = Math.min(255, orig.g + Math.round(t * (0x8C - orig.g)));
        const b = Math.min(255, orig.b + Math.round(t * (0xF8 - orig.b)));
        img.setPixelColor(rgbaToInt(r, g, b, 255), x, y);
      }
    }
  }

  // Large Pokéball centred vertically at ~38% of height
  const ballR = Math.round(W * 0.32);
  drawPokeball(img, W / 2, Math.round(H * 0.38), ballR);

  // "Pokédex" wordmark — approximate with a thick accent line above text area
  // (real text requires canvas; we do a visual stand-in: two lines)
  const lineY = Math.round(H * 0.68);
  const lineW = Math.round(W * 0.45);
  fillRect(img, W / 2 - lineW / 2, lineY,      W / 2 + lineW / 2, lineY + 6,  ACCENT);
  fillRect(img, W / 2 - lineW * 0.3, lineY + 20, W / 2 + lineW * 0.3, lineY + 26, 0x334155FF);

  await img.write(path.join(ASSETS, 'splash.png'));
  console.log('✅  splash.png  (1284×2778)');

  // Favicon (32×32)
  const fav = new Jimp({ width: 32, height: 32, color: BG_DARK });
  drawPokeball(fav, 16, 16, 12);
  await fav.write(path.join(ASSETS, 'favicon.png'));
  console.log('✅  favicon.png  (32×32)');
}

// ─── Run ──────────────────────────────────────────────────────────────────────
console.log('Generating Pokédex assets…\n');
await makeIcon();
await makeSplash();
console.log('\nDone! Remember to run `npx expo prebuild` before building natively.');
