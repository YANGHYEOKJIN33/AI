/**
 * 앱 상태 저장소 — 화면 부품은 상태를 직접 고치지 않고 set()만 부르며, 그리기는 구독으로 한다.
 * (8-퍼즐 사이트와 같은 방식)
 */
import { ALGO_ORDER, ALGORITHMS, normalizeParams } from '../core/algorithms/index.js';

const STORAGE_KEY = 'ml-ds-review:prefs';

/** 새로 고쳐도 남길 값 — 고른 설정과 보던 쪽 */
const PERSISTED = ['mode', 'toolsStep', 'algoStep', 'algoTab', 'wrapStep', 'params',
  'speedId', 'theme', 'scale', 'quizOn'];

function defaultParams() {
  return Object.fromEntries(ALGO_ORDER.map((id) => [id, { ...ALGORITHMS[id].defaults }]));
}

const initial = {
  // 큰 탭 셋: tools(📦 자료구조 도구) · algo(🤖 알고리즘) · wrap(✅ 정리·확인)
  mode: 'tools',
  toolsStep: 0,
  algoStep: 0,          // 알고리즘 탭의 몇 번째 쪽인가 (하위 탭을 바꿔도 유지)
  algoTab: 'knn',       // 알고리즘 하위 탭
  wrapStep: 0,

  // 알고리즘마다 "핵심 한 줄 바꿔 보기"로 고른 값
  params: defaultParams(),

  speedId: 'normal',
  quizOn: true,         // 🔮 예측 퀴즈를 낼까

  theme: 'auto',        // auto | light | dark
  scale: 1,             // 글자 크기 배율
};

function sanitize(saved) {
  const out = {};
  for (const key of PERSISTED) if (key in saved) out[key] = saved[key];
  if (!['tools', 'algo', 'wrap'].includes(out.mode)) delete out.mode;
  if (out.algoTab && !ALGO_ORDER.includes(out.algoTab)) delete out.algoTab;
  if (out.params) {
    const params = defaultParams();
    for (const id of ALGO_ORDER) params[id] = normalizeParams(id, out.params[id]);
    out.params = params;
  }
  return out;
}

function loadPrefs() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : {};
  } catch {
    return {};   // 사생활 보호 모드 등 — 기본값으로 조용히 넘어간다
  }
}

function savePrefs(state) {
  try {
    const out = {};
    for (const key of PERSISTED) out[key] = state[key];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(out));
  } catch {
    /* 저장하지 못해도 학습에는 지장이 없다 */
  }
}

export function createStore() {
  let state = { ...initial, ...loadPrefs() };
  const listeners = new Set();

  return {
    get() { return state; },

    /** 바뀐 값만 넘긴다. 실제로 달라진 것이 없으면 아무도 다시 그리지 않는다. */
    set(patch) {
      let changed = false;
      for (const [key, value] of Object.entries(patch)) {
        if (state[key] !== value) { changed = true; break; }
      }
      if (!changed) return state;
      const prev = state;
      state = { ...state, ...patch };
      savePrefs(state);
      for (const listener of listeners) listener(state, prev);
      return state;
    },

    /** 알고리즘 하나의 설정만 바꾼다 */
    setParams(algoId, patch) {
      const next = { ...state.params, [algoId]: { ...state.params[algoId], ...patch } };
      this.set({ params: next });
    },

    /** 구독 즉시 한 번 그려 주고, 구독 해제 함수를 돌려준다. */
    subscribe(listener) {
      listeners.add(listener);
      listener(state, state);
      return () => listeners.delete(listener);
    },
  };
}

export const SPEEDS = [
  { id: 'slow',   name: '느림',   ms: 1400 },
  { id: 'normal', name: '보통',   ms: 800 },
  { id: 'fast',   name: '빠름',   ms: 380 },
  { id: 'turbo',  name: '아주 빠름', ms: 140 },
];
