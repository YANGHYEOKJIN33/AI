import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { glossaryEntries, searchGlossary } from '../src/app/glossary.js';
import { ALGORITHMS } from '../src/core/algorithms/index.js';

const TERMS = new Set(glossaryEntries().map((e) => e.term));

function sources(dir) {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    return statSync(p).isDirectory() ? sources(p) : p.endsWith('.js') ? [p] : [];
  });
}

test('용어마다 영어와 쉬운 말과 만나는 곳이 있다', () => {
  for (const e of glossaryEntries()) {
    assert.ok(e.en && e.plain && e.where, e.term);
  }
  assert.equal(TERMS.size, glossaryEntries().length, '같은 용어가 두 번 들어 있다');
});

test('화면이 용어 풍선(ⓘ)으로 부르는 용어는 모두 사전에 있다', () => {
  const used = new Set();
  for (const file of sources(new URL('../src', import.meta.url).pathname)) {
    const text = readFileSync(file, 'utf8');
    for (const m of text.matchAll(/infoTerm\('([^']+)'/g)) used.add(m[1]);
    const kw = text.match(/const KEYWORDS = \[([\s\S]*?)\];/);
    if (kw) for (const m of kw[1].matchAll(/'([^']+)'/g)) used.add(m[1]);
  }
  for (const a of Object.values(ALGORITHMS)) { used.add(a.meta.task); used.add(a.meta.learning); }
  for (const t of ['리스트', '딕셔너리', '2차원 리스트', '튜플', '변수', '스택']) used.add(t);
  const missing = [...used].filter((t) => !TERMS.has(t));
  assert.deepEqual(missing, []);
});

test('찾기는 영어·뜻에서도 걸린다', () => {
  const hit = searchGlossary('centroid').flatMap((g) => g.items.map((i) => i.term));
  assert.ok(hit.includes('중심'));
  assert.equal(searchGlossary('없는낱말xyz').length, 0);
});
