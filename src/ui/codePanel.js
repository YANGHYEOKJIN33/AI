/**
 * 코드 패널 — 왼쪽.
 *   문제 보기 쪽 : 무엇을 푸는가 · 오늘 따라갈 순서(누르면 그 쪽으로) · 시험에서 기억할 것
 *   단계 쪽      : 이 쪽의 의사코드 줄만 + 그 줄의 계산(계산 상자). "전체 보기"를 누르면 나머지 줄도 흐리게.
 *                  실행 전 모습에서는 다음에 실행할 줄에 ▶ 표시.
 */
import { el, fill } from './dom.js';
import { currentStep, algoPages } from '../app/lesson.js';
import { getAlgorithm } from '../core/algorithms/index.js';
import { infoTerm } from './infoTip.js';

/** 패널 안에서만 스크롤해 지금 줄과 계산이 보이게 한다 (페이지 전체가 튀지 않게) */
function scrollWithin(box, target) {
  if (!box || !target) return;
  const b = box.getBoundingClientRect();
  const r = target.getBoundingClientRect();
  if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
}

export function mountCodePanel(root, store, player, views) {
  const title = el('span.panel__title', {}, '의사코드');
  let showAll = false;
  const allBtn = el('button.linkbtn.panel__toggle', { type: 'button', onclick: () => { showAll = !showAll; draw(); } });
  const body = el('div.panel__body.codepanel');
  fill(root, el('div.panel__head', {}, title, el('span.topbar__spacer'), allBtn), body);

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const page = currentStep(state);
    const algo = getAlgorithm(v.algoId);
    if (page.kind === 'intro') {
      title.textContent = '문제 보기';
      allBtn.hidden = true;
      renderIntro(v, algo);
    } else if (page.kind === 'step') {
      title.textContent = '의사코드';
      allBtn.hidden = false;
      allBtn.textContent = showAll ? '이 쪽 줄만' : '전체 보기';
      renderPseudo(v, algo, page);
    }
  }

  function renderIntro(v, algo) {
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
        el('h3.intro__h', {}, '📝 시험에서 기억할 것'),
        el('ul.intro__tips', {}, info.tips.map((t) => el('li', {}, t))),
        el('h3.intro__h', {}, '🗺 순서'),
        el('div.intro__steps', {}, steps.map((p) => el('button.pill.intro__step', {
          type: 'button', onclick: () => store.set({ algoStep: p.index }),
        }, `${p.index + 1}. ${p.title}`))),
      ),
    );
  }

  function renderPseudo(v, algo, page) {
    const lines = algo.pseudo(v.params);
    const [a, b] = page.lines;
    const active = v.frame.line;
    const nextLine = v.ready ? v.next?.line : null;
    const shownAt = (n) => showAll || (n >= a && n <= b);
    // 보이는 줄들의 공통 들여쓰기는 걷어 낸다 (중첩 관계는 그대로)
    const indent = Math.min(...lines.map((t, i) => (shownAt(i + 1) ? t.match(/^ */)[0].length : Infinity)));
    const rows = [];
    lines.forEach((text, i) => {
      const n = i + 1;
      const inPage = n >= a && n <= b;
      if (!inPage && !showAll) return;
      const on = n === active;
      const isNext = n === nextLine;
      rows.push(el(`li.pseudo__row${on ? '.is-on' : ''}${isNext ? '.is-next' : ''}${inPage ? '' : '.is-off'}`, { 'data-line': n },
        el('span.pseudo__no', {}, String(n)),
        el('code.pseudo__code', {}, text.slice(indent)),
        isNext ? el('span.pseudo__badge', {}, '▶ 다음에 실행') : null,
      ));
    });

    // 이 줄의 계산 — 줄 바로 아래에 둔다 (줄 ↔ 계산을 한눈에)
    const calc = v.frame.calc;
    let calcBox = null;
    if (calc && !v.ready) {
      calcBox = el('div.calc.calc--flash', { 'aria-live': 'polite' },
        el('div.calc__title', {}, calc.title),
        el('div.calc__rows', {}, calc.rows.map((r) => el('div.calc__row', {}, r))));
    }
    const long = rows.length > 6;   // 재귀 쪽처럼 줄이 많으면 글자를 한 단계 줄인다
    fill(body, el('div.pseudowrap', {}, el(`ol.pseudo${long ? '.pseudo--long' : ''}`, {}, rows), calcBox));
    const on = body.querySelector('.pseudo__row.is-on, .pseudo__row.is-next');
    scrollWithin(body, calcBox ?? on);
    scrollWithin(body, on);
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
