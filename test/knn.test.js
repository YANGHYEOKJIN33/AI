import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as knn from '../src/core/algorithms/knn.js';
import { FOODS } from '../src/core/datasets.js';

const TOMATO = { name: '토마토', x: 6, y: 4 };

test('토마토(6,4): k=1·3이면 과일, k=5·7이면 단백질 (계획서 검산)', () => {
  assert.equal(knn.run({ k: 1, query: TOMATO }).result.label, '과일');
  assert.equal(knn.run({ k: 3, query: TOMATO }).result.label, '과일');
  assert.equal(knn.run({ k: 5, query: TOMATO }).result.label, '단백질');
  assert.equal(knn.run({ k: 7, query: TOMATO }).result.label, '단백질');
});

test('토마토와의 거리 제곱은 모두 다른 정수 (손으로 풀기 좋게)', () => {
  const r = knn.run({ k: 3, query: TOMATO });
  assert.deepEqual(r.result.sorted.map((s) => [s.name, s.d2]), [
    ['오렌지', 2], ['견과류', 5], ['포도', 8], ['생선', 10], ['치즈', 13], ['당근', 17], ['오이', 25], ['사과', 34], ['셀러리', 41],
  ]);
});

test('연습용 질문점은 모두 거리에 동점이 없다', () => {
  assert.ok(knn.QUERIES.length >= 5);
  for (const q of knn.QUERIES) {
    const d2 = FOODS.map((f) => (q.x - f.x) ** 2 + (q.y - f.y) ** 2);
    assert.equal(new Set(d2).size, d2.length, q.name);
  }
});

test('자료구조 흐름: distances 9칸(표 순서) → 정렬 → 앞 k개 → 표 합계 = k', () => {
  const r = knn.run({ k: 3, query: TOMATO });
  const sortFrame = r.frames.find((f) => f.action === 'sort');
  const before = r.frames[r.frames.indexOf(sortFrame) - 1];
  assert.deepEqual(before.ds.distances.map((d) => d.name), FOODS.map((f) => f.name));
  assert.equal(before.ds.sorted, false);
  const last = r.frames.at(-1).ds;
  assert.deepEqual(last.neighbors.map((n) => n.name), ['오렌지', '견과류', '포도']);
  assert.equal(last.votes.reduce((s, v) => s + v.count, 0), 3);
});

test('깨진 설정은 기본 조건으로', () => {
  assert.deepEqual(knn.normalize({ k: 4, query: { name: '?', x: 1, y: 1 } }), { k: 3, query: TOMATO });
});
