import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDeck, toHash, fromHash, flatIndex, totalBeats } from '../src/deck/engine.js';

const scenes = [{ id: 'a', beats: 2 }, { id: 'b', beats: 1 }, { id: 'c', beats: 3 }];

test('한 박자씩 앞으로 — 장면 끝에서 다음 장면의 처음으로', () => {
  const d = createDeck(scenes);
  const seen = [];
  for (let i = 0; i < 7; i += 1) { const p = d.pos(); seen.push(`${p.id}${p.beat}`); d.next(); }
  assert.deepEqual(seen, ['a0', 'a1', 'b0', 'c0', 'c1', 'c2', 'c2']);
  assert.ok(d.pos().atEnd);
});

test('한 박자씩 뒤로 — 장면 처음에서 앞 장면의 마지막 모습으로', () => {
  const d = createDeck(scenes, { scene: 2, beat: 0 });
  d.prev(); assert.deepEqual([d.pos().id, d.pos().beat], ['b', 0]);
  d.prev(); assert.deepEqual([d.pos().id, d.pos().beat], ['a', 1]);
  d.prev(); d.prev(); assert.ok(d.pos().atStart);
});

test('장면 건너뛰기와 번호로 가기', () => {
  const d = createDeck(scenes);
  d.nextScene(); assert.equal(d.pos().id, 'b');
  d.goTo(2, 'last'); assert.deepEqual([d.pos().id, d.pos().beat], ['c', 2]);
  d.prevScene(); assert.deepEqual([d.pos().id, d.pos().beat], ['c', 0]);
  d.goTo(99); assert.equal(d.pos().id, 'c');
});

test('주소(#장면.박자)로 오가기 — 이상한 주소는 무시', () => {
  assert.equal(toHash({ scene: 0, beat: 0 }), '#1');
  assert.equal(toHash({ scene: 2, beat: 1 }), '#3.2');
  assert.deepEqual(fromHash('#3.2', scenes), { scene: 2, beat: 1 });
  assert.deepEqual(fromHash('#3.9', scenes), { scene: 2, beat: 2 });
  assert.equal(fromHash('#9', scenes), null);
  assert.equal(fromHash('#x', scenes), null);
});

test('진행 막대용 박자 번호', () => {
  assert.equal(totalBeats(scenes), 6);
  assert.equal(flatIndex(scenes, { scene: 2, beat: 1 }), 4);
});

test('구독자는 바뀔 때만 불린다', () => {
  const d = createDeck(scenes);
  let n = 0; d.subscribe(() => { n += 1; });
  d.prev(); d.next(); d.next(); d.next();
  assert.equal(n, 3);
});
