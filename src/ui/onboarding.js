/**
 * 첫 방문 안내 — 문서 대신 3단계 말풍선으로 화면 쓰는 법을 알려 준다. (8-퍼즐 사이트와 같은 방식)
 */
import { el, fill } from './dom.js';

const SEEN_KEY = 'ml-ds-review:seen-guide';

const STEPS = [
  {
    emoji: '📦',
    title: '이미 배운 네 알고리즘을 "데이터의 이동"으로 복습해요',
    body: 'k-최근접 이웃 · k-평균 · 선형회귀 · 의사결정트리. 오늘은 공식보다 ' +
          '"데이터가 어느 자료구조에서 어느 자료구조로 옮겨 가는지"를 눈으로 따라가며 다시 봅니다.',
  },
  {
    emoji: '🗂',
    title: '탭을 왼쪽부터 오른쪽으로',
    body: '📦 자료구조 도구(미션을 따라 손으로) → 🤖 알고리즘(문제 보기 → 한 단계씩 → 추적표 → 시험 대비 연습) → ' +
          '✅ 정리·확인(종합 모의시험). 알고리즘의 단계 쪽 하나는 의사코드 한 줄만 다뤄요.',
  },
  {
    emoji: '👣',
    title: '의사코드를 한 줄씩 밟아요',
    body: '단계 쪽은 그 줄을 실행하기 전 모습에서 시작해요. 깜빡이는 ⏭ 한 단계(→ 키)를 누르면 바뀐 자료구조만 또렷해지고 ' +
          '나머지는 흐려져요. ⏮ 뒤로(←)로 전과 후를 다시 비교하고, 🔮 예측 퀴즈로 먼저 맞혀 보세요.',
  },
];

export function createOnboarding() {
  const card = el('div.guide__card', { role: 'dialog', 'aria-modal': 'true', 'aria-label': '사용 안내' });
  const backdrop = el('div.guide__backdrop', { hidden: true }, card);
  document.body.append(backdrop);
  let step = 0;

  function render() {
    const s = STEPS[step];
    fill(card,
      el('div.guide__dots', {}, STEPS.map((_, i) => el(`span.guide__dot${i === step ? '.guide__dot--on' : ''}`))),
      el('div.guide__emoji', {}, s.emoji),
      el('h2.guide__title', {}, s.title),
      el('p.guide__body', {}, s.body),
      el('div.guide__actions', {},
        el('button.pill', { type: 'button', onclick: close }, '건너뛰기'),
        el('span.topbar__spacer'),
        step > 0 ? el('button.pill', { type: 'button', onclick: () => { step -= 1; render(); } }, '이전') : null,
        el('button.pill.ctrl--primary', { type: 'button', onclick: next }, step === STEPS.length - 1 ? '시작하기' : '다음'),
      ),
    );
  }
  function next() { if (step === STEPS.length - 1) close(); else { step += 1; render(); } }
  function close() {
    backdrop.hidden = true;
    try { localStorage.setItem(SEEN_KEY, '1'); } catch { /* 무시 */ }
  }
  function open() { step = 0; render(); backdrop.hidden = false; card.querySelector('.ctrl--primary')?.focus(); }
  document.addEventListener('keydown', (e) => { if (!backdrop.hidden && e.key === 'Escape') close(); });
  function maybeShow() {
    let seen = false;
    try { seen = localStorage.getItem(SEEN_KEY) === '1'; } catch { seen = false; }
    if (!seen) open();
  }
  return { open, maybeShow };
}
