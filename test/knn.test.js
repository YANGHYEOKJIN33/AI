import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as knn from '../src/core/algorithms/knn.js';
import { FOODS } from '../src/core/datasets.js';

/** 사이트 코드와 별개로 짠 참값 계산기 */
function bruteForce(q, k) {
  const ds = FOODS.map((f) => ({ label: f.label, d: Math.sqrt((q.x - f.x) ** 2 + (q.y - f.y) ** 2) }))
    .sort((a, b) => a.d - b.d);
  const votes = {};
  ds.slice(0, k).forEach((n) => { votes[n.label] = (votes[n.label] ?? 0) + 1; });
  return Object.entries(votes).sort((a, b) => b[1] - a[1])[0][0];
}

test('토마토(6,4): k=1·3이면 과일, k=5·7이면 단백질 (계획서 4.1 검산)', () => {
  const q = { x: 6, y: 4 };
  assert.equal(knn.run({ k: 1, query: q }).result.label, '과일');
  assert.equal(knn.run({ k: 3, query: q }).result.label, '과일');
  assert.equal(knn.run({ k: 5, query: q }).result.label, '단백질');
  assert.equal(knn.run({ k: 7, query: q }).result.label, '단백질');
});

test('예제 질문점 근처에서 거리 동점이 없다 (가장 가까운 8개)', () => {
  const ds = FOODS.map((f) => Math.hypot(6 - f.x, 4 - f.y)).sort((a, b) => a - b);
  for (let i = 0; i < 8; i += 1) assert.notEqual(ds[i].toFixed(6), ds[i + 1].toFixed(6));
});

test('여러 질문점에서 참값 계산기와 같은 답 (동점이 없는 경우)', () => {
  for (let x = 1; x <= 10; x += 3) {
    for (let y = 1; y <= 10; y += 3) {
      for (const k of [1, 3]) {
        const got = knn.classify({ x, y }, k);
        const r = knn.run({ k, query: { x, y } });
        assert.equal(r.result.label, got);
        if (k === 1) assert.equal(got, bruteForce({ x, y }, 1));
      }
    }
  }
});

test('자료구조 흐름: distances 12칸 → 정렬 → 앞 k개 → 표 합계 = k', () => {
  const r = knn.run({ k: 3, query: { x: 6, y: 4 } });
  const sortFrame = r.frames.find((f) => f.action === 'sort');
  const before = r.frames[r.frames.indexOf(sortFrame) - 1];
  assert.equal(before.ds.distances.length, FOODS.length);
  assert.equal(before.ds.sorted, false);
  const ds = sortFrame.ds.distances.map((d) => d.d);
  assert.deepEqual(ds, ds.slice().sort((a, b) => a - b));
  const last = r.frames.at(-1).ds;
  assert.equal(last.neighbors.length, 3);
  assert.equal(last.votes.reduce((s, v) => s + v.count, 0), 3);
  assert.deepEqual(last.neighbors.map((n) => n.name), ['오렌지', '견과류', '포도']);
});

test('append 프레임마다 distances가 정확히 한 칸씩 늘어난다', () => {
  const r = knn.run();
  let size = 0;
  for (const f of r.frames) {
    if (f.action === 'append') { assert.equal(f.ds.distances.length, size + 1); size += 1; }
  }
  assert.equal(size, FOODS.length);
});
