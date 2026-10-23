/**
 * 📦 자료구조 도구 방들이 함께 쓰는 틀.
 *
 *   ┌ 제목 · 한 줄 규칙 ───────────────────────────────┐
 *   │ [단추들]                                            │
 *   │ 원래 데이터  ➜  [ 연산 · 자료구조 ]  ➜  결과       │   ← 8-퍼즐 자료구조 탭처럼 왼→오 흐름
 *   │ 💬 방금 일어난 일                                   │
 *   │ 🔮 맞히기                                           │
 *   │ 🔗 이 도구를 쓰는 알고리즘                           │
 *   └────────────────────────────────────────────────────┘
 */
import { el } from '../dom.js';
import { ALGO_ICON } from '../topbar.js';
import { getAlgorithm } from '../../core/algorithms/index.js';

export function roomShell({ icon, title, rule, controls = [], body, message = null, quiz = null, links = null, cls = '' }) {
  return el(`div.troom${cls ? `.${cls}` : ''}`, {},
    el('div.troom__head', {},
      el('span.troom__icon', { 'aria-hidden': 'true' }, icon),
      el('div.troom__titles', {},
        el('h3.troom__title', {}, title),
        rule ? el('p.troom__rule', {}, rule) : null)),
    controls.length ? el('div.troom__controls', {}, controls) : null,
    el('div.troom__body', {}, body),
    message ? el(`div.troom__msg${message.tone ? `.troom__msg--${message.tone}` : ''}`, { 'aria-live': 'polite' }, message.text) : null,
    quiz,
    links,
  );
}

/** 단추 */
export function btn(label, onclick, { primary = false, disabled = false, title = null, pressed = null } = {}) {
  return el(`button.pill${primary ? '.ctrl--primary' : ''}`, {
    type: 'button', onclick, disabled, title, 'aria-pressed': pressed === null ? null : String(pressed),
  }, label);
}

/** 맞히기 — 고르면 정답과 이유를 보여 준다 */
export function quizBox(quiz, picked, onPick) {
  if (!quiz) return null;
  const done = picked !== null && picked !== undefined;
  return el('div.troom__quiz', {},
    el('div.coach__q', {}, `🔮 맞혀 보기 — ${quiz.q}`),
    el('div.coach__opts', {}, quiz.options.map((o, i) => {
      const cls = done ? (i === quiz.answer ? '.quiz__opt--ok' : (i === picked ? '.quiz__opt--no' : '')) : '';
      return el(`button.coach__opt${cls}`, { type: 'button', disabled: done, onclick: () => onPick(i) }, o);
    })),
    done ? el(`div.coach__result${picked === quiz.answer ? '.coach__result--ok' : '.coach__result--no'}`, {},
      el('span', {}, picked === quiz.answer ? '✓ 맞았어요!' : `✗ 정답은 "${quiz.options[quiz.answer]}"`),
      el('span.coach__why', {}, quiz.why)) : null,
  );
}

/** 이 도구를 쓰는 알고리즘 — 누르면 그 알고리즘의 ②쪽(의사코드)으로 */
export function algoLinks(store, items) {
  return el('div.troom__links', {},
    el('span.troom__linkcap', {}, '🔗 이 도구를 쓰는 곳'),
    items.map(([id, where]) => el('button.pill.troom__link', {
      type: 'button', onclick: () => store.set({ mode: 'algo', algoTab: id, algoStep: 1 }),
    }, `${ALGO_ICON[id]} ${getAlgorithm(id).meta.name}`, el('span.troom__where', {}, ` — ${where}`))));
}

/** 코드 한 줄(파이썬) — 지금 실행한 줄을 강조 */
export function codeLines(lines, activeIdx = -1) {
  return el('pre.troom__code', {}, lines.map((t, i) => el(`code.troom__codeline${i === activeIdx ? '.is-on' : ''}`, {}, t)));
}
