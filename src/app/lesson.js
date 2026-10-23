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
  {
    id: 'map', room: 'map',
    title: '복습 지도 — 네 알고리즘과 자료구조',
    goal: '이미 배운 네 알고리즘을 오늘은 "데이터가 어느 자료구조로 옮겨 가는가"로 다시 봐요. 겉모습은 달라도, 거리·정렬·세기·묶기·평균·갱신이라는 같은 도구를 서로 다르게 조합한 것이라서 도구를 알면 네 알고리즘이 한 줄로 꿰어져요.',
    todo: '네 카드에서 알고리즘마다 "데이터 이동" 한 줄을 읽고, 아래 표에서 어떤 도구를 쓰는지 확인하세요. 다음 쪽부터 도구를 하나씩 손으로 써 봐요.',
  },
  {
    id: 'table', room: 'table',
    title: '표 = 리스트의 리스트',
    goal: '머신러닝 데이터는 표예요. 한 줄(행)이 샘플 하나, 칸(열)이 특징, 마지막 칸이 정답 레이블이죠. 파이썬은 리스트 안에 리스트를 넣어 표를 만들고, data[i][j]로 i번째 줄의 j번째 칸을 꺼내요. 네 알고리즘 모두 이 표에서 출발해요.',
    todo: '➕ 한 줄 추가(append)를 눌러 표가 자라고 그림에 점이 찍히는 것을 보세요. 줄이나 칸을 눌러 data[i], data[i][j]가 무엇인지 확인하세요.',
  },
  {
    id: 'distance', room: 'distance',
    title: '거리 재기 — 얼마나 가까운가',
    goal: '두 점이 얼마나 가까운지는 유클리드 거리 √(Δx² + Δy²)로 재요. k-NN은 질문점과 학습 데이터 사이를, k-평균은 점과 중심 사이를 이 거리로 비교해요. "가깝다"를 숫자로 바꿔야 컴퓨터가 비교할 수 있기 때문이에요.',
    todo: '점 하나를 골라 ⏭ 한 단계 계산으로 Δ → 제곱 → 더하기 → √ 순서를 밟아 보세요. 그다음 "모든 점과 거리 재기"로 거리 리스트를 채워 보세요.',
  },
  {
    id: 'sort', room: 'sort',
    title: '정렬하고 앞에서 k개',
    goal: '거리 리스트를 정렬(sort)하면 가까운 것이 앞으로 와요. 그 앞에서 k개만 잘라 오면(슬라이싱 [:k]) "가장 가까운 k개"가 돼요. k-NN의 이웃이 바로 이렇게 만들어져요 — 정렬 덕분에 "가장 가까운"을 고르는 일이 "앞에서 자르기"로 쉬워져요.',
    todo: '먼저 맨 앞에 올 카드를 맞혀 보고 sort()를 누르세요. k를 고르고 [:k]를 누르면 앞의 카드가 새 리스트로 복사돼요.',
  },
  {
    id: 'dict', room: 'dict',
    title: '딕셔너리로 세기',
    goal: '딕셔너리는 "키 → 값" 짝을 모아 둔 자료구조예요. 레이블을 키로, 개수를 값으로 두면 무엇이 몇 개인지 셀 수 있어요. k-NN의 투표, 의사결정트리의 레이블 세기와 다수결이 모두 이 방법이에요.',
    todo: '하나 세기를 눌러 토큰이 딕셔너리 칸으로 들어가는 것을 보세요. 처음 나온 레이블이면 새 키가 생기고, 있던 레이블이면 값이 1 늘어요. 다 세면 max로 1등을 찾아요.',
  },
  {
    id: 'group', room: 'group',
    title: '묶음으로 나누고 평균 내기',
    goal: '규칙에 따라 데이터를 여러 묶음(리스트)으로 나누고, 묶음마다 평균을 내는 일은 k-평균(가까운 중심으로 나누고 평균으로 중심 옮기기)과 의사결정트리(질문의 답으로 나누기)의 뼈대예요.',
    todo: '나누는 규칙을 고르고 "하나 나누기"로 점이 묶음으로 이동하는 것을 보세요. 다 나누면 "평균 내기"로 묶음의 가운데가 그림의 어디인지 확인하세요.',
  },
  {
    id: 'update', room: 'update',
    title: '조금씩 고쳐 가기 — 갱신과 기록',
    goal: '한 번에 맞히지 못하면, 틀린 만큼 조금씩 고쳐 가요: w ← w − 학습률 × 기울기. 고칠 때마다 결과를 기록 리스트에 붙이면 나아지고 있는지 볼 수 있어요. 선형회귀의 경사하강법, k-평균의 중심 갱신이 모두 이런 반복이에요.',
    todo: '"한 번 갱신"을 여러 번 눌러 공이 그릇 바닥으로 내려가고 기록이 줄어드는 것을 보세요. 학습률을 크게 바꾸면 어떻게 되는지도 해 보세요.',
  },
];

/* ══════════════════════════ 🤖 알고리즘 ══════════════════════════ */
const ALGO_INFO = {
  knn: {
    reviewGoal: 'k-NN은 새 데이터와 가장 가까운 학습 데이터 k개를 찾아 다수결로 레이블을 정하는 분류 방법이었죠. 따로 학습하지 않고, 예측할 때마다 학습 데이터 전체와 거리를 재요. 오늘은 토마토(단맛 6, 아삭함 4)가 과일·채소·단백질 중 무엇과 비슷한지 분류해요.',
    reviewTodo: '▶ 재생으로 처음부터 끝까지 보며 왼쪽 "절차"의 불이 옮겨 가는 것을 보세요. 끝나면 그림을 눌러 질문점을 옮겨 보세요 — 다시 분류해요.',
    focus: '특히 표의 행이 distances로 "복사"되어 들어가고, sort() 때 제자리를 찾아 미끄러지고, 앞의 k개가 neighbors로 복사되는 것을 보세요.',
    swapTodo: 'k를 1·3·5·7로 바꿔 보세요. 토마토의 분류가 언제 바뀌나요? 왜 그런지 이웃 원으로 설명해 보세요.',
  },
  kmeans: {
    reviewGoal: 'k-평균은 정답 레이블 없이 데이터를 k개 묶음으로 나누는 군집 방법이었죠. "가까운 중심으로 나누기(할당) → 묶음 평균으로 중심 옮기기(갱신)"를 중심이 멈출 때까지 되풀이해요. 오늘은 집 10채에 배달 거점 3곳을 정해요.',
    reviewTodo: '▶ 재생으로 보며 반복할 때마다 중심 ◆가 어디로 옮겨 가는지, 점들의 묶음이 어떻게 바뀌는지 보세요. 끝나면 그림을 눌러 새 집을 놓아 보세요.',
    focus: '특히 반복이 시작될 때 점들이 대기 줄로 돌아갔다가 하나씩 묶음 리스트로 이동하는 것, 평균을 낸 뒤 중심이 미끄러지는 것을 보세요.',
    swapTodo: 'k를 2·4로, 또 "나쁜 시작"으로 바꿔 보세요. 나쁜 시작에서는 어떤 묶음에서 멈추나요? 왜 그대로 멈출까요?',
  },
  linreg: {
    reviewGoal: '선형회귀는 데이터를 가장 잘 지나는 직선 y = wx + b를 찾는 회귀 방법이었죠. 경사하강법은 손실(오차² 평균)이 줄어드는 쪽으로 w와 b를 조금씩 고쳐 가요. 오늘은 공부 시간으로 퀴즈 점수를 예측하는 직선을 찾아요.',
    reviewTodo: '▶ 재생으로 보며 직선이 점들에 다가가는 것과 손실 그래프가 내려가는 것을 함께 보세요. 끝나면 아래 슬라이더로 공부 시간에 따른 예측 점수를 확인하세요.',
    focus: '특히 예측·오차 열이 위에서 아래로 채워지는 것, w·b 변수가 새 값으로 바뀌며 직선이 움직이는 것, 기록 리스트가 한 칸씩 자라는 것을 보세요.',
    swapTodo: '학습률을 0.01·0.05·0.1로 바꿔 보세요. 손실 그래프 모양이 어떻게 달라지나요? 0.1에서는 무슨 일이 생기나요?',
  },
  dtree: {
    reviewGoal: '의사결정트리는 "날씨는?" 같은 질문으로 데이터를 계속 나눠 레이블을 맞히는 분류 방법이었죠. 질문마다 묶음이 얼마나 깨끗해지는지(불순도)를 재서 가장 좋은 질문을 골라요. 오늘은 14일의 기록으로 "운동장에서 축구할까?" 트리를 만들어요.',
    reviewTodo: '▶ 재생으로 보며 트리가 위에서부터 자라는 것과 오른쪽 아래 호출 스택이 쌓였다 빠지는 것을 보세요. 끝나면 오늘 날씨를 골라 트리로 예측해 보세요.',
    focus: '특히 특징을 시험할 때마다 데이터 행이 묶음으로 이동하는 것, 점수표에서 가장 작은 값이 뽑히는 것, 재귀 호출 때 스택이 쌓이고 빠지는 것을 보세요.',
    swapTodo: '지니 ↔ 엔트로피로 바꾸면 점수 숫자는 달라지지만 고르는 질문은 같은지 보세요. 최대 깊이 1로 바꾸면 트리가 어떻게 되나요?',
  },
};

const ALGO_PAGE_META = [
  { id: 'review', badge: '①', name: '한눈에 복습' },
  { id: 'pseudo', badge: '②', name: '의사코드로 한 단계씩' },
  { id: 'python', badge: '③', name: '의사코드 ↔ 파이썬' },
];

const _algoCache = new Map();
export function algoPages(algoId) {
  if (_algoCache.has(algoId)) return _algoCache.get(algoId);
  const info = ALGO_INFO[algoId] ?? ALGO_INFO.knn;
  const label = getAlgorithm(algoId).meta.name;
  const pages = ALGO_PAGE_META.map((m) => ({
    id: m.id,
    view: 'workspace',
    title: `${m.badge} ${label} — ${m.name}`,
    goal: m.id === 'review' ? info.reviewGoal
      : m.id === 'pseudo'
        ? `의사코드를 한 줄씩 밟으면, 그 줄이 바꾸는 자료구조가 오른쪽 아래에서 빛나고 데이터가 구조 사이를 이동해요. "코드 한 줄 = 데이터의 어떤 이동"을 짝지어 보는 쪽이에요. ${info.focus}`
        : '같은 일을 하는 의사코드와 파이썬을 줄마다 나란히 맞춰 봐요. 파이썬을 몰라도 괜찮아요 — 밟을 때마다 양쪽에서 같은 줄이 켜지고 오른쪽 자료구조가 함께 움직여요. 마지막으로 결과를 정하는 "핵심 한 줄"을 바꿔 무엇이 달라지는지 봐요.',
    todo: m.id === 'review' ? info.reviewTodo
      : m.id === 'pseudo'
        ? '⏭ 한 단계(키보드 →)로 천천히 밟으세요. 🔮 예측 퀴즈가 나오면 먼저 맞혀 보고 넘어가세요. ⏮ 뒤로(←)로 놓친 장면을 다시 볼 수 있어요.'
        : info.swapTodo,
  }));
  _algoCache.set(algoId, pages);
  return pages;
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
    id: 'quiz', room: 'quiz',
    title: '이해 확인',
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
