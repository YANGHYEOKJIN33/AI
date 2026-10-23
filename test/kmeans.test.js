import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as kmeans from '../src/core/algorithms/kmeans.js';
import { HOUSES } from '../src/core/datasets.js';

const byId = Object.fromEntries(HOUSES.map((p) => [p.id, p]));

function checkFixedPoint(result) {
  const { clusters, centroids } = result;
  // 중심 = 묶음 평균
  clusters.forEach((cl, c) => {
    if (cl.length === 0) return;
    const mx = cl.reduce((s, id) => s + byId[id].x, 0) / cl.length;
    const my = cl.reduce((s, id) => s + byId[id].y, 0) / cl.length;
    assert.ok(Math.abs(mx - centroids[c].x) < 1e-9);
    assert.ok(Math.abs(my - centroids[c].y) < 1e-9);
  });
  // 모든 점은 가장 가까운 중심의 묶음에 있다
  clusters.forEach((cl, c) => cl.forEach((id) => {
    assert.equal(kmeans.assignPoint(byId[id], centroids), c);
  }));
}

test('기본(k=3, 앞의 3개로 시작)은 3번 반복해 수렴하고 세 동네를 찾는다', () => {
  const r = kmeans.run({ variant: 'k3' });
  assert.equal(r.result.converged, true);
  assert.equal(r.result.iterations, 3);
  assert.deepEqual(r.result.clusters.map((c) => c.slice().sort()), [
    ['p0', 'p3', 'p4'], ['p1', 'p2', 'p5', 'p6'], ['p7', 'p8', 'p9'],
  ]);
  checkFixedPoint(r.result);
});

test('나쁜 시작은 지역 최적에 수렴한다 — 묶음 안 거리 제곱합이 더 크다', () => {
  const good = kmeans.run({ variant: 'k3' }).result;
  const bad = kmeans.run({ variant: 'bad' }).result;
  assert.equal(bad.converged, true);
  checkFixedPoint(bad);
  assert.ok(kmeans.sse(bad.clusters, bad.centroids) > kmeans.sse(good.clusters, good.centroids) + 1);
});

test('k=2·4도 수렴하고 고정점 조건을 만족한다', () => {
  for (const variant of ['k2', 'k4']) {
    const r = kmeans.run({ variant });
    assert.equal(r.result.converged, true);
    checkFixedPoint(r.result);
  }
});

test('점은 언제나 대기 줄이나 묶음 한 곳에만 있다 (데이터 이동 보존)', () => {
  for (const variant of ['k3', 'bad']) {
    for (const f of kmeans.run({ variant }).frames) {
      const all = [...f.ds.pool, ...f.ds.clusters.flat()];
      assert.equal(all.length, HOUSES.length);
      assert.equal(new Set(all).size, HOUSES.length);
    }
  }
});
