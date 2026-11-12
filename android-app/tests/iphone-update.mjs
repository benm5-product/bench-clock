// Checks iPhone updates arrive promptly: after a new index.html is published, the very next open with
// signal shows it, and the new version then also opens offline. Uses a temporary copy of the web files.
// Run from android-app/:  npm run test:iphone   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { cpSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { serve } from './serve-dir.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const root = new URL('../../', import.meta.url).pathname;
const sw = readFileSync(join(root, 'sw.js'), 'utf8');
const files = [...sw.match(/const FILES = \[([\s\S]*?)\];/)[1].matchAll(/'\.\/([^']+)'/g)].map(m => m[1]).filter(Boolean);
const dir = mkdtempSync(join(tmpdir(), 'bench-clock-update-'));
for (const f of [...files, 'sw.js']) cpSync(join(root, f), join(dir, f));

let failures = 0;
const check = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) failures++; };
const server = await serve(dir);
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); failures++; });

console.log('Updates reach the iPhone app on the next open');
await page.goto(server.url);
await page.evaluate(() => navigator.serviceWorker.ready);
await page.reload(); // now controlled by the offline cache
await page.waitForTimeout(400);
check(await page.evaluate(() => !!navigator.serviceWorker.controller), 'offline cache in control');
check((await page.title()) === 'Bench Clock', 'first version showing');

writeFileSync(join(dir, 'index.html'), readFileSync(join(dir, 'index.html'), 'utf8').replace('<title>Bench Clock</title>', '<title>Bench Clock NEW</title>'));
await page.reload();
await page.waitForTimeout(400);
check((await page.title()) === 'Bench Clock NEW', 'new version shows on the next open with signal');

await ctx.setOffline(true);
await page.reload();
await page.waitForTimeout(400);
check((await page.title()) === 'Bench Clock NEW', 'and the new version opens offline afterwards');
check(!!(await page.$('#teamSel option')), 'app works offline');
await ctx.setOffline(false);

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
