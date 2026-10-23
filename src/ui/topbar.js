/**
 * 상단 막대 — 2단계 내비게이션 (8-퍼즐 사이트와 같은 모양)
 *   1줄: 큰 탭 셋 [📦 자료구조 도구] [🤖 알고리즘] [✅ 정리·확인] + 도구
 *   2줄: 알고리즘 하위 탭 (🤖 알고리즘일 때만)
 */
import { el, fill } from './dom.js';
import { ALGO_TABS } from '../app/lesson.js';

const MODES = [
  { id: 'tools', label: '📦 자료구조 도구', tip: '네 알고리즘이 함께 쓰는 표·거리·정렬·딕셔너리·묶음·갱신을 손으로 다시 익힙니다' },
  { id: 'algo',  label: '🤖 알고리즘',     tip: '알고리즘마다 복습 → 의사코드 한 단계씩 → 파이썬 대조' },
  { id: 'wrap',  label: '✅ 정리·확인',    tip: '한 장 정리와 이해 확인 문제' },
];

export const ALGO_ICON = { knn: '📍', kmeans: '🎯', linreg: '📈', dtree: '🌳' };

export function mountTopbar(root, store, { onHelp = () => {}, onGlossary = () => {} } = {}) {
  const modeButtons = MODES.map((mode) => el('button.pill.modetab', {
    type: 'button', role: 'tab', title: mode.tip,
    onclick: () => store.set({ mode: mode.id }),
  }, mode.label));

  const subButtons = ALGO_TABS.map((a) => el('button.pill.subtab', {
    type: 'button', role: 'tab', title: `${a.name} 복습하기`,
    onclick: () => store.set({ mode: 'algo', algoTab: a.id }),
  }, `${ALGO_ICON[a.id]} ${a.name}`));
  const subtabs = el('div.subtabs', { role: 'tablist', 'aria-label': '알고리즘 고르기' },
    el('span.subtabs__label', {}, '알고리즘:'), ...subButtons);

  const helpBtn = el('button.pill', { type: 'button', title: '사용 안내 다시 보기', onclick: () => onHelp() }, '? 도움말');
  const glossaryBtn = el('button.pill', { type: 'button', title: '화면에 나오는 용어의 뜻 찾아보기', onclick: () => onGlossary() }, '📖 용어');
  const themeBtn = el('button.pill', {
    type: 'button', title: '밝은 화면 / 어두운 화면 바꾸기',
    onclick: () => {
      const order = ['auto', 'light', 'dark'];
      store.set({ theme: order[(order.indexOf(store.get().theme) + 1) % order.length] });
    },
  });
  const smaller = el('button.pill', {
    type: 'button', title: '글자 작게', 'aria-label': '글자 작게',
    onclick: () => store.set({ scale: Math.max(0.85, +(store.get().scale - 0.15).toFixed(2)) }),
  }, '가−');
  const bigger = el('button.pill', {
    type: 'button', title: '글자 크게 (교실 뒷자리 가독성)', 'aria-label': '글자 크게',
    onclick: () => store.set({ scale: Math.min(1.6, +(store.get().scale + 0.15).toFixed(2)) }),
  }, '가＋');

  fill(root,
    el('div.topbar__row', {},
      el('h1.topbar__title', {},
        '자료구조로 다시 보는 머신러닝',
        el('small', {}, 'k-NN · k-평균 · 선형회귀 · 의사결정트리 — 데이터 이동 → 의사코드 → 파이썬'),
      ),
      el('div.modetabs', { role: 'tablist', 'aria-label': '무엇을 할까요' }, modeButtons),
      el('span.topbar__spacer'),
      el('div.topbar__tools', {}, helpBtn, glossaryBtn, smaller, bigger, themeBtn),
    ),
    subtabs,
  );

  store.subscribe((state) => {
    modeButtons.forEach((b, i) => b.setAttribute('aria-selected', String(MODES[i].id === state.mode)));
    const isAlgo = state.mode === 'algo';
    subtabs.hidden = !isAlgo;
    subButtons.forEach((b, i) => b.setAttribute('aria-selected', String(isAlgo && ALGO_TABS[i].id === state.algoTab)));
    themeBtn.textContent = state.theme === 'auto' ? '🌗 자동' : state.theme === 'light' ? '☀ 밝게' : '🌙 어둡게';
  });
}
