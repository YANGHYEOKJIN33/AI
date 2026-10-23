/**
 * 그림 패널 — 오른쪽 위. 산점도(또는 트리) + 범례 + 계산 상자(지금 이 줄의 계산).
 * 그림은 알고리즘마다 한 번 만들고, 장면마다 모양 목록만 넘겨 부드럽게 움직인다.
 */
import { el, fill } from './dom.js';
import { currentStep } from '../app/lesson.js';

export function mountStagePanel(root, store, player, views) {
  const title = el('span.panel__title', {}, '그림');
  const hint = el('span.panel__hint');
  const plotBox = el('div.stage__plot');
  const legendBox = el('div.stage__legend');
  const calcBox = el('div.calc', { 'aria-live': 'polite' });
  const extraBox = el('div.stage__extra');

  fill(root,
    el('div.panel__head', {}, title, hint),
    el('div.panel__body.stage', {},
      plotBox,
      el('div.stage__side', {}, legendBox, calcBox, extraBox)),
  );

  let plot = null;
  let plotFor = null;

  function ctx() {
    const state = store.get();
    return { store, player, state, page: currentStep(state)?.id };
  }

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const view = views[v.algoId];
    const c = ctx();
    if (plotFor !== v.algoId) {
      plot = view.createPlot(c);
      plotFor = v.algoId;
      fill(plotBox, plot.svg);
      plotBox.style.setProperty('--plot-ratio', String(view.plotRatio ?? 320 / 296));
    }
    title.textContent = view.stageTitle;
    hint.textContent = view.stageHint ?? '';
    plot.update(view.shapes(v, c));
    fill(legendBox, view.legend ? view.legend(v, c) : null);

    // 이 줄에 계산이 없으면 바로 앞 줄의 계산을 흐리게 남겨 둔다 (예: 거리를 잰 뒤 리스트에 추가할 때)
    const own = v.frame.calc;
    const calc = own ?? v.prev?.calc ?? null;
    if (calc) {
      fill(calcBox,
        el('div.calc__title', {}, calc.title, own ? null : el('span.calc__stale', {}, ' · 방금 전 줄의 계산')),
        el('div.calc__rows', {}, calc.rows.map((r) => el('div.calc__row', {}, r))));
      calcBox.classList.remove('calc--quiet');
      calcBox.classList.toggle('calc--stale', !own);
    } else {
      fill(calcBox,
        el('div.calc__title', {}, '🧾 계산 상자'),
        el('div.calc__rows', {}, el('div.calc__row.calc__row--muted', {}, '이 줄은 계산 없이 자료구조만 바꿔요 — 아래 빛나는 상자를 보세요.')));
      calcBox.classList.add('calc--quiet');
    }
    calcBox.classList.remove('calc--flash');
    void calcBox.offsetWidth;   // 다시 깜빡이게
    if (own) calcBox.classList.add('calc--flash');

    fill(extraBox, view.extra ? view.extra(v, c) : null);
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
