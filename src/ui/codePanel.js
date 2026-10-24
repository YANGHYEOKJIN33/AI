/**
 * 코드 패널 — 왼쪽.
 *   문제 보기 쪽 : 무엇을 푸는가 · 오늘 따라갈 순서(누르면 그 쪽으로) · 시험에서 기억할 것
 *   단계 쪽      : 의사코드 — 이 쪽에서 밟는 줄만 또렷하게, 나머지는 흐리게. 지금 줄 아래에 한 문장 설명
 */
import { el, fill } from './dom.js';
import { currentStep, algoPages } from '../app/lesson.js';
import { getAlgorithm } from '../core/algorithms/index.js';
import { infoTerm } from './infoTip.js';

/** 패널 안에서만 스크롤해 지금 줄이 보이게 한다 (페이지 전체가 튀지 않게) */
function scrollWithin(box, row) {
  if (!box || !row) return;
  const b = box.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
}

export function mountCodePanel(root, store, player, views) {
  const title = el('span.panel__title', {}, '의사코드');
  const hint = el('span.panel__hint');
  const body = el('div.panel__body.codepanel');
  fill(root, el('div.panel__head', {}, title, hint), body);

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const page = currentStep(state);
    const algo = getAlgorithm(v.algoId);
    if (page.kind === 'intro') {
      title.textContent = '문제 보기';
      hint.textContent = '';
      renderIntro(v, algo, state);
    } else if (page.kind === 'step') {
      title.textContent = '의사코드';
      hint.textContent = `이 쪽에서는 ${page.lines[0]}~${page.lines[1]}줄을 밟아요`;
      renderPseudo(v, algo, page);
    }
  }

  function renderIntro(v, algo, state) {
    const info = views[v.algoId].intro;
    const steps = algoPages(v.algoId).map((p, i) => ({ ...p, index: i })).filter((p) => p.kind !== 'intro');
    fill(body,
      el('div.intro', {},
        el('div.review__tags', {},
          el('span.tag', {}, '문제 · ', infoTerm(algo.meta.task, { strong: true })),
          el('span.tag', {}, infoTerm(algo.meta.learning, { strong: true }))),
        el('p.intro__q', {}, info.question),
        el('div.intro__io', {},
          el('div', {}, el('span.intro__label', {}, '입력'), info.input),
          el('div', {}, el('span.intro__label', {}, '출력'), info.output)),
        el('h3.intro__h', {}, '🗺 오늘 따라갈 순서'),
        el('ol.intro__steps', {}, steps.map((p) => el('li', {},
          el('button.linkbtn', { type: 'button', onclick: () => store.set({ algoStep: p.index }) }, `${p.index + 1}쪽`),
          ` ${p.title}`))),
        el('h3.intro__h', {}, '📝 시험에서 기억할 것'),
        el('ul.intro__tips', {}, info.tips.map((t) => el('li', {}, t))),
      ),
    );
  }

  function renderPseudo(v, algo, page) {
    const lines = algo.pseudo(v.params);
    const active = v.frame.line;
    const [a, b] = page.lines;
    const list = el('ol.pseudo', {}, lines.map((text, i) => {
      const n = i + 1;
      const on = n === active;
      const inPage = n >= a && n <= b;
      return el(`li.pseudo__row${on ? '.is-on' : ''}${inPage ? '' : '.is-off'}`, { 'data-line': n },
        el('span.pseudo__no', {}, String(n)),
        el('code.pseudo__code', {}, text),
        on ? el('div.pseudo__note', {}, algo.notes[i]) : null,
      );
    }));
    fill(body, el('div.pseudowrap', {}, list));
    scrollWithin(body, list.querySelector('.is-on'));
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
