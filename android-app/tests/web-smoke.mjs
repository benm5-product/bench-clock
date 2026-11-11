// Phone-sized browser test of the Android build (android-app/www) with the Capacitor plugins mocked.
// Run from android-app/:  npm run test:web   (it builds www/ from the repo root first)
// Needs Playwright with Chromium.
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { serve } from './serve-dir.mjs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

execFileSync(process.execPath, [new URL('../scripts/copy-web.mjs', import.meta.url).pathname], { stdio: 'inherit' });
const server = await serve(new URL('../www/', import.meta.url).pathname);
const URL_ = process.env.URL || server.url;
const SHOTS = process.env.SHOTS || 'test-results';
mkdirSync(SHOTS, { recursive: true });

// Stand-in for capacitor.js: "native" platform with recorded plugin calls.
// Preferences persist in localStorage under a separate prefix, so they survive a reload ("app killed").
const MOCK = `
(function(){
  const log = window.__log = {awake:[], buzz:0, bars:[], shares:[], files:{}, exit:0};
  const PFX = 'MOCK_PREFS:';
  const listeners = {};
  window.__fire = (ev) => (listeners[ev]||[]).forEach(f => f());
  const plugins = {
    Preferences: { get: async ({key}) => ({value: localStorage.getItem(PFX+key)}), set: async ({key,value}) => { localStorage.setItem(PFX+key, value); } },
    Filesystem: { writeFile: async ({path, data}) => { log.files[path] = data; return {uri: 'file:///cache/'+path}; } },
    Share: { share: async (o) => { log.shares.push(o); return {}; } },
    Haptics: { impact: async () => { log.buzz++; } },
    KeepAwake: { keepAwake: async () => { log.awake.push(true); }, allowSleep: async () => { log.awake.push(false); } },
    App: { addListener: (ev, f) => { (listeners[ev] = listeners[ev] || []).push(f); return Promise.resolve({remove(){}}); }, exitApp: async () => { log.exit++; } },
    BarColour: { set: async (o) => { log.bars.push(o); } },
  };
  window.Capacitor = { isNativePlatform: () => true, registerPlugin: (n) => plugins[n] };
})();`;

let failures = 0;
const check = (cond, msg) => { console.log((cond ? '  PASS ' : '  FAIL ') + msg); if (!cond) failures++; };
const parseClock = s => { const [m, x] = s.split(':').map(Number); return m * 60 + x; };

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true });
await ctx.route('**/capacitor.js', r => r.fulfill({ contentType: 'text/javascript', body: MOCK }));
let page = await ctx.newPage();
page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); failures++; });
page.on('dialog', d => d.accept());

const clockText = () => page.textContent('#clock');
const names = sel => page.$$eval(sel + ' .chip .nm', els => els.map(e => e.textContent));
const log = () => page.evaluate(() => window.__log);
const stored = () => page.evaluate(() => JSON.parse(localStorage.getItem('MOCK_PREFS:bench-clock-teams-v1') || 'null'));

console.log('First launch imports existing localStorage data');
await page.goto(URL_);
await page.evaluate(() => {
  localStorage.clear();
  const st = {cfg:{len:20,periods:2,onField:7},players:[['3','Mia'],['5','Jack'],['7','Ava'],['8','Leo'],['10','Isla'],['11','Noah'],['12','Zara'],['14','Oscar'],['21','Ruby']].map(([n,name],i)=>({id:'p'+i,num:+n,name,on:i<7})),example:false,p:0,acc:0,runStart:null,halfEnd:[],events:[],finished:false};
  localStorage.setItem('bench-clock-teams-v1', JSON.stringify({teams:[{id:'tA',name:'Legacy Lions',state:st}],cur:'tA',updatedAt:1}));
});
await page.reload();
await page.waitForTimeout(300);
check((await page.$eval('#teamSel', s => s.selectedOptions[0].textContent)) === 'Legacy Lions', 'old localStorage team shown');
check((await stored())?.teams?.[0]?.name === 'Legacy Lions', 'and copied into Preferences');
check(/saved on this phone/i.test(await page.textContent('#saveStatus')), 'setup says data is saved on this phone');

console.log('Layout');
const lastChipBottom = await page.$$eval('.sides .chip', els => Math.max(...els.map(e => e.getBoundingClientRect().bottom)));
check(lastChipBottom <= 844, `all 9 tiles fit on a 390x844 screen (bottom ${Math.round(lastChipBottom)}px)`);
const bar = (await log()).bars.at(-1);
check(bar && bar.statusColor === '#1f4d32' && bar.lightStatusIcons === true, 'status bar set to default green with light icons');
await page.screenshot({ path: `${SHOTS}/01-start.png` });

console.log('Clock + tap subs + undo');
await page.click('#goBtn');
check((await page.textContent('#goBtn')) === 'Pause', 'Start -> Pause');
check((await log()).awake.at(-1) === true, 'screen kept awake while running');
await page.waitForTimeout(1600);
const firstOn = (await names('#field'))[0];
await page.tap(`#field .chip:has-text("${firstOn}")`);
check((await names('#bench')).includes(firstOn), `tap moved ${firstOn} to bench`);
check(await page.isVisible('#undoBar'), 'undo bar shown');
await page.tap('#undoBtn');
check((await names('#field')).includes(firstOn), 'undo put them back on');

console.log('Long-press drag to swap');
const cdp = await ctx.newCDPSession(page);
const centre = async sel => { const b = await page.locator(sel).first().boundingBox(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; };
async function touchDrag(from, to, hold = 350) {
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from.x, y: from.y }] });
  await page.waitForTimeout(hold);
  for (let i = 1; i <= 10; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from.x + (to.x - from.x) * i / 10, y: from.y + (to.y - from.y) * i / 10 }] });
    await page.waitForTimeout(20);
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(200);
}
const benchFirst = (await names('#bench'))[0], fieldFirst = (await names('#field'))[0];
const buzzBefore = (await log()).buzz;
await touchDrag(await centre(`#bench .chip:has-text("${benchFirst}")`), await centre(`#field .chip:has-text("${fieldFirst}")`));
check((await names('#field')).includes(benchFirst) && (await names('#bench')).includes(fieldFirst), `drag swapped ${benchFirst} on for ${fieldFirst}`);
check((await log()).buzz === buzzBefore + 1, 'haptic buzz on drag start');
const swapEvents = (await stored()).teams[0].state.events.slice(-2);
check(swapEvents.length === 2 && swapEvents[0].t === swapEvents[1].t, 'both swap events at the same clock time');
await page.tap('#undoBtn');
check((await names('#field')).includes(fieldFirst) && (await names('#bench')).includes(benchFirst), 'one undo reverses the whole swap');
// drop on the other column (not on a player) just moves across
const benchN = (await names('#bench')).length;
const fb = await page.locator('#bench').boundingBox();
await touchDrag(await centre(`#field .chip:has-text("${fieldFirst}")`), { x: fb.x + fb.width / 2, y: fb.y + fb.height + 2 });
const movedAcross = (await names('#bench')).length === benchN + 1;
if (!movedAcross) { // the bench column may be short; drop on its header area instead
  const h = await page.locator('#bench').boundingBox();
  await touchDrag(await centre(`#field .chip:has-text("${fieldFirst}")`), { x: h.x + h.width / 2, y: h.y + 4 });
}
check((await names('#bench')).includes(fieldFirst), 'drop on the other column moves the player across');
await page.tap('#undoBtn');
// plain swipe on a tile still scrolls the page
await page.evaluate(() => window.scrollTo(0, 0));
const c = await centre('#field .chip');
await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: c.x, y: c.y + 100 }] });
for (let i = 1; i <= 8; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: c.x, y: c.y + 100 - i * 30 }] }); await page.waitForTimeout(16); }
await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
await page.waitForTimeout(400);
check((await page.evaluate(() => window.scrollY)) > 50, 'a quick swipe over the tiles scrolls the page');
await page.evaluate(() => window.scrollTo(0, 0));

console.log('Back button');
await page.evaluate(() => window.__fire('backButton'));
check((await log()).exit === 0, 'back ignored while the clock runs');
await page.evaluate(() => { document.getElementById('setup').open = true; window.__fire('backButton'); });
check(!(await page.evaluate(() => document.getElementById('setup').open)), 'back closes the setup panel');

console.log('Background for a minute (timestamp clock)');
const before = parseClock(await clockText());
await page.evaluate(() => { const real = Date.now; const off = 60000; Date.now = () => real() + off; document.dispatchEvent(new Event('visibilitychange')); });
await page.waitForTimeout(700);
const after = parseClock(await clockText());
check(after - before >= 60 && after - before <= 62, `clock jumped ${after - before}s after a minute away`);

console.log('Kill and reopen mid-game');
const savedState = (await stored()).teams[0].state;
await page.close();
page = await ctx.newPage();
page.on('pageerror', e => { console.log('  PAGE ERROR', e.message); failures++; });
page.on('dialog', d => d.accept());
await page.goto(URL_);
await page.waitForTimeout(700);
check((await page.textContent('#goBtn')) === 'Pause', 'clock still running after reopen');
check(parseClock(await clockText()) >= 2, `clock carried on (${await clockText()})`);
check((await stored()).teams[0].state.events.length === savedState.events.length, 'substitution history kept');

console.log('Second team with its own logo, colours and game');
await page.selectOption('#teamSel', '__new');
await page.fill('#teamName', 'Blue Bandits');
await page.fill('#roster', '1 Amy\n2 Ben\n3 Cal\n4 Dee\n5 Eve\n6 Fin');
await page.fill('#cfgOn', '5');
await page.selectOption('#cfgPeriods', '4');
await page.click('#applyBtn');
await page.$eval('#colPrimary', el => { el.value = '#1e40af'; el.dispatchEvent(new Event('input', {bubbles:true})); el.dispatchEvent(new Event('change', {bubbles:true})); });
// Generate a logo PNG in the page and upload it through the file input
const png = await page.evaluate(() => { const c = document.createElement('canvas'); c.width = c.height = 400; const x = c.getContext('2d'); x.fillStyle = '#fbbf24'; x.beginPath(); x.arc(200, 200, 180, 0, 7); x.fill(); x.fillStyle = '#1e40af'; x.font = 'bold 160px sans-serif'; x.fillText('BB', 80, 260); return c.toDataURL('image/png').split(',')[1]; });
await page.setInputFiles('#logoFile', { name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64') });
await page.waitForTimeout(400);
check(await page.isVisible('#logo'), 'logo shows on the scoreboard');
const bb = await stored();
const blue = bb.teams.find(t => t.name === 'Blue Bandits');
check(blue && blue.brand.logo && blue.brand.logo.length < 70000, `logo resized and saved (${blue && blue.brand.logo.length} chars)`);
check((await log()).bars.at(-1).statusColor === '#1e40af', 'status bar follows the new primary colour');
check((await page.textContent('#period')) === '1st Quarter', 'quarters setting applied');
await page.click('#goBtn'); await page.waitForTimeout(1200); await page.click('#goBtn');
await page.tap('#field .chip >> nth=0');
await page.evaluate(() => window.scrollTo(0, 0));
await page.screenshot({ path: `${SHOTS}/02-second-team.png` });
const blueClock = await clockText();
const lions = (await stored()).teams.find(t => t.name === 'Legacy Lions').id;
await page.selectOption('#teamSel', lions);
check((await page.textContent('#goBtn')) === 'Pause' && parseClock(await clockText()) >= 5, `Legacy Lions still has its own running game (${await clockText()})`);
check(!(await page.isVisible('#logo')), 'Legacy Lions has no logo');
check((await log()).bars.at(-1).statusColor === '#1f4d32', 'status bar back to green');
const blueId = (await stored()).teams.find(t => t.name === 'Blue Bandits').id;
await page.selectOption('#teamSel', blueId);
check((await clockText()) === blueClock && (await page.textContent('#goBtn')) === 'Resume', `Blue Bandits kept its paused game (${blueClock})`);
check((await page.textContent('#clockSub')).includes('of 20:00'), 'Blue Bandits shows its own settings');

console.log('Export, delete, import');
await page.evaluate(() => { document.getElementById('setup').open = true; });
await page.click('#exportFile');
await page.waitForTimeout(300);
const L = await log();
check(L.shares.length === 1 && L.shares[0].files[0].startsWith('file:///cache/bench-clock-teams-'), 'export opens the share sheet with a JSON file');
const exported = Object.values(L.files)[0];
check(JSON.parse(exported).app === 'bench-clock' && JSON.parse(exported).data.teams.length === 2, 'export contains both teams, in the same backup format as the iPhone version');
writeFileSync(`${SHOTS}/export.json`, exported);
await page.click('#delTeamBtn');
check(/Tap again/.test(await page.textContent('#delTeamBtn')), 'delete needs a second tap');
await page.click('#delTeamBtn');
check((await stored()).teams.length === 1, 'Blue Bandits deleted');
await page.setInputFiles('#importFile', { name: 'backup.json', mimeType: 'application/json', buffer: Buffer.from(exported) });
await page.waitForTimeout(400);
check(/Replace my 1 team with 2 teams/.test(await page.textContent('#importConfirm')), 'import shows what it will replace');
check((await stored()).teams.length === 1, 'nothing replaced before confirming');
await page.click('#importConfirm');
check(/Tap again/.test(await page.textContent('#importConfirm')) && (await stored()).teams.length === 1, 'import needs a second tap');
await page.click('#importConfirm');
const afterImport = await stored();
check(afterImport.teams.length === 2 && afterImport.teams.some(t => t.name === 'Blue Bandits' && t.brand && t.brand.logo), 'Blue Bandits is back with its logo');
// a bare {teams:[...]} file, as Android 1.0-1.2 exported, still imports
await page.setInputFiles('#importFile', { name: 'old.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(JSON.parse(exported).data)) });
await page.waitForTimeout(300);
check(/Replace my 2 teams with 2 teams/.test(await page.textContent('#importConfirm')), 'old Android export format is accepted');
await page.setInputFiles('#importFile', { name: 'junk.json', mimeType: 'application/json', buffer: Buffer.from('{"hello":1}') });
await page.waitForTimeout(300);
check(/isn’t a Bench Clock/.test(await page.textContent('#backupMsg')) && !(await page.isVisible('#importConfirm')), 'non-backup file is rejected');
check((await stored()).teams.length === 2, 'rejected files leave teams alone');
await page.screenshot({ path: `${SHOTS}/03-setup.png`, fullPage: true });

console.log('Play to full time, then new game');
await page.selectOption('#teamSel', lions);
await page.evaluate(() => window.scrollTo(0, 0));
await page.click('#goBtn'); // pause
check((await log()).awake.at(-1) === false, 'screen may sleep when paused');
await page.click('#nextBtn');
check((await page.textContent('#period')) === '2nd Half', 'next half');
await page.click('#goBtn'); await page.waitForTimeout(1100); await page.click('#goBtn');
check((await page.textContent('#nextBtn')) === 'Full time', 'button says Full time in the last half');
await page.click('#nextBtn');
check((await page.textContent('#period')) === 'Full time' && (await page.textContent('#goBtn')) === 'New game', 'full time reached, button is New game');
await page.evaluate(() => { document.getElementById('setup').open = false; window.__fire('backButton'); });
check((await log()).exit === 1, 'back exits when the clock is stopped');
await page.screenshot({ path: `${SHOTS}/04-full-time.png` });
await page.click('#goBtn');
check((await page.textContent('#goBtn')) === 'Tap to confirm', 'New game needs a second tap');
await page.click('#goBtn');
check((await clockText()) === '0:00' && (await page.textContent('#period')) === '1st Half' && (await page.textContent('#goBtn')) === 'Start', 'new game started');

console.log('Look-back and summary');
check((await page.$$('#summary tbody tr')).length === 9, 'time table lists the squad');
check((await page.textContent('#tableTitle')) === 'Time on by player', 'Android shows time on by default');
await page.click('#tableSeg [data-table="off"]');
check((await page.textContent('#tableTitle')) === 'Time off by player', 'switch shows time off');
await page.click('#tableSeg [data-table="on"]');

console.log('Dark theme');
await page.emulateMedia({ colorScheme: 'dark' });
await page.waitForTimeout(200);
check((await log()).bars.at(-1).lightNavIcons === true, 'navigation bar icons switch for dark theme');
await page.screenshot({ path: `${SHOTS}/05-dark.png` });

await browser.close();
server.close();
console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed');
process.exit(failures ? 1 : 0);
