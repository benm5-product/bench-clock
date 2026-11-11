// Builds the claude.ai prototype page from the shared web app (repo root index.html), so the
// prototype link always shows the same app as the iPhone and Android versions.
// Fonts are embedded, the offline cache is switched off (artifact pages can't use it) and two demo
// teams are added the first time someone opens it. Run from android-app/:  npm run prototype
// Output: android-app/dist/bench-clock-prototype.html (not committed). Republish it to
// https://claude.ai/artifact/7ACmbZ2rKaem1VdY1qWYtB after every change (see CLAUDE.md).
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);
const outFile = new URL('../dist/bench-clock-prototype.html', import.meta.url);
let html = readFileSync(new URL('index.html', root), 'utf8');

const swap = (from, to) => {
  const n = html.split(from).length - 1;
  if (n !== 1) throw new Error(`Expected exactly one ${JSON.stringify(from.slice(0, 60))} in index.html, found ${n}`);
  html = html.replace(from, to);
};

// Embed the fonts so nothing loads from outside the page.
html = html.replace(/url\(([\w-]+\.woff2)\)/g, (_, f) =>
  `url(data:font/woff2;base64,${readFileSync(new URL(f, root)).toString('base64')})`);
// No offline cache in a prototype page.
swap("if(!Native.isNative&&'serviceWorker' in navigator)", 'if(false)');
// The Android build's marker isn't needed here.
html = html.replace(/^.*<!-- android:native\b.*-->.*\n/m, '');

const head = html.slice(html.indexOf('<head>') + 6, html.indexOf('</head>'));
const body = html.slice(html.indexOf('<body>') + 6, html.lastIndexOf('</body>'));
// Keep only the page's own styles from <head>; the artifact skeleton supplies charset and viewport.
const headStyles = head.match(/<style>[\s\S]*?<\/style>/g) || [];

const seed = `<script>
/* Prototype only: two demo teams the first time this page is opened. */
(function(){
  try{
    if(localStorage.getItem('bench-clock-teams-v1')) return;
    const names=[[1,'Archie'],[2,'Mason'],[3,'Lachie'],[4,'Ruby'],[5,'Kai'],[6,'Isla'],[7,'Hudson'],[8,'Zara'],[9,'Cooper'],[10,'Mia'],[11,'Jack'],[12,'Ava'],[13,'Leo'],[14,'Noah'],[15,'Evie']];
    const st=(list,onField)=>({cfg:{len:20,periods:2,onField},players:list.map(([n,name],i)=>({id:'p'+i,num:n,name,on:i<onField})),example:false,p:0,acc:0,runStart:null,halfEnd:[],events:[],finished:false});
    const basic=[[3,'Mia'],[5,'Jack'],[7,'Ava'],[8,'Leo'],[10,'Isla'],[11,'Noah'],[12,'Zara'],[14,'Oscar'],[21,'Ruby']];
    localStorage.setItem('bench-clock-teams-v1',JSON.stringify({teams:[
      {id:'demo-rl',name:'Under 10s Rugby League',sport:'rl',state:st(names,11)},
      {id:'demo-basic',name:'Basic team',sport:'basic',state:st(basic,7)}
    ],cur:'demo-rl',updatedAt:1}));
  }catch(e){}
})();
</script>
`;
const firstScript = body.indexOf('<script>');
if (firstScript < 0) throw new Error('No <script> found in index.html');

const page = `<title>Bench Clock Prototype</title>
<meta name="claude:viewport-fit-sides" content="cover">
${headStyles.join('\n')}
${body.slice(0, firstScript)}${seed}${body.slice(firstScript).trim()}
`;
mkdirSync(new URL('../dist/', import.meta.url), { recursive: true });
writeFileSync(outFile, page);
console.log(`Prototype written to android-app/dist/bench-clock-prototype.html (${Math.round(page.length / 1024)} KB)`);
