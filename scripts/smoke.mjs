/**
 * (선택) 브라우저 점검 — 모든 쪽을 열고, 알고리즘 쪽은 모든 조건 조합으로 처음부터 끝까지 밟아
 * 콘솔 오류가 없는지 확인한다. 정적 서버를 스스로 띄우므로 따로 켤 필요가 없다.
 *
 *   npm i -D playwright && npx playwright install chromium   # 처음 한 번
 *   node scripts/smoke.mjs
 *   (전역 설치를 쓰면) PLAYWRIGHT_MODULE=/경로/playwright/index.mjs node scripts/smoke.mjs
 */
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  const path = normalize(decodeURIComponent(new URL(req.url, 'http://x').pathname)).replace(/^(\.\.[/\\])+/, '');
  const file = path.endsWith('/') ? `${path}index.html` : path;
  try {
    const body = await readFile(join(ROOT, file));
    res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end();
  }
});
await new Promise((ok) => server.listen(0, ok));
const url = `http://localhost:${server.address().port}/`;

const { chromium } = await import(process.env.PLAYWRIGHT_MODULE ?? 'playwright');
const browser = await chromium.launch();
const errors = [];
let visited = 0;

for (const viewport of [{ width: 1280, height: 720 }, { width: 390, height: 844 }]) {
  const page = await browser.newPage({ viewport });
  page.on('pageerror', (e) => errors.push(`${viewport.width}px pageerror: ${e}`));
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`${viewport.width}px console: ${m.text()}`); });
  await page.goto(url);
  await page.evaluate(() => { localStorage.clear(); localStorage.setItem('ml-ds-review:seen-guide', '1'); });
  await page.reload();
  await page.waitForFunction(() => globalThis.__mlds);

  const set = (patch) => page.evaluate((p) => globalThis.__mlds.store.set(p), patch);
  for (let i = 0; i < 7; i += 1) { await set({ mode: 'tools', toolsStep: i }); visited += 1; }
  for (let i = 0; i < 3; i += 1) { await set({ mode: 'wrap', wrapStep: i }); visited += 1; }

  // 알고리즘마다 모든 조건(knob 조합) × 모든 쪽을 열고, 단계 쪽은 처음부터 끝까지 밟는다
  const plan = await page.evaluate(async () => {
    const { ALGORITHMS, ALGO_ORDER } = await import('./src/core/algorithms/index.js');
    const { algoPages } = await import('./src/app/lesson.js');
    return ALGO_ORDER.map((id) => {
      let combos = [{}];
      for (const k of ALGORITHMS[id].knobs) combos = combos.flatMap((c) => k.options.map((o) => ({ ...c, ...o.patch })));
      return [id, combos, algoPages(id).length];
    });
  });
  for (const [algoTab, combos, pages] of plan) {
    for (const params of combos) {
      for (let algoStep = 0; algoStep < pages; algoStep += 1) {
        await page.evaluate(({ algoTab, algoStep, params }) => {
          const { store } = globalThis.__mlds;
          store.setParams(algoTab, params);
          store.set({ mode: 'algo', algoTab, algoStep });
        }, { algoTab, algoStep, params });
        await page.evaluate(() => {
          const { player } = globalThis.__mlds;
          const v = player.view();
          if (v.empty) return;
          for (let i = v.lo; i <= v.hi; i += Math.max(1, Math.floor((v.hi - v.lo) / 20))) player.goTo(i);
          player.toEnd();
        });
        visited += 1;
      }
    }
  }
  await page.close();
}

await browser.close();
server.close();
console.log(`쪽·설정 ${visited}가지를 훑었습니다.`);
if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}
console.log('콘솔 오류 없음 ✓');
