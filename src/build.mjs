// Builds the README sections as SVG files (light + dark) and a GitHub-like preview.
// Technique: <svg><foreignObject> with real HTML/CSS inside, width=100%, so the layout
// reflows with container queries instead of shrinking like a picture.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

import { tmpdir } from 'node:os';
const SRC = new URL('.', import.meta.url).pathname;
const ROOT = new URL('..', import.meta.url).pathname;
const OUT = ROOT + 'assets/';
const TMP = tmpdir() + '/';
mkdirSync(OUT, { recursive: true });

// ---------- content (becomes config later) ----------
const C = {
  name: 'Ayhan Gad',
  role: 'Designer & Engineer',
  place: 'GMT+3',
  intro: ['Ayhan Gad is a designer and engineer, currently at Tapforce.',
          'He makes software by deciding, mostly, what not to make.'],
  links: [['Website', 'https://ayhan.fyi'], ['X', 'https://x.com/ayhangad'],
          ['LinkedIn', 'https://linkedin.com/in/ayhangad']],
};

const THEMES = {
  light: { ink: '#0a0a0a', muted: '#8a8a8a', faint: '#e6e6e6' },
  dark:  { ink: '#f0f0f0', muted: '#7d8590', faint: '#232a33' },
};

// ---------- data ----------
const cal = JSON.parse(readFileSync(ROOT + 'data/contributions.json', 'utf8'))
  .data.user.contributionsCollection.contributionCalendar;
const days = cal.weeks.flatMap(w => w.contributionDays);
const max = Math.max(...days.map(d => d.contributionCount));

// ---------- font: Inter Variable, subset to what we render ----------
const text = JSON.stringify(C) + '0123456789,–—·↗ ' + 'JanFebMarAprMayJunJulAugSepOctNovDec contributions in the last year Today';
const chars = [...new Set(text)].join('');
execFileSync('pyftsubset', [SRC + 'fonts/InterVariable.woff2', `--text=${chars}`,
  '--flavor=woff2', '--layout-features=*', `--output-file=${TMP}inter-subset.woff2`]);
const FONT = readFileSync(TMP + 'inter-subset.woff2').toString('base64');

// ---------- shared ----------
const base = (t) => /* css */ `
  @font-face { font-family: I; src: url(data:font/woff2;base64,${FONT}) format('woff2'); font-weight: 100 900; }
  * { box-sizing: border-box; margin: 0; }
  .w { width: 100%; height: 100%; container-type: inline-size; font-family: I, -apple-system, sans-serif;
       font-size: 14px; line-height: 20px; letter-spacing: -0.006em; color: ${t.ink};
       font-feature-settings: 'cv11', 'ss01', 'tnum'; -webkit-font-smoothing: antialiased; }
  .g { display: grid; grid-template-columns: repeat(12, minmax(0, 1fr)); }
  .m { color: ${t.muted}; }
  .f { opacity: 0; animation: f .9s cubic-bezier(.2,.6,.2,1) forwards; animation-delay: var(--d, 0s); }
  @keyframes f { from { opacity: 0; transform: translateY(3px); } to { opacity: 1; transform: none; } }
  @media (prefers-reduced-motion: reduce) { .f, .b { animation: none !important; opacity: 1; transform: none; } }
`;
const svg = (h, css, html, w = '100%') => `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" fill="none">
<foreignObject width="100%" height="100%"><div xmlns="http://www.w3.org/1999/xhtml" class="w"><style><![CDATA[${css}]]></style>${html}</div></foreignObject></svg>`;
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');

// ---------- sections ----------
function top(t) {
  return svg(20, base(t) + `
    .a { grid-column: 1 / 7; font-weight: 500; }
    .b2 { grid-column: 7 / 10; }
    .c { grid-column: 10 / 13; text-align: right; }
    @container (max-width: 559px) { .b2 { grid-column: 7 / 13; text-align: right; } .c { display: none; } }
  `, `<div class="g">
    <div class="a f">${esc(C.name)}</div>
    <div class="b2 m f" style="--d:.08s">${esc(C.role)}</div>
    <div class="c m f" style="--d:.16s">${esc(C.place)}</div>
  </div>`);
}

function main(t) {
  const H = 420, GH = 72; // image height, graph height
  // words fade in one by one
  let i = 0;
  const words = C.intro.map((s, k) => `<span class="${k ? 'm' : ''}">${s.split(' ')
    .map(w => `<span class="f" style="--d:${(.35 + i++ * .035).toFixed(3)}s">${esc(w)}</span>`).join(' ')}</span>`).join(' ');

  // one hairline per day; height ~ sqrt(count)
  const N = days.length;
  const bars = days.map((d, x) => {
    const h = d.contributionCount ? 6 + Math.sqrt(d.contributionCount / max) * (GH - 6) : 2;
    const cls = d.contributionCount ? 'on' : 'off';
    return `<line class="b ${cls}" x1="${x + .5}" x2="${x + .5}" y1="${GH}" y2="${(GH - h).toFixed(1)}" style="animation-delay:${(1.2 + x * .004).toFixed(3)}s"/>`;
  }).join('');

  // month labels at the first day of each month
  const months = days.map((d, x) => [d, x]).filter(([d]) => d.date.endsWith('-01'))
    .map(([d, x]) => `<span style="left:${(x / N * 100).toFixed(2)}%">${new Date(d.date).toLocaleString('en', { month: 'short' })}</span>`).join('');

  return svg(H, base(t) + `
    .wrap { height: 100%; display: grid; grid-template-rows: 1fr auto; padding-bottom: 36px; }
    .intro { grid-column: 7 / 13; font-size: 26px; line-height: 32px; letter-spacing: -0.022em; padding-top: 56px; text-wrap: pretty; }
    .intro .f { display: inline-block; }
    .graph { grid-column: 1 / 13; }
    .meta { display: flex; justify-content: space-between; margin-bottom: 14px; }
    .plot { width: 100%; height: ${GH}px; display: block; overflow: visible; }
    .b { stroke-width: 1px; vector-effect: non-scaling-stroke; transform-box: fill-box; transform-origin: bottom;
         transform: scaleY(0); animation: grow .8s cubic-bezier(.2,.7,.2,1) forwards; }
    .on { stroke: ${t.ink}; } .off { stroke: ${t.faint}; }
    @keyframes grow { to { transform: none; } }
    .months { position: relative; height: 20px; margin-top: 8px; }
    .months span { position: absolute; top: 0; }
    @container (max-width: 699px) { .intro { grid-column: 5 / 13; font-size: 23px; line-height: 29px; } }
    @container (max-width: 559px) { .intro { grid-column: 1 / 13; font-size: 21px; line-height: 27px; padding-top: 40px; }
                                  .months span:nth-child(even) { display: none; } }
  `, `<div class="wrap">
    <div class="g"><p class="intro">${words}</p></div>
    <div class="g"><div class="graph">
      <div class="meta f" style="--d:1s"><span>${cal.totalContributions.toLocaleString('en')} <span class="m">contributions in the last year</span></span><span class="m">Today</span></div>
      <svg xmlns="http://www.w3.org/2000/svg" class="plot" viewBox="0 0 ${N} ${GH}" preserveAspectRatio="none">${bars}</svg>
      <div class="months m f" style="--d:1.4s">${months}</div>
    </div></div>
  </div>`);
}

function link(t, label, i) {
  return svg(20, base(t) + `.l { --d: ${(2 + i * .08).toFixed(2)}s; }`,
    `<div class="l f">${esc(label)}</div>`);
}

// ---------- write ----------
for (const [name, t] of Object.entries(THEMES)) {
  writeFileSync(`${OUT}top-${name}.svg`, top(t));
  writeFileSync(`${OUT}main-${name}.svg`, main(t));
  C.links.forEach(([label], i) => writeFileSync(`${OUT}link-${i}-${name}.svg`, link(t, label, i)));
}

// ---------- README.md (exact markup that will go to GitHub) ----------
const pic = (file, attrs) => `<picture><source media="(prefers-color-scheme: dark)" srcset="assets/${file}-dark.svg"><img src="assets/${file}-light.svg" ${attrs}></picture>`;
const readme = [
  pic('top', `alt="${C.name} — ${C.role}" width="100%" height="20" align="left"`),
  pic('main', `alt="${C.intro.join(' ')}" width="100%" height="420" align="left"`),
  `<img src="data:null;," width="100%" height="0" align="left" alt="">`,
  // Links: no align (GitHub pads img[align=left] by 20px, which breaks the 4×25% grid),
  // and no whitespace between them so four 25% images fill exactly one line.
  '<p>' + C.links.map(([label, href], i) => `<a href="${href}">${pic(`link-${i}`, `alt="${label}" width="25%" height="20"`)}</a>`).join('') + '</p>',
].join('\n');
writeFileSync(ROOT + 'README.md', readme + '\n');

console.log('font subset', Math.round(FONT.length / 1024), 'KB b64; main', Math.round(main(THEMES.light).length / 1024), 'KB');

// ---------- preview.html (GitHub profile chrome around the exact README markup) ----------
writeFileSync(ROOT + 'preview.html', `<!doctype html><html><head><meta charset="utf-8"><title>README preview</title><style>
  :root { --bg:#fff; --bd:#d1d9e0; --tx:#1f2328; --mu:#59636e; }
  .dark { --bg:#0d1117; --bd:#3d444d; --tx:#f0f6fc; --mu:#9198a1; }
  body { margin:0; background:var(--bg); color:var(--tx); font:14px/1.5 -apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif; }
  .bar { display:flex; gap:8px; justify-content:center; padding:10px; border-bottom:1px solid var(--bd); }
  .bar button { font:inherit; padding:4px 12px; border-radius:6px; border:1px solid var(--bd); background:none; color:var(--tx); cursor:pointer; }
  .wrap { max-width:1280px; margin:32px auto; padding:0 32px; display:flex; gap:24px; }
  .side { width:296px; flex-shrink:0; } .side img { width:296px; height:296px; border-radius:50%; border:1px solid var(--bd); display:block; }
  .side h1 { margin:16px 0 0; font-size:24px; font-weight:600; } .side div { font-size:20px; font-weight:300; color:var(--mu); }
  .main { flex:1; min-width:0; }
  .box { border:1px solid var(--bd); border-radius:6px; padding:24px; }
  .path { font:12px ui-monospace,Menlo,monospace; margin-bottom:16px; }
  .markdown-body { overflow:hidden; } .markdown-body img { max-width:100%; box-sizing:content-box; }
  .mobile .wrap { max-width:390px; padding:0 16px; display:block; }
  .mobile .side { width:auto; display:flex; gap:16px; align-items:center; margin-bottom:16px; }
  .mobile .side img { width:72px; height:72px; } .mobile .side h1 { margin:0; font-size:20px; } .mobile .box { padding:16px; }
</style></head><body>
<div class="bar"><button onclick="theme()">Light / Dark</button><button onclick="document.body.classList.toggle('mobile')">Desktop / Mobile</button><button onclick="replay()">Replay</button></div>
<div class="wrap"><aside class="side"><img src="https://cdn.sanity.io/images/b4spjdyq/production/9dedf907d65e6ed0990b134db995d7aa086939fc-1024x1024.png?w=600&h=600&auto=format" alt=""><div><h1>Ayhan Gad</h1><div>ayhangad</div></div></aside>
<main class="main"><div class="box"><div class="path">ayhangad / README.md</div><article class="markdown-body" id="md">${readme}</article></div></main></div>
<script>
  const md = document.getElementById('md');
  md.querySelectorAll('source').forEach(s => s.remove());
  let dark = matchMedia('(prefers-color-scheme: dark)').matches;
  function apply() { document.body.classList.toggle('dark', dark);
    md.querySelectorAll('img[src$=".svg"]').forEach(i => i.src = i.getAttribute('src').replace(/-(light|dark)\\.svg.*/, '-' + (dark ? 'dark' : 'light') + '.svg?' + Date.now())); }
  function theme() { dark = !dark; apply(); }
  function replay() { apply(); }
  apply();
</script></body></html>`);
