/**
 * 자료구조 패널 — 오른쪽 아래. 이 사이트의 주인공.
 * 알고리즘의 보기(view)가 상자들을 그리고, 이 패널은 다시 그린 뒤 FLIP으로 데이터를 미끄러뜨린다.
 */
import { el, fill } from './dom.js';
import { createFlip } from './flip.js';
import { currentStep } from '../app/lesson.js';

export function mountDataPanel(root, store, player, views) {
  const hint = el('span.panel__hint', {}, '의사코드 한 줄이 바꾼 상자가 빛나요 · 데이터는 상자 사이를 이동해요');
  const body = el('div.panel__body.dataflow');
  fill(root,
    el('div.panel__head', {}, el('span.panel__title', {}, '자료구조'), hint),
    body,
  );
  const flip = createFlip();
  let lastSig = '';

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const page = currentStep(state)?.id;
    const sig = `${v.algoId}|${v.loadSeq}|${page}`;
    const reset = sig !== lastSig;
    lastSig = sig;
    fill(body, views[v.algoId].data(v, { store, player, state, page }));
    flip(body, { reset });
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
