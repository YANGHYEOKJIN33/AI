/**
 * 1쪽 · 복습 지도 — 네 알고리즘 카드 + 도구 × 알고리즘 표.
 * "같은 도구를 다르게 조합했다"는 것을 한눈에 보여 준다.
 */
import { el, fill } from '../dom.js';
import { ALGO_ICON } from '../topbar.js';
import { ALGO_ORDER, getAlgorithm } from '../../core/algorithms/index.js';
import { TOOLS } from '../../app/lesson.js';
import { infoTerm } from '../infoTip.js';

export const DATA_FLOW = {
  knn: '표 ➜ distances(리스트에 append) ➜ sort ➜ [:k] ➜ votes(딕셔너리) ➜ max',
  kmeans: '대기 줄 ➜ clusters[c](묶음 리스트로 이동) ➜ 평균 ➜ new ➜ centroids 교체 (반복)',
  linreg: 'X ➜ pred·err 리스트 ➜ 평균 ➜ loss·dw·db 변수 ➜ w·b 갱신 ➜ history.append (반복)',
  dtree: 'rows ➜ groups(값별 묶음) ➜ 레이블 세기 ➜ score 딕셔너리 ➜ min ➜ build() 재귀 = 스택',
};

const STORY = {
  knn: '토마토는 과일·채소·단백질 중 무엇과 닮았을까?',
  kmeans: '집 10채에 배달 거점 3곳을 어디에 둘까?',
  linreg: '공부 시간으로 퀴즈 점수를 예측하는 직선은?',
  dtree: '오늘 운동장에서 축구를 할까?',
};

/** 도구 × 알고리즘 — 칸에 적힌 것은 그 알고리즘에서 맡는 일 */
const MATRIX = [
  { tool: 'table',    name: '📋 표(2차원 리스트)', uses: { knn: '학습 데이터', kmeans: '집 위치', linreg: 'x, y 열', dtree: '14일 기록' } },
  { tool: 'distance', name: '📏 거리',            uses: { knn: '질문점 ↔ 데이터', kmeans: '점 ↔ 중심' } },
  { tool: 'sort',     name: '🔃 정렬·[:k]',        uses: { knn: '가까운 k개' } },
  { tool: 'dict',     name: '🗳 딕셔너리 세기',     uses: { knn: '다수결 투표', dtree: '레이블 세기·점수표' } },
  { tool: 'group',    name: '🧺 묶음·평균',        uses: { kmeans: '할당·새 중심', linreg: '오차 평균(손실)', dtree: '값별로 나누기' } },
  { tool: 'update',   name: '🔁 갱신·기록',        uses: { kmeans: '중심 교체·수렴', linreg: 'w·b 갱신·history' } },
  { tool: null,       name: '📚 스택(재귀)',        uses: { dtree: '호출 스택' } },
];

export function createMapRoom({ store }) {
  const root = el('div.troom.troom--map');

  function render() {
    fill(root,
      el('div.mapcards', {}, ALGO_ORDER.map((id) => {
        const m = getAlgorithm(id).meta;
        return el('article.mapcard', {},
          el('div.mapcard__head', {},
            el('span.mapcard__icon', { 'aria-hidden': 'true' }, ALGO_ICON[id]),
            el('div', {}, el('h3.mapcard__name', {}, m.name), el('div.mapcard__en', {}, m.en))),
          el('div.mapcard__tags', {},
            el('span.tag', {}, infoTerm(m.task, { strong: true })),
            el('span.tag', {}, infoTerm(m.learning, { strong: true }))),
          el('p.mapcard__story', {}, `“${STORY[id]}”`),
          el('div.mapcard__flowcap', {}, '데이터 이동'),
          el('p.mapcard__flow', {}, DATA_FLOW[id]),
          el('button.pill.ctrl--primary', { type: 'button', onclick: () => store.set({ mode: 'algo', algoTab: id, algoStep: 0 }) }, '복습하러 가기 →'),
        );
      })),
      el('h3.troom__subtitle', {}, '🧰 도구 × 알고리즘 — 같은 도구를 서로 다르게 조합해요 (도구 이름을 누르면 그 쪽으로)'),
      el('div.matrixwrap', {},
        el('table.matrix', {},
          el('thead', {}, el('tr', {}, el('th', {}, '도구'), ALGO_ORDER.map((id) => el('th', {}, `${ALGO_ICON[id]} ${getAlgorithm(id).meta.short}`)))),
          el('tbody', {}, MATRIX.map((row) => el('tr', {},
            el('th', {}, row.tool
              ? el('button.linkbtn', { type: 'button', onclick: () => store.set({ toolsStep: TOOLS.findIndex((t) => t.id === row.tool) }) }, row.name)
              : row.name),
            ALGO_ORDER.map((id) => el(`td${row.uses[id] ? '.is-used' : ''}`, {}, row.uses[id] ? `✓ ${row.uses[id]}` : '')))))),
      ),
    );
  }

  return { node: root, render };
}
