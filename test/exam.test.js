import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeExam, makeMockExam, traceTables } from '../src/core/exam.js';
import { ALGORITHMS, ALGO_ORDER } from '../src/core/algorithms/index.js';

const PAGES = {
  knn: ['dist', 'sort', 'slice', 'vote'],
  kmeans: ['assign', 'mean', 'update', 'repeat'],
  linreg: ['predict', 'error', 'loss', 'grad', 'update', 'repeat'],
  dtree: ['count', 'split', 'choose', 'grow', 'finish'],
};

for (const id of ALGO_ORDER) {
  test(`${id}: 연습 문제 — 보기는 서로 다르고 정답이 하나, 장면 보기는 실제 프레임`, () => {
    for (let seed = 0; seed < 25; seed += 1) {
      const ex = makeExam(id, seed);
      assert.ok(ex.questions.length >= 4, `${id} seed ${seed}: ${ex.questions.length}`);
      assert.ok(ex.questions.some((q) => q.kind === 'order'), '순서를 묻는 문제가 있어야 한다');
      const run = ALGORITHMS[id].run(ex.params);
      for (const q of ex.questions) {
        assert.equal(new Set(q.options).size, q.options.length, q.q);
        assert.ok(q.options.length >= 2, q.q);
        assert.ok(q.answer >= 0 && q.answer < q.options.length, q.q);
        assert.ok(PAGES[id].includes(q.jump.page), q.jump.page);
        assert.ok(q.jump.frame >= 0 && q.jump.frame < run.frames.length, `${q.q} → ${q.jump.frame}`);
        assert.ok(!/python|파이썬|def |\[:/.test(q.q), '문제에 파이썬 코드가 없어야 한다');
      }
    }
  });
}

test('같은 씨앗이면 같은 문제', () => {
  assert.deepEqual(makeExam('knn', 3), makeExam('knn', 3));
});

test('기본 조건 정답이 손 계산과 같다', () => {
  const find = (ex, s) => ex.questions.find((q) => q.q.includes(s));
  const lr = makeExam('linreg', 0, 99);
  const q = find(lr, '첫 에폭의 손실');
  assert.equal(q.options[q.answer], '35');
  const w = find(lr, '갱신 뒤 w');
  assert.equal(w.options[w.answer], '1.96');
  const km = makeExam('kmeans', 0, 99);
  const conv = find(km, '멈추는가');
  assert.equal(conv.options[conv.answer], '3회차');
  const moved = find(km, '옮겨 가는 집');
  assert.equal(moved.options[moved.answer], '집1');
  const dt = makeExam('dtree', 0, 99);
  const rootQ = find(dt, '뿌리 노드의 질문');
  assert.equal(rootQ.options[rootQ.answer], '날씨');
  const second = find(dt, '두 번째로 만들어지는 질문 노드');
  assert.equal(second.options[second.answer], '습도');
  const stack = find(dt, '호출 스택');
  assert.equal(stack.options[stack.answer], '3칸');
  const knn = makeExam('knn', 0, 99);
  const votes = find(knn, 'votes 딕셔너리');
  assert.equal(votes.options[votes.answer], '{ 과일: 2, 단백질: 1 }');
});

test('추적표: 숨길 열 번호가 표 안에 있고, 줄마다 칸 수가 같다', () => {
  for (const id of ALGO_ORDER) {
    for (const t of traceTables(id, ALGORITHMS[id].run(ALGORITHMS[id].defaults))) {
      for (const h of t.hide) assert.ok(h >= 0 && h < t.columns.length, `${id} ${t.title}`);
      for (const row of t.rows) assert.equal(row.length, t.columns.length, `${id} ${t.title}`);
    }
  }
});

test('종합 모의시험: 알고리즘마다 2문제', () => {
  const m = makeMockExam(1);
  assert.equal(m.length, 8);
  for (const id of ALGO_ORDER) assert.equal(m.filter((q) => q.algo === id).length, 2);
});

test('보기는 대부분 3개 이상 (예/아니오 문제 제외)', () => {
  let few = 0; let total = 0;
  for (const id of ALGO_ORDER) {
    for (let seed = 0; seed < 25; seed += 1) {
      for (const q of makeExam(id, seed, 99).questions) { total += 1; if (q.options.length < 3) few += 1; }
    }
  }
  assert.ok(few / total < 0.1, `${few}/${total}`);
});
