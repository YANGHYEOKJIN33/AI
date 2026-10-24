/**
 * 📦 2쪽 · 표 = 리스트의 리스트.
 *   리스트로 쓴 모습  ➜  표(행 = 샘플, 열 = 특징·레이블)  ➜  산점도(행 하나 = 점 하나)
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { missionShell, btn, quizBox, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { FOODS, FOOD_LABELS, FOOD_AXES } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const START = 4;
const COLS = ['이름', '단맛', '아삭함', '레이블'];
const ROLE = ['이름표', '특징 ①', '특징 ②', '레이블(정답)'];
const asList = (r) => `['${r.name}', ${r.x}, ${r.y}, '${r.label}']`;

const STEPS = [
  { id: 'append', do: '➕ "한 줄 추가"를 누르세요.', see: '표 맨 아래, 리스트 맨 뒤, 그림에 같은 데이터가 동시에 생겨요.' },
  { id: 'row', do: '표 왼쪽의 번호(0, 1, 2 …) 하나를 누르세요.', see: 'data[i] = i번 줄 전체 = 음식 하나(샘플).' },
  { id: 'cell', do: '표의 칸 하나를 누르세요.', see: 'data[i][j] = i번 줄의 j번 칸. 번호는 0부터 세요.' },
  { id: 'quiz', do: '🔮 맞혀 보기 문제를 푸세요.', see: '줄 번호 먼저, 칸 번호 나중.' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '알고리즘이 이 표를 한 줄씩 꺼내 쓰는 장면이에요.' },
];
const LEARNED = [
  '표의 한 줄 = 샘플(데이터) 하나, 한 칸 = 특징 또는 레이블.',
  'data[i]는 줄, data[i][j]는 칸 — 번호는 0부터.',
  '네 알고리즘 모두 이 표에서 출발해 한 줄씩 꺼내 써요.',
];

export function createTableRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('table', STEPS, store);
  let n = START;
  let sel = null;
  let justAdded = null;
  let msg = null;
  let picked = null;
  let peek = false;
  const plot = createPlot({
    x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 300, height: 280,
    xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`, ariaLabel: '표의 행을 점으로 찍은 산점도',
  });
  const quiz = { q: `data[2][1]의 값은? (0번 줄부터 세요)`, options: [String(FOODS[2].x), String(FOODS[1].x), String(FOODS[2].y), FOODS[2].name], answer: 0,
    why: `data[2] = ${asList(FOODS[2])} (세 번째 줄), 그중 [1]은 두 번째 칸 = 단맛 ${FOODS[2].x}.` };

  function append() {
    if (n >= FOODS.length) return;
    n += 1;
    justAdded = n - 1;
    mission.complete('append');
    msg = { tone: 'ok', text: `data에 ${asList(FOODS[n - 1])}를 추가했어요 → ${n - 1}번 줄. 이제 줄이 ${n}개.` };
    render();
  }
  function choose(i, j = null) {
    sel = { i, j };
    const r = FOODS[i];
    const vals = [r.name, r.x, r.y, r.label];
    if (j === null) {
      mission.complete('row');
      msg = { tone: 'info', text: `data[${i}] = ${asList(r)} — ${i}번 줄 전체, 음식 하나(샘플)예요.` };
    } else {
      mission.complete('cell');
      msg = { tone: 'info', text: `data[${i}][${j}] = ${typeof vals[j] === 'string' ? `'${vals[j]}'` : vals[j]} — ${i}번 줄의 ${j}번 칸(${COLS[j]}, ${ROLE[j]}).` };
    }
    render();
  }
  function reset() { n = START; sel = null; justAdded = null; msg = null; picked = null; mission.reset(); render(); }

  function render() {
    const list = FOODS.slice(0, n);
    plot.update(list.map((r, i) => ({
      key: r.id, kind: 'point', x: r.x, y: r.y, shape: LABEL[r.label].shape, size: sel?.i === i ? 8 : 6,
      cls: `cat-${LABEL[r.label].cat}${sel?.i === i ? ' is-cur' : ''}`, label: r.name,
    })));
    const asCode = el('pre.troom__code', {},
      el('code.troom__codeline', {}, 'data = ['),
      list.map((r, i) => el(`code.troom__codeline${sel?.i === i ? '.is-on' : ''}${justAdded === i ? '.is-new' : ''}`, {
        'data-flip': `code-${r.id}`, 'data-enter': 'up',
      }, `  ${asList(r)},   ← ${i}번`)),
      el('code.troom__codeline', {}, ']'));
    const table = el('table.dtable.dtable--big', {},
      el('thead', {},
        el('tr', {}, el('th', {}, '번호'), COLS.map((c, j) => el('th', {}, `[${j}] ${c}`))),
        el('tr.dtable__roles', {}, el('th', {}, ''), ROLE.map((c) => el('th', {}, c)))),
      el('tbody', {}, list.map((r, i) => el(`tr${sel?.i === i ? '.is-cur' : ''}${justAdded === i ? '.is-new' : ''}`, { 'data-flip': `row-${r.id}`, 'data-enter': 'up' },
        el('td.num', {}, el(`button.rowbtn${mission.isNext('row') ? '.is-next' : ''}`, { type: 'button', onclick: () => choose(i), title: `data[${i}] 보기` }, String(i))),
        [r.name, r.x, r.y, r.label].map((val, j) => el(`td.cellbtn${typeof val === 'number' ? '.num' : ''}${sel?.i === i && sel?.j === j ? '.is-hot' : ''}${mission.isNext('cell') ? '.is-next-cell' : ''}`, {
          onclick: () => choose(i, j), title: `data[${i}][${j}]`,
        }, j === 3 ? [mark(LABEL[val].shape, LABEL[val].cat), ` ${val}`] : String(val)))))));

    fill(root, missionShell({
      icon: '📋', title: '표 = 리스트의 리스트',
      mission: mission.view({ goal: '데이터 표에서 줄(샘플)과 칸(특징·레이블)을 data[i][j]로 짚을 수 있어요.', learned: LEARNED }),
      controls: [
        btn(`➕ 한 줄 추가 (${n}/${FOODS.length})`, append, { primary: true, disabled: n >= FOODS.length, next: mission.isNext('append') }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col.tflow__col--grow', {}, el('div.tflow__cap', {}, `📋 표 — 줄 ${n}개`), table),
        el('div.tflow__arrow', {}, '='),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📝 리스트로 쓰면 (리스트 안에 리스트)'), asCode),
        el('div.tflow__arrow', {}, '='),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 그림으로 보면 (줄 하나 = 점 하나)'), el('div.tplot', {}, plot.svg))),
      message: msg,
      quiz: mission.has('cell') || mission.has('quiz') ? quizBox(quiz, picked, (i) => { picked = i; mission.complete('quiz'); choose(2, 1); }, { next: mission.isNext('quiz') }) : null,
      connect: connectSection({ mission, cards: CONNECTIONS.table, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
    justAdded = null;
  }

  return { node: root, render };
}
