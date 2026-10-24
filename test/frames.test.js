import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALGORITHMS, normalizeParams, withKnob, conditionText } from '../src/core/algorithms/index.js';
import { nextIterIndex } from '../src/core/trace.js';
import { _test } from '../src/core/exam.js';

const KNOWN_ACTIONS = new Set([
  'new', 'loop', 'measure', 'append', 'sort', 'slice', 'count', 'result',
  'init', 'reset', 'nearest', 'assign', 'mean', 'check', 'converged', 'update',
  'predict', 'error', 'loss', 'gradient', 'record', 'diverge',
  'call', 'leaf', 'split', 'score', 'choose', 'node', 'branch', 'return',
]);

for (const [id, algo] of Object.entries(ALGORITHMS)) {
  test(`${id}: 의사코드와 줄 설명의 줄 수가 같고, 파이썬은 없다`, () => {
    for (const params of _test.allParams(id)) assert.equal(algo.notes.length, algo.pseudo(params).length);
    assert.equal(algo.python, undefined);
  });

  test(`${id}: 모든 조건에서 프레임이 올바른 모양이다`, () => {
    for (const params of _test.allParams(id)) {
      const r = algo.run(params);
      const n = algo.pseudo(params).length;
      for (const f of r.frames) {
        assert.ok(Number.isInteger(f.line) && f.line >= 1 && f.line <= n, `${id} line ${f.line}`);
        assert.ok(KNOWN_ACTIONS.has(f.action), `${id} action ${f.action}`);
        assert.equal(typeof f.narration, 'string');
        assert.ok(f.phase >= 0 && f.phase < algo.meta.phases.length);
        if (f.ask) assert.ok(f.ask.answer >= 0 && f.ask.answer < f.ask.options.length);
      }
      for (let i = 1; i < r.frames.length; i += 1) assert.ok(r.frames[i].iter >= r.frames[i - 1].iter);
      assert.deepEqual(normalizeParams(id, r.params), r.params);
    }
  });

  test(`${id}: 조건 바꾸기와 조건 글`, () => {
    const p = normalizeParams(id, { start: 'zzz', k: 99, lr: 7, criterion: 'x' });
    assert.deepEqual(p, normalizeParams(id, algo.defaults));
    for (const knob of algo.knobs) {
      for (const opt of knob.options) {
        const q = withKnob(id, algo.defaults, knob.key, opt.id);
        assert.equal(algo.knobValue(q, knob.key), opt.id);
      }
    }
    assert.ok(conditionText(id, algo.defaults).length > 3);
  });
}

test('nextIterIndex: 다음 반복의 첫 프레임으로 간다', () => {
  const frames = [{ iter: 0 }, { iter: 1 }, { iter: 1 }, { iter: 2 }, { iter: 2 }];
  assert.equal(nextIterIndex(frames, 0), 1);
  assert.equal(nextIterIndex(frames, 1), 3);
  assert.equal(nextIterIndex(frames, 3), 4);
});
