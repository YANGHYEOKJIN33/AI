/**
 * 📦 자료구조 도구 방들이 함께 쓰는 틀.
 *
 *   ┌ 아이콘 · 제목 ─────────────────────────────────────────────┐
 *   │ ┌ 🎯 미션 ─────┐ ┌ 활동 ───────────────────────────────────┐ │
 *   │ │ 1 ✓ …        │ │ [다음에 누를 단추가 반짝]                 │ │
 *   │ │ 2 ▶ 지금 할 일│ │ 원래 데이터 ➜ [ 자료구조 ] ➜ 결과        │ │
 *   │ │ 3 · …        │ │ 💬 방금 일어난 일                         │ │
 *   │ │ 🎓 배운 것   │ │ 🔮 맞혀 보기 (그 차례가 되면)              │ │
 *   │ └──────────────┘ └─────────────────────────────────────────┘ │
 *   │ 🤖 알고리즘 속에서는 — (손으로 하는 미션을 마치면 나타난다)    │
 *   └─────────────────────────────────────────────────────────────┘
 */
import { el } from '../dom.js';
import { connectView } from './mission.js';

export function missionShell({ icon, title, mission, controls = [], body, message = null, quiz = null, connect = null }) {
  return el('div.troom.troom--mission', {},
    el('div.troom__head', {},
      el('span.troom__icon', { 'aria-hidden': 'true' }, icon),
      el('h3.troom__title', {}, title)),
    el('div.mroom', {},
      mission,
      el('div.mroom__activity', {},
        controls.length ? el('div.troom__controls', {}, controls) : null,
        el('div.troom__body', {}, body),
        message ? el(`div.troom__msg${message.tone ? `.troom__msg--${message.tone}` : ''}`, { 'aria-live': 'polite' }, message.text) : null,
        quiz)),
    connect,
  );
}

/** 단추 — next면 "지금 누를 단추"로 반짝인다 */
export function btn(label, onclick, { primary = false, disabled = false, title = null, pressed = null, next = false } = {}) {
  return el(`button.pill${primary ? '.ctrl--primary' : ''}${next && !disabled ? '.is-next' : ''}`, {
    type: 'button', onclick, disabled, title, 'aria-pressed': pressed === null ? null : String(pressed),
  }, label);
}

/** 맞혀 보기 — 고르면 정답과 이유를 보여 준다 */
export function quizBox(quiz, picked, onPick, { next = false } = {}) {
  if (!quiz) return null;
  const done = picked !== null && picked !== undefined;
  return el(`div.troom__quiz${next ? '.is-next-box' : ''}`, {},
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

/** 의사코드 한두 줄 — 지금 실행한 줄을 강조 (파이썬 대신 알고리즘 쪽과 같은 의사코드) */
export function codeLines(lines, activeIdx = -1) {
  return el('pre.troom__code', {}, lines.map((t, i) => el(`code.troom__codeline${i === activeIdx ? '.is-on' : ''}`, {}, t)));
}

/**
 * 알고리즘 연결 — 손으로 하는 미션을 마치면 펼쳐지고, 그 전에는 "먼저 보기" 단추만 둔다(한 화면 정보량 줄이기).
 */
export function connectSection({ mission, cards, jump, peek, onPeek }) {
  if (mission.handsOnDone() || peek) {
    return connectView(cards, { jump, onJump: () => mission.complete('connect') });
  }
  return el('div.connect.connect--folded', {},
    el('span', {}, '🤖 이 도구가 알고리즘 속에서 어떻게 쓰이는지는 미션을 마치면 나타나요.'),
    el('button.linkbtn', { type: 'button', onclick: onPeek }, '먼저 보기'));
}
