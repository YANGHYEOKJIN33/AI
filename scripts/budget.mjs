/**
 * 수업 화면 정보량 점검 (PLAN-v3 9.4) — 모든 차시의 모든 장면·박자를 브라우저로 넘기며 잰다.
 *
 *   ① 가장 작은 글자 ≥ 무대 높이의 2.4% (1600×900 무대에서 22px)
 *   ② 무대 밖으로 넘치는 글자·상자 없음
 *   ③ 보이는 글자 ≤ 250자 (위 한 줄 · 자막 · 장면 번호 제외 — 가운데와 지금 줄).
 *      데이터 전체(표 9줄 + 리스트 9칸)를 함께 보여 주는 장면(dense)만 350자까지
 *   ④ 한 박자에 바뀌는 곳은 "지금 줄"(의사코드) 또는 "가운데" 중 한 곳 (+ 자막)
 *   (견본처럼 일부러 기준 밖을 보여 주는 장면은 budgetExempt로 뺀다)
 *   ⑤ 콘솔 오류 없음
 *
 *   npm i -D playwright 없이: PLAYWRIGHT_MODULE=/경로/playwright/index.mjs node scripts/budget.mjs
 */
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png' };
const server = createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^\/+/, '');
  try { const body = await readFile(join(ROOT, path || 'index.html')); res.writeHead(200, { 'content-type': TYPES[extname(path)] ?? 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const base = `http://localhost:${server.address().port}/`;

const MIN_PX = 900 * 0.024 - 0.05;
const MAX_CHARS = 250;
const MAX_DENSE = 350;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

const { LESSONS, EXTRAS } = await (async () => { await page.goto(`${base}index.html`); return page.evaluate(async () => { const m = await import('./src/lessons/index.js'); return { LESSONS: m.LESSONS.filter((l) => l.ready).map((l) => l.id), EXTRAS: m.EXTRAS.filter((l) => l.ready).map((l) => l.id) }; }); })();

const problems = [];
let beats = 0;
for (const id of [...LESSONS, ...EXTRAS]) {
  await page.goto(`${base}class.html?l=${id}#1`);
  await page.evaluate(() => localStorage.clear());
  await page.goto(`${base}class.html?l=${id}#1`);
  await page.waitForFunction(() => globalThis.__deck);
  const total = await page.evaluate(() => globalThis.__deck.deck.scenes.reduce((s, x) => s + Math.max(1, x.beats), 0));
  let prev = null;
  for (let i = 0; i < total; i += 1) {
    await page.waitForTimeout(40);
    const m = await page.evaluate(({ MIN_PX }) => {
      const stage = document.getElementById('stage');
      const sr = stage.getBoundingClientRect();
      const scale = sr.width / 1600;
      const visible = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
      const small = []; let chars = 0; const over = [];
      const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const t = walker.currentNode; const txt = t.nodeValue.replace(/\s+/g, ' ').trim(); if (!txt) continue;
        const e = t.parentElement; if (!e || !visible(e) || e.closest('.hidden')) continue;
        const range = document.createRange(); range.selectNodeContents(t); const rr = range.getBoundingClientRect();
        const px = rr.height / scale / 1.2 > 0 ? (() => { let fs = parseFloat(getComputedStyle(e).fontSize); const svg = e.closest('svg'); if (svg) { const vb = svg.viewBox.baseVal; fs *= svg.getBoundingClientRect().width / vb.width / scale; } return fs; })() : 0;
        if (px < MIN_PX) small.push(`${txt.slice(0, 16)}(${px.toFixed(1)}px)`);
        if (rr.right > sr.right + 1 || rr.bottom > sr.bottom + 1 || rr.left < sr.left - 1 || rr.top < sr.top - 1) over.push(txt.slice(0, 16));
        if (e.closest('#zone-main, #zone-line')) chars += txt.length;
      }
      for (const box of stage.querySelectorAll('#zone-main *')) {
        if (!visible(box) || box.closest('.hidden') || box.closest('svg')) continue;
        if (box.scrollWidth > box.clientWidth + 2 && getComputedStyle(box).overflow !== 'visible' && box.clientWidth > 0) over.push(`넘침:${box.className}`);
      }
      const zone = (id) => document.getElementById(id);
      const lineSig = document.querySelector('#zone-line code')?.textContent ?? '';
      const sig = (id) => (zone(id) ? zone(id).innerText + '|' + zone(id).querySelectorAll('.hidden').length + '|' + [...zone(id).querySelectorAll('.hot,.new,.cur,.pick,.win,.on,.right,.off,.first,.dimmed,.colhl')].length : '');
      const p = globalThis.__deck.deck.pos();
      return { at: `${p.id}.${p.beat + 1}`, scene: p.scene, dense: stage.hasAttribute('data-dense'), exempt: stage.hasAttribute('data-exempt'), lineSig, small: [...new Set(small)].slice(0, 4), over: [...new Set(over)].slice(0, 4), chars, main: sig('zone-main') + document.querySelector('#zone-main svg')?.innerHTML.length };
    }, { MIN_PX });
    beats += 1;
    const where = `${id} ${m.at}`;
    if (m.exempt) { prev = m; await page.keyboard.press('ArrowRight'); continue; }
    if (m.small.length) problems.push(`${where} 작은 글자: ${m.small.join(', ')}`);
    if (m.over.length) problems.push(`${where} 무대 밖: ${m.over.join(', ')}`);
    const limit = m.dense ? MAX_DENSE : MAX_CHARS;
    if (m.chars > limit) problems.push(`${where} 글자 ${m.chars}자 > ${limit}`);
    if (prev && prev.scene === m.scene && prev.lineSig !== m.lineSig && prev.main !== m.main) problems.push(`${where} 한 박자에 지금 줄과 가운데가 함께 바뀜`);
    prev = m;
    await page.keyboard.press('ArrowRight');
  }
}
await browser.close();
server.close();
console.log(`수업 화면 ${LESSONS.length + EXTRAS.length}개 · 박자 ${beats}개를 점검했습니다.`);
if (errors.length) console.log('콘솔 오류:\n' + errors.join('\n'));
if (problems.length) { console.log(`문제 ${problems.length}건:\n` + problems.join('\n')); process.exitCode = 1; }
else if (!errors.length) console.log('모두 기준 안 ✓');
if (errors.length) process.exitCode = 1;
