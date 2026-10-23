import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, normalizeParams } from '../src/core/algorithms/index.js';
import { nextIterIndex } from '../src/core/trace.js';

const KNOWN_ACTIONS = new Set([
  'new', 'loop', 'measure', 'append', 'sort', 'slice', 'count', 'result',
  'init', 'reset', 'nearest', 'assign', 'mean', 'check', 'converged', 'update',
  'predict', 'error', 'loss', 'gradient', 'record', 'diverge',
  'call', 'leaf', 'split', 'score', 'choose', 'node', 'branch', 'return',
]);

for (const [id, algo] of Object.entries(ALGORITHMS)) {
  test(`${id}: 의사코드·파이썬·설명의 줄 수가 같다`, () => {
    for (const opt of algo.swap.options) {
      const n = algo.pseudo(opt.params).length;
      assert.equal(algo.python(opt.params).length, n);
      assert.equal(algo.notes.length, n);
      assert.ok(algo.coreLine >= 0 && algo.coreLine < n);
    }
  });

  test(`${id}: 모든 프레임이 올바른 모양이다`, () => {
    for (const opt of algo.swap.options) {
      const r = algo.run(opt.params);
      const n = algo.pseudo(opt.params).length;
      assert.ok(r.frames.length > 5);
      for (const f of r.frames) {
        assert.ok(Number.isInteger(f.line) && f.line >= 1 && f.line <= n, `${id} line ${f.line}`);
        assert.ok(KNOWN_ACTIONS.has(f.action), `${id} action ${f.action}`);
        assert.equal(typeof f.narration, 'string');
        assert.ok(f.phase >= 0 && f.phase < algo.meta.phases.length);
        for (const e of f.effects) assert.equal(typeof e.target, 'string');
        if (f.ask) {
          assert.ok(f.ask.options.length >= 2);
          assert.ok(f.ask.answer >= 0 && f.ask.answer < f.ask.options.length);
          assert.equal(typeof f.ask.why, 'string');
        }
        if (f.calc) assert.ok(Array.isArray(f.calc.rows));
      }
      // 반복 번호는 줄어들지 않는다 (다음 반복 단추)
      for (let i = 1; i < r.frames.length; i += 1) assert.ok(r.frames[i].iter >= r.frames[i - 1].iter);
      assert.equal(algo.swapIdOf(r.params), opt.id);
    }
  });

  test(`${id}: 깨진 저장값은 기본값으로 메운다`, () => {
    const p = normalizeParams(id, { variant: 'zzz', k: 99, lr: 7 });
    assert.ok(algo.swap.options.some((o) => o.id === algo.swapIdOf(p)));
  });
}

test('nextIterIndex: 다음 반복의 첫 프레임으로 간다', () => {
  const frames = [{ iter: 0 }, { iter: 1 }, { iter: 1 }, { iter: 2 }, { iter: 2 }];
  assert.equal(nextIterIndex(frames, 0), 1);
  assert.equal(nextIterIndex(frames, 1), 3);
  assert.equal(nextIterIndex(frames, 3), 4);
});
