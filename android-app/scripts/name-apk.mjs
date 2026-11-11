// Copies the signed APK to dist/bench-clock-<version>.apk. Run from android/ by `npm run build:apk`.
import { copyFileSync, mkdirSync, readFileSync } from 'node:fs';
const v = readFileSync('../VERSION', 'utf8').trim();
mkdirSync('../dist', { recursive: true });
copyFileSync('app/build/outputs/apk/release/app-release.apk', `../dist/bench-clock-${v}.apk`);
console.log(`Signed APK: dist/bench-clock-${v}.apk`);
