/**
 * 📍 k-최근접 이웃 탭 — 사이트 형태(v4)의 쪽 10개. (PLAN-v4 4장)
 *
 * 쪽 = { id, title, sentence, code: [처음 줄, 끝 줄] | null, steps: [단계] }
 * 단계 = { on(지금 줄), left(왼쪽 칸: 계산 · 설명), right(오른쪽 칸: 자료구조), plot(그림으로 바꿔 볼 때),
 *          cap(아래 띠: 바뀐 것), ask(아래 띠: 질문 · 활동), timer, note(교사 노트) }
 *
 * 규칙: ▶ 한 단계에 왼쪽이나 오른쪽 한쪽만 바뀐다(아래 띠는 함께 바뀌어도 된다).
 * 숫자는 모두 엔진(core/algorithms/knn.js)의 실행 기록에서 가져온다.
 */
import { el } from '../ui/dom.js';
import { createPlot } from '../ui/plot.js';
import { ALGORITHMS } from '../core/algorithms/index.js';
import { FOOD_AXES } from '../core/datasets.js';
import { josa } from '../core/josa.js';
import { dsBox, cell, pairValue, calcLines, labelMark, labelInfo, plotBox } from '../deck/parts.js';
import { checks } from '../lessons/knn.js';
import { page, hide, lines, arrowRight as arrowR, tag, wrapPage, practicePages, codeOf } from './common.js';

const algo = ALGORITHMS.knn;
const run = algo.run(algo.defaults);
const F = run.frames;
const foods = run.data.train;
const q = F[0].ds.query;
const K = run.params.k;
const appended = F.filter((f) => f.action === 'append').map((f) => f.ds.distances);
const order = appended[appended.length - 1];
const sorted = F.find((f) => f.action === 'sort').ds.distances;
const neighbors = F.find((f) => f.action === 'slice').ds.neighbors;
const result = F[F.length - 1].ds.result;
const resultOf = (k) => algo.run({ ...algo.defaults, k }).result;
const k1 = resultOf(1);
const k5 = resultOf(5);
const votesText = (votes) => `{ ${votes.map((v) => `${v.label}: ${v.count}`).join(', ')} }`;
const sq = (f) => ({ dx2: (q.x - f.x) ** 2, dy2: (q.y - f.y) ** 2 });
export const CODE = codeOf(algo.pseudo(run.params));

/* ───────────── 이 탭의 부품 ───────────── */
/** 원본은 표 전체가 아니라 지금 읽는 줄 하나 */
const rowCard = (i) => dsBox({ name: '학습 데이터', kind: `${i + 1}번째 줄`, dense: true, width: 250 },
  el('div.cell.cur', { 'data-flip': `row-${foods[i].id}`, style: 'flex-direction:column; align-items:flex-start; gap:2px; white-space:normal;' },
    el('span.v', { style: 'font-family:var(--font-ui)' }, foods[i].name),
    el('span.nm', { style: 'margin:0; color:var(--text)' }, `단맛 ${foods[i].x} · 아삭함 ${foods[i].y}`),
    el('span.v', { style: 'font-family:var(--font-ui); font-size:28px' }, labelMark(foods[i].label))));
const arrowRight = () => arrowR();

function distBox(items, { fresh = -1, hot = false, hidden = false, width = 520 } = {}) {
  return hide(dsBox({ name: 'distances', kind: `리스트 · ${items.length}칸`, hot, dense: true, width },
    items.map((d, i) => cell({ ix: i, value: pairValue(d.d2, d.label), name: d.name, state: i === fresh ? 'new' : '', flip: `d-${d.id}`, from: `row-${d.id}`, tag: i === fresh ? '새 칸' : null })),
    items.length < 9 ? cell({ ix: items.length, value: '다음 칸', state: 'ghost' }) : null), !hidden);
}
const distRight = (rowIdx, items, o = {}) => () => el('div.row', { style: 'gap:14px; align-items:center;' },
  rowIdx === null ? el('div', { style: 'flex:0 0 250px' }) : rowCard(rowIdx), hide(arrowRight(), rowIdx !== null), distBox(items, o));
const d2Calc = (f) => () => { const s = sq(f); const d2 = order.find((d) => d.id === f.id).d2;
  return calcLines([`${q.name} (${q.x}, ${q.y}) ↔ ${f.name} (${f.x}, ${f.y})`, `d² = (${q.x}−${f.x})² + (${q.y}−${f.y})²`, `   = ${s.dx2} + ${s.dy2} = ${d2}`], 3, { small: true }); };

function strip(items, { prefix, from = null, pick = () => false, dim = false, hidden = false, n = 9 }) {
  return hide(el('div.strip', { style: `grid-template-columns:repeat(${n}, 1fr); gap:8px; width:100%;` }, items.map((d, i) => el(`div.sc.${labelInfo(d.label).cls}${pick(i) ? '.pick' : ''}${dim ? '.dimmed' : ''}`, {
    'data-flip': `${prefix}-${d.id}`, 'data-from': from ? `${from}-${d.id}` : null, style: 'font-size:36px; padding:6px 0 4px;',
  }, String(d.d2), el('small', { style: 'font-size:22px' }, d.name)))), !hidden);
}
const stripIx = (hl = () => false, shown = true) => hide(el('div.stripix', { style: 'gap:8px; width:100%; font-size:22px;' }, sorted.map((_, i) => el('span', hl(i) ? { style: 'color:var(--blue)' } : {}, `[${i}]`))), shown);

function neighborBox(items, cur = -1) {
  return dsBox({ name: '이웃', kind: `리스트 · ${items.length}칸`, dense: true, width: 400 },
    items.map((d, i) => cell({ ix: i, value: pairValue(d.d2, d.label), name: d.name, state: i === cur ? 'cur' : '', flip: `nb-${d.id}` })));
}
function votesBox(counted, { fresh = null, bumped = null, win = null, hot = false, hidden = false } = {}) {
  const keys = [];
  for (const n of counted) { let k = keys.find((x) => x.label === n.label); if (!k) { k = { label: n.label, items: [] }; keys.push(k); } k.items.push(n); }
  return hide(dsBox({ name: 'votes', kind: '딕셔너리', hot, dense: true, width: 390 },
    keys.length === 0 ? cell({ value: '{ }  비어 있음', state: 'ghost' }) : keys.map((k) => el(`div.kv${k.label === win ? '.win' : k.label === fresh ? '.new' : k.label === bumped ? '.cur' : ''}`, { style: 'font-size:28px; padding:6px 16px; gap:10px;' },
      labelMark(k.label), el('span', {}, ':'),
      el(`span.${labelInfo(k.label).cls}`, { style: 'display:flex; gap:6px;' }, k.items.map((n) => el('span.token', { style: 'width:24px; height:24px', 'data-flip': `tk-${n.id}`, 'data-from': `nb-${n.id}` }))),
      el('span.val', { style: 'font-size:32px' }, k.label === bumped ? [el('span.old', { style: 'font-size:26px' }, String(k.items.length - 1)), '→'] : null, String(k.items.length))))), !hidden);
}
const answerBox = (label, shown, text = `예측: ${q.name} → `) => hide(el('div.answerbox', { style: 'font-size:30px; padding:8px 18px;' }, text, labelMark(label)), shown);
const voteRight = ({ cur = -1, counted = [], fresh = null, bumped = null, win = null, hot = false, votesHidden = false, answer = false }) => () => el('div.row', { style: 'gap:14px; align-items:center;' },
  neighborBox(neighbors, cur), arrowRight(), el('div.col', { style: 'gap:14px;' }, votesBox(counted, { fresh, bumped, win, hot, hidden: votesHidden }), answerBox(result, answer)));

function foodTable() {
  return dsBox({ name: '학습 데이터', kind: '표 · 9줄', dense: true, width: 560 }, el('table.big', { style: 'width:100%; font-size:26px;' },
    el('tr', {}, el('th', {}, '이름'), el('th', {}, '단맛'), el('th', {}, '아삭함'), el('th', {}, '레이블')),
    foods.map((f) => el('tr', {}, el('td', {}, f.name), el('td.num', {}, String(f.x)), el('td.num', {}, String(f.y)), el('td', {}, labelMark(f.label))))));
}

/** 산점도 — 쪽마다 하나 만들어 두고 모양만 바꾼다 */
function scatter() {
  let plot = null;
  return ({ points = foods.length, only = null, star = true, ranks = false, ring = 0 } = {}) => {
    plot ??= createPlot({ x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 320, height: 296, tick: 2, xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`, ariaLabel: '음식의 단맛과 아삭함' });
    const shapes = [];
    const picked = new Set(sorted.slice(0, ring).map((d) => d.id));
    if (ring) shapes.push({ key: 'ring', kind: 'circle', cx: q.x, cy: q.y, r: Math.sqrt(sorted[ring - 1].d2) + 0.15, cls: 'nb-ring' });
    foods.slice(0, points).filter((f) => !only || only.includes(f.id)).forEach((f) => {
      const l = labelInfo(f.label);
      const rank = sorted.findIndex((d) => d.id === f.id);
      if (ranks || only) shapes.push({ key: `l-${f.id}`, kind: 'line', x1: q.x, y1: q.y, x2: f.x, y2: f.y, cls: picked.has(f.id) || only ? 'dline is-nb' : 'dline' });
      shapes.push({ key: `p-${f.id}`, kind: 'point', x: f.x, y: f.y, shape: l.shape, size: picked.has(f.id) ? 7 : 5.5,
        cls: `cat-${l.cat}${picked.has(f.id) ? ' is-nb' : ''}${ring && !picked.has(f.id) ? ' is-off' : ''}`, label: ranks ? `[${rank}] ${f.name}` : f.name, labelBelow: f.y >= 9 });
    });
    if (star) shapes.push({ key: 'q', kind: 'point', x: q.x, y: q.y, shape: 'star', size: 8.5, cls: 'query', label: `${q.name}?`, labelBelow: true });
    plot.update(shapes);
    return plotBox(plot, 580);
  };
}

/* ───────────── 쪽 ───────────── */
const P = [];

// 1 문제와 목표
{
  const fig = scatter();
  const left = (n) => () => lines([el('div.label', {}, '오늘의 질문'), el('h2', { style: 'font-size:44px' }, '토마토는 과일일까, 채소일까, 단백질 식품일까?'),
    el('p.lead', { style: 'font-size:28px' }, '① 새 데이터를 ', el('b', {}, '가까운 이웃 k개의 투표'), '로 분류하는 방법을 설명할 수 있다.'),
    el('p.lead', { style: 'font-size:28px' }, '② ', el('b', {}, 'distances 리스트'), '와 ', el('b', {}, 'votes 딕셔너리'), '가 한 줄씩 어떻게 바뀌는지 따라갈 수 있다.')], n);
  const tomato = () => el('div.col', { style: 'align-items:center; gap:24px;' }, el('div.emoji', { style: 'font-size:150px' }, '🍅'), el('p.lead', {}, '단맛 6점, 아삭함 4점'),
    el('div.row', { style: 'gap:12px' }, el('span.pill.c1', {}, labelMark('과일')), el('span.pill.c2', {}, labelMark('채소')), el('span.pill.c3', {}, labelMark('단백질'))));
  P.push(page({ id: 'goal', title: '문제와 목표', sentence: '처음 보는 음식 토마토를 무엇으로 분류할까요?', code: null, leftTitle: '오늘의 수업' }, (s) => {
    s({ left: left(2), right: tomato, note: { say: '토마토를 처음 본 컴퓨터가 있다고 합시다. 세 가지 가운데 어디에 넣을지 정해야 합니다.', ask: '토마토는 어디에 넣을까요? 왜 그렇게 생각했나요?', expect: '근거를 "무엇과 비슷해서"로 말하게 이끈다.' } });
    s({ left: left(3) });
    s({ left: left(4) });
    s({ right: () => fig({}), cap: ['가까이 있는 것끼리 닮았다 — ★와 가까운 음식은?'], capLabel: '생각',
      note: { say: '가로는 단맛, 세로는 아삭함입니다. 같은 종류끼리 모여 있습니다.', ask: '★와 가까운 음식은 무엇인가요?', expect: '오렌지, 견과류, 포도 …', watch: '눈대중으로는 견과류와 포도 순서가 헷갈린다 → 수로 재야 한다.' } });
  }));
}

// 2 개념: 가깝다를 수로
{
  const fig = scatter();
  const f = sorted[0]; const food = foods.find((x) => x.id === f.id); const s2 = sq(food);
  const carrot = foods.find((x) => x.name === '당근'); const cs = sq(carrot); const cd2 = order.find((d) => d.id === carrot.id).d2;
  const left = (n) => () => el('div.col', { style: 'gap:18px;' },
    el('h2', { style: 'font-size:38px' }, n === 0 ? '학습 데이터 9개' : `${q.name} (${q.x}, ${q.y}) ↔ ${f.name} (${food.x}, ${food.y})`),
    n === 0 ? el('p.lead', { style: 'font-size:28px' }, '한 줄 = 음식 하나, 마지막 칸 = 레이블(정답)')
      : [calcLines([`① 차이    ${q.x} − ${food.x} = ${q.x - food.x},  ${q.y} − ${food.y} = ${q.y - food.y}`, `② 제곱    ${s2.dx2},  ${s2.dy2}`, `③ 더하기  d² = ${s2.dx2} + ${s2.dy2} = ${f.d2}`], Math.min(3, n - 1), { small: true }),
        hide(el('p.lead', { style: 'font-size:26px; color:var(--muted)' }, '가까운 순서만 알면 되므로 √는 하지 않고 d²으로 비교해요.'), n >= 5)]);
  P.push(page({ id: 'idea', title: '가깝다를 수로 — d²', sentence: '차이를 구하고, 제곱해서, 더해요.', code: null, leftTitle: '개념' }, (s) => {
    s({ left: left(0), right: foodTable, note: { say: '컴퓨터가 가진 것은 이 표가 전부입니다. 한 줄이 음식 하나이고 마지막 칸이 정답(레이블)입니다.', ask: '마지막 칸은 다른 칸과 무엇이 다른가요?', expect: '정답(레이블)이다.' } });
    s({ right: () => fig({ only: [f.id] }), cap: ['표 대신 그림 — 토마토와 가장 가까워 보이는 ', josa(f.name, '을'), ' 재 본다'], capLabel: '보기' });
    s({ left: left(1) });
    s({ left: left(2) });
    s({ left: left(3), note: { say: '차이를 구하고, 제곱해서, 더합니다. 진짜 거리는 여기에 √를 씌운 값이지만 누가 더 가까운지는 d²만 비교해도 같습니다.', ask: '√는 왜 안 해도 될까요?', expect: 'd²이 크면 d도 크다. 순서가 바뀌지 않는다.', watch: '차이가 음수여도 제곱하면 양수.' } });
    s({ left: left(5) });
    s({ ask: `✏️ 활동지 ①번 — ${q.name} (${q.x}, ${q.y}) ↔ ${carrot.name} (${carrot.x}, ${carrot.y})의 d²은?`, timer: 60, note: { say: '활동지 ①번 표의 당근 줄을 채웁니다. 1분.', ask: '오렌지와 당근 가운데 누가 더 가까운가요?', expect: `오렌지 (2 < ${cd2}).` } });
    s({ cap: [`(${q.x}−${carrot.x})² + (${q.y}−${carrot.y})² = ${cs.dx2} + ${cs.dy2} = `, el('b', {}, String(cd2))], capLabel: '답' });
  }));
}

// 3 ① 거리 재기
{
  const fig = scatter();
  P.push(page({ id: 'dist', title: '① 거리 재기', sentence: '표의 위에서부터 d²을 재서 distances 뒤에 붙여요.', code: [1, 4] }, (s) => {
    s({ on: null, right: distRight(null, [], { hidden: true }), plot: () => fig({}), note: { say: '의사코드 1~4줄입니다. 2~4줄은 학습 데이터마다 되풀이합니다.', ask: '3 · 4줄은 모두 몇 번 실행될까요?', expect: '음식이 9개이므로 9번씩.' } });
    s({ on: 1 });
    s({ right: distRight(null, [], { hot: true }), cap: ['빈 리스트 ', el('code', {}, 'distances'), '가 생겼다 (0칸)'] });
    const slow = (i, note) => {
      s({ right: distRight(i, i ? appended[i - 1] : []), cap: [`표의 ${i + 1}번째 줄 `, el('b', {}, josa(foods[i].name, '을')), ' 읽는다'], capLabel: '읽기', note });
      s({ on: 3, left: d2Calc(foods[i]) });
      s({ on: 4, ask: i === 2 ? `✋ ${josa(foods[i].name, '은')} 몇 번 칸에 들어갈까요?` : null });
      s({ right: distRight(i, appended[i], { fresh: i, hot: true }), cap: [el('code', {}, 'distances'), ' ', el('span.old', {}, `${i}칸`), ' → ', el('b', {}, `${i + 1}칸`), ` · 맨 뒤 [${i}]에 (${order[i].d2}, ${order[i].label})`] });
    };
    slow(0, { say: '표의 첫 줄 사과부터 봅니다. 차이를 제곱해 더하고, 레이블과 한 쌍으로 묶어 리스트 맨 뒤에 붙입니다.', ask: '몇 번 칸에 들어갔나요?', expect: '0번 칸.', watch: '첫 칸을 1번이라고 센다.' });
    slow(1, { say: '둘째 줄 포도. 같은 일을 되풀이합니다 — 계산하고, 맨 뒤에 붙입니다.', ask: '포도의 d²은?', expect: String(order[1].d2) });
    slow(2, { say: '가깝다고 앞에 끼어들지 않습니다. 넣는 순서대로 뒤에 붙습니다.', ask: '오렌지는 가장 가까운데 왜 [0]이 아닌가요?', expect: '리스트는 넣은 순서대로 담는다.', watch: '가까운 것이 앞에 들어간다.' });
    s({ left: null, ask: '✏️ 활동지 ①번 — 나머지 여섯 음식의 d²을 채우세요 (3분)', timer: 180, note: { say: '3분 동안 각자 채웁니다. 차이를 제곱했는지 돌아보며 확인합니다.', ask: '—', expect: order.slice(3).map((d) => `${d.name} ${d.d2}`).join(', '), watch: '제곱을 빼먹는다.' } });
    for (let i = 3; i < 9; i += 1) s({ right: distRight(i, appended[i], { fresh: i, hot: true }), cap: [`${foods[i].name} d² = `, el('b', {}, String(order[i].d2)), ` · `, el('span.old', {}, `${i}칸`), ' → ', el('b', {}, `${i + 1}칸`)] });
    s({ ask: '✋ 지금 distances는 어떤 순서인가요? 가장 가까운 음식이 [0]에 있나요?', note: { say: '아홉 칸이 다 찼지만 가까운 순서가 아닙니다. 그래서 다음 단계가 필요합니다.', ask: '가장 가까운 음식이 [0]에 있나요?', expect: '아니다. 표 순서대로다.', watch: '처음부터 가까운 순서다.' } });
    s({ cap: ['표에 적힌 순서 그대로 — 가장 가까운 ', el('b', {}, `${sorted[0].name}(${sorted[0].d2})`), `은 [${order.findIndex((d) => d.id === sorted[0].id)}]에 있다`], capLabel: '답' });
  }));
}

// 4 ② 정렬하기
{
  const fig = scatter();
  const right = (b) => () => el('div.col', { style: 'gap:8px; width:100%;' },
    tag('정렬 전'), strip(order, { prefix: 'sb', dim: b >= 1 }),
    hide(el('div', { style: 'text-align:center; font-size:36px; color:var(--blue); line-height:1;' }, '⬇'), b >= 1),
    hide(tag('정렬 후', 'var(--blue)'), b >= 1), strip(sorted, { prefix: 'sa', from: 'sb', pick: (i) => b >= 2 && i === 0, hidden: b < 1 }), stripIx((i) => b >= 2 && i === 0, b >= 1));
  P.push(page({ id: 'sort', title: '② 정렬하기', sentence: 'distances를 d²이 작은 순서로 다시 세워요.', code: [5, 5] }, (s) => {
    s({ on: null, right: right(0), plot: () => fig({}), ask: '✋ d²이 작은 순서로 정렬하면 [0]번 칸에는 어떤 음식이 올까요?', note: { say: '짝과 30초 이야기한 뒤 손을 들어 봅니다.', ask: '왜 그 음식인가요?', expect: `d²이 가장 작은 ${sorted[0].name}(${sorted[0].d2}).` } });
    s({ on: 5 });
    s({ right: right(1), plot: () => fig({ ranks: true }), cap: [el('b', {}, '순서만'), ' 바뀌었다 (9칸 그대로)'], note: { say: '위가 정렬 전, 아래가 정렬 후입니다. 새 리스트가 생긴 것이 아니라 같은 리스트의 순서가 바뀐 것입니다. ◀ ▶로 다시 볼 수 있습니다.', ask: '칸 수는 바뀌었나요? 사과는 몇 번으로 갔나요?', expect: `9칸 그대로. 사과는 [${sorted.findIndex((d) => d.name === '사과')}].`, watch: '정렬하면 리스트가 하나 더 생긴다.' } });
    s({ right: right(2), cap: ['가장 가까운 ', el('b', {}, `${sorted[0].name}(${sorted[0].d2})`), '가 [0]으로 왔다'] });
  }));
}

// 5 ③ 앞에서 k개
{
  const fig = scatter();
  const right = (b) => () => el('div.col', { style: 'gap:8px; width:100%;' },
    tag('distances'), strip(sorted, { prefix: 'sa', pick: (i) => i < b }), stripIx((i) => i < b),
    el('div', { style: 'height:18px' }), tag('이웃', 'var(--blue)'),
    el('div.strip', { style: 'grid-template-columns:repeat(9, 1fr); gap:8px; width:100%;' }, sorted.slice(0, K).map((d, i) => (i < b
      ? el(`div.sc.${labelInfo(d.label).cls}`, { 'data-flip': `nbs-${d.id}`, 'data-from': `sa-${d.id}`, style: 'font-size:36px; padding:6px 0 4px;' }, String(d.d2), el('small', { style: 'font-size:22px' }, d.name))
      : el('div.sc.dimmed', { style: 'border-style:dashed; color:#aeb6c2; font-size:36px; padding:6px 0 4px;' }, '?', el('small', { style: 'font-size:22px' }, `[${i}]`))))));
  P.push(page({ id: 'slice', title: '③ 앞에서 k개 고르기', sentence: `정렬된 distances의 앞에서 ${K}개를 이웃으로 복사해요.`, code: [6, 6] }, (s) => {
    s({ on: null, right: right(0), plot: () => fig({ ranks: true }), ask: `✋ k = ${K}이면 몇 번 칸부터 몇 번 칸까지 고를까요?`, note: { say: '시험에서 자주 틀리는 곳입니다. 0부터 세면 3개는 0, 1, 2입니다.', ask: 'k = 5라면 마지막 칸은 몇 번인가요?', expect: '[4]번.', watch: `앞에서 ${K}개를 [1] ~ [${K}]로 센다.` } });
    s({ on: 6, cap: [`[0] ~ [${K - 1}] — 0부터 세므로 앞에서 ${K}개`], capLabel: '답' });
    for (let b = 1; b <= K; b += 1) s({ right: right(b), plot: () => fig({ ranks: true, ring: b }), cap: ['이웃 ', el('span.old', {}, `${b - 1}칸`), ' → ', el('b', {}, `${b}칸`), ` · distances[${b - 1}]을 복사 (distances는 9칸 그대로)`],
      note: { say: '앞에서 세 칸을 이웃 리스트로 복사합니다. distances는 그대로 아홉 칸입니다.', ask: 'distances는 줄었나요?', expect: '아니다. 복사했으므로 그대로다.', watch: '잘라 오면 원래 리스트에서 없어진다.' } });
  }));
}

// 6 ④ 투표하기
{
  const fig = scatter();
  P.push(page({ id: 'vote', title: '④ 투표하기', sentence: '이웃의 레이블을 세어 가장 많은 것을 골라요.', code: [7, 9] }, (s) => {
    s({ on: null, right: voteRight({ votesHidden: true }), plot: () => fig({ ranks: true, ring: K }), note: { say: '이웃 세 개가 정해졌습니다. 이제 레이블을 셉니다.', ask: '—', expect: '—' } });
    s({ on: 7 });
    s({ right: voteRight({ hot: true }), cap: ['빈 딕셔너리 ', el('code', {}, 'votes'), '가 생겼다'], note: { say: '키는 레이블, 값은 표 수가 될 것입니다.', ask: '—', expect: '—' } });
    s({ on: 8 });
    neighbors.forEach((n, i) => {
      const isNew = !neighbors.slice(0, i).some((x) => x.label === n.label);
      const count = neighbors.slice(0, i + 1).filter((x) => x.label === n.label).length;
      s({ right: voteRight({ cur: i, counted: neighbors.slice(0, i) }), cap: [`이웃 [${i}] `, el('b', {}, n.name), ` — 레이블 ${n.label}`], capLabel: '읽기',
        ask: null, note: isNew ? { say: `이웃 [${i}]의 레이블은 ${n.label}. votes에 그 키가 아직 없으므로 새로 만들고 값을 1로 둡니다.`, ask: '키는 무엇이고 값은 무엇인가요?', expect: '키 = 레이블, 값 = 표 수.' }
          : { say: '같은 키는 하나만 있을 수 있습니다. 이미 있는 키면 값만 늘립니다.', ask: '딕셔너리에 같은 키가 두 개 있을 수 있나요?', expect: '없다. 값이 1 늘어난다.', watch: '같은 레이블이 나올 때마다 키가 새로 생긴다.' } });
      if (!isNew) steps_ask(s, `✋ ${n.label} 키는 이미 있어요. votes는 어떻게 될까요?`);
      s({ right: voteRight({ cur: i, counted: neighbors.slice(0, i + 1), fresh: isNew ? n.label : null, bumped: isNew ? null : n.label, hot: true }),
        cap: isNew ? ['새 키 ', el('b', {}, n.label), ` · ${n.label}: 1`] : [el('b', {}, n.label), ': ', el('span.old', {}, String(count - 1)), ' → ', el('b', {}, String(count)), ' (새 키가 아니라 값이 +1)'] });
    });
    s({ on: 9 });
    s({ right: voteRight({ counted: neighbors, win: result, hot: true }), cap: ['값이 가장 큰 키 = ', el('b', {}, result)], note: { say: '값이 가장 큰 키를 찾습니다. 그것이 예측입니다.', ask: '토마토는 무엇으로 분류되었나요?', expect: result } });
    s({ right: voteRight({ counted: neighbors, win: result, hot: true, answer: true }), cap: [`${josa(q.name, '은')} `, el('b', {}, josa(result, '으로')), ` 분류한다 · votes = ${votesText(F[F.length - 1].ds.votes)}`], capLabel: '결과' });
  }));
}
function steps_ask(s, text) { s({ ask: text }); }

// 7 k를 바꾸면
{
  const right = ({ picked, votes = null, label = null, k }) => () => el('div.col', { style: 'gap:8px; width:100%;' },
    tag('distances (정렬됨)'), strip(sorted, { prefix: 'sa', pick: (i) => i < picked }), stripIx((i) => i < picked),
    el('div', { style: 'height:14px' }),
    el('div.row', { style: 'gap:18px;' }, hide(el('div.calc.sm', {}, `votes = ${votesText(votes ?? resultOf(k).votes)}`), Boolean(votes)), answerBox(label ?? resultOf(k).label, Boolean(label), `k = ${k} 예측: `)));
  P.push(page({ id: 'k', title: 'k를 바꾸면', sentence: 'k에 따라 이웃이 달라지고, 예측도 달라질 수 있어요.', code: [6, 6], codeK: true }, (s) => {
    s({ on: 6, k: 1, right: right({ picked: 0, k: 1 }), note: { say: 'k를 1로 바꾸면 가장 가까운 하나만 봅니다.', ask: 'k = 1이면 이웃은 누구인가요?', expect: `${sorted[0].name} → ${k1.label}` } });
    s({ right: right({ picked: 1, k: 1 }) });
    s({ right: right({ picked: 1, votes: k1.votes, label: k1.label, k: 1 }), cap: ['k = 1 → 예측 ', el('b', {}, k1.label)], capLabel: '결과' });
    s({ k: 5, ask: '✏️ 활동지 ③번 — k = 5일 때 이웃 · votes · 예측은? (2분)', timer: 120, note: { say: '정렬된 리스트의 [0] ~ [4]를 보면 됩니다.', ask: '—', expect: `${votesText(k5.votes)} → ${k5.label}` } });
    s({ right: right({ picked: 5, k: 5 }) });
    s({ right: right({ picked: 5, votes: k5.votes, k: 5 }) });
    s({ right: right({ picked: 5, votes: k5.votes, label: k5.label, k: 5 }), cap: [`k = ${K} → 5 · 예측이 `, el('span.old', {}, result), ' → ', el('b', {}, k5.label), ` ([3] · [4]번 이웃이 ${sorted[3].label})`],
      note: { say: 'k를 3에서 5로 늘리자 [3], [4]번 이웃이 투표에 들어왔고 둘 다 단백질이라 결과가 뒤집혔습니다.', ask: '왜 예측이 바뀌었나요?', expect: `[3] ${sorted[3].name}, [4] ${josa(sorted[4].name, '이')} 모두 ${sorted[3].label}.`, watch: 'k가 클수록 더 정확하다.' } });
  }));
}

// 8 정리 · 확인 문제
P.push(wrapPage({
  points: [['모든 학습 데이터까지 d²을 재서 ', el('b', {}, '리스트 맨 뒤에'), ' 붙인다 — 표 순서대로 쌓인다.'], [el('b', {}, '정렬'), '해야 가까운 순서가 된다. 앞에서 k개 = [0] ~ [k−1].'], ['이웃의 레이블을 ', el('b', {}, '딕셔너리'), '로 세어, 값이 가장 큰 키가 예측이다.']],
  next: '다음 시간: 레이블이 없는 데이터는 어떻게 묶을까?',
  flow: ['표', 'distances (추가)', '정렬', `이웃 (앞에서 ${K}개)`, 'votes (세기)', '예측'], checks,
  note: { say: '오늘 데이터가 지나간 상자를 순서대로 다시 짚고, 세 문장을 학생이 소리 내어 읽게 합니다.', ask: '정렬을 빼먹으면 어떤 일이 생길까요?', expect: '앞에서 k개가 가장 가까운 k개가 아니게 된다.' },
}));
P.push(...practicePages('knn'));

export const tab = { id: 'knn', name: 'k-NN', emoji: '📍', full: 'k-최근접 이웃', code: CODE, k: K, pages: P };
