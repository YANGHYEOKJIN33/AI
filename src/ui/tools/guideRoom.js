/**
 * 📦 1쪽 · 안내 — 이 탭에서 무엇을 하고 무엇을 배우는지 한눈에.
 * 도구 카드마다 "할 일 · 배우는 것 · 쓰이는 곳"과 미션을 마쳤는지(✓)를 보여 주고 바로 그 쪽으로 보낸다.
 */
import { el, fill } from '../dom.js';
import { ALGO_ICON } from '../topbar.js';
import { ALGO_ORDER, getAlgorithm } from '../../core/algorithms/index.js';
import { TOOLS } from '../../app/lesson.js';

export const DATA_FLOW = {
  knn: '표 ➜ distances(리스트에 추가) ➜ 정렬 ➜ 앞에서 k개 ➜ votes(딕셔너리) ➜ 가장 많은 것',
  kmeans: '대기 줄 ➜ 묶음 리스트로 이동 ➜ 묶음 평균 ➜ 새 중심 ➜ 중심 교체 (반복)',
  linreg: 'x ➜ 예측·오차 리스트 ➜ 평균 ➜ 손실·dw·db 변수 ➜ w·b 갱신 ➜ 손실 기록 (반복)',
  dtree: '행 ➜ 값별 묶음 ➜ 레이블 세기 ➜ 점수표(딕셔너리) ➜ 가장 작은 것 ➜ 재귀 호출 = 스택',
};

const CARDS = [
  { id: 'table', icon: '📋', name: '표 = 리스트의 리스트', todo: '줄을 추가하고 data[i][j]를 짚어 봐요', learn: '줄 = 샘플, 칸 = 특징·레이블', algos: ['knn', 'kmeans', 'linreg', 'dtree'] },
  { id: 'distance', icon: '📏', name: '거리 재기', todo: '두 점의 d²을 한 단계씩 계산해요', learn: '가까운지 비교는 d²으로', algos: ['knn', 'kmeans'] },
  { id: 'sort', icon: '🔃', name: '정렬하고 앞에서 k개', todo: '카드를 정렬하고 앞에서 k장을 잘라요', learn: '정렬 후 0번 = 가장 가까운 것', algos: ['knn'] },
  { id: 'dict', icon: '🗳', name: '딕셔너리로 세기', todo: '레이블 토큰을 하나씩 세요', learn: '새 키 / 값 +1, 가장 큰 값 = 다수결', algos: ['knn', 'dtree'] },
  { id: 'group', icon: '🧺', name: '묶음으로 나누고 평균', todo: '규칙대로 점을 나누고 평균을 내요', learn: '묶음 = 리스트, 평균 = 새 중심', algos: ['kmeans', 'dtree'] },
  { id: 'update', icon: '🔁', name: '조금씩 고쳐 가기', todo: '학습률을 바꿔 가며 값을 갱신해요', learn: '기울기 반대로, 너무 크면 발산', algos: ['linreg', 'kmeans'] },
];

export function createGuideRoom({ store }) {
  const root = el('div.troom.troom--guide');

  function render() {
    const doneMap = store.get().toolsDone ?? {};
    const doneCount = CARDS.filter((c) => doneMap[c.id]).length;
    const go = (id) => store.set({ toolsStep: TOOLS.findIndex((t) => t.id === id) });
    const nextCard = CARDS.find((c) => !doneMap[c.id]);
    fill(root,
      el('div.guide', {},
        el('h3.guide__h', {}, '📦 이 탭에서 할 일'),
        el('ol.guide__how', {},
          el('li', {}, el('strong', {}, '도구 6개를 차례로 '), '열어, 왼쪽 ', el('strong', {}, '🎯 미션'), '을 1번부터 따라 해요. ', el('span.guide__em', {}, '다음에 누를 단추가 반짝여요.')),
          el('li', {}, '미션을 마치면 ', el('strong', {}, '🎓 배운 것'), '이 정리되고, ', el('strong', {}, '🤖 알고리즘 속에서는'), ' 카드가 열려요.'),
          el('li', {}, '카드의 ', el('strong', {}, '"그 장면 보러 가기"'), '를 누르면 그 도구가 실제 알고리즘에서 움직이는 장면으로 가요.')),
        el('div.guide__progress', {}, `미션 완료 ${doneCount} / ${CARDS.length}`,
          el('span.guide__bar', {}, el('span.guide__fill', { style: `width:${(doneCount / CARDS.length) * 100}%` })),
          nextCard ? el('button.pill.ctrl--primary.is-next', { type: 'button', onclick: () => go(nextCard.id) }, `${nextCard.icon} ${nextCard.name} 시작 →`) : el('strong', {}, '🎉 모두 마쳤어요! 🤖 알고리즘 탭으로 가요.')),
      ),
      el('div.toolcards', {}, CARDS.map((c, i) => el(`article.toolcard${doneMap[c.id] ? '.is-done' : ''}`, {},
        el('div.toolcard__head', {},
          el('span.toolcard__no', {}, doneMap[c.id] ? '✓' : String(i + 2)),
          el('span.toolcard__icon', { 'aria-hidden': 'true' }, c.icon),
          el('h4.toolcard__name', {}, c.name)),
        el('div.toolcard__row', {}, el('span.toolcard__cap', {}, '할 일'), c.todo),
        el('div.toolcard__row', {}, el('span.toolcard__cap', {}, '배우는 것'), c.learn),
        el('div.toolcard__row', {}, el('span.toolcard__cap', {}, '쓰이는 곳'), c.algos.map((a) => el('span.tag', {}, `${ALGO_ICON[a]} ${getAlgorithm(a).meta.short}`))),
        el('button.pill', { type: 'button', onclick: () => go(c.id) }, doneMap[c.id] ? '다시 하기' : '시작 →')))),
      el('details.guide__more', {},
        el('summary', {}, '🗺 네 알고리즘의 데이터 이동 한 줄 요약 (펼치기)'),
        el('ul.guide__flows', {}, ALGO_ORDER.map((id) => el('li', {}, el('strong', {}, `${ALGO_ICON[id]} ${getAlgorithm(id).meta.name}: `), DATA_FLOW[id])))),
    );
  }

  return { node: root, render };
}
