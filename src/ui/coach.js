/**
 * 예측 퀴즈 — 다음 장면에 "예측해 볼 일"이 걸려 있으면, 넘어가기 전에 먼저 묻는다.
 * (8-퍼즐 사이트의 "다음에 꺼낼 노드는?"과 같은 역할)
 *
 *  - ②·③쪽에서만, 🔮 예측 퀴즈가 켜져 있을 때만 나온다.
 *  - 강요하지 않는다: 그냥 ⏭ 한 단계를 눌러도 넘어간다.
 *  - ▶ 재생 중이면 퀴즈 앞에서 멈춰 기다린다(player.setHold).
 */
import { el, fill } from './dom.js';
import { currentStep } from '../app/lesson.js';

export function createCoach(store, player) {
  const root = el('div.coach', { hidden: true, 'aria-live': 'polite' });
  const answers = new Map();   // "실행번호:장면번호" → 고른 보기
  const keyOf = (v, i) => `${v.loadSeq}:${i}`;

  function enabled() {
    const s = store.get();
    if (!s.quizOn || s.mode !== 'algo') return false;
    const page = currentStep(s);
    return page && (page.id === 'pseudo' || page.id === 'python');
  }

  player.setHold((nextIndex) => {
    const v = player.view();
    if (v.empty || !enabled()) return false;
    const f = v.frames[nextIndex];
    return Boolean(f?.ask) && !answers.has(keyOf(v, nextIndex));
  });

  function draw() {
    const v = player.view();
    if (v.empty || !enabled() || !v.next?.ask) { root.hidden = true; return; }
    const ask = v.next.ask;
    const key = keyOf(v, v.index + 1);
    root.hidden = false;
    const picked = answers.get(key);
    if (picked === undefined) {
      fill(root,
        el('div.coach__q', {}, ask.q),
        el('div.coach__opts', {}, ask.options.map((text, i) => el('button.coach__opt', {
          type: 'button', onclick: () => { answers.set(key, i); draw(); },
        }, text))),
        el('div.coach__hint', {}, '맞혀 본 뒤 ⏭ 한 단계로 확인해요 (그냥 넘어가도 돼요)'),
      );
      return;
    }
    const right = picked === ask.answer;
    fill(root,
      el(`div.coach__result${right ? '.coach__result--ok' : '.coach__result--no'}`, {},
        el('span', {}, right ? '✓ 맞았어요!' : `✗ 정답은 "${ask.options[ask.answer]}"`),
        el('span.coach__why', {}, ask.why)),
      el('button.coach__opt.coach__go', { type: 'button', onclick: () => player.step(1) }, '⏭ 확인하러 가기'),
    );
  }

  store.subscribe(draw);
  player.subscribe(draw);
  return root;
}
