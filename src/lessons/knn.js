/**
 * 1차시 · k-최근접 이웃 — 수업 장면 43개 (docs/plan-v3/SCENES.md의 1차시).
 *
 * 숫자는 손으로 적지 않는다. 모두 엔진(core/algorithms/knn.js)이 실제로 실행한 기록에서 가져온다.
 * 박자 하나에 화면의 한 곳만 바뀐다: 지금 줄 → 계산 → 데이터 이동(+ 자막).
 */
import { el } from '../ui/dom.js';
import { createPlot } from '../ui/plot.js';
import { ALGORITHMS } from '../core/algorithms/index.js';
import { FOOD_AXES } from '../core/datasets.js';
import { dsBox, cell, pairValue, calcLines, labelMark, labelInfo, plotBox } from '../deck/parts.js';
import { cover, say, ask, activity, codeMap, check, summary } from '../deck/kit.js';
import { josa } from '../core/josa.js';

/* ───────────── 엔진에서 가져오는 값 ───────────── */
const algo = ALGORITHMS.knn;
const run = algo.run(algo.defaults);
const F = run.frames;
const foods = run.data.train;                       // 표 순서 그대로
const q = F[0].ds.query;                            // 토마토 (6, 4)
const K = run.params.k;
const appended = F.filter((f) => f.action === 'append').map((f) => f.ds.distances);   // 한 칸씩 늘어나는 모습
const order = appended[appended.length - 1];        // 다 채운 distances (표 순서)
const sorted = F.find((f) => f.action === 'sort').ds.distances;
const neighbors = F.find((f) => f.action === 'slice').ds.neighbors;
const voteSteps = F.filter((f) => f.action === 'count').map((f) => f.ds.votes);
const result = F[F.length - 1].ds.result;
const resultOf = (k) => algo.run({ ...algo.defaults, k }).result;
const k1 = resultOf(1);
const k5 = resultOf(5);

const CODE = algo.pseudo(run.params).map((t) => t.replace(/(\S)\s{2,}/g, '$1  '));
const line = (n, what = null, swapK = null) => ({ no: n, code: (swapK ? CODE[n - 1].replace(`k = ${K}`, `k = ${swapK}`) : CODE[n - 1]).trim(), what });
const PARTS = ['① 거리 재기', '② 정렬', '③ k개 고르기', '④ 투표'];
const sq = (f) => ({ dx: q.x - f.x, dy: q.y - f.y, dx2: (q.x - f.x) ** 2, dy2: (q.y - f.y) ** 2 });
const votesText = (votes) => `{ ${votes.map((v) => `${v.label}: ${v.count}`).join(', ')} }`;
const ord = (i) => ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉'][i];

/** 테스트와 활동지가 함께 쓰는 값 */
export const facts = {
  query: q, k: K,
  order: order.map((d) => ({ name: d.name, label: d.label, d2: d.d2 })),
  sorted: sorted.map((d) => ({ name: d.name, label: d.label, d2: d.d2 })),
  votes: voteSteps[voteSteps.length - 1], result,
  k1: { votes: k1.votes, label: k1.label }, k5: { votes: k5.votes, label: k5.label },
};

/* ───────────── 이 차시의 부품 ───────────── */

/** 학습 데이터 표. cur = 지금 보는 줄, done = 이미 처리한 줄 수, hl = 강조(row | feat | label) */
function foodTable({ cur = -1, done = 0, hl = null, upTo = foods.length, width = 460 } = {}) {
  const c = (col) => (hl === col ? '.colhl' : '');
  return dsBox({ name: '학습 데이터', kind: '표', width },
    el('table.big', { style: 'width:100%' },
      el('tr', {}, el('th', {}, '이름'), el(`th${c('feat')}`, {}, '단맛'), el(`th${c('feat')}`, {}, '아삭함'), el(`th${c('label')}`, {}, '레이블')),
      foods.slice(0, upTo).map((f, i) => el(`tr${i === cur || (hl === 'row' && i === 0) ? '.cur' : i < done ? '.done' : ''}`, { 'data-flip': `row-${f.id}` },
        el('td', {}, f.name), el(`td.num${c('feat')}`, {}, String(f.x)), el(`td.num${c('feat')}`, {}, String(f.y)), el(`td${c('label')}`, {}, labelMark(f.label))))));
}

/** distances 리스트. fresh = 방금 들어온 칸 번호, ghost = 다음 빈칸을 점선으로 */
function distBox(items, { fresh = -1, ghost = false, hot = false, width = 580, hidden = false } = {}) {
  const box = dsBox({ name: 'distances', kind: `리스트 · ${items.length}칸`, hot, dense: true, width },
    items.map((d, i) => cell({ ix: i, value: pairValue(d.d2, d.label), name: d.name, state: i === fresh ? 'new' : '', flip: `d-${d.id}`, from: `row-${d.id}`, tag: i === fresh ? '방금 추가' : null })),
    ghost ? cell({ ix: items.length, value: '다음 칸', state: 'ghost' }) : null,
    items.length === 0 && !ghost ? cell({ value: '비어 있음', state: 'ghost' }) : null);
  if (hidden) box.classList.add('hidden');
  return box;
}

/** d² 계산 세 줄 (shown줄까지) */
function d2Calc(f, shown) {
  const s = sq(f);
  const d2 = order.find((d) => d.id === f.id).d2;
  return el('div.col', { style: 'flex:0 0 380px; gap:10px; align-items:stretch;' },
    el(`div.small${shown > 0 ? '' : '.hidden'}`, {}, `${q.name} (${q.x}, ${q.y}) ↔ ${f.name} (${f.x}, ${f.y})`),
    calcLines([`(${q.x}−${f.x})² = ${s.dx2}`, `(${q.y}−${f.y})² = ${s.dy2}`, `d² = ${s.dx2} + ${s.dy2} = ${d2}`], shown, { small: true }));
}

/** 거리 재기 구간의 공통 배치: 표 | 계산 | distances */
const distLayout = ({ cur, done, calc = null, items, fresh = -1, hot = false, listHidden = false }) => [
  foodTable({ cur, done }),
  calc ?? el('div', { style: 'flex:0 0 380px' }),
  distBox(items, { fresh, hot, ghost: items.length < 9 && !listHidden, hidden: listHidden }),
];

/** 가로로 늘어선 9칸 */
function strip(items, { prefix, from = null, pick = () => false, dim = false, hidden = false }) {
  return el(`div.strip${hidden ? '.hidden' : ''}`, { style: 'flex:1 1 auto;' }, items.map((d, i) => el(`div.sc.${labelInfo(d.label).cls}${pick(i) ? '.pick' : ''}${dim ? '.dimmed' : ''}`, {
    'data-flip': `${prefix}-${d.id}`, 'data-from': from ? `${from}-${d.id}` : null,
  }, String(d.d2), el('small', {}, d.name))));
}
const stripRow = (label, node, color = null) => el('div.row', { style: 'gap:18px; width:1510px;' }, el('span.striplabel', color ? { style: `color:${color}` } : {}, label), node);
const stripIndex = (hl = () => false) => stripRow('', el('div.stripix', { style: 'flex:1 1 auto;' }, sorted.map((_, i) => el('span', hl(i) ? { style: 'color:var(--blue)' } : {}, `[${i}]`))));

/** 정렬 전 → 후를 잇는 선 */
function connectors(show) {
  const col = (1372 - 12 * 8) / 9;
  const cx = (i) => col / 2 + i * (col + 12);
  const colorOf = { c1: '#c2255c', c2: '#0b7a69', c3: '#6741d9' };
  const paths = order.map((d, i) => {
    const j = sorted.findIndex((s) => s.id === d.id);
    const first = j === 0;
    return `<path d="M${cx(i)} 2C${cx(i)} 70 ${cx(j)} 50 ${cx(j)} 118" stroke="${first ? '#1857c4' : colorOf[labelInfo(d.label).cls]}" stroke-width="${first ? 9 : 5}" opacity="${first ? 1 : 0.7}"/>`;
  }).join('');
  return el(`div${show ? '' : '.hidden'}`, { style: 'width:1510px; padding-left:138px;', html: `<svg width="1372" height="120" viewBox="0 0 1372 120" style="display:block"><g fill="none" stroke-linecap="round">${paths}</g></svg>` });
}

/** 이웃 리스트 (세로) */
function neighborBox(items, { cur = -1, width = 520 } = {}) {
  return dsBox({ name: '이웃', kind: `리스트 · ${items.length}칸`, width },
    items.map((d, i) => cell({ ix: i, value: pairValue(d.d2, d.label), name: d.name, state: i === cur ? 'cur' : '', flip: `nb-${d.id}` })));
}

/**
 * votes 딕셔너리. counted = 지금까지 투표한 이웃들(토큰이 그 이웃 칸에서 날아온다)
 * fresh = 방금 생긴 키, bumped = 방금 +1 된 키, win = 가장 많은 키
 */
function votesBox(counted, { fresh = null, bumped = null, win = null, hot = false, width = 520, hidden = false } = {}) {
  const keys = [];
  for (const n of counted) { let k = keys.find((x) => x.label === n.label); if (!k) { k = { label: n.label, items: [] }; keys.push(k); } k.items.push(n); }
  const box = dsBox({ name: 'votes', kind: '딕셔너리 · 레이블 : 표 수', hot, width },
    keys.length === 0 ? cell({ value: '{ }  비어 있음', state: 'ghost' }) : keys.map((k) => el(`div.kv${k.label === win ? '.win' : k.label === fresh ? '.new' : k.label === bumped ? '.cur' : ''}`, {},
      labelMark(k.label), el('span', {}, ':'),
      el(`span.${labelInfo(k.label).cls}`, { style: 'display:flex; gap:8px;' }, k.items.map((n) => el('span.token', { 'data-flip': `tk-${n.id}`, 'data-from': `nb-${n.id}` }))),
      el('span.val', {}, k.label === bumped ? [el('span.old', {}, String(k.items.length - 1)), ' → '] : null, String(k.items.length)),
      k.label === fresh ? el('span.tagnew', {}, '새 키') : null)));
  if (hidden) box.classList.add('hidden');
  return box;
}
const answerBox = (label, shown = true) => el(`div.answerbox${shown ? '' : '.hidden'}`, { 'data-flip': shown ? 'answer' : null }, `예측: ${q.name} → `, labelMark(label));
const midArrow = () => el('div', { html: '<svg width="110" height="70" viewBox="0 0 110 70"><path d="M4 35h78" stroke="#1857c4" stroke-width="14" stroke-linecap="round"/><path d="M66 10l34 25-34 25" fill="none" stroke="#1857c4" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>' });

/** 산점도 — 장면마다 하나씩 만들어 두고, 박자마다 모양만 바꾼다(부드럽게 움직인다) */
function scatter() {
  let plot = null;
  return ({ points = foods.length, star = true, ranks = false, ring = 0, size = 590 } = {}) => {
    plot ??= createPlot({ x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 320, height: 296, tick: 2, xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`, ariaLabel: '음식의 단맛과 아삭함' });
    const shapes = [];
    const picked = new Set(sorted.slice(0, ring).map((d) => d.id));
    if (ring) shapes.push({ key: 'ring', kind: 'circle', cx: q.x, cy: q.y, r: Math.sqrt(sorted[ring - 1].d2) + 0.15, cls: 'nb-ring' });
    foods.slice(0, points).forEach((f) => {
      const l = labelInfo(f.label);
      const rank = sorted.findIndex((d) => d.id === f.id);
      if (ranks) shapes.push({ key: `l-${f.id}`, kind: 'line', x1: q.x, y1: q.y, x2: f.x, y2: f.y, cls: picked.has(f.id) ? 'dline is-nb' : 'dline' });
      shapes.push({ key: `p-${f.id}`, kind: 'point', x: f.x, y: f.y, shape: l.shape, size: picked.has(f.id) ? 7 : 5.5,
        cls: `cat-${l.cat}${picked.has(f.id) ? ' is-nb' : ''}${ring && !picked.has(f.id) ? ' is-off' : ''}`, label: ranks ? `[${rank}] ${f.name}` : f.name, labelBelow: f.y >= 9 });
    });
    if (star) shapes.push({ key: 'q', kind: 'point', x: q.x, y: q.y, shape: 'star', size: 8.5, cls: 'query', label: `${q.name}?`, labelBelow: true });
    plot.update(shapes);
    return plotBox(plot, size);
  };
}

/* ───────────── 확인 문제 (활동지 · 정답지와 같은 것) ───────────── */
const fifth = order[4];
export const checks = [
  { q: 'distances를 d²이 작은 순서로 정렬했을 때, [3]번 칸에 있는 음식은?',
    opts: [sorted[2].name, sorted[3].name, sorted[4].name, order[3].name], answer: 1,
    why: `정렬하면 ${sorted.slice(0, 5).map((d, i) => `[${i}] ${d.name}(${d.d2})`).join(' · ')} … — [3]번은 ${sorted[3].name}.` },
  { q: 'k = 5일 때, 투표가 끝난 votes 딕셔너리는?',
    opts: ['{ 과일: 3, 단백질: 2 }', votesText(k5.votes), '{ 과일: 2, 채소: 3 }', '{ 과일: 1, 단백질: 4 }'], answer: 1,
    why: `앞에서 5개는 ${sorted.slice(0, 5).map((d) => `${d.name}(${d.label})`).join(', ')} — ${votesText(k5.votes)}, 예측은 ${k5.label}.` },
  { q: 'distances에 다섯 번째로 추가되는 것은? (정렬하기 전)',
    opts: [`(${sorted[4].d2}, ${sorted[4].label})`, `(${order[3].d2}, ${order[3].label})`, `(${fifth.d2}, ${fifth.label})`, `(${order[5].d2}, ${order[5].label})`], answer: 2,
    why: `정렬 전에는 표에 적힌 순서대로 들어간다: ${order.slice(0, 5).map((d) => d.name).join(' → ')}. 다섯 번째는 ${fifth.name} (${fifth.d2}, ${fifth.label}).` },
];

/* ───────────── 장면 ───────────── */
const S = [];
const add = (scene) => S.push(scene);
const live = (o) => add({ sec: '전개', kind: 'live', ...o });

// ── 도입
add(cover({
  id: 'k01', question: ['토마토는 과일일까, 채소일까,', el('br'), '단백질 식품일까?'],
  goals: [['새 데이터를 ', el('b', {}, '가까운 이웃 k개의 투표'), '로 분류하는 방법을 설명할 수 있다.'],
    [el('b', {}, 'distances 리스트'), '와 ', el('b', {}, 'votes 딕셔너리'), '가 한 줄씩 어떻게 바뀌는지 따라갈 수 있다.']],
  flow: ['문제', ...PARTS, '정리 · 확인'],
  note: { min: 1, say: '오늘의 질문을 읽고, 목표 두 가지를 하나씩 눌러 보여 줍니다. "오늘은 공식보다 데이터가 어떤 상자로 옮겨 가는지를 봅니다."', ask: '—', expect: '—' },
}));
add({
  id: 'k02', sec: '도입', part: null, kind: 'idea', title: '오늘의 문제', beats: 2,
  note: { min: 1.5, say: '토마토를 처음 본 컴퓨터가 있다고 합시다. 세 가지 가운데 어디에 넣을지 정해야 합니다.', ask: '토마토는 어디에 넣을까요? 왜 그렇게 생각했나요?', expect: '과일(달다), 채소(반찬) 등 — 근거를 "무엇과 비슷해서"로 말하게 이끈다.' },
  render: (b) => ({ main: [el('div.emoji', {}, '🍅'), el('div.col', { style: 'gap:30px;' },
    el('h2', {}, '처음 보는 음식, 토마토'),
    el('p.lead', {}, '단맛 6점, 아삭함 4점'),
    el(`div.row${b >= 1 ? '' : '.hidden'}`, {}, el('span.pill.c1', {}, labelMark('과일')), el('span.pill.c2', {}, labelMark('채소')), el('span.pill.c3', {}, labelMark('단백질')), el('span.lead', {}, '중에 무엇?')))] }),
});
add(ask({
  id: 'k03', sec: '도입', title: '생각 열기', q: ['처음 보는 음식을 분류하려면', el('br'), '무엇을 보면 될까요?'],
  answerText: '이미 알고 있는 음식 가운데 비슷한 음식을 찾아본다 → "비슷하다"를 어떻게 정할까?',
  note: { min: 1.5, say: '학생 답을 두세 개 듣고 "비슷한 것을 찾는다"로 모읍니다.', ask: '사람은 처음 보는 과일을 어떻게 과일인 줄 알까요?', expect: '아는 것과 닮아서. 맛·생김새가 비슷해서.' },
}));

// ── 개념
{
  const fig = scatter();
  add(say({
    id: 'k04', sec: '개념', title: '가까이 있는 것끼리 닮았다', heading: ['가까이 있는 것끼리', el('br'), '닮았다.'],
    lines: [['단맛과 아삭함이 비슷한 음식은', el('br'), '그림에서 ', el('b', {}, '가까운 곳'), '에 있어요.'], '', el('span.or', {}, '★ 토마토와 가까운 음식은?')],
    figure: (b) => fig({ points: b >= 1 ? 9 : 0, star: b >= 2 }), beats: 3,
    note: { min: 1.5, say: '가로는 단맛, 세로는 아삭함입니다. 점을 찍으면 같은 종류끼리 모여 있습니다. 토마토 자리를 찍어 봅니다.', ask: '★와 가까운 음식은 무엇인가요? 눈으로 골라 보세요.', expect: '오렌지, 견과류, 포도 …', watch: '눈대중으로는 견과류와 포도 순서가 헷갈린다 → 수로 재야 한다.' },
  }));
}
add(say({
  id: 'k05', sec: '개념', title: '분류란', heading: '분류 — 레이블을 맞히는 문제',
  lines: [['정답(', el('b', {}, '레이블'), ')이 붙은 데이터를 보고'], '새 데이터의 레이블을 맞힌다.',
    el('span', {}, el('span.pill.c1', {}, '사과 → 과일'), ' ', el('span.pill.c2', {}, '오이 → 채소'), ' ', el('span.pill', {}, '토마토 → ?'))],
  note: { min: 1, say: '정답이 붙은 데이터로 배우는 것을 지도학습, 그중 종류를 맞히는 문제를 분류라고 합니다.', ask: '오늘 예제에서 레이블은 무엇인가요?', expect: '과일 · 채소 · 단백질.' },
}));
add({
  id: 'k06', sec: '개념', part: null, kind: 'table', title: '데이터 표 만나기', beats: 4,
  note: { min: 1.5, say: '컴퓨터가 가진 것은 이 표가 전부입니다. 한 줄씩, 한 칸씩 뜻을 짚습니다.', ask: '한 줄에는 무엇이 들어 있나요? 마지막 칸은 다른 칸과 무엇이 다른가요?', expect: '음식 하나의 정보. 마지막 칸은 정답(레이블).' },
  render: (b) => {
    const text = ['음식 9개의 기록', ['한 줄 = 음식 하나 ', el('span.small', {}, '(샘플)')], ['가운데 두 칸 = ', el('b', {}, '특징')], ['마지막 칸 = ', el('b', {}, '레이블'), ' (정답)']];
    return { main: [foodTable({ hl: [null, 'row', 'feat', 'label'][b], width: 560 }),
      el('div.col', { style: 'flex:0 0 560px; gap:26px;' }, text.map((t, i) => el(`p.lead${i === b ? '.hl' : ''}${i <= b ? '' : '.hidden'}`, {}, t)))] };
  },
});
{
  const fig = scatter();
  add({
    id: 'k07', sec: '개념', part: null, kind: 'table', title: '표의 한 줄 = 그림의 한 점', beats: 3,
    note: { min: 1, say: '표의 한 줄이 그림의 점 하나입니다. 단맛이 가로, 아삭함이 세로 자리입니다.', ask: '포도(8, 6)는 어디에 찍힐까요?', expect: '오른쪽으로 8, 위로 6.' },
    render: (b) => { const n = [1, 2, 9][b]; return { main: [foodTable({ cur: b < 2 ? b : -1, done: b < 2 ? b : 0, width: 520 }), fig({ points: n, star: false })] }; },
  });
}
{
  const f = sorted[0];   // 가장 가까운 오렌지로 계산을 풀어 본다
  const s = sq(f);
  add({
    id: 'k08', sec: '개념', part: null, kind: 'calc', title: '"가깝다"를 수로 — 거리 제곱 d²', beats: 4,
    note: { min: 2, say: '가깝다를 수로 바꿉니다. 칸마다 차이를 구하고, 제곱해서, 더합니다. 진짜 거리는 여기에 √를 씌운 값이지만, 누가 더 가까운지는 d²만 비교해도 순서가 같습니다.', ask: '√는 왜 안 해도 될까요?', expect: 'd²이 크면 d도 크다. 순서가 바뀌지 않는다.', watch: '차이가 음수여도 제곱하면 양수가 된다.' },
    render: (b) => ({ main: el('div.col', { style: 'gap:26px; align-items:flex-start;' },
      el('h2', {}, `${q.name} (${q.x}, ${q.y}) ↔ ${f.name} (${f.x}, ${f.y})`),
      calcLines([`① 차이    ${q.x} − ${f.x} = ${s.dx},   ${q.y} − ${f.y} = ${s.dy}`, `② 제곱    (${s.dx})² = ${s.dx2},   ${s.dy}² = ${s.dy2}`, `③ 더하기  d² = ${s.dx2} + ${s.dy2} = ${f.d2}`], b + 1),
      el(`p.lead${b >= 3 ? '' : '.hidden'}`, {}, '가까운 순서만 알면 되므로 ', el('b', {}, '√는 하지 않고 d²으로 비교'), '해요.')) }),
  });
}
{
  const f = foods.find((x) => x.name === '당근'); const s = sq(f); const d2 = order.find((d) => d.id === f.id).d2;
  add(activity({
    id: 'k09', sec: '개념', no: 1, seconds: 60, task: [`${q.name} (${q.x}, ${q.y}) ↔ ${f.name} (${f.x}, ${f.y})의`, el('br'), 'd²을 구하세요.'],
    answer: `(${q.x}−${f.x})² + (${q.y}−${f.y})² = ${s.dx2} + ${s.dy2} = ${d2}`,
    note: { min: 1.5, say: '활동지 ①번 표의 당근 줄을 채웁니다. 1분 뒤 함께 확인합니다.', ask: '오렌지(2)와 당근 가운데 누가 토마토에 더 가까운가요?', expect: `오렌지. d²이 2 < ${d2}.` },
  }));
}
add(say({
  id: 'k10', sec: '개념', title: 'k-NN 한 문장과 네 단계', heading: 'k-최근접 이웃 — 가까운 k개에게 물어본다',
  lines: PARTS.map((p, i) => [el('b', {}, p), ['  모든 학습 데이터까지 d²을 잰다', '  가까운 순서로 줄 세운다', '  앞에서 k개를 고른다', '  가장 많은 레이블이 답이다'][i]]),
  note: { min: 1, say: '오늘 따라갈 길은 네 단계입니다. 화면 위쪽에 지금 어느 단계인지 늘 표시됩니다.', ask: '네 단계 가운데 "가깝다"를 쓰는 단계는?', expect: '① 거리 재기와 ② 정렬.' },
}));
add({
  id: 'k11', sec: '개념', part: null, kind: 'idea', title: '오늘 쓸 자료구조', beats: 2,
  note: { min: 0.5, say: '오늘 데이터가 담길 상자는 둘입니다. 리스트는 순서대로 담는 줄이고 칸 번호가 0부터 붙습니다. 딕셔너리는 이름표(키)마다 값을 하나 적어 두는 상자입니다.', ask: '리스트의 첫 칸은 몇 번인가요?', expect: '0번.', watch: '첫 칸을 1번이라고 센다.' },
  render: (b) => ({ main: [
    dsBox({ name: '리스트', kind: '순서대로 담는 줄', width: 560 }, cell({ ix: 0, value: '첫 번째로 넣은 것' }), cell({ ix: 1, value: '두 번째로 넣은 것' }), cell({ ix: 2, value: '맨 뒤에 붙는다', state: 'ghost' })),
    (() => { const box = dsBox({ name: '딕셔너리', kind: '이름표 : 값', width: 560 }, el('div.kv', {}, '"키"', el('span', {}, ':'), el('span.val', {}, '값')), el('div.kv', {}, labelMark('과일'), el('span', {}, ':'), el('span.val', {}, '2'))); if (b < 1) box.classList.add('hidden'); return box; })(),
  ] }),
});

// ── 전개 ① 거리 재기
add(codeMap({ id: 'k12', part: 0, lines: CODE, range: [1, 4], note: { min: 0.5, say: '의사코드 아홉 줄 가운데 지금은 1~4줄, 거리 재기입니다. 2~4줄은 학습 데이터마다 되풀이합니다.', ask: '3 · 4줄은 모두 몇 번 실행될까요?', expect: '음식이 9개이므로 9번씩.' } }));
live({
  id: 'k13', part: 0, group: 'dist', title: '1줄 · 빈 리스트 만들기', beats: 2,
  note: { min: 0.5, say: '먼저 거리를 모아 둘 빈 리스트를 만듭니다. 아직 한 칸도 없습니다.', ask: '—', expect: '—' },
  render: (b) => ({ line: line(1), main: distLayout({ cur: -1, done: 0, items: [], listHidden: b < 1, hot: b >= 1 }), cap: b >= 1 ? ['빈 리스트 ', el('code', {}, 'distances'), '가 생겼다 (0칸)'] : null }),
});
live({
  id: 'k14', part: 0, group: 'dist', title: `3줄 · ${foods[0].name}까지 거리`, beats: 4,
  note: { min: 2, say: '표의 첫 줄 사과부터 봅니다. 단맛 차이를 제곱하고, 아삭함 차이를 제곱하고, 더합니다. 한 줄씩 눌러 가며 학생이 먼저 답하게 합니다.', ask: '(6−9)²은 얼마인가요? (4−9)²은?', expect: `${sq(foods[0]).dx2}, ${sq(foods[0]).dy2}. 더하면 ${order[0].d2}.`, watch: '−3을 제곱해 −9라고 한다.' },
  render: (b) => ({ line: line(3, `1번째 학습 데이터 · ${foods[0].name}`), main: distLayout({ cur: 0, done: 0, calc: d2Calc(foods[0], b), items: [] }),
    cap: b >= 3 ? [`${q.name} ↔ ${foods[0].name}  `, el('code', {}, `d² = ${order[0].d2}`)] : null, capLabel: '구한 것' }),
});
live({
  id: 'k15', part: 0, group: 'dist', title: '4줄 · 리스트에 추가', beats: 2,
  note: { min: 1, say: `방금 구한 ${josa(order[0].d2, '을')} 레이블 ${josa(`"${order[0].label}"`, '과')} 한 쌍으로 묶어 리스트 맨 뒤에 붙입니다. 표는 그대로 있고 값이 복사되어 갑니다.`, ask: '몇 번 칸에 들어갔나요?', expect: '0번 칸.', watch: '첫 칸을 1번이라고 한다.' },
  render: (b) => ({ line: line(4, `1번째 학습 데이터 · ${foods[0].name}`), main: distLayout({ cur: 0, done: 0, calc: d2Calc(foods[0], 3), items: b >= 1 ? appended[0] : [], fresh: b >= 1 ? 0 : -1, hot: b >= 1 }),
    cap: b >= 1 ? [el('code', {}, 'distances'), ' ', el('span.old', {}, '0칸'), ' → ', el('b', {}, '1칸'), ` · [0]에 ${josa(`(${order[0].d2}, ${order[0].label})`, '이')} 들어왔다`] : null }),
});
/** 한 음식을 "줄 3 → 계산 → 줄 4 → 추가"의 네 박자로 */
const oneFood = (id, i, note) => live({
  id, part: 0, group: 'dist', title: foods[i].name, beats: 4, note, dense: i >= 2,
  render: (b) => ({ line: line(b >= 2 ? 4 : 3, `${i + 1}번째 학습 데이터 · ${foods[i].name}`),
    main: distLayout({ cur: i, done: i, calc: d2Calc(foods[i], b >= 1 ? 3 : 0), items: b >= 3 ? appended[i] : appended[i - 1], fresh: b >= 3 ? i : -1, hot: b >= 3 }),
    cap: b >= 3 ? [el('code', {}, 'distances'), ' ', el('span.old', {}, `${i}칸`), ' → ', el('b', {}, `${i + 1}칸`), ` · 맨 뒤 [${i}]에 ${josa(`(${order[i].d2}, ${order[i].label})`, '이')} 들어왔다`] : null }),
});
oneFood('k16', 1, { min: 1, say: '둘째 줄 포도입니다. 같은 일을 되풀이합니다 — 계산하고, 맨 뒤에 붙입니다.', ask: '포도의 d²은 얼마인가요?', expect: `${order[1].d2}.` });
add(ask({
  id: 'k17', sec: '전개', part: 0, group: 'dist', title: `${josa(foods[2].name, '은')} 몇 번 칸에?`, q: `다음 음식 ${josa(foods[2].name, '은')} 몇 번 칸에 들어갈까요?`,
  side: () => distBox(appended[1], { ghost: true, width: 560 }), answerText: '[2]번 — 리스트는 언제나 맨 뒤에 붙는다.', talk: '손가락으로 번호를 들어 보세요.',
  note: { min: 0.5, say: '거리가 가장 가깝다고 앞에 끼어들지 않습니다. 넣는 순서대로 뒤에 붙습니다.', ask: '오렌지는 가장 가까운데도 왜 [0]이 아닌가요?', expect: '리스트는 넣은 순서대로 담기 때문에.', watch: '가까운 것이 앞에 들어간다고 생각한다.' },
}));
oneFood('k18', 2, { min: 1, say: '오렌지를 계산해 맨 뒤 [2]에 붙입니다. 활동지 ①번 표의 오렌지 줄도 함께 채웁니다.', ask: '지금 distances는 몇 칸인가요?', expect: '3칸 ([0] ~ [2]).' });
add(activity({
  id: 'k19', sec: '전개', part: 0, no: 2, seconds: 180, task: ['나머지 여섯 음식의 d²을 구해', el('br'), '활동지 ①번 표를 채우세요.'],
  answer: '다 채웠으면 다음 화면에서 한 칸씩 확인해요.',
  note: { min: 3.5, say: '3분 동안 각자 채웁니다. 돌아다니며 차이를 제곱했는지 확인합니다.', ask: '—', expect: order.slice(3).map((d) => `${d.name} ${d.d2}`).join(', '), watch: '차이만 더하고 제곱을 빼먹는다.' },
}));
live({
  id: 'k20', part: 0, group: 'dist', title: '답 확인 — 나머지 여섯 칸', beats: 6,
  note: { min: 1.5, say: '한 번 누를 때마다 한 음식씩 확인합니다. 학생이 먼저 값을 말하게 한 뒤 누릅니다.', ask: '다음 줄의 d²은 얼마인가요?', expect: order.slice(3).map((d) => `${d.name} ${d.d2}`).join(' · ') },
  dense: true,
  render: (b) => { const i = 3 + b; return { line: line(4, `${i + 1}번째 학습 데이터 · ${foods[i].name}`),
    main: distLayout({ cur: i, done: i, calc: el('div', { style: 'flex:0 0 300px; display:flex; justify-content:center;' }, el('div.calc', {}, `${foods[i].name}  d² = `, el('span.res', {}, String(order[i].d2)))), items: appended[i], fresh: i, hot: true }),
    cap: [el('code', {}, 'distances'), ' ', el('span.old', {}, `${i}칸`), ' → ', el('b', {}, `${i + 1}칸`), ` · 맨 뒤 [${i}]에 (${order[i].d2}, ${order[i].label})`] }; },
});
add(ask({
  id: 'k21', sec: '전개', part: 0, title: '지금은 어떤 순서?', q: ['지금 distances는', el('br'), '어떤 순서로 담겨 있나요?'],
  side: () => distBox(order, { width: 600 }), answerText: `표에 적힌 순서 그대로 — 가장 가까운 ${josa(`${sorted[0].name}(${sorted[0].d2})`, '은')} [${order.findIndex((d) => d.id === sorted[0].id)}]에 있다.`,
  note: { min: 1, say: '아홉 칸이 다 찼습니다. 하지만 가까운 순서가 아닙니다. 그래서 다음 단계가 필요합니다.', ask: '가장 가까운 음식이 [0]에 있나요?', expect: '아니다. 표 순서대로다.', watch: 'distances는 처음부터 가까운 순서다.' },
}));

// ── 전개 ② 정렬
add(codeMap({ id: 'k22', part: 1, lines: CODE, range: [5, 5], note: { min: 0.5, say: '5줄, 정렬입니다. 새 리스트를 만드는 것이 아니라 같은 리스트 안에서 순서만 바꿉니다.', ask: '—', expect: '—' } }));
add(ask({
  id: 'k23', sec: '전개', part: 1, title: '정렬하면 [0]에는?', q: ['d²이 작은 순서로 정렬하면', el('br'), el('span.hl', {}, '[0]번 칸'), '에는 어떤 음식이 올까요?'],
  opts: [order[0], sorted[0], sorted[1], sorted[4]].map((d) => [d.name, ' ', el('small', {}, String(d.d2))]), answer: 1,
  note: { min: 1, say: '짝과 30초 이야기한 뒤 손을 들어 봅니다.', ask: '왜 그 음식인가요?', expect: `d²이 가장 작은 ${sorted[0].name}(${sorted[0].d2}).` },
}));
live({
  id: 'k24', part: 1, title: '5줄 · 정렬', beats: 3,
  note: { min: 2, say: '위가 정렬 전, 아래가 정렬 후입니다. 선을 따라가면 각 칸이 어디로 갔는지 보입니다. R을 누르면 다시 볼 수 있습니다.', ask: '칸 수는 바뀌었나요? 사과는 몇 번에서 몇 번으로 갔나요?', expect: `9칸 그대로, 순서만 바뀐다. 사과는 [0] → [${sorted.findIndex((d) => d.name === '사과')}].`, watch: '정렬하면 새 리스트가 하나 더 생긴다.' },
  render: (b) => ({ line: line(5),
    main: el('div.col', { style: 'gap:0; align-items:flex-start;' },
      stripRow('정렬 전', strip(order, { prefix: 'sb', dim: b >= 1 })),
      connectors(b >= 1),
      stripRow('정렬 후', strip(sorted, { prefix: 'sa', from: 'sb', pick: (i) => b >= 2 && i === 0, hidden: b < 1 }), 'var(--blue)'),
      el(`div${b >= 1 ? '' : '.hidden'}`, { style: 'margin-top:8px' }, stripIndex((i) => b >= 2 && i === 0))),
    cap: b >= 2 ? ['가장 가까운 ', el('b', {}, `${sorted[0].name}(${sorted[0].d2})`), '이 [0]으로 왔다'] : b >= 1 ? [el('b', {}, '순서만'), ' 바뀌었다 (9칸 그대로)'] : null }),
});
{
  const fig = scatter();
  add(say({
    id: 'k25', sec: '전개', part: 1, title: '그림으로 보면', heading: '그림으로 보면', lines: [['★에서 가까운 순서대로 번호를 붙이면', el('br'), '정렬된 distances의 ', el('b', {}, '칸 번호'), '와 같아요.']],
    figure: (b) => fig({ ranks: b >= 1 }), beats: 2,
    note: { min: 0.5, say: '정렬된 리스트의 번호를 그림에 옮겨 적었습니다.', ask: '[1]번은 어떤 음식인가요?', expect: `${sorted[1].name}.` },
  }));
}

// ── 전개 ③ 앞에서 k개
add(ask({
  id: 'k26', sec: '전개', part: 2, title: `k = ${K}이면 몇 번부터 몇 번까지?`, q: `k = ${K}이면 몇 번 칸부터 몇 번 칸까지 고를까요?`,
  figure: () => el('div.col', { style: 'gap:8px' }, stripRow('distances', strip(sorted, { prefix: 'sa' })), stripIndex()),
  answerText: `[0] ~ [${K - 1}] — 0부터 세므로 앞에서 ${K}개는 ${Array.from({ length: K }, (_, i) => i).join(', ')}번.`, talk: '손가락으로 마지막 번호를 들어 보세요.',
  note: { min: 0.5, say: '시험에서 자주 틀리는 곳입니다. 0부터 세면 3개는 0, 1, 2입니다.', ask: 'k = 5라면 마지막 칸은 몇 번인가요?', expect: '[4]번.', watch: `앞에서 ${K}개를 [1] ~ [${K}]로 센다.` },
}));
live({
  id: 'k27', part: 2, title: `6줄 · 앞에서 ${K}개`, beats: 1 + K,
  note: { min: 1.5, say: '정렬된 리스트의 앞에서 세 칸을 이웃 리스트로 복사합니다. distances는 그대로 아홉 칸입니다.', ask: 'distances는 줄었나요?', expect: '아니다. 복사했으므로 그대로다.', watch: '잘라 오면 원래 리스트에서 없어진다.' },
  render: (b) => ({ line: line(6),
    main: el('div.col', { style: 'gap:10px; align-items:flex-start;' },
      stripRow('distances', strip(sorted, { prefix: 'sa', pick: (i) => i < b })), stripIndex((i) => i < b),
      el('div', { style: 'height:34px' }),
      stripRow('이웃', el('div.strip', { style: 'flex:1 1 auto;' }, sorted.slice(0, K).map((d, i) => (i < b
        ? el(`div.sc.${labelInfo(d.label).cls}`, { 'data-flip': `nbs-${d.id}`, 'data-from': `sa-${d.id}` }, String(d.d2), el('small', {}, d.name))
        : el('div.sc.dimmed', { style: 'border-style:dashed; color:#aeb6c2;' }, '?', el('small', {}, `[${i}]`))))), 'var(--blue)')),
    cap: b >= 1 ? ['이웃 ', el('span.old', {}, `${b - 1}칸`), ' → ', el('b', {}, `${b}칸`), ` · distances[${b - 1}]을 복사 (distances는 9칸 그대로)`] : null }),
});
{
  const fig = scatter();
  add(say({
    id: 'k28', sec: '전개', part: 2, title: '그림으로 보면', heading: '그림으로 보면', lines: [[`★에서 가까운 ${K}개가`, el('br'), el('b', {}, '이웃'), '이에요.']],
    figure: (b) => fig({ ranks: true, ring: b >= 1 ? K : 0 }), beats: 2,
    note: { min: 0.5, say: '세 번째 이웃까지 닿는 원을 그리면, 원 안에 든 점이 이웃입니다.', ask: '원 안에는 어떤 레이블이 몇 개씩 있나요?', expect: votesText(facts.votes) },
  }));
}

// ── 전개 ④ 투표
const voteMain = ({ cur = -1, counted, fresh = null, bumped = null, win = null, hot = false, votesHidden = false, answer = false }) => [
  neighborBox(neighbors, { cur }), midArrow(),
  el('div.col', { style: 'gap:24px;' }, votesBox(counted, { fresh, bumped, win, hot, hidden: votesHidden }), answerBox(result, answer)),
];
live({
  id: 'k29', part: 3, group: 'vote', title: '7줄 · 빈 딕셔너리', beats: 2,
  note: { min: 0.5, say: '표를 셀 빈 딕셔너리를 만듭니다. 키는 레이블, 값은 표 수가 될 것입니다.', ask: '—', expect: '—' },
  render: (b) => ({ line: line(7), main: voteMain({ counted: [], votesHidden: b < 1, hot: b >= 1 }), cap: b >= 1 ? ['빈 딕셔너리 ', el('code', {}, 'votes'), '가 생겼다'] : null }),
});
const vote = (id, i, note) => {
  const n = neighbors[i];
  const isNew = !neighbors.slice(0, i).some((x) => x.label === n.label);
  const count = neighbors.slice(0, i + 1).filter((x) => x.label === n.label).length;
  live({
    id, part: 3, group: 'vote', title: `8줄 · 이웃 [${i}] ${n.label}`, beats: 2, note,
    render: (b) => ({ line: line(8, `이웃 [${i}] · ${n.name}`),
      main: voteMain({ cur: i, counted: neighbors.slice(0, b >= 1 ? i + 1 : i), fresh: b >= 1 && isNew ? n.label : null, bumped: b >= 1 && !isNew ? n.label : null, hot: b >= 1 }),
      cap: b >= 1 ? (isNew ? ['새 키 ', el('b', {}, n.label), `이 생겼다 · ${n.label}: 1`] : [el('b', {}, n.label), ': ', el('span.old', {}, String(count - 1)), ' → ', el('b', {}, String(count)), ' (새 키가 아니라 값이 +1)']) : null }),
  });
};
vote('k30', 0, { min: 1, say: '이웃 [0]의 레이블은 과일입니다. votes에 과일이라는 키가 아직 없으므로 새로 만들고 값을 1로 둡니다.', ask: '키는 무엇이고 값은 무엇인가요?', expect: '키 = 레이블(과일), 값 = 표 수(1).' });
vote('k31', 1, { min: 0.5, say: '이웃 [1]은 단백질입니다. 이것도 처음 나온 레이블이라 새 키가 생깁니다.', ask: '지금 votes에는 키가 몇 개인가요?', expect: '2개.' });
add(ask({
  id: 'k32', sec: '전개', part: 3, title: `이웃 [2]는 ${neighbors[2].label}. 딕셔너리는?`, q: [`이웃 [2]는 ${neighbors[2].name}(${neighbors[2].label})예요.`, el('br'), 'votes는 어떻게 될까요?'],
  opts: ['과일 키가 하나 더 생긴다', '과일의 값이 1 → 2가 된다', '단백질의 값이 2가 된다'], answer: 1,
  note: { min: 0.5, say: '같은 키는 하나만 있을 수 있습니다. 이미 있는 키면 값만 늘립니다.', ask: '딕셔너리에 같은 키가 두 개 있을 수 있나요?', expect: '없다. 값이 1 늘어난다.', watch: '같은 레이블이 나올 때마다 키가 새로 생긴다.' },
}));
vote('k33', 2, { min: 1, say: '과일 키가 이미 있으므로 값만 1에서 2로 바뀝니다.', ask: '세 이웃이 모두 투표했습니다. 표는 모두 몇 표인가요?', expect: `${K}표 (k와 같다).` });
live({
  id: 'k34', part: 3, group: 'vote', title: '9줄 · 가장 많은 레이블', beats: 3,
  note: { min: 1, say: '값이 가장 큰 키를 찾습니다. 그것이 예측입니다.', ask: '토마토는 무엇으로 분류되었나요?', expect: `${result}.` },
  render: (b) => ({ line: line(9), main: voteMain({ counted: neighbors, win: b >= 1 ? result : null, hot: b >= 1, answer: b >= 2 }),
    cap: b >= 2 ? [`${josa(q.name, '은')} `, el('b', {}, josa(result, '으로')), ` 분류한다 · votes = ${votesText(facts.votes)}`] : null, capLabel: '결과' }),
});

// ── 깊이: k를 바꾸면
const kMain = ({ k, picked, votes = null, label = null }) => el('div.col', { style: 'gap:10px; align-items:flex-start;' },
  stripRow('distances', strip(sorted, { prefix: 'sa', pick: (i) => i < picked })), stripIndex((i) => i < picked),
  el('div', { style: 'height:26px' }),
  el('div.row', { style: 'gap:34px; padding-left:138px;' },
    el(`div.calc${votes ? '' : '.hidden'}`, {}, `votes = ${votes ? votesText(votes) : votesText(resultOf(k).votes)}`),
    el(`div.answerbox${label ? '' : '.hidden'}`, {}, `k = ${k} 예측: `, labelMark(label ?? resultOf(k).label))));
add({
  id: 'k35', sec: '깊이', part: null, kind: 'live', title: 'k를 1로', beats: 3,
  note: { min: 1, say: 'k를 1로 바꾸면 가장 가까운 하나만 봅니다.', ask: 'k = 1이면 이웃은 누구인가요?', expect: `${sorted[0].name} 하나 → ${k1.label}.` },
  render: (b) => ({ line: line(6, 'k를 바꿔 보면', 1), main: kMain({ k: 1, picked: b >= 1 ? 1 : 0, votes: b >= 2 ? k1.votes : null, label: b >= 2 ? k1.label : null }),
    cap: b >= 2 ? ['k = 1 → 예측 ', el('b', {}, k1.label)] : null, capLabel: '결과' }),
});
add(activity({
  id: 'k36', sec: '깊이', no: 3, seconds: 120, task: ['k = 5일 때', el('br'), '이웃 · votes · 예측을 적으세요.'], answer: '다 적었으면 다음 화면에서 함께 확인해요.',
  note: { min: 2, say: '활동지 ③번의 k = 5 줄입니다. 정렬된 리스트의 [0] ~ [4]를 보면 됩니다.', ask: '—', expect: `${votesText(k5.votes)} → ${k5.label}` },
}));
add({
  id: 'k37', sec: '깊이', part: null, kind: 'live', title: '답과 까닭', beats: 4,
  note: { min: 1.5, say: 'k를 3에서 5로 늘리자 [3], [4]번 이웃이 투표에 들어왔고, 둘 다 단백질이라 결과가 뒤집혔습니다.', ask: '왜 예측이 바뀌었나요?', expect: `[3] ${sorted[3].name}, [4] ${josa(sorted[4].name, '이')} 모두 ${josa(sorted[3].label, '이라')}서.`, watch: 'k가 클수록 더 정확하다.' },
  render: (b) => ({ line: line(6, 'k를 바꿔 보면', 5), main: kMain({ k: 5, picked: b >= 1 ? 5 : 0, votes: b >= 2 ? k5.votes : null, label: b >= 3 ? k5.label : null }),
    cap: b >= 3 ? [`k = ${K} → 5 · 예측이 `, el('span.old', {}, result), ' → ', el('b', {}, k5.label), ` ([3] · [4]번 이웃이 ${sorted[3].label})`] : null }),
});
add(say({
  id: 'k38', sec: '깊이', title: 'k는 어떻게 정할까', heading: 'k는 어떻게 정할까?', optional: true,
  lines: [[el('b', {}, '너무 작으면'), ' — 가까운 한두 개에 휘둘린다'], [el('b', {}, '너무 크면'), ' — 멀리 있는 것까지 투표한다'], '보통 홀수로, 여러 값을 해 보고 정한다'],
  note: { min: 0.5, say: '정답인 k는 없습니다. 데이터에 따라 여러 값을 시험해 고릅니다. (시간이 없으면 건너뜁니다.)', ask: '왜 홀수를 많이 쓸까요?', expect: '두 레이블이 같은 표를 받는 일을 줄이려고.' },
}));
S[S.length - 1].optional = true;

// ── 정리
add(summary({
  id: 'k39', flow: ['표', 'distances (추가)', '정렬', `이웃 (앞에서 k개)`, 'votes (세기)', '예측'],
  points: [['모든 학습 데이터까지 d²을 재서 ', el('b', {}, '리스트 맨 뒤에'), ' 붙인다 — 표 순서대로 쌓인다.'],
    [el('b', {}, '정렬'), '해야 가까운 순서가 된다. 앞에서 k개 = [0] ~ [k−1].'],
    ['이웃의 레이블을 ', el('b', {}, '딕셔너리'), '로 세어, 값이 가장 큰 키가 예측이다.']],
  note: { min: 2, say: '오늘 데이터가 지나간 상자를 순서대로 다시 짚고, 세 문장을 학생이 소리 내어 읽게 합니다.', ask: '정렬을 빼먹으면 어떤 일이 생길까요?', expect: '앞에서 k개가 가장 가까운 k개가 아니게 된다.' },
}));
checks.forEach((c, i) => add(check({
  id: `k4${i}`, n: i + 1, total: checks.length, ...c,
  note: { min: 1.5, say: '활동지 ⑤번에 답을 적게 한 뒤 정답을 보여 줍니다.', ask: '왜 그 답인가요? 어느 장면에서 확인할 수 있나요?', expect: `${'①②③④'[c.answer]} — ${c.why}` },
})));
add(say({
  id: 'k43', sec: '정리', title: '다음 시간', kind: 'idea', heading: '다음 시간',
  lines: ['오늘은 레이블(정답)이 있는 데이터였어요.', [el('span.or', {}, '레이블이 없는 데이터'), '는 어떻게 묶을 수 있을까요?'], el('span.small', {}, '2차시 · k-평균 군집')],
  note: { min: 0.5, say: '다음 시간에는 정답 없이 가까운 것끼리 묶는 방법을 배웁니다.', ask: '—', expect: '—' },
}));

/* ───────────── 활동지 · 정답지 (교사용 화면에서 인쇄) ───────────── */
const blank = (answer) => ({ blank: true, answer: String(answer) });
export const sheet = {
  title: `${josa(`${q.name}(단맛 ${q.x}, 아삭함 ${q.y})`, '은')} 무엇과 닮았을까?`,
  sections: [
    { title: '① 거리 재기 — d² = (단맛 차이)² + (아삭함 차이)²', hint: '활동 ①: 당근 줄 · 수업 화면과 함께: 오렌지 줄 · 활동 ②: 나머지 줄',
      head: ['번호', '이름', '단맛', '아삭함', '레이블', '단맛 차이²', '아삭함 차이²', 'd²'],
      rows: order.map((d, i) => { const f = foods[i]; const s = sq(f); const given = i < 2;
        return [`[${i}]`, f.name, String(f.x), String(f.y), f.label, given ? String(s.dx2) : blank(s.dx2), given ? String(s.dy2) : blank(s.dy2), given ? String(d.d2) : blank(d.d2)]; }) },
    { title: '② 정렬 — distances를 d²이 작은 순서로 다시 적으세요 (d², 레이블)', boxes: sorted.map((d, i) => ({ label: `[${i}]`, answer: `(${d.d2}, ${d.label})` })) },
    { title: '③ 앞에서 k개 고르고 투표하기', hint: 'k = 3은 수업 화면과 함께 · 활동 ③: k = 5',
      head: ['k', '이웃 (앞에서 k개)', 'votes 딕셔너리 { 레이블: 표 수 }', '예측'],
      rows: [1, 3, 5].map((k) => { const r = resultOf(k); return [String(k), blank(sorted.slice(0, k).map((d) => d.name).join(', ')), blank(votesText(r.votes)), blank(r.label)]; }) },
    { title: '④ 한 문장으로 — k를 3에서 5로 늘리면 예측이 바뀌는 까닭은?', lines: 2,
      answer: `[3], [4]번 이웃(${sorted[3].name}, ${sorted[4].name})이 투표에 들어왔는데 둘 다 ${josa(sorted[3].label, '이라')}, ${votesText(facts.votes)}가 ${votesText(k5.votes)}로 바뀌었기 때문이다.` },
    { title: '⑤ 확인 문제 답', answers: checks.map((c, i) => ({ label: `${i + 1}번`, answer: '①②③④'[c.answer] })) },
  ],
};

export const lesson = {
  id: 'knn', badge: '1차시', title: 'k-최근접 이웃', emoji: '📍',
  brief: '거리 재기 → 정렬 → k개 → 투표', structures: '리스트 · 딕셔너리',
  goals: ['새 데이터를 "가까운 이웃 k개의 투표"로 분류하는 방법을 설명할 수 있다.', 'distances 리스트와 votes 딕셔너리가 한 줄씩 어떻게 바뀌는지 따라갈 수 있다.'],
  materials: ['이 수업 화면', '활동지(학생 수만큼 인쇄)', '정답지 · 수업 대본(교사용)'],
  parts: PARTS, scenes: S, sheet, checks, facts,
};
