/**
 * 진입점 — 화면 부품을 붙이고, 재생기를 상태에 연결한다.
 */
import { createStore } from './state.js';
import { createPlayer } from './player.js';
import { currentStep } from './lesson.js';
import { qs } from '../ui/dom.js';
import { mountTopbar } from '../ui/topbar.js';
import { mountLessonBar } from '../ui/lessonBar.js';
import { mountControls } from '../ui/controls.js';
import { mountActionCard } from '../ui/actionCard.js';
import { createCoach } from '../ui/coach.js';
import { mountCodePanel } from '../ui/codePanel.js';
import { mountStagePanel } from '../ui/stagePanel.js';
import { mountDataPanel } from '../ui/dataPanel.js';
import { mountRoom } from '../ui/room.js';
import { createGlossaryPanel } from '../ui/glossaryPanel.js';
import { createOnboarding } from '../ui/onboarding.js';
import knnView from '../ui/views/knn.js';
import kmeansView from '../ui/views/kmeans.js';
import linregView from '../ui/views/linreg.js';
import dtreeView from '../ui/views/dtree.js';

const VIEWS = { knn: knnView, kmeans: kmeansView, linreg: linregView, dtree: dtreeView };

const store = createStore();
const player = createPlayer(store);
const glossary = createGlossaryPanel();
const onboarding = createOnboarding();
const coach = createCoach(store, player);

mountTopbar(qs('#topbar'), store, { onHelp: onboarding.open, onGlossary: glossary.open });
mountLessonBar(qs('#lessonbar'), store);
mountControls(qs('#controlbar'), store, player);
mountActionCard(qs('#actionbar'), store, player, coach);
mountCodePanel(qs('#panel-code'), store, player, VIEWS);
mountStagePanel(qs('#panel-stage'), store, player, VIEWS);
mountDataPanel(qs('#panel-data'), store, player, VIEWS);
mountRoom(qs('#room'), store, { onGlossary: glossary.open });

// 어느 화면인가 — 방(도구·정리) / 3분할 작업대(알고리즘)
let lastPage = '';
store.subscribe((state) => {
  const workspace = state.mode === 'algo';
  document.body.classList.toggle('view-workspace', workspace);
  document.body.classList.toggle('view-room', !workspace);
  if (!workspace) { player.pause(); return; }
  const page = currentStep(state)?.id ?? 'review';
  qs('#workspace').dataset.page = page;
  const sig = `${state.algoTab}|${page}`;
  if (sig !== lastPage) {
    lastPage = sig;
    player.pause();
  }
});

// 알고리즘이나 "핵심 한 줄" 설정이 바뀌면 다시 돌려 싣는다. 쪽만 바뀌면 진행 위치를 지킨다.
let lastRunKey = '';
store.subscribe((state) => {
  if (state.mode !== 'algo') return;
  const key = `${state.algoTab}|${JSON.stringify(state.params[state.algoTab])}`;
  if (key !== lastRunKey) {
    lastRunKey = key;
    player.load(state.algoTab);
  }
});

// 보기 설정 (테마 · 글자 크기)
store.subscribe((state) => {
  const root = document.documentElement;
  if (state.theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', state.theme);
  root.style.setProperty('--scale', String(state.scale));
});

onboarding.maybeShow();

// 개발 중 확인용
globalThis.__mlds = { store, player };
