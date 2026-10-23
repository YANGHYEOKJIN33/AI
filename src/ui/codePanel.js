/**
 * 코드 패널 — 왼쪽. 알고리즘 쪽마다 다른 것을 보여 준다.
 *   ① review : 복습 카드 — 문제 유형, 입력→출력, 절차(지금 단계가 켜짐), 쓰는 도구, 기억할 점
 *   ② pseudo : 의사코드 — 지금 줄 강조 + 그 줄의 설명 + 바뀐 자료구조 꼬리표
 *   ③ python : 의사코드 ↔ 파이썬 나란히 + 🔑 핵심 한 줄 바꿔 보기 + 무엇이 달라졌나
 */
import { el, fill } from './dom.js';
import { currentStep, TOOLS } from '../app/lesson.js';
import { getAlgorithm, normalizeParams } from '../core/algorithms/index.js';
import { infoTerm } from './infoTip.js';

/** 도구 쪽 이름표 — 복습 카드의 "쓰는 도구" 단추 */
const TOOL_CHIPS = {
  table: '📋 표(2차원 리스트)',
  distance: '📏 거리',
  sort: '🔃 정렬·자르기',
  dict: '🗳 딕셔너리 세기',
  group: '🧺 묶음·평균',
  update: '🔁 갱신·기록',
};

/** 패널 안에서만 스크롤해 지금 줄이 보이게 한다 (페이지 전체가 튀지 않게) */
function scrollWithin(box, row) {
  if (!box || !row) return;
  const b = box.getBoundingClientRect();
  const r = row.getBoundingClientRect();
  if (r.top < b.top) box.scrollTop -= b.top - r.top + 8;
  else if (r.bottom > b.bottom) box.scrollTop += r.bottom - b.bottom + 8;
}

export function mountCodePanel(root, store, player, views) {
  const title = el('span.panel__title', {}, '코드');
  const hint = el('span.panel__hint');
  const body = el('div.panel__body.codepanel');
  fill(root, el('div.panel__head', {}, title, hint), body);

  // ③쪽 "무엇이 달라졌나" — 설정마다 한 번만 계산해 둔다
  const outcomeCache = new Map();
  function outcomeOf(algoId, params) {
    const key = `${algoId}|${JSON.stringify(params)}`;
    if (!outcomeCache.has(key)) {
      const run = getAlgorithm(algoId).run(params);
      outcomeCache.set(key, views[algoId].outcome(run));
    }
    return outcomeCache.get(key);
  }

  function draw() {
    const state = store.get();
    if (state.mode !== 'algo') return;
    const v = player.view();
    if (v.empty) return;
    const page = currentStep(state)?.id;
    const algo = getAlgorithm(v.algoId);
    if (page === 'review') {
      title.textContent = '복습 카드';
      hint.textContent = '무엇을 하는 알고리즘이었나';
      renderReview(v, algo);
    } else if (page === 'python') {
      title.textContent = '의사코드 ↔ 파이썬';
      hint.textContent = '같은 줄이 함께 켜져요';
      renderPyMap(v, algo, state);
    } else {
      title.textContent = '의사코드';
      hint.textContent = '⏭ 한 단계마다 한 줄씩';
      renderPseudo(v, algo);
    }
  }

  /* ───────────── ① 복습 카드 ───────────── */
  function renderReview(v, algo) {
    const info = views[v.algoId].reviewInfo;
    const phase = v.frame.phase;
    fill(body,
      el('div.review', {},
        el('div.review__tags', {},
          el('span.tag', {}, '문제 · ', infoTerm(algo.meta.task, { strong: true })),
          el('span.tag', {}, infoTerm(algo.meta.learning, { strong: true })),
        ),
        el('p.review__one', {}, info.one),
        el('div.review__io', {},
          el('div.review__iobox', {}, el('span.review__iolabel', {}, '입력'), info.input),
          el('span.review__ioarrow', { 'aria-hidden': 'true' }, '➜'),
          el('div.review__iobox', {}, el('span.review__iolabel', {}, '출력'), info.output)),
        el('h3.review__h', {}, '🔢 절차 — 지금 하는 단계에 불이 켜져요'),
        el('ol.phases', {}, algo.meta.phases.map((p, i) => el(`li.phase${i === phase ? '.is-on' : ''}${i < phase ? '.is-done' : ''}`, {},
          el('span.phase__no', {}, String(i + 1)),
          el('span.phase__name', {}, p),
          info.phaseDs?.[i] ? el('span.phase__ds', {}, info.phaseDs[i]) : null))),
        el('h3.review__h', {}, '🧰 쓰는 자료구조 도구 — 누르면 📦 도구 쪽으로'),
        el('div.review__tools', {}, info.tools.map((t) => el('button.pill.toolchip', {
          type: 'button',
          onclick: () => store.set({ mode: 'tools', toolsStep: TOOLS.findIndex((p) => p.id === t) }),
        }, TOOL_CHIPS[t]))),
        el('h3.review__h', {}, '💡 기억할 점'),
        el('ul.review__remember', {}, info.remember.map((r) => el('li', {}, r))),
      ),
    );
  }

  /* ───────────── ② 의사코드 한 줄씩 ───────────── */
  function renderPseudo(v, algo) {
    const lines = algo.pseudo(v.params);
    const active = v.frame.line;
    const effects = v.frame.effects;
    const list = el('ol.pseudo', {}, lines.map((text, i) => {
      const on = i + 1 === active;
      return el(`li.pseudo__row${on ? '.is-on' : ''}`, { 'data-line': i + 1 },
        el('span.pseudo__no', {}, String(i + 1)),
        el('code.pseudo__code', {}, text),
        on && effects.length ? el('span.pseudo__fx', {}, effects.map((e) => el('span.fxtag', {}, `${views[v.algoId].targetName(e.target)} · ${e.op}`))) : null,
        on ? el('div.pseudo__note', {}, algo.notes[i]) : null,
      );
    }));
    fill(body, el('div.pseudowrap', {},
      el('div.pseudo__cap', {}, `📜 ${algo.meta.name} — 의사코드`),
      list,
      el('p.pseudo__hint', {}, '파란 줄이 지금 실행 중인 줄이에요. 꼬리표는 이 줄이 바꾼 자료구조와 동작이에요.'),
    ));
    scrollWithin(body, list.querySelector('.is-on'));
  }

  /* ───────────── ③ 의사코드 ↔ 파이썬 ───────────── */
  function renderPyMap(v, algo, state) {
    const ps = algo.pseudo(v.params);
    const py = algo.python(v.params);
    const active = v.frame.line;
    const rows = ps.map((text, i) => el(`li.pymap__row${i + 1 === active ? '.is-on' : ''}${i === algo.coreLine ? '.is-core' : ''}`, {},
      el('span.pymap__no', {}, String(i + 1)),
      el('code.pymap__ps', {}, text.replace(/(\S) {2,}/g, '$1 ')),
      el('code.pymap__py', {}, py[i]),
    ));

    const current = algo.swapIdOf(v.params);
    const select = el('select.swap__select', {
      'aria-label': `핵심 한 줄 바꾸기 — ${algo.swap.label}`,
      onchange: (e) => {
        const opt = algo.swap.options.find((o) => o.id === e.target.value);
        store.setParams(v.algoId, opt.params);
      },
    }, algo.swap.options.map((o) => el('option', { value: o.id, selected: o.id === current }, o.text)));

    // 선택지마다 결과를 나란히 — "무엇이 달라졌나"
    const base = normalizeParams(v.algoId, state.params[v.algoId]);
    const outcomes = el('table.outcomes', {},
      el('thead', {}, el('tr', {}, el('th', {}, '핵심 한 줄'), el('th', {}, '결과'))),
      el('tbody', {}, algo.swap.options.map((o) => {
        const params = { ...base, ...o.params };
        return el(`tr${o.id === current ? '.is-on' : ''}`, {
          onclick: () => store.setParams(v.algoId, o.params), title: '이 줄로 바꿔 보기',
        },
          el('td', {}, el('code', {}, o.text.split('#')[1]?.trim() || o.text)),
          el('td', {}, outcomeOf(v.algoId, params)));
      })));

    fill(body, el('div.pymap', {},
      el('div.pymap__legend', {}, el('span', {}, '의사코드 (사람 말에 가까움)'), el('span', {}, '파이썬 (컴퓨터가 실행)')),
      el('ol.pymap__list', {}, rows),
      el('div.swap', {},
        el('div.swap__label', {}, `🔑 핵심 한 줄 바꿔 보기 — ${algo.swap.label}`),
        select,
        el('div.swap__why', {}, algo.coreWhy),
        outcomes,
      ),
    ));
    scrollWithin(body.querySelector('.pymap__list'), body.querySelector('.pymap__row.is-on'));
  }

  player.subscribe(draw);
  store.subscribe((s, prev) => {
    if (s.mode !== prev.mode || s.algoStep !== prev.algoStep || s.algoTab !== prev.algoTab) draw();
  });
}
