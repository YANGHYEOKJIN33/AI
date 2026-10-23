import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { TOOLS, WRAP, algoPages, ALGO_TABS, currentLesson, continuation } from '../src/app/lesson.js';
import { ALGO_ORDER } from '../src/core/algorithms/index.js';

const ROOMS = ['map', 'table', 'distance', 'sort', 'dict', 'group', 'update', 'summary', 'quiz'];

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

test('알고리즘마다 같은 3쪽(복습·의사코드·파이썬)', () => {
  assert.deepEqual(ALGO_TABS.map((t) => t.id), ALGO_ORDER);
  for (const id of ALGO_ORDER) assert.deepEqual(algoPages(id).map((p) => p.id), ['review', 'pseudo', 'python']);
});

test('마지막 쪽의 [다음]은 도구 → 알고리즘 넷 → 정리로 이어진다', () => {
  let state = { mode: 'tools', toolsStep: TOOLS.length - 1, algoTab: 'knn', algoStep: 0, wrapStep: 0 };
  const visited = [];
  for (let i = 0; i < 6; i += 1) {
    const cont = continuation(state);
    if (!cont) break;
    state = { ...state, ...cont.patch };
    visited.push(state.mode === 'algo' ? state.algoTab : state.mode);
    if (state.mode === 'algo') state.algoStep = 2;
  }
  assert.deepEqual(visited, ['knn', 'kmeans', 'linreg', 'dtree', 'wrap']);
  assert.equal(continuation({ mode: 'wrap', wrapStep: 1 }), null);
});

test('저장된 쪽 번호가 범위를 넘어도 안전하다', () => {
  assert.equal(currentLesson({ mode: 'tools', toolsStep: 99 }).index, TOOLS.length - 1);
  assert.equal(currentLesson({ mode: 'algo', algoTab: 'dtree', algoStep: -3 }).index, 0);
});
