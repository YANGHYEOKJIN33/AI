/**
 * 그림 패널 — 오른쪽 위. 산점도(또는 트리) + 범례 (+ 손실 그래프 같은 덧그림).
 * 계산은 왼쪽 의사코드 줄 바로 아래에 있다. 그림은 알고리즘마다 한 번 만들고, 장면마다 모양 목록만 넘겨 부드럽게 움직인다.
 */
import { el, fill } from './dom.js';
import { currentStep } from '../app/lesson.js';

export function mountStagePanel(root, store, player, views) {
  const title = el('span.panel__title', {}, '그림');
  const plotBox = el('div.stage__plot');
  const legendBox = el('div.stage__legend');
  const extraBox = el('div.stage__extra');

  fill(root,
    el('div.panel__head', {}, title),
    el('div.panel__body.stage', {},
      plotBox,
      el('div.stage__side', {}, legendBox, extraBox)),
  );

  let plot = null;
  let plotFor = null;

  function ctx() {
    const state = store.get();
    const step = currentStep(state);
    return { store, player, state, page: step?.id, kind: step?.kind, refreshPlot };
  }

  /** 그림만 다시 그린다 — 써 보기 슬라이더처럼 옆 칸을 갈아 끼우면 안 되는 조작에 쓴다 */
  function refreshPlot() {
    const v = player.view();
    if (v.empty || !plot) return;
    plot.update(views[v.algoId].shapes(v, ctx()));
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
    plot.update(view.shapes(v, c));
    fill(legendBox, view.legend ? view.legend(v, c) : null);
    fill(extraBox, view.extra ? view.extra(v, c) : null);
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
