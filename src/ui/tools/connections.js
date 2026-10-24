/**
 * 🤖 알고리즘 속에서는 — 도구마다 "어느 알고리즘의 몇 번째 의사코드 줄에서, 어떤 데이터로" 쓰이는지.
 * 예시 값은 실제 예제 데이터로 계산해 넣는다(알고리즘 쪽 화면과 늘 같게).
 *   page·action : "그 장면 보러 가기"가 여는 쪽과 그 쪽에서 처음 나오는 동작
 */
import { FOODS, FOOD_QUERY, HOUSES, STUDY, PLAY_DAYS } from '../../core/datasets.js';
import { getAlgorithm } from '../../core/algorithms/index.js';

const q = FOOD_QUERY;
const d2 = (f) => (q.x - f.x) ** 2 + (q.y - f.y) ** 2;
const sorted = FOODS.slice().sort((a, b) => d2(a) - d2(b));
const km = getAlgorithm('kmeans').run(getAlgorithm('kmeans').defaults).result.history[0];
const kmA = HOUSES.filter((h) => km.assign[h.id] === 0).map((h) => h.name);

export const CONNECTIONS = {
  table: [
    { algo: 'knn', page: 'dist', action: 'measure', lines: '2~4줄',
      pseudo: '각 학습 데이터 (x, 레이블)에 대해 반복',
      how: '표의 한 줄(음식 하나)을 위에서부터 차례로 꺼내 거리를 재요. 그래서 distances에는 표 순서대로 쌓여요.',
      example: `0번 줄 ${FOODS[0].name}(${FOODS[0].x}, ${FOODS[0].y}, ${FOODS[0].label}) → 1번 줄 ${FOODS[1].name} → …` },
    { algo: 'kmeans', page: 'assign', action: 'nearest', lines: '4줄',
      pseudo: '각 점 p에 대해',
      how: '집 6채의 (가로, 세로)가 표예요. 레이블 칸이 없는 표 — 그래서 비지도학습이에요.',
      example: `${HOUSES.map((h) => `${h.name}(${h.x}, ${h.y})`).slice(0, 3).join(', ')} …` },
    { algo: 'linreg', page: 'predict', action: 'predict', lines: '3~4줄',
      pseudo: '각 i에 대해 예측[i] ← w × x[i] + b',
      how: 'x 열과 y 열 옆에 예측 열·오차 열이 새로 붙어요. 열 하나가 리스트 하나예요.',
      example: `x = [${STUDY.X.join(', ')}], y = [${STUDY.Y.join(', ')}]` },
    { algo: 'dtree', page: 'root', action: 'split', lines: '5줄',
      pseudo: '데이터를 A의 값에 따라 묶음으로 나눈다',
      how: '14일 기록표에서 특징 열 하나(예: 날씨)의 값을 보고 줄들을 나눠요.',
      example: `1번 줄: ${['날씨', '기온', '습도', '바람'].map((f) => PLAY_DAYS[0][f]).join(', ')} → ${PLAY_DAYS[0].label}` },
  ],
  distance: [
    { algo: 'knn', page: 'dist', action: 'measure', lines: '3줄',
      pseudo: 'd ← 거리(질문점 q, x)',
      how: '질문점과 학습 데이터 9개 사이의 거리를 하나씩 재요. 비교만 하면 되니 d²으로 충분해요.',
      example: `${q.name}(${q.x}, ${q.y}) ↔ ${sorted[0].name}(${sorted[0].x}, ${sorted[0].y}): d² = ${d2(sorted[0])} (가장 가까움)` },
    { algo: 'kmeans', page: 'assign', action: 'nearest', lines: '5줄',
      pseudo: 'c ← p에서 가장 가까운 중심의 번호',
      how: '집마다 중심 k개까지 거리를 재서 가장 작은 쪽을 골라요. 점 하나당 거리 k번.',
      example: `집3(3, 1): 중심 A(2, 5)까지 d² = 17, 중심 B(1, 3)까지 d² = 8 → B` },
  ],
  sort: [
    { algo: 'knn', page: 'sort', action: 'sort', lines: '5~6줄',
      pseudo: 'distances를 d가 작은 순서로 정렬한다 → 이웃 ← 앞에서 k개',
      how: '정렬하면 가까운 것이 0번으로 와요. 그다음 앞에서 k개만 잘라 오면 그것이 이웃이에요.',
      example: `정렬 결과 ${sorted.slice(0, 4).map((f, i) => `${i}번 ${f.name}(${d2(f)})`).join(', ')} … → k = 3이면 ${sorted.slice(0, 3).map((f) => f.name).join(', ')}` },
    { algo: 'dtree', page: 'root', action: 'choose', lines: '7줄',
      pseudo: 'best ← 점수가 가장 작은 특징',
      how: '정렬 전체는 아니지만 "가장 작은 것 고르기"는 정렬한 뒤 0번을 고르는 것과 같아요.',
      example: '날씨 0.343 · 습도 0.367 · 바람 0.429 · 기온 0.440 → 날씨' },
  ],
  dict: [
    { algo: 'knn', page: 'vote', action: 'count', lines: '7~9줄',
      pseudo: '각 이웃의 레이블마다 votes[레이블]을 1 늘린다',
      how: '키 = 레이블, 값 = 표 수. 처음 나온 레이블은 새 키를 만들고 1, 있던 키는 +1. 값이 가장 큰 키가 예측이에요.',
      example: `k = 3: ${sorted.slice(0, 3).map((f) => f.label).join(' → ')} → { 과일: 2, 단백질: 1 } → 과일` },
    { algo: 'dtree', page: 'root', action: 'score', lines: '2·6줄',
      pseudo: '레이블 세기 → 점수[A] ← 묶음별 불순도의 가중 평균',
      how: '묶음마다 {한다: n, 안 한다: m}을 세어 불순도를 구하고, 점수표 {특징: 점수}에 적어요.',
      example: '맑음 묶음 { 한다: 2, 안 한다: 3 } → 지니 1 − (2/5)² − (3/5)² = 0.48' },
  ],
  group: [
    { algo: 'kmeans', page: 'assign', action: 'assign', lines: '3·6·7줄',
      pseudo: '묶음[c]에 p를 넣는다 → 새 중심 ← 묶음마다 평균',
      how: '가까운 중심의 묶음 리스트에 집을 넣고, 다 넣으면 묶음마다 평균을 내 새 중심을 만들어요.',
      example: `1회차 묶음 A = {${kmA.join(', ')}} → 평균 (${km.next[0].x}, ${km.next[0].y})` },
    { algo: 'dtree', page: 'root', action: 'split', lines: '5줄',
      pseudo: '데이터를 A의 값에 따라 묶음으로 나눈다',
      how: '질문(특징)의 답마다 묶음 리스트를 만들어 줄을 나눠 넣어요. 묶음이 깨끗할수록 좋은 질문.',
      example: '날씨로 나누면 맑음 5개 · 흐림 4개(모두 한다!) · 비 5개' },
  ],
  update: [
    { algo: 'linreg', page: 'update', action: 'update', lines: '7~8줄',
      pseudo: 'w ← w − 학습률 × dw, 손실 기록에 손실을 추가한다',
      how: '기울기 반대쪽으로 w, b를 조금 고치고, 손실을 기록 리스트에 붙여 나아지는지 확인해요.',
      example: '첫 에폭: w = 0 − 0.05 × (−39.2) = 1.96, 기록 [35]' },
    { algo: 'kmeans', page: 'update', action: 'update', lines: '8~9줄',
      pseudo: '만약 새 중심 = 중심 이면 멈춘다 → 중심 ← 새 중심',
      how: '중심을 새 값으로 바꾸며(갱신) 반복하다가, 더 바뀌지 않으면 멈춰요(수렴).',
      example: '중심 A: (2, 5) → (5, 6.5) → (6, 7) → (6, 7) 그대로 → 멈춤' },
  ],
};
