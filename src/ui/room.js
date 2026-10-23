/**
 * 방(room) — 📦 자료구조 도구와 ✅ 정리·확인 쪽을 화면 전체로 보여 준다.
 * 방마다 한 번만 만들어 두고(조작한 상태 유지) 쪽이 바뀌면 갈아 끼운다.
 */
import { fill } from './dom.js';
import { currentStep } from '../app/lesson.js';
import { createMapRoom } from './tools/mapRoom.js';
import { createTableRoom } from './tools/tableRoom.js';
import { createDistanceRoom } from './tools/distanceRoom.js';
import { createSortRoom } from './tools/sortRoom.js';
import { createDictRoom } from './tools/dictRoom.js';
import { createGroupRoom } from './tools/groupRoom.js';
import { createUpdateRoom } from './tools/updateRoom.js';
import { createSummaryRoom, createQuizRoom } from './tools/wrapRooms.js';

const FACTORIES = {
  map: createMapRoom,
  table: createTableRoom,
  distance: createDistanceRoom,
  sort: createSortRoom,
  dict: createDictRoom,
  group: createGroupRoom,
  update: createUpdateRoom,
  summary: createSummaryRoom,
  quiz: createQuizRoom,
};

export function mountRoom(root, store, { onGlossary = () => {} } = {}) {
  const rooms = {};
  let shown = null;

  store.subscribe((state) => {
    if (state.mode === 'algo') {
      if (shown) { rooms[shown].leave?.(); shown = null; }
      return;
    }
    const id = currentStep(state)?.room;
    if (!id || !FACTORIES[id]) return;
    if (id === shown) return;
    if (shown) rooms[shown].leave?.();
    if (!rooms[id]) rooms[id] = FACTORIES[id]({ store, onGlossary });
    shown = id;
    fill(root, rooms[id].node);
    rooms[id].render();
    root.scrollTop = 0;
  });
}
