/**
 * 자료구조 패널 — 오른쪽 아래. 이 사이트의 주인공.
 * 알고리즘의 보기(view)가 상자들을 그리고, 이 패널은 다시 그린 뒤 FLIP으로 데이터를 미끄러뜨린다.
 */
import { el, fill } from './dom.js';
import { createFlip } from './flip.js';
import { currentStep } from '../app/lesson.js';

export function mountDataPanel(root, store, player, views) {
  const body = el('div.panel__body.dataflow');
  fill(root,
    el('div.panel__head', {}, el('span.panel__title', {}, '자료구조')),
    body,
  );
  const flip = createFlip();
  let lastSig = '';

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const step = currentStep(state);
    const view = views[v.algoId];
    const sig = `${v.algoId}|${v.loadSeq}|${step.id}`;
    const reset = sig !== lastSig;
    lastSig = sig;
    // 이 쪽에 필요한 상자만 — 문제 보기 쪽은 입력 데이터 하나만
    const boxes = step.kind === 'intro' ? view.introBoxes : step.boxes;
    fill(body, view.data(v, { store, player, state, page: step.id, kind: step.kind, boxes: new Set(boxes) }));
    // 바뀐 상자가 이 쪽에 안 보이면(다른 쪽 상자만 바뀐 장면) 흐리게 하지 않는다
    if (!body.querySelector('.sbox.is-hot')) body.querySelectorAll('.sbox.is-quiet').forEach((b) => b.classList.remove('is-quiet'));
    flip(body, { reset });
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
