/**
 * 진입점 — 화면 부품을 붙이고, 재생기를 상태에 연결한다.
 */
import { createStore } from './state.js';
import { createPlayer } from './player.js';
import { currentStep, algoPages, pageWindow, pageOfFrame } from './lesson.js';
import { normalizeParams } from '../core/algorithms/index.js';
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

/**
 * 알고리즘의 한 장면으로 바로 간다 — 연습 문제의 "그 장면 보기", 도구 쪽의 "그 장면 보러 가기".
 * params를 주면 그 조건으로 다시 돌린 뒤 간다.
 */
function jump(algoId, pageId, frame = null, params = null) {
  if (params) store.setParams(algoId, normalizeParams(algoId, params));
  const pages = algoPages(algoId);
  // 장면 번호를 주면 그 장면이 실제로 들어 있는 단계 쪽으로 간다
  if (typeof frame === 'number' && frame >= 0) {
    store.set({ mode: 'algo', algoTab: algoId });
    pageId = pageOfFrame(algoId, player.frames(), frame, pageId);
  }
  const algoStep = Math.max(0, pages.findIndex((p) => p.id === pageId));
  store.set({ mode: 'algo', algoTab: algoId, algoStep });
  // frame: 장면 번호, 또는 동작 이름(그 쪽에서 그 동작이 처음 나오는 장면)
  if (typeof frame === 'string') {
    const v = player.view();
    const i = v.frames.findIndex((f, k) => k >= v.lo && k <= v.hi && f.action === frame);
    if (i >= 0) player.goTo(i);
  } else if (frame !== null && frame >= 0) {
    player.goTo(frame);
  }
}

mountTopbar(qs('#topbar'), store, { onHelp: onboarding.open, onGlossary: glossary.open });
mountLessonBar(qs('#lessonbar'), store);
mountControls(qs('#controlbar'), store, player);
mountActionCard(qs('#actionbar'), store, player, coach);
mountCodePanel(qs('#panel-code'), store, player, VIEWS);
mountStagePanel(qs('#panel-stage'), store, player, VIEWS);
mountDataPanel(qs('#panel-data'), store, player, VIEWS);
mountRoom(qs('#room'), store, { onGlossary: glossary.open, jump, player });

// 알고리즘·조건이 바뀌면 다시 돌리고, 쪽이 바뀌면 그 쪽의 장면 범위만 오가게 한다.
let lastRunKey = '';
let lastPageKey = '';
store.subscribe((state) => {
  const page = currentStep(state);
  const kind = state.mode === 'algo' ? page.kind : 'room';
  const workspace = kind === 'intro' || kind === 'step';
  document.body.classList.toggle('view-workspace', workspace);
  document.body.classList.toggle('view-room', !workspace);
  document.body.classList.toggle('show-controls', kind === 'step');
  qs('#workspace').dataset.page = page.id;
  qs('#workspace').dataset.kind = kind;
  qs('#workspace').dataset.algo = state.algoTab;
  if (page.stage) qs('#workspace').dataset.stage = page.stage; else delete qs('#workspace').dataset.stage;
  qs('#workspace').toggleAttribute('data-nostage', kind === 'intro' && VIEWS[state.algoTab]?.introStage === false);
  if (state.mode !== 'algo') { player.pause(); lastPageKey = ''; return; }

  const runKey = `${state.algoTab}|${JSON.stringify(state.params[state.algoTab])}`;
  const reloaded = runKey !== lastRunKey;
  if (reloaded) { lastRunKey = runKey; player.load(state.algoTab); }
  const pageKey = `${runKey}|${page.id}`;
  if (pageKey !== lastPageKey) {
    lastPageKey = pageKey;
    const [lo, hi, ready] = pageWindow(page, player.frames());
    player.setWindow(lo, hi, { ready });
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
globalThis.__mlds = { store, player, jump };
