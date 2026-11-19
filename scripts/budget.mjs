/**
 * 화면 정보량 점검 (PLAN-v4 8장) — 새 틀(index.html)의 모든 탭·쪽·단계를 브라우저로 넘기며 잰다.
 *
 *   ① 가장 작은 글자 ≥ 무대 높이의 2.4% (1600×900 무대에서 22px)
 *   ② 무대 밖으로 넘치는 글자·상자 없음
 *   ③ 작업대 두 칸에 보이는 글자 ≤ 300자, 자료구조 상자 ≤ 2개, 실행 단추 3개
 *      데이터 전체(표 9줄 + 리스트 9칸)를 함께 보여 주는 장면(dense)만 350자까지
 *   ④ 한 단계에 바뀌는 곳은 왼쪽 칸 또는 오른쪽 칸 중 한 곳 (+ 아래 띠)
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
const MAX_CHARS = 300;
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 } });
const errors = [];
page.on('pageerror', (e) => errors.push(String(e)));
page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`${base}index.html`);
await page.evaluate(() => localStorage.clear());
await page.goto(`${base}index.html#knn/1`);
await page.waitForFunction(() => globalThis.__site);

const problems = [];
let steps = 0;
const tabs = await page.evaluate(() => globalThis.__site.tabs.map((t) => ({ id: t.id, pages: t.pages.map((p) => p.steps.length) })));
for (const tab of tabs) {
  await page.evaluate((id) => globalThis.__site.switchTab(id), tab.id);
  for (let p = 0; p < tab.pages.length; p += 1) {
    await page.evaluate((p) => globalThis.__site.go(p, 0), p);
    const here = await page.evaluate(() => globalThis.__site.pos());
    if (here.tab !== tab.id || here.page !== p) problems.push(`${tab.id} ${p + 1}쪽으로 가지 못함`);
    let prev = null;
    for (let s = 0; s < tab.pages[p]; s += 1) {
      if (s > 0) await page.keyboard.press('ArrowRight');
      await page.waitForTimeout(30);
      const m = await page.evaluate(({ MIN_PX }) => {
        const stage = document.getElementById('stage');
        const sr = stage.getBoundingClientRect(); const scale = sr.width / 1600;
        const visible = (e) => { const cs = getComputedStyle(e); if (cs.visibility === 'hidden' || cs.display === 'none') return false; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; };
        const small = []; const over = []; let chars = 0;
        const walker = document.createTreeWalker(stage, NodeFilter.SHOW_TEXT);
        while (walker.nextNode()) {
          const t = walker.currentNode; const txt = t.nodeValue.replace(/\s+/g, ' ').trim(); if (!txt) continue;
          const e = t.parentElement; if (!e || !visible(e) || e.closest('.hidden')) continue;
          let fs = parseFloat(getComputedStyle(e).fontSize); const svg = e.closest('svg');
          if (svg && svg.viewBox.baseVal.width) fs *= svg.getBoundingClientRect().width / svg.viewBox.baseVal.width / scale;
          if (fs < MIN_PX) small.push(`${txt.slice(0, 14)}(${fs.toFixed(1)}px)`);
          const range = document.createRange(); range.selectNodeContents(t); const rr = range.getBoundingClientRect();
          const box = e.closest('.panel, .bottom, .pagebar, .tabs')?.getBoundingClientRect() ?? sr;
          const clipped = e.closest('.pagebar p, .btext');   // 말줄임 처리하는 자리
          if (!clipped && (rr.right > box.right + 1 || rr.bottom > box.bottom + 1 || rr.left < box.left - 1)) over.push(txt.slice(0, 14));
          if (e.closest('.work .body')) chars += txt.length;
        }
        for (const z of ['zone-left', 'zone-right']) { const b = document.getElementById(z); const br = b.getBoundingClientRect();
          for (const c of b.children) { const r = c.getBoundingClientRect(); if (r.right > br.right + 2 || r.bottom > br.bottom + 2 || r.left < br.left - 2 || r.top < br.top - 2) over.push(`${z} 넘침`); } }
        const cap = document.getElementById('zone-cap'); if (cap.scrollWidth > cap.clientWidth + 2) over.push('아래 띠 잘림');
        const sig = (id) => { const z = document.getElementById(id); return z.innerText + '|' + z.querySelectorAll('.hidden').length + '|' + z.querySelectorAll('.hot,.new,.cur,.pick,.win,.on,.right,.off,.dimmed').length + '|' + (z.querySelector('svg.plot')?.textContent ?? '') + (z.querySelector('svg.plot .plot__shapes')?.childElementCount ?? 0); };
        return { small: [...new Set(small)].slice(0, 3), over: [...new Set(over)].slice(0, 3), chars, left: sig('zone-left'), right: sig('zone-right'),
          boxes: document.querySelectorAll('#zone-right .ds:not(.hidden)').length, buttons: [...document.querySelectorAll('.ctrl button')].length };
      }, { MIN_PX });
      steps += 1;
      const where = `${tab.id} ${p + 1}쪽 ${s + 1}단계`;
      if (m.small.length) problems.push(`${where} 작은 글자: ${m.small.join(', ')}`);
      if (m.over.length) problems.push(`${where} 넘침: ${m.over.join(', ')}`);
      if (m.chars > MAX_CHARS) problems.push(`${where} 글자 ${m.chars}자 > ${MAX_CHARS}`);
      if (m.boxes > 2) problems.push(`${where} 자료구조 상자 ${m.boxes}개 > 2`);
      if (m.buttons !== 3) problems.push(`${where} 실행 단추 ${m.buttons}개`);
      if (prev && prev.left !== m.left && prev.right !== m.right) problems.push(`${where} 한 단계에 왼쪽과 오른쪽이 함께 바뀜`);
      prev = m;
    }
  }
}
await browser.close();
server.close();
console.log(`탭 ${tabs.length}개 · 쪽 ${tabs.reduce((a, t) => a + t.pages.length, 0)}개 · 단계 ${steps}개를 점검했습니다.`);
if (errors.length) console.log('콘솔 오류:\n' + errors.join('\n'));
if (problems.length) { console.log(`문제 ${problems.length}건:\n` + problems.join('\n')); process.exitCode = 1; }
else if (!errors.length) console.log('모두 기준 안 ✓');
if (errors.length) process.exitCode = 1;
