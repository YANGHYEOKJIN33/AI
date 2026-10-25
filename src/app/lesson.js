/**
 * 레슨(쪽) 구성 — 큰 탭 셋마다 쪽 묶음이 다르다. (8-퍼즐 사이트의 lesson.js와 같은 원칙)
 *
 *  - 한 쪽 = 배울 것 하나. 📘 배울 것 + ✋ 해 볼 것 (알고리즘 단계 쪽은 한 문장만 — 시선을 그림과 자료구조에).
 *  - 알고리즘 탭은 문제 보기 → 단계 쪽(줄마다) → 추적표 → 시험 대비 연습.
 *
 *  view : 'room' — 화면 전체를 쓰는 방(자료구조 도구·정리)
 *         'workspace' — 코드 | 그림 / 자료구조 3분할 (알고리즘 쪽)
 */
import { ALGO_ORDER, getAlgorithm } from '../core/algorithms/index.js';

/* ══════════════════════════ 📦 자료구조 도구 ══════════════════════════ */
export const TOOLS = [
  { id: 'map', room: 'map', title: '안내 — 이 탭에서 할 일',
    goal: '네 알고리즘은 같은 자료구조 도구 6개를 서로 다르게 조합해요. 도구를 하나씩 손으로 써 보고, 그 도구가 알고리즘의 어디에서 쓰이는지 확인해요.',
    todo: '아래 도구 카드에서 "할 일"과 "배우는 것"을 읽고, 반짝이는 단추로 첫 도구부터 시작하세요.' },
  { id: 'table', room: 'table', title: '표 = 리스트의 리스트',
    goal: '데이터 표의 한 줄은 샘플 하나, 한 칸은 특징이나 레이블이에요. data[i][j]로 줄과 칸을 짚어요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
  { id: 'distance', room: 'distance', title: '거리 재기',
    goal: '"가깝다"를 숫자로 바꾸는 방법 — 거리 제곱 d² = Δx² + Δy². k-NN과 k-평균이 이 계산으로 가장 가까운 것을 찾아요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
  { id: 'sort', room: 'sort', title: '정렬하고 앞에서 k개',
    goal: '정렬하면 가장 가까운 것이 0번으로 와요. 그다음 앞에서 k개를 자르면 "가장 가까운 k개" — k-NN의 이웃이에요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
  { id: 'dict', room: 'dict', title: '딕셔너리로 세기',
    goal: '키 → 값 짝으로 레이블을 세면 다수결을 구할 수 있어요. k-NN의 투표, 의사결정트리의 레이블 세기가 이것이에요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
  { id: 'group', room: 'group', title: '묶음으로 나누고 평균 내기',
    goal: '규칙대로 데이터를 묶음 리스트에 나누고 묶음의 평균을 내요. k-평균(할당·갱신)과 의사결정트리(나누기)의 뼈대예요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
  { id: 'update', room: 'update', title: '조금씩 고쳐 가기 — 갱신과 기록',
    goal: 'w ← w − 학습률 × 기울기로 값을 조금씩 고치고 결과를 기록해요. 선형회귀의 경사하강법, k-평균의 중심 갱신이 이 반복이에요.', todo: '왼쪽 🎯 미션을 1번부터 따라 하세요. 다음에 누를 단추가 반짝여요.' },
];

/* ══════════════════════════ 🤖 알고리즘 ══════════════════════════ */
/**
 * 알고리즘마다 쪽을 잘게 나눈다 — 한 쪽 = 의사코드 한 줄(또는 붙어 있는 몇 줄) = 바뀌는 자료구조 하나.
 *
 *  kind    : 'intro' 문제 보기 | 'step' 의사코드 한 단계씩 | 'trace' 추적표 | 'exam' 시험 대비 연습
 *  goal    : 단계 쪽은 한 문장만 (화면 위 한 줄)
 *  lines   : 이 쪽에서 밟는 의사코드 줄 [처음, 끝] — 이 줄만 보인다
 *  window(frame, index, frames) : 이 쪽에서 재생할 장면 (재생기가 이 범위만 오간다)
 *  boxes   : 자료구조 패널에 보일 상자
 *  iterNav : ⏭⏭ 다음 반복 단추를 보일까 (반복을 넘겨 보는 쪽에서만)
 *  stage   : 'none'이면 그림 칸을 접고 자료구조 칸을 키운다 (그림이 바뀌지 않는 쪽 — 트리 뿌리를 만들기 전)
 *
 * 단계 쪽은 "실행 전 모습"(바로 앞 장면)에서 시작한다 — ⏭를 누르면 이 줄이 무엇을 바꾸는지 전후가 보인다.
 */
const firstIdx = (fr, pred) => fr.findIndex(pred);
/** 의사결정트리: 뿌리에서 뻗는 가지 장면들 (스택에 뿌리 호출 하나만 있을 때) */
const rootBranches = (fr) => fr.map((g, i) => (g.action === 'branch' && g.ds.stack.length === 1 ? i : -1)).filter((i) => i >= 0);
const dt = {
  firstLoop: (fr) => firstIdx(fr, (g) => g.action === 'loop'),
  firstScore: (fr) => firstIdx(fr, (g) => g.action === 'score'),
  firstNode: (fr) => firstIdx(fr, (g) => g.action === 'node'),
  secondBranch: (fr) => rootBranches(fr)[1] ?? fr.length,
};

const TRACE_PAGE = {
  id: 'trace', kind: 'trace', title: '추적표로 정리',
  goal: '시험에서는 알고리즘을 손으로 따라가 표를 채워요. 지금까지 본 장면을 한 장의 추적표로 정리해요.',
  todo: '① 칸의 "?"를 먼저 스스로 계산해 보고 ② 눌러서 확인하세요. ③ 위에서 조건을 바꾸면 표가 새로 계산돼요.',
};
const EXAM_PAGE = {
  id: 'exam', kind: 'exam', title: '시험 대비 연습',
  goal: '기말고사와 같은 형식의 문제예요. 답을 고르면 바로 채점하고, "그 장면 보기"로 정답이 나오는 순간을 확인할 수 있어요.',
  todo: '① 종이에 풀고 답을 고르세요. ② 틀리면 "그 장면 보기"로 돌아가 확인하세요. ③ "새 문제"로 조건을 바꿔 다시 연습하세요.',
};

export const ALGO_PAGES = {
  knn: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '토마토(단맛 6, 아삭함 4)는 과일·채소·단백질 중 무엇과 닮았을까요? 가장 가까운 학습 데이터 k개가 투표해서 정해요.',
      todo: '왼쪽에서 문제와 시험 포인트를 읽고, 학습 데이터 9개를 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'dist', kind: 'step', title: '① 거리 재기', lines: [1, 4], window: (f) => f.phase === 0, boxes: ['train', 'distances'],
      goal: '표의 위에서부터 토마토까지의 거리를 재서 distances 뒤에 붙여요.' },
    { id: 'sort', kind: 'step', title: '② 정렬하기', lines: [5, 5], window: (f) => f.phase === 1, boxes: ['distances'],
      goal: 'distances를 거리가 작은 순서로 다시 세워요.' },
    { id: 'slice', kind: 'step', title: '③ 앞에서 k개 고르기', lines: [6, 6], window: (f) => f.phase === 2, boxes: ['distances', 'neighbors'],
      goal: '정렬된 distances의 앞에서 k개를 이웃으로 복사해요.' },
    { id: 'vote', kind: 'step', title: '④ 투표하기', lines: [7, 9], window: (f) => f.phase === 3, boxes: ['neighbors', 'votes'],
      goal: '이웃의 레이블을 votes 딕셔너리로 세고, 가장 많은 레이블이 답이에요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  kmeans: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '집 6채를 가까운 것끼리 두 묶음으로 나눠 배달 거점 2곳을 정해요. 정답 레이블은 없어요(비지도학습).',
      todo: '왼쪽에서 문제와 시험 포인트를 읽고, 그림에서 집 6채와 시작 중심(◆)을 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'assign', kind: 'step', title: '① 묶음에 나누기 (1회차)', lines: [1, 6], window: (f) => f.iter <= 1 && f.line <= 6, boxes: ['pool', 'clusters', 'centroids'],
      goal: '집마다 가장 가까운 중심(d²이 가장 작은 중심)의 묶음에 넣어요.' },
    { id: 'mean', kind: 'step', title: '② 새 중심 구하기', lines: [7, 7], window: (f) => f.iter === 1 && f.line === 7, boxes: ['clusters', 'newCentroids'],
      goal: '묶음마다 점들의 평균을 내면 새 중심이에요.' },
    { id: 'update', kind: 'step', title: '③ 비교하고 중심 바꾸기', lines: [8, 9], window: (f) => f.iter === 1 && f.line >= 8, boxes: ['newCentroids', 'centroids'],
      goal: '새 중심이 지금 중심과 다르면 중심을 새 중심으로 바꾸고 다시 반복해요.' },
    { id: 'repeat', kind: 'step', title: '④ 수렴할 때까지 반복', lines: [2, 10], window: (f) => f.iter >= 2, boxes: ['pool', 'clusters', 'centroids', 'iter'], iterNav: true,
      goal: '⏭⏭로 회차를 넘기며, 묶음을 옮기는 집과 멈추는 회차를 찾아요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  linreg: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '공부 시간(x)으로 퀴즈 점수(y)를 예측하는 직선 y = wx + b를 찾아요. w = 0, b = 0에서 시작해 조금씩 고쳐 가요(경사하강법).',
      todo: '왼쪽에서 문제와 시험 포인트를 읽고, 표와 그림에서 데이터 5개를 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'predict', kind: 'step', title: '① 예측', lines: [1, 3], window: (f) => f.iter <= 1 && f.line <= 3, boxes: ['table', 'vars'],
      goal: 'w = 0, b = 0에서 시작해, 지금 직선으로 x마다 예측값을 구해요.' },
    { id: 'error', kind: 'step', title: '② 오차', lines: [4, 4], window: (f) => f.iter === 1 && f.line === 4, boxes: ['table'],
      goal: '오차 = 예측 − 실제. 그림의 세로 막대가 오차예요.' },
    { id: 'loss', kind: 'step', title: '③ 손실', lines: [5, 5], window: (f) => f.iter === 1 && f.line === 5, boxes: ['table', 'vars'],
      goal: '오차를 제곱해서 평균 내면 손실(MSE)이에요.' },
    { id: 'grad', kind: 'step', title: '④ 기울기', lines: [6, 6], window: (f) => f.iter === 1 && f.line === 6, boxes: ['table', 'vars'],
      goal: '오차와 x로 기울기 dw, db를 구해요. 부호가 고칠 방향을 알려 줘요.' },
    { id: 'update', kind: 'step', title: '⑤ 갱신', lines: [7, 7], window: (f) => f.iter === 1 && f.line === 7, boxes: ['vars'],
      goal: 'w ← w − 학습률 × dw. 직선이 어떻게 움직이는지 보세요.' },
    { id: 'repeat', kind: 'step', title: '⑥ 기록하고 반복', lines: [2, 9], window: (f) => (f.iter === 1 && f.line === 8) || f.iter >= 2, boxes: ['vars', 'history'], iterNav: true,
      goal: '손실을 기록에 붙이고, ⏭⏭로 에폭을 넘기며 손실이 줄어드는지 봐요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  dtree: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '14일의 기록(날씨·기온·습도·바람 → 축구 한다/안 한다)으로 "질문 트리"를 만들어요. 섞인 정도(불순도)가 가장 작아지는 질문부터 골라요.',
      todo: '왼쪽에서 문제와 시험 포인트를 읽고, 표에서 14일의 기록을 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'count', kind: 'step', stage: 'none', title: '① 레이블 세기', lines: [1, 3], window: (f, i, fr) => i < dt.firstLoop(fr), boxes: ['stack', 'counts'],
      goal: '함수를 부르면 스택에 쌓이고, 먼저 레이블을 세어 잎인지 확인해요.' },
    { id: 'split', kind: 'step', stage: 'none', title: '② 나누고 점수 매기기', lines: [4, 6], window: (f, i, fr) => i >= dt.firstLoop(fr) && i <= dt.firstScore(fr), boxes: ['groups', 'scores'],
      goal: '"날씨"로 행을 나누고, 묶음별 불순도를 크기로 가중 평균해 점수표에 적어요.' },
    { id: 'choose', kind: 'step', title: '③ 질문 고르기', lines: [5, 8], window: (f, i, fr) => i > dt.firstScore(fr) && i <= dt.firstNode(fr), boxes: ['groups', 'scores'],
      goal: '나머지 특징도 점수를 매기고, 가장 작은 점수의 특징을 질문으로 골라요.' },
    { id: 'grow', kind: 'step', title: '④ 첫 가지 만들기 (재귀)', lines: [1, 10], window: (f, i, fr) => i > dt.firstNode(fr) && i < dt.secondBranch(fr), boxes: ['stack', 'counts'], iterNav: true,
      goal: '첫 가지로 같은 함수를 다시 불러요. 스택이 쌓이고 빠지는 것을 보세요.' },
    { id: 'finish', kind: 'step', title: '⑤ 나머지 가지와 완성', lines: [1, 10], window: (f, i, fr) => i >= dt.secondBranch(fr), boxes: ['stack', 'counts'], iterNav: true,
      goal: '남은 가지도 같은 방법으로 만들어 트리를 완성해요. 노드가 생기는 순서를 세어 보세요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
};

export function algoPages(algoId) {
  return ALGO_PAGES[algoId] ?? ALGO_PAGES.knn;
}

/** 쪽이 실제로 밟는 장면 [처음, 끝] — 없으면 null */
function ownRange(page, frames) {
  let lo = -1; let hi = -1;
  frames.forEach((f, i) => { if (page.window(f, i, frames)) { if (lo < 0) lo = i; hi = i; } });
  return lo < 0 ? null : [lo, hi];
}

/**
 * 쪽의 장면 범위 [처음, 끝, 실행 전 모습에서 시작하나].
 * 단계 쪽은 바로 앞 장면(= 이 줄을 실행하기 전 모습)을 처음으로 둔다.
 */
export function pageWindow(page, frames) {
  if (!page || !frames?.length) return [0, Math.max(0, (frames?.length ?? 1) - 1), false];
  if (page.kind === 'intro') return [0, 0, false];
  if (!page.window) return [0, frames.length - 1, false];
  const own = ownRange(page, frames);
  if (!own) return [0, frames.length - 1, false];
  const [lo, hi] = own;
  return lo > 0 ? [lo - 1, hi, true] : [lo, hi, false];
}

/** 장면 하나가 어느 단계 쪽에 속하나 — "그 장면 보기"가 쓴다. 이름을 준 쪽에 있으면 그 쪽 */
export function pageOfFrame(algoId, frames, index, prefer = null) {
  const steps = algoPages(algoId).filter((p) => p.kind === 'step');
  const has = (p) => { const r = ownRange(p, frames); return r && index >= r[0] && index <= r[1]; };
  const preferred = steps.find((p) => p.id === prefer);
  if (preferred && has(preferred)) return preferred.id;
  return (steps.find(has) ?? steps[steps.length - 1]).id;
}

/** 알고리즘 하위 탭 */
export const ALGO_TABS = ALGO_ORDER.map((id) => ({ id, name: getAlgorithm(id).meta.name }));

/* ══════════════════════════ ✅ 정리·확인 ══════════════════════════ */
export const WRAP = [
  {
    id: 'summary', room: 'summary',
    title: '한 장 정리',
    goal: '네 알고리즘을 한 표에 모았어요. 문제 유형과 학습 방식은 달라도, 모두 표에서 출발해 리스트·딕셔너리·스택 같은 자료구조로 데이터를 옮기며 답을 만들어요.',
    todo: '표의 줄을 하나씩 읽으며 "데이터 이동" 칸을 소리 내어 설명해 보세요. 줄을 누르면 그 알고리즘으로 돌아가 다시 확인할 수 있어요.',
  },
  {
    id: 'mock', room: 'mock',
    title: '종합 모의시험',
    goal: '기말고사처럼 네 알고리즘을 섞어서 풀어 봐요. 문제마다 조건(질문점·시작 중심·학습률·불순도 기준)이 달라요.',
    todo: '① 한 문제씩 종이에 풀고 답을 고르세요. ② 틀리면 "그 장면 보기"로 확인하세요. ③ "새 문제"로 몇 번이든 다시 풀 수 있어요.',
  },
  {
    id: 'quiz', room: 'quiz',
    title: '개념 확인',
    goal: '자료구조와 데이터 이동으로 네 알고리즘을 설명할 수 있는지 문제로 확인해요.',
    todo: '문제마다 답을 고르면 바로 정답과 이유가 나와요. 틀려도 괜찮아요 — 이유를 읽고, 필요하면 해당 알고리즘 쪽으로 돌아가 다시 밟아 보세요.',
  },
];

/* ══════════════════════════ 조회 도우미 ══════════════════════════ */

const clampIndex = (i, len) => Math.max(0, Math.min(len - 1, i | 0));

/** 지금 탭의 쪽 묶음과 위치 */
export function currentLesson(state) {
  switch (state.mode) {
    case 'algo': {
      const steps = algoPages(state.algoTab);
      return { steps, index: clampIndex(state.algoStep, steps.length), key: 'algoStep' };
    }
    case 'wrap':
      return { steps: WRAP, index: clampIndex(state.wrapStep, WRAP.length), key: 'wrapStep' };
    case 'tools':
    default:
      return { steps: TOOLS, index: clampIndex(state.toolsStep, TOOLS.length), key: 'toolsStep' };
  }
}

export function currentStep(state) {
  const { steps, index } = currentLesson(state);
  return steps[index];
}

/**
 * 탭의 마지막 쪽에서 [다음 →]을 누르면 어디로 이어 갈까.
 * 도구 → 첫 알고리즘 → 다음 알고리즘 … → 정리. 끝이면 null.
 */
export function continuation(state) {
  if (state.mode === 'tools') {
    return { label: '알고리즘으로 →', patch: { mode: 'algo', algoTab: ALGO_ORDER[0], algoStep: 0 } };
  }
  if (state.mode === 'algo') {
    const i = ALGO_ORDER.indexOf(state.algoTab);
    if (i < ALGO_ORDER.length - 1) {
      const next = ALGO_ORDER[i + 1];
      return { label: `다음: ${getAlgorithm(next).meta.short} →`, patch: { algoTab: next, algoStep: 0 } };
    }
    return { label: '정리로 →', patch: { mode: 'wrap', wrapStep: 0 } };
  }
  return null;
}
