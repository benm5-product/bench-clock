// Phone-sized browser test of the iPhone web app exactly as GitHub Pages serves it (the repo root),
// with no Capacitor. Checks the Android extras stay out, saved teams survive, Rugby League works,
// and the app opens offline. Run from android-app/:  npm run test:iphone   (needs Playwright with Chromium)
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync } from 'node:fs';
import { serve } from './serve-dir.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const SHOTS = process.env.SHOTS || 'test-results';
mkdirSync(SHOTS, { recursive: true });
const server = await serve(new URL('../../', import.meta.url).pathname);
const URL_ = server.url;

let failures = 0;
const check = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) failures++; };
const KEY = 'bench-clock-teams-v1';

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
const requests = [];
ctx.on('request', r => requests.push(r.url()));
const page = await ctx.newPage();
page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); failures++; });
const stored = () => page.evaluate(k => JSON.parse(localStorage.getItem(k) || 'null'), KEY);
const names = sel => page.$$eval(sel + ' .chip .nm', els => els.map(e => e.textContent));
const tab = n => page.click(`#tabBar [data-tab="${n}"]`);

console.log('Existing iPhone data opens unchanged');
await page.goto(URL_);
const old = {
  teams: [{ id: 'tA', name: 'Saved Sharks', brand: { primary: '#123c69', secondary: ['#f2b705'], logo: null },
    state: { cfg: { len: 20, periods: 2, onField: 7 }, players: [[3,'Mia'],[5,'Jack'],[7,'Ava'],[8,'Leo'],[10,'Isla'],[11,'Noah'],[12,'Zara'],[14,'Oscar'],[21,'Ruby']].map(([num, name], i) => ({ id: 'p' + i, num, name, on: i < 7 })),
      example: false, p: 0, acc: 65000, runStart: null, halfEnd: [], events: [{ pid: 'p0', h: 0, t: 30000, type: 'off' }, { pid: 'p7', h: 0, t: 30000, type: 'on' }], finished: false } }],
  cur: 'tA', updatedAt: 5 };
await page.evaluate(([k, v]) => { localStorage.clear(); localStorage.setItem(k, JSON.stringify(v)); }, [KEY, old]);
await page.reload();
await page.waitForTimeout(400);
check((await page.$eval('#teamSel', s => s.selectedOptions[0].textContent)) === 'Saved Sharks', 'saved team shown');
check((await page.textContent('#clock')) === '1:05', 'saved game clock shown');
check((await page.$eval('meta[name="theme-color"]', m => m.content)) === '#123c69', 'team colour used for the iPhone status bar');
check(await page.isHidden('#viewSeg'), 'no Field/List switch for a Basic team');
check((await page.textContent('#tableTitle')) === 'Time off by player', 'iPhone still shows time off by default');
check(/Saved on this phone/.test(await page.textContent('#saveStatus')), 'save message');
check(!(await page.evaluate(() => window.Native.isNative)), 'runs as the web version');
const s1 = await stored();
check(s1 && s1.teams[0].name === 'Saved Sharks' && s1.teams[0].state.events.length === 2 && 'cur' in s1 && 'updatedAt' in s1, 'data still in the same key and shape');
const bottom = await page.$$eval('.sides .chip', els => Math.max(...els.map(e => e.getBoundingClientRect().bottom)));
check(bottom <= 844, `all tiles fit on one 390x844 screen (bottom ${Math.round(bottom)}px)`);
const barTop = await page.$eval('#tabBar', el => el.getBoundingClientRect().top);
check(bottom <= barTop, `tiles sit above the tab bar (tiles end ${Math.round(bottom)}px, bar starts ${Math.round(barTop)}px)`);
check(await page.isVisible('#pageBench') && await page.isHidden('#pageTeam') && await page.isHidden('#pageSettings'), 'opens on the Bench page');
await tab('team');
check(await page.isVisible('#teamName') && await page.isHidden('#pageBench') && await page.isVisible('#clock'), 'Team tab shows team setup, scoreboard stays');
check((await page.getAttribute('#tabTeam', 'aria-selected')) === 'true', 'Team tab marked as selected');
await page.screenshot({ path: `${SHOTS}/iphone-08-team.png` });
await tab('settings');
check(await page.isVisible('#colPrimary') && await page.isVisible('#copyBackup') && await page.isHidden('#pageTeam'), 'Settings tab shows colours and backup');
await page.screenshot({ path: `${SHOTS}/iphone-09-settings.png` });
await tab('bench');
await page.screenshot({ path: `${SHOTS}/iphone-01-light.png` });
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(150);
await page.screenshot({ path: `${SHOTS}/iphone-02-dark.png` });
await page.emulateMedia({ colorScheme: 'light' });

console.log('Rugby League team');
await tab('team');
await page.selectOption('#cfgSport', 'rl');
check(await page.$eval('#cfgOn', i => i.disabled && i.value === '11'), 'players on field fixed at 11');
await page.fill('#roster', Array.from({ length: 14 }, (_, i) => `${i + 1} Kid${i + 1}`).join('\n'));
await page.click('#applyBtn');
await page.click('#resetBtn');
await page.click('#resetBtn'); // New game, two taps: the new squad starts with 1-11 on
await tab('bench');
check(await page.isVisible('#viewSeg'), 'Field/List switch shown');
check((await page.$$('.pitch .slot')).length === 11, '11 positions on the pitch');
await page.click('#goBtn');
await page.waitForTimeout(1100);
await page.tap('.pitch .slot[data-pos="dh"]');
check(await page.isVisible('#sheet'), 'tapping a position opens the interchange list');
await page.tap('#sheetList [data-act^="swap:"] >> nth=0');
check(await page.isHidden('#sheet'), 'list closes after choosing');
const st = (await stored()).teams[0].state;
const dh = st.players.find(p => p.on && p.pos === 'dh');
check(dh && dh.name === 'Kid12', `bench player Kid12 now Dummy Half (${dh && dh.name})`);
await page.tap('#undoBtn');
check((await stored()).teams[0].state.players.find(p => p.pos === 'dh').name === 'Kid1', 'one undo reverses the interchange');
await page.tap('#viewSeg [data-view="list"]');
check((await page.$$('.pitch')).length === 0 && (await names('#field')).length === 11, 'List view shows the usual columns');
await page.tap('#viewSeg [data-view="field"]');
await page.screenshot({ path: `${SHOTS}/iphone-03-rugby-league.png` });
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(150);
await page.screenshot({ path: `${SHOTS}/iphone-04-rugby-league-dark.png` });
await page.emulateMedia({ colorScheme: 'light' });
await page.click('#tableSeg [data-table="on"]');
check((await page.textContent('#tableTitle')) === 'Time on by player' && (await stored()).teams[0].table === 'on', 'time on/off switch works and is remembered');
await page.click('#goBtn');

console.log('Football (Soccer) team with formations');
await tab('team');
await page.selectOption('#cfgSport', 'soccer');
check(await page.isVisible('#cfgFormation') && (await page.$eval('#cfgFormation', s => s.value)) === '4-4-2', 'formation choice appears, 4-4-2 by default');
check(await page.$eval('#cfgOn', i => i.disabled && i.value === '11'), 'players on field follows the formation (11)');
await page.fill('#roster', Array.from({ length: 15 }, (_, i) => `${i + 1} Kid${i + 1}`).join('\n'));
await page.click('#applyBtn');
await page.click('#resetBtn'); await page.click('#resetBtn');
await tab('bench');
check(await page.isVisible('#formSel') && (await page.$eval('#formSel', s => s.value)) === '4-4-2', 'formation selector beside Field | List');
check((await page.$$('.pitch.soccer .slot')).length === 11 && !!(await page.$('.slot[data-pos="f-gk"]')), '11 positions on a football pitch, with a goalkeeper');
const posOf = async () => Object.fromEntries((await stored()).teams[0].state.players.filter(p => p.on).map(p => [p.name, p.pos]));
const p442 = await posOf();
check(p442.Kid1 === 'f-gk' && p442.Kid2 === 'f-lb' && p442.Kid10 === 'f-ls', 'squad placed goalkeeper, then defence to attack');

// Every formation: right number of positions, no duplicates, nothing overlapping, every position named.
const forms = await page.$$eval('#formSel optgroup', gs => gs.flatMap(g => [...g.querySelectorAll('option')].map(o => [o.value, parseInt(g.label)])));
let bad = []; const sizes = new Set();
for (const [f, size] of forms) {
  await page.selectOption('#formSel', f);
  const r = await page.$$eval('.pitch .slot', els => ({
    ids: els.map(e => e.dataset.pos), names: els.map(e => e.querySelector('.pos').textContent),
    boxes: els.map(e => { const b = e.getBoundingClientRect(); return [b.left, b.top, b.right, b.bottom]; }),
    wide: document.documentElement.scrollWidth > innerWidth,
    sizes: els.map(e => { const b = e.getBoundingClientRect(); return Math.round(b.width) + 'x' + Math.round(b.height); }) }));
  r.sizes.forEach(z => sizes.add(z));
  const overlap = r.boxes.some((a, i) => r.boxes.some((b, j) => i < j && a[0] < b[2] - 1 && b[0] < a[2] - 1 && a[1] < b[3] - 1 && b[1] < a[3] - 1));
  if (r.ids.length !== size || new Set(r.ids).size !== size || overlap || r.wide || r.names.some(n => !n || n === '?')) bad.push(f);
}
check(sizes.size === 1, `every player tile is the same size in every formation (${[...sizes].join(', ')})`);
check(forms.length >= 40 && bad.length === 0, `all ${forms.length} formations lay out correctly${bad.length ? ' (problems: ' + bad.join(', ') + ')' : ''}`);
await page.selectOption('#formSel', '4-4-2');
const before = await posOf();
await page.selectOption('#formSel', '4-3-3');
const p433 = await posOf();
const in433 = new Set(['f-gk', 'f-lb', 'f-lcb', 'f-rcb', 'f-rb', 'f-lcm', 'f-cm', 'f-rcm', 'f-lw', 'f-st', 'f-rw']);
check(Object.values(p433).every(Boolean) && new Set(Object.values(p433)).size === 11, 'switching to 4-3-3 keeps all 11 in distinct positions');
check(Object.entries(before).every(([n, pos]) => !in433.has(pos) || p433[n] === pos), 'players keep positions that still exist');
check(Object.values(p433).every(pos => in433.has(pos)), 'everyone else moved to a 4-3-3 position');
await page.selectOption('#formSel', '2-3-1');
check((await page.$$('.pitch .slot')).length === 7 && /too many/.test(await page.textContent('#onCount')), '7-a-side: 7 positions, and it warns 4 too many are on');
await page.selectOption('#formSel', '4-4-2');
check((await page.$$('.pitch .slot.empty')).length === 0, 'back to 4-4-2 with every position filled');
await page.tap('.pitch .slot[data-pos="f-ls"]');
check(/Substitute with/.test(await page.textContent('#sheetHint')), 'football uses the word substitution');
check(!!(await page.$('.pitch .slot[data-pos="f-gk"] .disc')) && (await page.$$('.pitch .slot.rested')).length === 0, 'number discs shown, no rested rings before anyone has rested');
await page.tap('#sheetList [data-act^="swap:"] >> nth=0');
const sub = (await stored()).teams[0].state.players.find(p => p.on && p.pos === 'f-ls');
check(sub && sub.name === 'Kid12', `substitute Kid12 now Left Striker (${sub && sub.name})`);
check(/Left Striker/.test(await page.textContent('#log')), 'log names the position');
await page.tap('#undoBtn');
check((await stored()).teams[0].state.players.find(p => p.pos === 'f-ls').name === 'Kid10', 'undo reverses the substitution');
await page.screenshot({ path: `${SHOTS}/iphone-06-football-442.png` });
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(150);
await page.screenshot({ path: `${SHOTS}/iphone-07-football-442-dark.png` });
await page.emulateMedia({ colorScheme: 'light' });

console.log('Backup: paste flow with two taps');
await tab('settings');
await page.click('#pasteToggle');
await page.fill('#pasteText', JSON.stringify({ app: 'bench-clock', version: 1, data: old }));
await page.click('#pasteGo');
check(/Replace my 1 team with 1 team/.test(await page.textContent('#importConfirm')), 'pasted backup checked');
await page.click('#importConfirm');
check((await stored()).teams[0].sport === 'soccer', 'first tap does not replace');
await page.click('#importConfirm');
check((await stored()).teams[0].name === 'Saved Sharks' && !(await stored()).teams[0].sport, 'second tap restores the backup');

console.log('No Android code or outside network on the web');
check(!requests.some(u => /capacitor\.js|native\.js/.test(u)), 'capacitor.js and native.js are never loaded');
check(requests.every(u => u.startsWith(URL_)), 'no requests to other sites');

console.log('Works offline');
await page.evaluate(() => navigator.serviceWorker.ready);
await page.waitForTimeout(500);
const cacheName = readFileSync(new URL('../../sw.js', import.meta.url), 'utf8').match(/VERSION = '([^']+)'/)[1];
const cached = await page.evaluate(async n => (await (await caches.open(n)).keys()).length, cacheName);
check(cached >= 15, `offline copy saved (${cached} files)`);
await ctx.setOffline(true);
await page.reload();
await page.waitForTimeout(500);
check((await page.$eval('#teamSel', s => s.selectedOptions[0].textContent)) === 'Saved Sharks', 'opens with no network, teams intact');
check(await page.evaluate(() => document.fonts.check('700 20px "Barlow Condensed"')), 'bundled fonts load offline');
await page.screenshot({ path: `${SHOTS}/iphone-05-offline.png` });
await ctx.setOffline(false);

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
