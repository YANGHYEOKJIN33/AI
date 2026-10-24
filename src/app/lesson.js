/**
 * 레슨(쪽) 구성 — 큰 탭 셋마다 쪽 묶음이 다르다. (8-퍼즐 사이트의 lesson.js와 같은 원칙)
 *
 *  - 한 쪽 = 배울 것 하나. 📘 배울 것(왜 그런지까지) + ✋ 해 볼 것.
 *  - 알고리즘 탭은 하위 탭(알고리즘)마다 같은 3쪽 템플릿을 쓰고, 문구만 알고리즘에 따라 갈린다.
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
 * 알고리즘마다 쪽을 잘게 나눈다 — 한 쪽에는 절차 하나, 그 절차가 바꾸는 자료구조만 보인다.
 *
 *  kind  : 'intro' 문제 보기 | 'step' 의사코드 한 단계씩 | 'trace' 추적표 | 'exam' 시험 대비 연습
 *  lines : 이 쪽에서 밟는 의사코드 줄 [처음, 끝] — 나머지 줄은 흐리게 접는다
 *  window(frame, index, frames) : 이 쪽에서 재생할 장면 (재생기가 이 범위만 오간다)
 *  boxes : 자료구조 패널에 보일 상자
 */
const firstNode = (fr) => fr.findIndex((g) => g.action === 'node');

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
      todo: '① 왼쪽에서 오늘 따라갈 순서 세 가지를 읽고 ② 그림과 표에서 학습 데이터 9개를 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'dist', kind: 'step', title: '① 거리 재기', lines: [1, 4], window: (f) => f.phase === 0, boxes: ['train', 'distances'],
      goal: '학습 데이터를 표의 위에서부터 하나씩 꺼내 거리를 재고, (거리, 레이블)을 distances 리스트 뒤에 추가해요.',
      todo: '⏭ 한 단계(→)를 누르며 ① 표의 파란 줄 ② 계산 상자의 d² ③ distances에 한 칸씩 붙는 순서를 보세요.' },
    { id: 'sort', kind: 'step', title: '② 정렬하고 k개 고르기', lines: [5, 6], window: (f) => f.phase === 1 || f.phase === 2, boxes: ['distances', 'neighbors'],
      goal: 'distances를 거리가 작은 순서로 정렬하면, 앞에서 k개를 자르는 것만으로 "가장 가까운 k개"가 돼요.',
      todo: '① 🔮 퀴즈로 0번 자리를 먼저 맞히고 ② ⏭로 정렬되는 모습 ③ 앞 3개가 이웃으로 복사되는 모습을 보세요.' },
    { id: 'vote', kind: 'step', title: '③ 투표하기', lines: [7, 9], window: (f) => f.phase === 3, boxes: ['neighbors', 'votes'],
      goal: '이웃의 레이블을 딕셔너리로 세어(투표), 가장 많은 레이블을 예측으로 돌려줘요.',
      todo: '⏭를 누를 때마다 이웃 하나의 표가 votes로 들어가요. 새 키가 생기는지, 값이 1 느는지 구분해 보세요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  kmeans: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '집 6채를 가까운 것끼리 두 묶음으로 나눠 배달 거점 2곳을 정해요. 정답 레이블은 없어요(비지도학습).',
      todo: '① 왼쪽에서 따라갈 순서를 읽고 ② 그림에서 집 6채와 시작 중심(◆)을 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'assign', kind: 'step', title: '① 1회차 할당', lines: [1, 6], window: (f) => f.iter <= 1 && f.line <= 6, boxes: ['pool', 'clusters', 'centroids'],
      goal: '집1부터 차례로, 가장 가까운 중심(d²이 가장 작은 중심)의 묶음 리스트에 넣어요.',
      todo: '⏭를 누르며 ① 계산 상자의 d² 두 개를 비교하고 ② 집이 대기 줄에서 묶음으로 옮겨 가는 것을 보세요.' },
    { id: 'update', kind: 'step', title: '② 1회차 갱신·수렴 판정', lines: [7, 9], window: (f) => f.iter === 1 && f.line >= 7, boxes: ['clusters', 'newCentroids', 'centroids'],
      goal: '묶음마다 평균을 내어 새 중심을 구하고, 지금 중심과 같은지 비교해요. 다르면 중심을 바꾸고 다시 반복해요.',
      todo: '⏭를 누르며 ① 평균 계산 ② "새 중심 = 중심?" 판단 ③ 그림에서 ◆가 옮겨 가는 것을 보세요.' },
    { id: 'repeat', kind: 'step', title: '③ 반복해서 수렴까지', lines: [2, 10], window: (f) => f.iter >= 2, boxes: ['pool', 'clusters', 'newCentroids', 'centroids'],
      goal: '같은 과정을 되풀이해요. 묶음이 바뀌는 집이 있으면 중심도 움직이고, 더 바뀌지 않으면 멈춰요(수렴).',
      todo: '⏭⏭ 다음 반복(PageDown)으로 회차를 넘기며 ① 묶음을 옮기는 집(점선 칩) ② 몇 회차에 멈추는지 세어 보세요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  linreg: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '공부 시간(x)으로 퀴즈 점수(y)를 예측하는 직선 y = wx + b를 찾아요. w = 0, b = 0에서 시작해 조금씩 고쳐 가요(경사하강법).',
      todo: '① 왼쪽에서 따라갈 순서를 읽고 ② 표와 그림에서 데이터 5개를 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'predict', kind: 'step', title: '① 예측과 오차', lines: [1, 4], window: (f) => f.iter <= 1 && f.line <= 4, boxes: ['table', 'vars'],
      goal: '지금의 w, b로 모든 x의 예측값을 계산하고, 예측 − 실제로 오차를 구해요.',
      todo: '⏭를 누르며 ① 예측 열 ② 오차 열이 위에서 아래로 채워지는 것과 그림의 빨간 오차 막대를 보세요.' },
    { id: 'loss', kind: 'step', title: '② 손실과 기울기', lines: [5, 6], window: (f) => f.iter === 1 && (f.line === 5 || f.line === 6), boxes: ['table', 'vars'],
      goal: '오차²의 평균이 손실(MSE), 오차를 x와 곱해 평균 낸 것의 2배가 기울기 dw예요. 첫 에폭은 손으로 계산할 수 있어요.',
      todo: '① 계산 상자를 보기 전에 손실(35)을 직접 계산해 보고 ② ⏭로 확인하세요. dw의 부호도 확인하세요.' },
    { id: 'update', kind: 'step', title: '③ 갱신하고 반복하기', lines: [7, 9], window: (f) => (f.iter === 1 && f.line >= 7) || f.iter >= 2, boxes: ['vars', 'history'],
      goal: 'w ← w − 학습률 × dw 로 고치고 손실을 기록해요. 이것을 에폭마다 되풀이하면 손실이 줄어들어요.',
      todo: '① ⏭로 첫 갱신(w 0 → 1.96)을 보고 ② ⏭⏭ 다음 에폭으로 손실 기록이 줄어드는 것을 보세요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
  dtree: [
    { id: 'intro', kind: 'intro', title: '문제 보기',
      goal: '14일의 기록(날씨·기온·습도·바람 → 축구 한다/안 한다)으로 "질문 트리"를 만들어요. 섞인 정도(불순도)가 가장 작아지는 질문부터 골라요.',
      todo: '① 왼쪽에서 따라갈 순서를 읽고 ② 표에서 14일의 기록을 확인한 뒤 [다음 →]을 누르세요.' },
    { id: 'root', kind: 'step', title: '① 뿌리 질문 고르기', lines: [1, 8], window: (f, i, fr) => i <= firstNode(fr), boxes: ['counts', 'groups', 'scores'],
      goal: '특징 네 개로 하나씩 나눠 보고, 묶음별 지니 불순도를 크기로 가중 평균한 점수가 가장 작은 특징을 뿌리 질문으로 골라요.',
      todo: '⏭를 누르며 ① 행이 값별 묶음으로 옮겨 가는 것 ② 점수표에 한 줄씩 적히는 것 ③ 가장 작은 점수가 뽑히는 것을 보세요.' },
    { id: 'grow', kind: 'step', title: '② 가지마다 다시 만들기 (재귀)', lines: [1, 10], window: (f, i, fr) => i > firstNode(fr), boxes: ['stack', 'groups', 'scores'],
      goal: '값마다 가지를 뻗고 그 묶음으로 같은 함수를 다시 불러요(재귀). 부를 때 호출 스택에 쌓이고, 끝나면 빠져요.',
      todo: '⏭⏭ 다음 노드(PageDown)로 넘기며 ① 노드가 만들어지는 순서 ② 호출 스택 칸 수 ③ 잎이 되는 조건을 보세요.' },
    TRACE_PAGE, EXAM_PAGE,
  ],
};

export function algoPages(algoId) {
  return ALGO_PAGES[algoId] ?? ALGO_PAGES.knn;
}

/** 쪽의 장면 범위 [처음, 끝] — 없으면 전체 */
export function pageWindow(page, frames) {
  if (!page || !frames?.length) return [0, Math.max(0, (frames?.length ?? 1) - 1)];
  if (page.kind === 'intro') return [0, 0];
  if (!page.window) return [0, frames.length - 1];
  let lo = -1; let hi = -1;
  frames.forEach((f, i) => { if (page.window(f, i, frames)) { if (lo < 0) lo = i; hi = i; } });
  return lo < 0 ? [0, frames.length - 1] : [lo, hi];
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
