import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as dtree from '../src/core/algorithms/dtree.js';
import { PLAY_DAYS } from '../src/core/datasets.js';

test('뿌리 점수(가중 지니): 날씨 0.343 < 습도 0.367 < 바람 0.429 < 기온 0.440', () => {
  const r = dtree.run({ criterion: 'gini' });
  const choose = r.frames.find((f) => f.action === 'choose');
  const s = Object.fromEntries(choose.ds.scores.map((x) => [x.feature, +x.score.toFixed(3)]));
  assert.deepEqual(s, { 날씨: 0.343, 기온: 0.44, 습도: 0.367, 바람: 0.429 });
  assert.equal(choose.ds.best, '날씨');
});

test('지니·엔트로피 모두 교과서와 같은 트리 — 학습 데이터를 모두 맞힌다', () => {
  for (const criterion of ['gini', 'entropy']) {
    const r = dtree.run({ criterion });
    assert.equal(r.result.nodes[r.result.root].feature, '날씨');
    assert.equal(r.result.depth, 2);
    assert.equal(r.result.leaves, 5);
    for (const day of PLAY_DAYS) {
      assert.equal(dtree.classify(r.result.nodes, r.result.root, day).label, day.label);
    }
  }
});

test('최대 깊이 1이면 날씨 질문 하나와 다수결 잎 3개', () => {
  const r = dtree.run({ maxDepth: 1 });
  assert.equal(r.result.depth, 1);
  assert.equal(r.result.leaves, 3);
  assert.deepEqual(dtree.describe(r.result.nodes, r.result.root), [
    '날씨=맑음 → 안 한다', '날씨=흐림 → 한다', '날씨=비 → 한다',
  ]);
});

test('호출 스택: push와 pop이 짝이 맞고 끝나면 빈다', () => {
  const r = dtree.run();
  let maxDepth = 0;
  for (const f of r.frames) maxDepth = Math.max(maxDepth, f.ds.stack.length);
  assert.equal(maxDepth, 3);
  assert.equal(r.frames.at(-1).ds.stack.length, 0);
  const pushes = r.frames.filter((f) => f.action === 'call').length;
  const pops = r.frames.filter((f) => f.action === 'return' || f.action === 'result').length;
  assert.equal(pushes, pops);
});

test('나누기 프레임에서 행은 묶음들에 빠짐없이 한 번씩 들어 있다', () => {
  for (const f of dtree.run().frames.filter((fr) => fr.action === 'split')) {
    const all = f.ds.groups.bins.flatMap((b) => b.rows);
    assert.deepEqual(all.slice().sort(), f.ds.rows.slice().sort());
  }
});
