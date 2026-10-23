/**
 * 실행 제어 — 재생기를 조종한다. 되감기는 필수, 키보드만으로도 조작된다.
 *   ⏹ 처음으로 · ⏮ 뒤로 · ▶ 재생 · ⏭ 한 단계 · ⏭⏭ 다음 반복 · ⏩ 끝까지 · 속도 · 🔮 예측 퀴즈
 */
import { el, fill } from './dom.js';
import { SPEEDS } from '../app/state.js';

const BUTTONS = [
  { id: 'reset', label: '⏹ 처음으로', key: 'Home' },
  { id: 'back',  label: '⏮ 뒤로',     key: '←' },
  { id: 'play',  label: '▶ 재생',     key: 'Space', primary: true },
  { id: 'step',  label: '⏭ 한 단계',  key: '→' },
  { id: 'jump',  label: '⏭⏭ 다음 반복', key: 'PageDown' },
  { id: 'end',   label: '⏩ 끝까지',   key: 'End' },
];

export function mountControls(root, store, player) {
  const buttons = new Map();
  const handlers = {
    reset: () => player.reset(),
    back: () => player.step(-1),
    play: () => player.toggle(),
    step: () => player.step(1),
    jump: () => player.nextIter(),
    end: () => player.toEnd(),
  };
  for (const spec of BUTTONS) {
    buttons.set(spec.id, el(`button.ctrl${spec.primary ? '.ctrl--primary' : ''}`, {
      type: 'button', title: `${spec.label} (${spec.key})`, 'data-action': spec.id, onclick: handlers[spec.id],
    }, spec.label));
  }

  const speedSelect = el('select', {
    id: 'speed-select',
    onchange: (e) => { store.set({ speedId: e.target.value }); player.restartTimer(); },
  }, SPEEDS.map((s) => el('option', { value: s.id }, s.name)));

  const quizBox = el('input', {
    type: 'checkbox', id: 'quiz-toggle',
    onchange: (e) => store.set({ quizOn: e.target.checked }),
  });

  const progressFill = el('span.progress__fill');
  const progressText = el('span.progress__text');

  fill(root,
    ...buttons.values(),
    el('div.speed', {}, el('label', { for: 'speed-select' }, '속도'), speedSelect),
    el('label.quiztoggle', { for: 'quiz-toggle', title: '중간중간 "다음에 무슨 일이 생길까?"를 묻습니다' },
      quizBox, ' 🔮 예측 퀴즈'),
    el('span.topbar__spacer'),
    el('div.progress', { title: '지금 몇 번째 장면인가' }, el('span.progress__bar', {}, progressFill), progressText),
  );

  document.addEventListener('keydown', (event) => {
    const tag = event.target?.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || event.target?.isContentEditable) return;
    if (!document.body.classList.contains('view-workspace')) return;
    if (document.querySelector('.compare__backdrop:not([hidden]), .guide__backdrop:not([hidden])')) return;
    const map = { ' ': 'play', ArrowRight: 'step', ArrowLeft: 'back', Home: 'reset', End: 'end', PageDown: 'jump' };
    const button = buttons.get(map[event.key]);
    if (!button || button.disabled || button.hidden) return;
    event.preventDefault();
    button.click();
  });

  store.subscribe((state) => {
    speedSelect.value = state.speedId;
    quizBox.checked = state.quizOn;
  });

  player.subscribe((v) => {
    const ready = !v.empty;
    buttons.get('reset').disabled = !ready || v.atStart;
    buttons.get('back').disabled = !ready || v.atStart;
    buttons.get('step').disabled = !ready || v.atEnd;
    buttons.get('end').disabled = !ready || v.atEnd;
    const jump = buttons.get('jump');
    const label = ready ? v.algo.meta.jumpLabel : null;
    jump.hidden = !label;
    if (label) { jump.textContent = `⏭⏭ ${label}`; jump.title = `${label}의 처음으로 (PageDown)`; }
    jump.disabled = !ready || v.atEnd;
    buttons.get('play').textContent = v.playing ? '⏸ 일시정지' : (ready && v.atEnd ? '↻ 다시 재생' : '▶ 재생');
    const pct = ready ? (v.index / Math.max(1, v.total - 1)) * 100 : 0;
    progressFill.style.width = `${pct}%`;
    progressText.textContent = ready ? `${v.index + 1} / ${v.total}` : '';
  });
}
