import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as kmeans from '../src/core/algorithms/kmeans.js';
import { HOUSES } from '../src/core/datasets.js';

const byId = Object.fromEntries(HOUSES.map((p) => [p.id, p]));

function checkFixedPoint(result) {
  const { clusters, centroids } = result;
  clusters.forEach((cl, c) => {
    const mx = cl.reduce((s, id) => s + byId[id].x, 0) / cl.length;
    const my = cl.reduce((s, id) => s + byId[id].y, 0) / cl.length;
    assert.ok(Math.abs(mx - centroids[c].x) < 1e-9 && Math.abs(my - centroids[c].y) < 1e-9);
  });
  clusters.forEach((cl, c) => cl.forEach((id) => assert.equal(kmeans.assignPoint(byId[id], centroids), c)));
}

test('기본(집1·집2에서 시작): 1회차 (5, 6.5)·(2, 2) → 2회차에 집1이 옮겨 (6, 7)·(2, 3) → 3회차 수렴', () => {
  const r = kmeans.run({ start: 'p12' });
  const h = r.result.history;
  assert.equal(r.result.iterations, 3);
  assert.deepEqual(h.map((x) => x.next.map((c) => [c.x, c.y])), [
    [[5, 6.5], [2, 2]], [[6, 7], [2, 3]], [[6, 7], [2, 3]],
  ]);
  assert.deepEqual(h[1].changed, ['p0']);
  checkFixedPoint(r.result);
});

test('모든 시작 조건이 수렴하고, 1회차 할당에 거리 동점이 없다', () => {
  for (const s of kmeans.STARTS) {
    const r = kmeans.run({ start: s.id });
    assert.equal(r.result.converged, true, s.id);
    checkFixedPoint(r.result);
    for (const f of r.frames.filter((fr) => fr.action === 'nearest')) {
      const ds = f.ds.curDists;
      assert.equal(ds.filter((d) => d === Math.min(...ds)).length, 1, `${s.id} ${f.ds.cur}`);
    }
  }
});

test('점은 언제나 대기 줄이나 묶음 한 곳에만 있다 (데이터 이동 보존)', () => {
  for (const s of kmeans.STARTS) {
    for (const f of kmeans.run({ start: s.id }).frames) {
      const all = [...f.ds.pool, ...f.ds.clusters.flat()];
      assert.equal(new Set(all).size, HOUSES.length);
      assert.equal(all.length, HOUSES.length);
    }
  }
});
