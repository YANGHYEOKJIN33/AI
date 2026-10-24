/**
 * 방(room) — 화면 전체를 쓰는 쪽: 📦 도구, 알고리즘의 추적표·연습 문제, ✅ 정리.
 * 방마다 한 번만 만들어 두고(조작한 상태 유지) 쪽이 바뀌면 갈아 끼운다.
 */
import { fill } from './dom.js';
import { currentStep } from '../app/lesson.js';
import { createGuideRoom } from './tools/guideRoom.js';
import { createTableRoom } from './tools/tableRoom.js';
import { createDistanceRoom } from './tools/distanceRoom.js';
import { createSortRoom } from './tools/sortRoom.js';
import { createDictRoom } from './tools/dictRoom.js';
import { createGroupRoom } from './tools/groupRoom.js';
import { createUpdateRoom } from './tools/updateRoom.js';
import { createSummaryRoom, createQuizRoom } from './tools/wrapRooms.js';
import { createTraceRoom, createExamRoom, createMockExamRoom } from './algoRooms.js';

const FACTORIES = {
  map: createGuideRoom,
  table: createTableRoom,
  distance: createDistanceRoom,
  sort: createSortRoom,
  dict: createDictRoom,
  group: createGroupRoom,
  update: createUpdateRoom,
  summary: createSummaryRoom,
  quiz: createQuizRoom,
  mock: createMockExamRoom,
  trace: createTraceRoom,
  exam: createExamRoom,
};

export function mountRoom(root, store, deps = {}) {
  const rooms = {};
  let shown = null;

  store.subscribe((state) => {
    const step = currentStep(state);
    const id = state.mode === 'algo' ? (step.kind === 'trace' || step.kind === 'exam' ? step.kind : null) : step?.room;
    if (!id || !FACTORIES[id]) {
      if (shown) { rooms[shown].leave?.(); shown = null; }
      return;
    }
    const key = state.mode === 'algo' ? `${id}:${state.algoTab}` : id;
    if (key === shown) return;
    if (shown) rooms[shown].leave?.();
    if (!rooms[key]) rooms[key] = FACTORIES[id]({ store, algoId: state.algoTab, ...deps });
    shown = key;
    fill(root, rooms[key].node);
    rooms[key].render();
    root.scrollTop = 0;
  });
}
