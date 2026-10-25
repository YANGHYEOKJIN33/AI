/**
 * k-최근접 이웃 보기 — 그림(산점도)과 자료구조 흐름을 그린다.
 *
 *   [학습 데이터 표] ➜ [distances 리스트] ➜ [neighbors 리스트] ➜ [votes 딕셔너리] ➜ 예측
 *        행 복사(append)      sort()로 미끄러짐     앞 k개 복사([:k])     레이블 토큰 이동(+1)
 */
import { el } from '../dom.js';
import { createPlot } from '../plot.js';
import { sbox, flowArrow, chip, mark } from '../structures.js';
import { fmt } from '../../core/math.js';
import { FOOD_LABELS, FOOD_AXES } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const TARGET_NAME = { distances: 'distances', neighbors: 'neighbors', votes: 'votes', result: '결과' };

function labelMark(label) {
  const l = LABEL[label];
  return mark(l.shape, l.cat);
}

export default {
  stageTitle: '산점도 — 단맛 × 아삭함',
  targetName: (t) => TARGET_NAME[t] ?? t,

  intro: {
    question: '새 음식 토마토(단맛 6, 아삭함 4)는 과일·채소·단백질 중 무엇과 닮았을까?',
    input: '학습 데이터 9개(단맛, 아삭함 → 레이블), 질문점, k',
    output: '질문점의 레이블(예측)',
    tips: [
      '거리는 d² = Δx² + Δy²로 비교해도 순서가 같아요 (√를 안 해도 돼요).',
      'distances에는 표 순서대로 추가되고, 정렬한 뒤에야 가까운 순서가 돼요.',
      '이웃 = 정렬된 distances의 0번부터 k−1번까지. 투표는 딕셔너리 {레이블: 표 수}.',
    ],
  },
  introBoxes: ['train'],

  createPlot() {
    return createPlot({
      x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max],
      width: 320, height: 296, xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`,
      ariaLabel: '음식의 단맛과 아삭함 산점도',
    });
  },

  shapes(v) {
    const { ds, data } = v;
    const q = ds.query;
    const shapes = [];
    const computed = new Map(ds.distances.map((d) => [d.id, d]));
    const nbIds = new Set(ds.neighbors.map((n) => n.id));
    const radius = ds.neighbors.length ? ds.neighbors[ds.neighbors.length - 1].d : 0;

    // 이웃 원 — 앞에서 k개를 고르는 순간 반지름 0에서 자라난다
    shapes.push({ key: 'ring', kind: 'circle', cx: q.x, cy: q.y, r: radius ? radius + 0.12 : 0, cls: 'nb-ring' });

    // 거리를 잰 점까지의 선
    for (const row of data.train) {
      if (!computed.has(row.id)) continue;
      const cls = row.id === ds.cur ? 'dline is-cur' : nbIds.has(row.id) ? 'dline is-nb' : 'dline';
      shapes.push({ key: `l-${row.id}`, kind: 'line', x1: q.x, y1: q.y, x2: row.x, y2: row.y, cls });
    }
    // 지금 재는 거리의 값
    const cur = data.train.find((r) => r.id === ds.cur);
    if (cur && computed.has(cur.id)) {
      shapes.push({ key: 'dtext', kind: 'text', x: (q.x + cur.x) / 2, y: (q.y + cur.y) / 2, dy: -6,
        text: `d = ${fmt(computed.get(cur.id).d)}`, cls: 'dtext' });
    } else if (cur) {
      shapes.push({ key: `l-${cur.id}`, kind: 'line', x1: q.x, y1: q.y, x2: cur.x, y2: cur.y, cls: 'dline is-cur is-measuring' });
    }

    for (const row of data.train) {
      const l = LABEL[row.label];
      const cls = [`cat-${l.cat}`, row.id === ds.cur ? 'is-cur' : '', nbIds.has(row.id) ? 'is-nb' : ''].join(' ');
      shapes.push({ key: `p-${row.id}`, kind: 'point', x: row.x, y: row.y, shape: l.shape, size: nbIds.has(row.id) ? 7 : 5.5,
        cls, label: row.name, title: `${row.name} (${row.x}, ${row.y}) · ${row.label}` });
    }
    const resultCat = ds.result ? `cat-${LABEL[ds.result].cat}` : '';
    shapes.push({ key: 'q', kind: 'point', x: q.x, y: q.y, shape: 'star', size: 8.5, cls: `query ${resultCat}`,
      label: ds.result ? `${q.name} = ${ds.result}` : `${q.name}?`, title: `질문점 (${q.x}, ${q.y})` });
    return shapes;
  },

  legend() {
    return el('div.legend', {},
      ...FOOD_LABELS.map((l, i) => el('span.legend__item', {}, mark(l.shape, String(i + 1)), l.id)),
      el('span.legend__item', {}, el('span.mark.mark--query', {}, '★'), '질문점'),
      el('span.legend__item', {}, el('span.mark.mark--ring', {}, '◯'), '이웃 원'));
  },

  data(v, { boxes }) {
    const { ds, data, frame } = v;
    const nbIds = new Set(ds.neighbors.map((n) => n.id));

    // ① 학습 데이터 표 — 행마다 data-flip이 있어 distances로 복사될 때 출발점이 된다
    const table = el('table.dtable', {},
      el('thead', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, '이름'), el('th', {}, '단맛'), el('th', {}, '아삭'), el('th', {}, '레이블'),
        boxes.has('distances') ? el('th', {}, 'd²') : null)),
      el('tbody', {}, data.train.map((r, i) => el(`tr${r.id === ds.cur ? '.is-cur' : ''}`, { 'data-flip': `row-${r.id}` },
        el('td.num', {}, String(i)), el('td', {}, r.name), el('td.num', {}, String(r.x)), el('td.num', {}, String(r.y)),
        el('td', {}, labelMark(r.label), ' ', r.label),
        boxes.has('distances') ? el('td.num', {}, ds.distances.find((d) => d.id === r.id) ? String(ds.distances.find((d) => d.id === r.id).d2) : '') : null))));

    // ② distances — (d, 레이블) 튜플의 리스트
    const dist = ds.distances.map((d, i) => chip({
      flip: `d-${d.id}`, from: `row-${d.id}`, cat: LABEL[d.label].cat,
      cls: `tuple${nbIds.has(d.id) ? ' is-picked' : ''}${frame.action === 'append' && i === ds.distances.length - 1 ? ' is-new' : ''}`,
      title: `${d.name}: 거리 ${fmt(d.d)}, 레이블 ${d.label}`,
    },
    el('span.tuple__idx', {}, String(i)),
    el('span.tuple__val', {}, `(${fmt(d.d)}, `, labelMark(d.label), ` ${d.label})`),
    el('span.tuple__name', {}, `${d.name} · d² ${d.d2}`)));

    // ③ neighbors — 앞 k개를 복사
    const nbs = ds.neighbors.map((n, i) => chip({
      flip: `nb-${n.id}`, from: `d-${n.id}`, cat: LABEL[n.label].cat,
      cls: `tuple${ds.voting === n.id ? ' is-cur' : ''}`,
    },
    el('span.tuple__idx', {}, String(i)),
    el('span.tuple__val', {}, `(${fmt(n.d)}, `, labelMark(n.label), ` ${n.label})`),
    el('span.tuple__name', {}, `${n.name} · d² ${n.d2}`)));

    // ④ votes — 키(레이블) : 값(표 수). 표 하나하나를 토큰으로 그려 이웃에서 날아오게 한다
    const counted = [];
    const votedIdx = ds.voting ? ds.neighbors.findIndex((n) => n.id === ds.voting) : (ds.result ? ds.neighbors.length - 1 : -1);
    ds.neighbors.forEach((n, i) => { if (i <= votedIdx) counted.push(n); });
    const votes = ds.votes.map((vt) => el(`div.kv${ds.voting && ds.neighbors.find((n) => n.id === ds.voting)?.label === vt.label ? '.is-cur' : ''}${ds.result === vt.label ? '.is-win' : ''}`, { 'data-cat': LABEL[vt.label].cat },
      el('span.kv__key', {}, labelMark(vt.label), ` "${vt.label}"`),
      el('span.kv__colon', {}, ':'),
      el('span.kv__tokens', {}, counted.filter((n) => n.label === vt.label)
        .map((n) => chip({ flip: `v-${n.id}`, from: `nb-${n.id}`, cls: 'token', cat: LABEL[n.label].cat, title: n.name }, '●'))),
      el('strong.kv__val', {}, String(vt.count))));

    const resultBox = ds.result
      ? el('div.answer', { 'data-cat': LABEL[ds.result].cat }, el('span.answer__label', {}, '예측'), labelMark(ds.result), ` ${ds.result}`)
      : null;

    // 이 쪽에 필요한 상자만 차례로 잇는다
    const parts = [];
    const add = (box, arrow) => { if (parts.length && arrow) parts.push(flowArrow(arrow)); parts.push(box); };
    if (boxes.has('train')) add(sbox({ target: 'train', name: 'train', kind: '표', title: '학습 데이터', frame, cls: 'sbox--table' }, table));
    if (boxes.has('distances')) add(sbox({ target: 'distances', name: 'distances', kind: '리스트', title: ds.sorted ? '정렬됨 ✓' : '추가한 순서', frame,
      count: ds.distances.length, hint: '비어 있음', cls: 'sbox--list' }, dist), '추가');
    if (boxes.has('neighbors')) add(sbox({ target: 'neighbors', name: '이웃', kind: '리스트', frame,
      hint: '비어 있음', cls: 'sbox--list' }, nbs), `앞 ${ds.k}개`);
    if (boxes.has('votes')) {
      add(el('div.flow__col', {},
        sbox({ target: 'votes', name: 'votes', kind: '딕셔너리', frame,
          hint: frame.line >= 7 ? '{ }' : '아직 없음', cls: 'sbox--dict' }, votes),
        resultBox ? sbox({ target: 'result', name: '결과', title: '예측', frame, cls: 'sbox--result' }, resultBox) : null), '레이블 세기');
    }
    return el('div.flow.flow--knn', {}, parts);
  },
};
