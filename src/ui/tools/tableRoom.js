/**
 * 2쪽 · 표 = 리스트의 리스트.
 *   파이썬 코드(data = [[…], …])  ➜  표(행 = 샘플, 열 = 특징·레이블)  ➜  산점도(행 하나 = 점 하나)
 * append로 한 줄을 붙이면 세 곳에 동시에 나타나고, 행·칸을 누르면 data[i]·data[i][j]를 보여 준다.
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { roomShell, btn, quizBox, algoLinks } from './common.js';
import { FOODS, FOOD_LABELS, FOOD_AXES } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const START = 5;
const COLS = ['이름', '단맛', '아삭함', '레이블'];
const ROLE = ['이름표', '특징 x₁', '특징 x₂', '레이블 y'];
const py = (r) => `['${r.name}', ${r.x}, ${r.y}, '${r.label}']`;

export function createTableRoom({ store }) {
  const root = el('div');
  const flip = createFlip();
  let n = START;
  let sel = null;   // { i, j }
  let justAdded = null;
  let msg = null;
  let picked = null;
  const plot = createPlot({
    x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 300, height: 280,
    xLabel: `${FOOD_AXES.x} (data[i][1]) →`, yLabel: `${FOOD_AXES.y} (data[i][2]) →`, ariaLabel: '표의 행을 점으로 찍은 산점도',
  });

  const rows = () => FOODS.slice(0, n);
  const quiz = { q: 'data[2][1]의 값은? (파이썬은 0부터 세요)', options: ['10', '8', '1', '6'], answer: 1,
    why: 'data[2]는 세 번째 줄 [\'포도\', 8, 6, \'과일\'], 그중 [1]은 두 번째 칸 = 단맛 8이에요.' };

  function append() {
    if (n >= FOODS.length) { msg = { tone: 'warn', text: '준비한 음식 12개를 모두 넣었어요.' }; render(); return; }
    n += 1;
    justAdded = n - 1;
    const r = FOODS[n - 1];
    msg = { tone: 'ok', text: `data.append(${py(r)}) — 표 맨 아래에 ${n - 1}번 줄이 생기고, 그림에 점 하나가 찍혔어요. 이제 len(data) = ${n}.` };
    render();
  }
  function reset() { n = START; sel = null; justAdded = null; msg = null; render(); }
  function choose(i, j = null) {
    sel = { i, j };
    const r = FOODS[i];
    const vals = [r.name, r.x, r.y, r.label];
    msg = j === null
      ? { tone: 'info', text: `data[${i}] = ${py(r)} — ${i}번 줄 전체(샘플 하나)예요.` }
      : { tone: 'info', text: `data[${i}][${j}] = ${typeof vals[j] === 'string' ? `'${vals[j]}'` : vals[j]} — ${i}번 줄의 ${j}번 칸(${COLS[j]}, ${ROLE[j]})이에요.` };
    render();
  }

  function render() {
    const list = rows();
    plot.update(list.map((r, i) => ({
      key: r.id, kind: 'point', x: r.x, y: r.y, shape: LABEL[r.label].shape, size: sel?.i === i ? 8 : 6,
      cls: `cat-${LABEL[r.label].cat}${sel?.i === i ? ' is-cur' : ''}`, label: r.name,
    })));

    const code = el('pre.troom__code', {},
      el('code.troom__codeline', {}, 'data = ['),
      list.map((r, i) => el(`code.troom__codeline${sel?.i === i ? '.is-on' : ''}${justAdded === i ? '.is-new' : ''}`, {
        'data-flip': `code-${r.id}`, 'data-enter': 'up', onclick: () => choose(i),
      }, `    ${py(r)},   # ${i}`)),
      el('code.troom__codeline', {}, ']'));

    const table = el('table.dtable.dtable--big', {},
      el('thead', {},
        el('tr', {}, el('th', {}, 'i'), COLS.map((c, j) => el('th', {}, `[${j}] ${c}`))),
        el('tr.dtable__roles', {}, el('th', {}, ''), ROLE.map((c) => el('th', {}, c)))),
      el('tbody', {}, list.map((r, i) => el(`tr${sel?.i === i ? '.is-cur' : ''}${justAdded === i ? '.is-new' : ''}`, {
        'data-flip': `row-${r.id}`, 'data-enter': 'up',
      },
      el('td.num', {}, el('button.linkbtn', { type: 'button', onclick: () => choose(i), title: `data[${i}] 보기` }, String(i))),
      [r.name, r.x, r.y, r.label].map((val, j) => el(`td${typeof val === 'number' ? '.num' : ''}${sel?.i === i && sel?.j === j ? '.is-hot' : ''}`, {
        onclick: () => choose(i, j), title: `data[${i}][${j}]`, style: 'cursor:pointer',
      }, j === 3 ? [mark(LABEL[val].shape, LABEL[val].cat), ` ${val}`] : String(val)))))));

    fill(root, roomShell({
      icon: '📋', title: '표 = 리스트의 리스트',
      rule: '행(줄) 하나 = 샘플 하나, 열(칸) = 특징 또는 레이블. data[i]는 i번 줄, data[i][j]는 i번 줄의 j번 칸이에요.',
      controls: [
        btn(`➕ data.append(…)  (${n}/${FOODS.length})`, append, { primary: true, disabled: n >= FOODS.length }),
        btn('↺ 처음으로', reset),
        el('span.troom__hint', {}, '표의 번호·칸이나 코드 줄을 눌러 보세요'),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '🐍 파이썬 코드'), code),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {}, el('div.tflow__cap', {}, `📋 표로 보면 — len(data) = ${n}`), table),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 그림으로 보면 — 행 하나 = 점 하나'), el('div.tplot', {}, plot.svg))),
      message: msg,
      quiz: quizBox(quiz, picked, (i) => { picked = i; choose(2, 1); }),
      links: algoLinks(store, [['knn', '학습 데이터 train'], ['kmeans', '집 위치 points'], ['linreg', 'X, Y 열'], ['dtree', '14일 기록 rows']]),
    }));
    flip(root);
    justAdded = null;
  }

  return { node: root, render };
}
