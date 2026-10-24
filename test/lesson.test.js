import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOLS, WRAP, algoPages, ALGO_TABS, currentLesson, continuation, pageWindow } from '../src/app/lesson.js';
import { ALGORITHMS } from '../src/core/algorithms/index.js';
import { ALGO_ORDER } from '../src/core/algorithms/index.js';

const ROOMS = ['map', 'table', 'distance', 'sort', 'dict', 'group', 'update', 'summary', 'mock', 'quiz'];

test('쪽마다 제목·배울 것·해 볼 것이 있다', () => {
  const pages = [...TOOLS, ...WRAP, ...ALGO_ORDER.flatMap((id) => algoPages(id))];
  for (const p of pages) {
    assert.ok(p.title && p.goal && p.todo, p.id);
    assert.ok(p.goal.length > 30, `${p.id} 배울 것이 너무 짧다`);
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
    for (const params of [algo.defaults]) {
      const frames = algo.run(params).frames;
      const steps = algoPages(id).filter((p) => p.kind === 'step');
      const covered = new Set();
      for (const p of steps) {
        const [lo, hi] = pageWindow(p, frames);
        for (let i = lo; i <= hi; i += 1) {
          assert.ok(p.window(frames[i], i, frames), `${id}/${p.id} 장면 ${i}가 범위 안에서 끊김`);
          covered.add(i);
        }
        assert.ok(frames.slice(lo, hi + 1).some((f) => f.line >= p.lines[0] && f.line <= p.lines[1]));
      }
      assert.equal(covered.size, frames.length, `${id}: 어느 쪽에도 속하지 않는 장면이 있다`);
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
