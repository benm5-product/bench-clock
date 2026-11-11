// Renders the original Bench Clock icon (a stopwatch over a halfway line, green and gold)
// into the source images @capacitor/assets needs. Run with: npm run assets
import sharp from 'sharp';
import { mkdirSync } from 'node:fs';

const GREEN = '#1f4d32', GOLD = '#d99a17', CHALK = '#f4f6f1', DARK_BG = '#0e1410';
mkdirSync('assets', { recursive: true });

// Stopwatch drawn in a 1024 box; its outline spans y 176..848, so it scales around the centre (512, 512).
const watch = (s = 1) => `
<g transform="translate(512 512) scale(${s}) translate(-512 -512)">
  <rect x="462" y="176" width="100" height="58" rx="18" fill="${GOLD}"/>
  <rect x="492" y="220" width="40" height="110" fill="${GOLD}"/>
  <g transform="rotate(42 512 580)"><rect x="490" y="262" width="44" height="70" rx="12" fill="${GOLD}"/></g>
  <circle cx="512" cy="580" r="268" fill="${GOLD}"/>
  <circle cx="512" cy="580" r="222" fill="${CHALK}"/>
  <path d="M512 580 L512 358 A222 222 0 0 1 704.3 469 Z" fill="${GREEN}" opacity=".9"/>
  <g stroke="${GREEN}" stroke-width="16" stroke-linecap="round">
    <line x1="714" y1="580" x2="682" y2="580"/>
    <line x1="512" y1="782" x2="512" y2="750"/><line x1="310" y1="580" x2="342" y2="580"/>
  </g>
  <line x1="512" y1="580" x2="668" y2="490" stroke="${GOLD}" stroke-width="22" stroke-linecap="round"/>
  <circle cx="512" cy="580" r="30" fill="${GOLD}"/>
  <circle cx="512" cy="580" r="12" fill="${GREEN}"/>
</g>`;

// A faint halfway line and centre circle behind the watch, like a pitch.
const pitch = `<g fill="none" stroke="${CHALK}" stroke-opacity=".14" stroke-width="18">
  <line x1="0" y1="580" x2="1024" y2="580"/><circle cx="512" cy="580" r="360"/></g>`;

const svg = body => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${body}</svg>`);
const png = (buf, file, size = 1024) => sharp(buf).resize(size, size).png().toFile(`assets/${file}`);

// Legacy square icon: full design.
await png(svg(`<rect width="1024" height="1024" fill="${GREEN}"/>${pitch}${watch(0.9)}`), 'icon-only.png');
// Adaptive icon: background layer + foreground kept inside the central safe zone.
await png(svg(`<rect width="1024" height="1024" fill="${GREEN}"/>${pitch}`), 'icon-background.png');
await png(svg(watch(0.85)), 'icon-foreground.png');

// Splash screens: the watch centred on green (light) and on the dark theme background (dark).
const splash = (bg, file) => sharp(svg(`<rect width="1024" height="1024" fill="${bg}"/>${watch(0.3)}`))
  .resize(2732, 2732).png().toFile(`assets/${file}`);
await splash(GREEN, 'splash.png');
await splash(DARK_BG, 'splash-dark.png');
console.log('Icon sources written to assets/');
