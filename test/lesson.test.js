import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOLS, WRAP, algoPages, ALGO_TABS, currentLesson, continuation, pageWindow, pageOfFrame } from '../src/app/lesson.js';
import { makeExam } from '../src/core/exam.js';
import { CONNECTIONS } from '../src/ui/tools/connections.js';
import { ALGORITHMS } from '../src/core/algorithms/index.js';
import { ALGO_ORDER } from '../src/core/algorithms/index.js';

/** 조건 조합 전부 (knobs의 곱) */
function allParams(id) {
  const algo = ALGORITHMS[id];
  let combos = [{ ...algo.defaults }];
  for (const knob of algo.knobs ?? []) {
    combos = combos.flatMap((c) => knob.options.map((o) => ({ ...c, ...o.patch })));
  }
  return combos.map((c) => algo.normalize(c));
}

const ROOMS = ['map', 'table', 'distance', 'sort', 'dict', 'group', 'update', 'summary', 'mock', 'quiz'];

test('쪽마다 제목·배울 것이 있고, 알고리즘 단계 쪽은 한 문장으로 짧다', () => {
  const pages = [...TOOLS, ...WRAP, ...ALGO_ORDER.flatMap((id) => algoPages(id))];
  for (const p of pages) {
    assert.ok(p.title && p.goal, p.id);
    if (p.kind === 'step') {
      assert.ok(p.goal.length <= 50, `${p.id} 단계 쪽 설명은 짧게: ${p.goal.length}자`);
      assert.ok(!p.todo, `${p.id} 단계 쪽에는 할 일 문단을 두지 않는다`);
    } else {
      assert.ok(p.todo, p.id);
      assert.ok(p.goal.length > 30, `${p.id} 배울 것이 너무 짧다`);
    }
  }
});

test('도구·정리 쪽의 방은 모두 만들어져 있다', () => {
  const roomFile = readFileSync(new URL('../src/ui/room.js', import.meta.url), 'utf8');
  for (const p of [...TOOLS, ...WRAP]) {
    assert.ok(ROOMS.includes(p.room), p.room);
    assert.ok(roomFile.includes(`${p.room}:`), `room.js에 ${p.room}이 없다`);
  }
});

test('알고리즘 쪽: 문제 보기 → 단계 쪽들 → 추적표 → 시험 대비 연습', () => {
  assert.deepEqual(ALGO_TABS.map((t) => t.id), ALGO_ORDER);
  for (const id of ALGO_ORDER) {
    const kinds = algoPages(id).map((p) => p.kind);
    assert.equal(kinds[0], 'intro');
    assert.deepEqual(kinds.slice(-2), ['trace', 'exam']);
    assert.ok(kinds.filter((k) => k === 'step').length >= 2);
    assert.ok(!algoPages(id).some((p) => /python|파이썬/i.test(`${p.id} ${p.title}`)), '파이썬 쪽은 없다');
  }
});

test('단계 쪽의 장면 범위는 이어진 구간이고, 단계 쪽들이 처음부터 끝까지 빈틈없이 덮는다', () => {
  for (const id of ALGO_ORDER) {
    const algo = ALGORITHMS[id];
    for (const params of allParams(id)) {
      const frames = algo.run(params).frames;
      const steps = algoPages(id).filter((p) => p.kind === 'step');
      const covered = new Set();
      steps.forEach((p, k) => {
        const [lo, hi, ready] = pageWindow(p, frames);
        // 첫 단계 쪽이 아니면 "실행 전 모습"(바로 앞 장면)에서 시작한다
        assert.equal(ready, k > 0, `${id}/${p.id} 실행 전 모습`);
        const own = ready ? lo + 1 : lo;
        assert.ok(own <= hi, `${id}/${p.id} 장면이 없다 ${JSON.stringify(params)}`);
        for (let i = own; i <= hi; i += 1) {
          assert.ok(p.window(frames[i], i, frames), `${id}/${p.id} 장면 ${i}가 범위 안에서 끊김`);
          assert.ok(!covered.has(i), `${id}/${p.id} 장면 ${i}가 두 쪽에 겹침`);
          covered.add(i);
        }
        assert.ok(frames.slice(own, hi + 1).some((f) => f.line >= p.lines[0] && f.line <= p.lines[1]), `${id}/${p.id} 줄`);
      });
      assert.equal(covered.size, frames.length, `${id}: 어느 쪽에도 속하지 않는 장면이 있다`);
    }
  }
});

test('연습 문제의 "그 장면 보기"는 이름을 준 쪽 안의 장면으로 간다', () => {
  for (const id of ALGO_ORDER) {
    for (let seed = 0; seed < 25; seed += 1) {
      const ex = makeExam(id, seed, 99);
      const frames = ALGORITHMS[id].run(ex.params).frames;
      for (const q of ex.questions) {
        assert.equal(pageOfFrame(id, frames, q.jump.frame, q.jump.page), q.jump.page, `${id} seed ${seed}: ${q.q}`);
      }
    }
  }
});

test('도구 쪽의 "그 장면 보러 가기" 카드는 그 쪽에 그 동작이 있다', () => {
  for (const cards of Object.values(CONNECTIONS)) {
    for (const c of cards) {
      const page = algoPages(c.algo).find((p) => p.id === c.page);
      assert.ok(page && page.kind === 'step', `${c.algo}/${c.page}`);
      const frames = ALGORITHMS[c.algo].run(ALGORITHMS[c.algo].defaults).frames;
      const [lo, hi, ready] = pageWindow(page, frames);
      assert.ok(frames.slice(ready ? lo + 1 : lo, hi + 1).some((f) => f.action === c.action), `${c.algo}/${c.page}/${c.action}`);
    }
  }
});

test('마지막 쪽의 [다음]은 도구 → 알고리즘 넷 → 정리로 이어진다', () => {
  let state = { mode: 'tools', toolsStep: TOOLS.length - 1, algoTab: 'knn', algoStep: 0, wrapStep: 0 };
  const visited = [];
  for (let i = 0; i < 6; i += 1) {
    const cont = continuation(state);
    if (!cont) break;
    state = { ...state, ...cont.patch };
    visited.push(state.mode === 'algo' ? state.algoTab : state.mode);
    if (state.mode === 'algo') state.algoStep = algoPages(state.algoTab).length - 1;
  }
  assert.deepEqual(visited, ['knn', 'kmeans', 'linreg', 'dtree', 'wrap']);
  assert.equal(continuation({ mode: 'wrap', wrapStep: 1 }), null);
});

test('저장된 쪽 번호가 범위를 넘어도 안전하다', () => {
  assert.equal(currentLesson({ mode: 'tools', toolsStep: 99 }).index, TOOLS.length - 1);
  assert.equal(currentLesson({ mode: 'algo', algoTab: 'dtree', algoStep: -3 }).index, 0);
});
