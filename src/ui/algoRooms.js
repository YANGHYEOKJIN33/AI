/**
 * 알고리즘 탭의 마지막 두 쪽 — 시험 대비.
 *   추적표   : 시험지에 그리는 표. 답 칸은 "?"로 가려 두고 눌러서 확인한다. 조건을 바꾸면 다시 계산.
 *   연습 문제 : 한 번에 한 문제씩(시선 집중). 고르면 바로 채점, "그 장면 보기"로 정답 장면으로 간다.
 */
import { el, fill } from './dom.js';
import { getAlgorithm, normalizeParams, withKnob } from '../core/algorithms/index.js';
import { traceTables, makeExam, makeMockExam } from '../core/exam.js';
import { ALGO_ICON } from './topbar.js';

/* ───────────────────────── 추적표 ───────────────────────── */

export function createTraceRoom({ store, algoId }) {
  const root = el('div.troom.troom--trace');
  const algo = getAlgorithm(algoId);
  let shown = new Set();     // 펼친 칸 "표:줄:열"
  let all = false;
  let lastKey = '';

  function render() {
    const params = normalizeParams(algoId, store.get().params[algoId]);
    const key = JSON.stringify(params);
    if (key !== lastKey) { lastKey = key; shown = new Set(); all = false; }
    const tables = traceTables(algoId, algo.run(params));

    const knobs = el('div.troom__controls', {},
      el('span.troom__label', {}, '조건'),
      algo.knobs.map((k) => el('label.troom__select', {}, `${k.label} `,
        el('select', {
          'aria-label': k.label,
          onchange: (e) => { store.setParams(algoId, withKnob(algoId, params, k.key, e.target.value)); render(); },
        }, k.options.map((o) => el('option', { value: o.id, selected: algo.knobValue(params, k.key) === o.id }, o.label))))),
      el('span.topbar__spacer'),
      el('button.pill', { type: 'button', onclick: () => { all = !all; shown = new Set(); render(); } }, all ? '🙈 답 가리기' : '👀 답 모두 보기'));

    fill(root,
      el('div.troom__head', {},
        el('span.troom__icon', { 'aria-hidden': 'true' }, '🧾'),
        el('div.troom__titles', {},
          el('h3.troom__title', {}, `${algo.meta.name} 추적표`),
          el('p.troom__rule', {}, '"?" 칸은 먼저 종이에 계산해 보고 눌러서 확인하세요. 시험에서 이 표를 직접 채워요.'))),
      knobs,
      tables.map((t, ti) => el('section.ttable', {},
        el('h4.ttable__title', {}, t.title),
        t.note ? el('p.ttable__note', {}, t.note) : null,
        el('div.matrixwrap', {},
          el('table.matrix.matrix--trace', {},
            el('thead', {}, el('tr', {}, t.columns.map((c) => el('th', {}, c)))),
            el('tbody', {}, t.rows.map((row, ri) => el('tr', {}, row.map((cell, ci) => {
              const hidden = t.hide.includes(ci) && cell !== '' && !all && !shown.has(`${ti}:${ri}:${ci}`);
              if (!hidden) return el(`td${t.hide.includes(ci) && cell !== '' ? '.is-answer' : ''}`, {}, cell);
              return el('td', {}, el('button.reveal', {
                type: 'button', title: '눌러서 확인',
                onclick: () => { shown.add(`${ti}:${ri}:${ci}`); render(); },
              }, '?'));
            })))))))),
    );
  }

  return { node: root, render };
}

/* ───────────────────────── 연습 문제 ───────────────────────── */

/**
 * 한 문제씩 푸는 틀 — 알고리즘별 연습과 ✅ 종합 모의시험이 함께 쓴다.
 * @param make(seed) → { title, sub, questions: [{ q, options, answer, why, jump, algo?, params?, condition? }] }
 */
function createQuizRunner({ make, jump, defaultAlgo = null }) {
  const root = el('div.troom.troom--exam');
  let seed = 0;
  let set = null;
  let at = 0;
  let picks = [];

  function load() { set = make(seed); at = 0; picks = set.questions.map(() => null); }

  function render() {
    if (!set) load();
    const qs = set.questions;
    const done = picks.filter((p) => p !== null).length;
    const right = picks.filter((p, i) => p !== null && p === qs[i].answer).length;
    const q = qs[at];
    const pick = picks[at];
    const finished = done === qs.length;

    const dots = el('div.examdots', {}, qs.map((_, i) => el(`button.examdot${i === at ? '.is-on' : ''}${picks[i] === null ? '' : picks[i] === qs[i].answer ? '.is-ok' : '.is-no'}`, {
      type: 'button', 'aria-label': `${i + 1}번 문제`, onclick: () => { at = i; render(); },
    }, String(i + 1))));

    const card = el('div.examcard', {},
      el('div.examcard__no', {},
        q.algo ? `${ALGO_ICON[q.algo]} ${getAlgorithm(q.algo).meta.name} · ` : '',
        `${at + 1}번 / ${qs.length}`,
        q.condition ? el('span.examcard__cond', {}, ` (${q.condition})`) : null),
      el('p.examcard__q', {}, q.q),
      el('div.examcard__opts', {}, q.options.map((o, j) => {
        const cls = pick === null ? '' : j === q.answer ? '.quiz__opt--ok' : j === pick ? '.quiz__opt--no' : '';
        return el(`button.pill.quiz__opt.examopt${cls}`, {
          type: 'button', disabled: pick !== null, onclick: () => { picks[at] = j; render(); },
        }, `${'①②③④⑤'[j]} ${o}`);
      })),
      pick === null ? null : el(`div.examcard__why${pick === q.answer ? '.is-ok' : '.is-no'}`, {},
        el('strong', {}, pick === q.answer ? '✓ 맞았어요! ' : `✗ 정답은 ${'①②③④⑤'[q.answer]} ${q.options[q.answer]} `),
        el('span', {}, q.why)),
      el('div.examcard__nav', {},
        el('button.pill', { type: 'button', disabled: at === 0, onclick: () => { at -= 1; render(); } }, '← 이전 문제'),
        pick === null ? null : el('button.pill', {
          type: 'button',
          onclick: () => jump(q.algo ?? defaultAlgo, q.jump.page, q.jump.frame, q.params ?? set.params),
        }, '🔎 그 장면 보기'),
        el('span.topbar__spacer'),
        el('button.pill.ctrl--primary', { type: 'button', disabled: at === qs.length - 1, onclick: () => { at += 1; render(); } }, '다음 문제 →')),
    );

    fill(root,
      el('div.troom__head', {},
        el('span.troom__icon', { 'aria-hidden': 'true' }, '📝'),
        el('div.troom__titles', {},
          el('h3.troom__title', {}, set.title),
          el('p.troom__rule', {}, set.sub)),
        el('span.topbar__spacer'),
        el('div.examscore', {}, `푼 문제 ${done} / ${qs.length} · 맞힌 개수 ${right}`)),
      el('div.troom__controls', {},
        dots,
        el('span.topbar__spacer'),
        el('button.pill', { type: 'button', onclick: () => { picks = qs.map(() => null); at = 0; render(); } }, '↺ 다시 풀기'),
        el('button.pill', { type: 'button', onclick: () => { seed += 1; load(); render(); } }, '🎲 새 문제')),
      card,
      finished ? el(`div.troom__msg${right === qs.length ? '.troom__msg--ok' : ''}`, {},
        right === qs.length ? `🎉 ${qs.length}문제를 모두 맞혔어요! "🎲 새 문제"로 조건을 바꿔 한 번 더 해 보세요.`
          : `${qs.length}문제 중 ${right}개 맞혔어요. 틀린 문제의 "🔎 그 장면 보기"로 그 순간을 다시 밟아 보세요.`) : null,
    );
  }

  return { node: root, render };
}

export function createExamRoom({ algoId, jump }) {
  const algo = getAlgorithm(algoId);
  return createQuizRunner({
    jump,
    defaultAlgo: algoId,
    make: (seed) => {
      const ex = makeExam(algoId, seed);
      return {
        ...ex,
        title: `${algo.meta.name} — 시험 대비 연습`,
        sub: `조건: ${ex.condition}${seed === 0 ? ' (수업 예제)' : ''} · 파이썬 코드는 묻지 않아요. 종이에 풀고 답을 고르세요.`,
      };
    },
  });
}

export function createMockExamRoom({ jump }) {
  return createQuizRunner({
    jump,
    make: (seed) => ({
      title: '종합 모의시험',
      sub: '네 알고리즘에서 2문제씩, 조건을 바꾼 새 문제예요. 문제마다 조건이 괄호 안에 적혀 있어요.',
      questions: makeMockExam(seed),
    }),
  });
}

