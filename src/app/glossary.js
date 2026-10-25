/**
 * 용어 사전 — 화면에서 쓰는 "정확한 용어"와 "쉬운 말"을 짝지어 둔다. (8-퍼즐 사이트와 같은 방식)
 *
 * term  : 교과서에서 쓰는 우리말 용어 (화면에도 이 말을 쓴다)
 * en    : 영어 용어
 * plain : 쉬운 한두 문장
 * where : 사이트 어디에서 만나는지
 */
export const GLOSSARY = [
  {
    group: '데이터와 학습',
    items: [
      { term: '샘플', en: 'sample', plain: '데이터 한 개. 표에서는 한 줄(행)이에요.', where: '📦 표 쪽' },
      { term: '특징', en: 'feature', plain: '샘플을 설명하는 값 하나(단맛, 날씨 …). 표에서는 한 칸(열)이에요.', where: '📦 표 쪽 · 의사결정트리' },
      { term: '레이블', en: 'label', plain: '샘플의 정답(과일, 한다 …). 지도학습은 레이블을 보고 배워요.', where: 'k-NN · 의사결정트리' },
      { term: '학습 데이터', en: 'training data', plain: '알고리즘이 보고 배우는(또는 비교하는) 데이터.', where: '자료구조 상자' },
      { term: '지도학습', en: 'supervised learning', plain: '정답(레이블)이 있는 데이터로 배우는 방법. 분류와 회귀가 여기에 들어요.', where: '📦 안내 · ✅ 한 장 정리' },
      { term: '비지도학습', en: 'unsupervised learning', plain: '정답 없이 데이터의 구조를 스스로 찾는 방법. 군집이 대표예요.', where: 'k-평균' },
      { term: '분류', en: 'classification', plain: '샘플이 어느 무리(레이블)에 속하는지 맞히는 문제.', where: 'k-NN · 의사결정트리' },
      { term: '회귀', en: 'regression', plain: '점수·가격 같은 수를 예측하는 문제.', where: '선형회귀' },
      { term: '군집', en: 'clustering', plain: '비슷한 것끼리 묶음을 만드는 문제. 정답 없이 묶어요.', where: 'k-평균' },
    ],
  },
  {
    group: '자료구조',
    items: [
      { term: '리스트', en: 'list', plain: '값을 순서대로 담는 상자 줄. 번호(인덱스)로 꺼내고, 뒤에 붙이고(append), 정렬할 수 있어요.', where: '거의 모든 상자' },
      { term: '2차원 리스트', en: 'list of lists', plain: '리스트 안에 리스트를 넣은 것. 표를 담을 때 써요. data[i][j] = i번 줄의 j번 칸(0부터).', where: '📦 표 쪽' },
      { term: '인덱스', en: 'index', plain: '리스트에서 몇 번째인지 나타내는 번호. 0부터 세요.', where: '📦 표 쪽' },
      { term: '튜플', en: 'tuple', plain: '(거리, 레이블)처럼 값 몇 개를 한 묶음으로 둔 것. 정렬할 때는 첫 값부터 비교해요.', where: 'k-NN distances' },
      { term: '추적표', en: 'trace table', plain: '알고리즘을 손으로 따라가며 단계마다 자료구조의 값을 적은 표. 시험에서 직접 채워요.', where: '알고리즘마다 추적표 쪽' },
      { term: '딕셔너리', en: 'dictionary', plain: '"키 → 값" 짝을 모은 상자. 레이블별 개수를 셀 때 딱 좋아요.', where: 'k-NN votes · 트리 점수표' },
      { term: '스택', en: 'stack', plain: '마지막에 넣은 것을 먼저 꺼내는 상자(LIFO). 함수 호출이 쌓이는 곳(호출 스택)이 스택이에요.', where: '의사결정트리 호출 스택' },
      { term: 'append', en: 'append', plain: '리스트 맨 뒤에 한 칸을 붙이는 일.', where: '동작 카드 📥' },
      { term: '정렬', en: 'sort', plain: '작은 값이 앞으로 오도록 순서를 다시 세우는 일.', where: 'k-NN · 📦 정렬 쪽' },
      { term: '슬라이싱', en: 'slicing', plain: '리스트의 일부를 잘라 새 리스트를 만드는 일. "앞에서 k개"처럼 잘라 와요.', where: 'k-NN · 📦 정렬 쪽' },
      { term: '변수', en: 'variable', plain: '값 하나를 담는 이름표 붙은 상자. 새 값을 넣으면 옛 값은 사라져요(갱신).', where: '선형회귀 w·b' },
    ],
  },
  {
    group: '계산 도구',
    items: [
      { term: '유클리드 거리', en: 'Euclidean distance', plain: '두 점 사이의 곧은 거리. √(Δx² + Δy²).', where: '📦 거리 쪽 · k-NN · k-평균' },
      { term: '평균', en: 'mean', plain: '값을 모두 더해 개수로 나눈 것. 묶음의 "가운데"가 돼요.', where: 'k-평균 · 선형회귀' },
      { term: '다수결', en: 'majority vote', plain: '가장 많이 나온 것을 고르는 방법.', where: 'k-NN · 의사결정트리' },
      { term: '반복', en: 'iteration', plain: '같은 절차를 여러 번 되풀이하는 것.', where: 'k-평균 · 선형회귀' },
    ],
  },
  {
    group: 'k-최근접 이웃',
    items: [
      { term: 'k-최근접 이웃', en: 'k-nearest neighbors', plain: '새 데이터와 가장 가까운 학습 데이터 k개를 찾아 다수결로 레이블을 정하는 분류 방법.', where: '🤖 k-최근접 이웃' },
      { term: '질문점', en: 'query point', plain: '분류하고 싶은 새 데이터(여기서는 토마토).', where: 'k-NN 그림의 ★' },
      { term: '이웃', en: 'neighbor', plain: '질문점과 가장 가까운 학습 데이터들.', where: 'k-NN neighbors' },
      { term: 'k', en: 'k', plain: 'k-NN에서는 투표할 이웃 수, k-평균에서는 만들 묶음 수.', where: '추적표 · 연습 문제의 조건' },
    ],
  },
  {
    group: 'k-평균',
    items: [
      { term: 'k-평균', en: 'k-means', plain: '점을 가장 가까운 중심으로 나누고, 묶음 평균으로 중심을 옮기기를 반복해 k개 묶음을 찾는 군집 방법.', where: '🤖 k-평균 군집' },
      { term: '중심', en: 'centroid', plain: '묶음을 대표하는 점. 묶음에 든 점들의 평균 위치예요.', where: 'k-평균 그림의 ◆' },
      { term: '할당', en: 'assignment', plain: '점을 가장 가까운 중심의 묶음에 넣는 단계.', where: 'k-평균 5·6줄' },
      { term: '갱신', en: 'update', plain: '값을 새로 계산한 값으로 바꾸는 일. k-평균은 중심을, 선형회귀는 w·b를 갱신해요.', where: 'k-평균 · 선형회귀' },
      { term: '수렴', en: 'convergence', plain: '반복해도 더 바뀌지 않는 상태. 여기서 멈춰요.', where: 'k-평균 8줄' },
      { term: '지역 최적', en: 'local optimum', plain: '주변보다는 좋지만 가장 좋지는 않은 곳에서 멈춘 상태. 시작이 나쁘면 생겨요.', where: 'k-평균 추적표의 시작 중심 바꾸기 (집 6채 예제는 어느 시작이든 같은 답, 회차 수만 달라요)' },
    ],
  },
  {
    group: '선형회귀',
    items: [
      { term: '선형회귀', en: 'linear regression', plain: '데이터를 가장 잘 지나는 직선 y = wx + b를 찾아 수를 예측하는 방법.', where: '🤖 선형회귀' },
      { term: '가중치', en: 'weight', plain: '직선의 기울기 w. x가 1 늘 때 예측이 얼마나 느는지.', where: '선형회귀 변수 상자' },
      { term: '편향', en: 'bias', plain: '직선의 절편 b. x가 0일 때의 예측값.', where: '선형회귀 변수 상자' },
      { term: '예측값', en: 'prediction', plain: '모델이 내놓은 답. 선형회귀에서는 w·x + b.', where: '선형회귀 예측 열' },
      { term: '오차', en: 'error', plain: '예측값 − 실제값. 그림의 세로 막대.', where: '선형회귀 오차 열' },
      { term: '손실', en: 'loss', plain: '얼마나 틀렸는지를 한 숫자로 나타낸 것. 작을수록 좋아요.', where: '선형회귀 손실 그래프' },
      { term: '평균제곱오차', en: 'MSE', plain: '오차를 제곱해 평균 낸 손실. 큰 오차를 더 크게 벌해요.', where: '선형회귀 5줄' },
      { term: '경사하강법', en: 'gradient descent', plain: '손실이 줄어드는 쪽(기울기의 반대)으로 조금씩 옮겨 가며 w·b를 찾는 방법.', where: '선형회귀 · 📦 갱신 쪽' },
      { term: '기울기', en: 'gradient', plain: 'w나 b를 조금 늘렸을 때 손실이 얼마나 늘어나는지. 이 반대 방향으로 가면 손실이 줄어요.', where: '선형회귀 dw·db' },
      { term: '학습률', en: 'learning rate', plain: '한 번에 얼마나 크게 고칠지 정하는 수. 너무 크면 발산해요.', where: '선형회귀 추적표 · 학습률 비교' },
      { term: '에폭', en: 'epoch', plain: '학습 데이터 전체를 한 번 훑어 학습하는 단위.', where: '선형회귀 2줄' },
      { term: '발산', en: 'divergence', plain: '고칠수록 손실이 커져 끝없이 멀어지는 것.', where: '선형회귀 학습률 0.1' },
    ],
  },
  {
    group: '의사결정트리',
    items: [
      { term: '의사결정트리', en: 'decision tree', plain: '질문으로 데이터를 계속 나눠 레이블을 맞히는 나무 모양의 분류 방법.', where: '🤖 의사결정트리' },
      { term: '노드', en: 'node', plain: '트리의 한 점. 질문 노드와 잎 노드가 있어요. 맨 위는 뿌리 노드.', where: '트리 그림' },
      { term: '잎 노드', en: 'leaf', plain: '더 나누지 않고 답(레이블)을 내는 노드.', where: '트리 그림 끝' },
      { term: '가지', en: 'branch', plain: '질문의 답(값) 하나마다 뻗는 선.', where: '트리 그림' },
      { term: '불순도', en: 'impurity', plain: '묶음에 레이블이 얼마나 섞였는지. 모두 같으면 0.', where: '트리 점수표' },
      { term: '지니 불순도', en: 'Gini impurity', plain: '1 − Σ(비율²). 반반 섞이면 0.5, 모두 같으면 0.', where: '트리 계산 상자' },
      { term: '엔트로피', en: 'entropy', plain: '−Σ p·log₂p. 섞인 정도를 재는 또 다른 방법. 반반이면 1.', where: '트리 추적표의 조건 바꾸기' },
      { term: '정보 이득', en: 'information gain', plain: '나누기 전 불순도 − 나눈 뒤 불순도(가중 평균). 클수록 좋은 질문. (점수가 가장 작은 특징 = 정보 이득이 가장 큰 특징)', where: '트리 ③ 질문 고르기' },
      { term: '재귀', en: 'recursion', plain: '함수가 자기 자신을 다시 부르는 것. 가지마다 같은 방법으로 트리를 만들어요.', where: '트리 9줄 · 호출 스택' },
      { term: '최대 깊이', en: 'max depth', plain: '트리가 내려갈 수 있는 한계. 너무 깊으면 학습 데이터에만 딱 맞는 과대적합이 생겨요.', where: '트리 추적표의 조건 바꾸기' },
      { term: '과대적합', en: 'overfitting', plain: '학습 데이터에 너무 딱 맞춰 새 데이터는 오히려 잘 못 맞히는 것.', where: '✅ 정리' },
    ],
  },
];

export function glossaryEntries() {
  return GLOSSARY.flatMap((g) => g.items.map((it) => ({ ...it, group: g.group })));
}

/** 낱말로 찾기 (용어·영어·설명 어디에 있어도 걸린다) */
export function searchGlossary(query) {
  const q = query.trim().toLowerCase();
  if (!q) return GLOSSARY;
  return GLOSSARY
    .map((g) => ({
      group: g.group,
      items: g.items.filter((it) => `${it.term} ${it.en} ${it.plain} ${it.where}`.toLowerCase().includes(q)),
    }))
    .filter((g) => g.items.length > 0);
}
