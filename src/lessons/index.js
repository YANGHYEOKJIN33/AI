/**
 * 차시 목록 — 수업 홈 · 수업 화면 · 교사용 화면이 함께 쓴다.
 * ready  : 슬라이드형 수업 화면(class.html)이 있는 차시 — PLAN-v4에서 거두는 중
 * teacher: 교사용 자료(teacher.html)에 활동지 · 정답지 · 대본이 있는 차시 (ready인 차시도 포함)
 */
export const LESSONS = [
  { id: 'knn', badge: '1차시', title: 'k-최근접 이웃', emoji: '📍', brief: '거리 재기 → 정렬 → k개 → 투표', structures: '리스트 · 딕셔너리', ready: true, load: () => import('./knn.js') },
  { id: 'kmeans', badge: '2차시', title: 'k-평균 군집', emoji: '🎯', brief: '묶음에 나누기 → 평균 → 반복', structures: '리스트의 리스트', ready: false, teacher: true, load: () => import('../site/kmeans.js') },
  { id: 'linreg', badge: '3 · 4차시', title: '선형회귀', emoji: '📈', brief: '직선 · 예측 → 오차 → 손실 → 기울기 → 갱신', structures: '리스트(열) · 변수 · 기록 리스트', ready: false, teacher: true, load: () => import('../site/linreg.js') },
  { id: 'dtree1', badge: '5차시', title: '의사결정트리 ①', emoji: '🌳', brief: '나누기 → 불순도 → 질문 고르기', structures: '딕셔너리(묶음 · 점수표)', ready: false },
  { id: 'dtree2', badge: '6차시', title: '의사결정트리 ②', emoji: '🌳', brief: '재귀 · 호출 스택 → 트리 완성', structures: '스택', ready: false },
];
/** 차시는 아니지만 수업 화면으로 여는 것 */
export const EXTRAS = [
  { id: 'check', badge: '점검', title: '교실 가독성 점검', ready: true, load: () => import('./check.js') },
];
export const findLesson = (id) => [...LESSONS, ...EXTRAS].find((l) => l.id === id) ?? null;
