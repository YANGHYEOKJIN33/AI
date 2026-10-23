/**
 * 3쪽 · 거리 재기 — 토마토(A)와 고른 음식(B) 사이의 유클리드 거리를 한 단계씩.
 * 그림에는 가로(Δx)·세로(Δy)·빗변(d) 직각삼각형을 그려 "왜 제곱해서 더하고 √인가"를 보인다.
 * 마지막에 모든 음식과 거리를 재서 거리 리스트를 채운다 (k-NN의 distances가 그렇게 만들어진다).
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { roomShell, btn, quizBox, algoLinks } from './common.js';
import { FOODS, FOOD_LABELS, FOOD_AXES, FOOD_QUERY } from '../../core/datasets.js';
import { dist, fmt } from '../../core/math.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const A = FOOD_QUERY;

export function createDistanceRoom({ store }) {
  const root = el('div');
  const flip = createFlip();
  let bId = 't2';     // 포도 (가장 가까운 오렌지는 맞히기의 정답이라 처음엔 고르지 않는다)
  let step = 0;       // 0~4 계산 단계
  let filled = [];    // 거리 리스트에 들어간 음식 id
  let timer = null;
  let picked = null;
  let msg = null;

  const plot = createPlot({
    x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 300, height: 280,
    xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`, ariaLabel: '거리를 잴 두 점',
    onClick: (x, y) => {
      // 누른 곳에서 가장 가까운 음식을 B로
      let best = FOODS[0];
      for (const f of FOODS) if (dist([x, y], [f.x, f.y]) < dist([x, y], [best.x, best.y])) best = f;
      pickB(best.id);
    },
  });

  const nearestThree = FOODS.slice().sort((p, q) => dist([A.x, A.y], [p.x, p.y]) - dist([A.x, A.y], [q.x, q.y]));
  const quiz = (() => {
    const opts = [nearestThree[2], nearestThree[0], nearestThree[1]];
    return { q: `${A.name}(${A.x}, ${A.y})에서 가장 가까운 음식은?`, options: opts.map((f) => f.name), answer: 1,
      why: `${nearestThree[0].name}까지 d = ${fmt(dist([A.x, A.y], [nearestThree[0].x, nearestThree[0].y]))}로 가장 짧아요. 그림 눈대중과 계산이 같은지 확인해 보세요.` };
  })();

  function pickB(id) { bId = id; step = 0; msg = null; render(); }
  function next() { if (step < 4) step += 1; render(); }
  function fillAll() {
    if (timer) return;
    filled = [];
    const ids = FOODS.map((f) => f.id);
    timer = setInterval(() => {
      if (filled.length >= ids.length) { clearInterval(timer); timer = null; msg = { tone: 'ok', text: '거리 리스트 완성! k-NN은 이 리스트를 정렬해 가까운 k개를 고르죠 (다음 쪽).' }; render(); return; }
      filled = [...filled, ids[filled.length]];
      render();
    }, 260);
  }
  function reset() { if (timer) { clearInterval(timer); timer = null; } filled = []; step = 0; msg = null; render(); }

  function render() {
    const B = FOODS.find((f) => f.id === bId);
    const dx = A.x - B.x; const dy = A.y - B.y;
    const d = Math.hypot(dx, dy);
    const shapes = [];
    // 직각삼각형: 가로 다리, 세로 다리, 빗변
    if (step >= 1) {
      shapes.push({ key: 'leg-x', kind: 'line', x1: B.x, y1: B.y, x2: A.x, y2: B.y, cls: 'toCentroid is-best' });
      shapes.push({ key: 'leg-y', kind: 'line', x1: A.x, y1: B.y, x2: A.x, y2: A.y, cls: 'toCentroid is-best' });
      shapes.push({ key: 'leg-xt', kind: 'text', x: (A.x + B.x) / 2, y: B.y, dy: 14, text: `Δx = ${fmt(dx)}`, cls: 'dtext' });
      shapes.push({ key: 'leg-yt', kind: 'text', x: A.x, y: (A.y + B.y) / 2, dx: 26, text: `Δy = ${fmt(dy)}`, cls: 'dtext' });
    }
    shapes.push({ key: 'hyp', kind: 'line', x1: A.x, y1: A.y, x2: B.x, y2: B.y, cls: `dline${step >= 4 ? ' is-nb' : ' is-cur is-measuring'}` });
    if (step >= 4) shapes.push({ key: 'hyp-t', kind: 'text', x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, dx: -18, dy: -6, text: `d = ${fmt(d)}`, cls: 'dtext' });
    for (const f of FOODS) {
      const l = LABEL[f.label];
      shapes.push({ key: f.id, kind: 'point', x: f.x, y: f.y, shape: l.shape, size: f.id === bId ? 8 : 5.5,
        cls: `cat-${l.cat}${f.id === bId ? ' is-cur' : ''}${filled.includes(f.id) ? ' is-nb' : ''}`, label: f.id === bId ? `B ${f.name}` : f.name });
    }
    shapes.push({ key: 'A', kind: 'point', x: A.x, y: A.y, shape: 'star', size: 8.5, cls: 'query', label: `A ${A.name}` });
    plot.update(shapes);

    const rowsTxt = [
      ['① 차이', `Δx = ${A.x} − ${B.x} = ${fmt(dx)},   Δy = ${A.y} − ${B.y} = ${fmt(dy)}`],
      ['② 제곱', `Δx² = ${fmt(dx * dx)},   Δy² = ${fmt(dy * dy)}   (음수도 양수가 돼요)`],
      ['③ 더하기', `Δx² + Δy² = ${fmt(dx * dx + dy * dy)}`],
      ['④ 제곱근', `d = √${fmt(dx * dx + dy * dy)} = ${fmt(d)}`],
    ];
    const calc = el('div.calc.calc--big', {},
      el('div.calc__title', {}, `📏 d = √((A.x − B.x)² + (A.y − B.y)²)   ·   A ${A.name}(${A.x}, ${A.y}),  B ${B.name}(${B.x}, ${B.y})`),
      el('div.calc__rows', {}, rowsTxt.map(([k, t], i) => el(`div.calc__row.calcstep${i < step ? '.is-done' : ''}${i === step - 1 ? '.is-on' : ''}`, {},
        el('strong', {}, `${k}  `), i < step ? t : '…'))));

    const listBox = el('div.sbox', {},
      el('header.sbox__head', {}, el('code.sbox__name', {}, 'distances'), el('span.sbox__kind', {}, '리스트'), el('span.sbox__count', {}, `${filled.length}칸`)),
      el('div.sbox__body', {}, filled.length === 0 ? el('div.sbox__empty', {}, '“모든 음식과 거리 재기”를 누르면 한 칸씩 채워져요') : filled.map((id, i) => {
        const f = FOODS.find((x) => x.id === id);
        return el('div.chip.tuple', { 'data-flip': `dl-${id}`, 'data-enter': 'left', 'data-cat': LABEL[f.label].cat },
          el('span.tuple__idx', {}, String(i)),
          el('span.tuple__val', {}, `(${fmt(dist([A.x, A.y], [f.x, f.y]))}, `, mark(LABEL[f.label].shape, LABEL[f.label].cat), ` ${f.label})`),
          el('span.tuple__name', {}, f.name));
      })));

    fill(root, roomShell({
      icon: '📏', title: '거리 재기 — 얼마나 가까운가',
      rule: '두 점의 거리 d = √(Δx² + Δy²). 가로·세로 차이를 직각삼각형의 두 변으로 보고 빗변 길이를 구하는 거예요(피타고라스).',
      controls: [
        btn(step < 4 ? `⏭ 한 단계 계산 (${step}/4)` : '✓ 계산 끝', next, { primary: true, disabled: step >= 4 }),
        el('label.troom__select', {}, 'B = ', el('select', { onchange: (e) => pickB(e.target.value), 'aria-label': '거리를 잴 음식' },
          FOODS.map((f) => el('option', { value: f.id, selected: f.id === bId }, `${f.name} (${f.x}, ${f.y})`)))),
        btn('📏 모든 음식과 거리 재기', fillAll, { disabled: Boolean(timer) }),
        btn('↺ 처음으로', reset),
        el('span.troom__hint', {}, '그림에서 점을 눌러 B를 바꿀 수도 있어요'),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 두 점과 직각삼각형'), el('div.tplot', {}, plot.svg)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {}, el('div.tflow__cap', {}, '🧮 한 단계씩 계산'), calc,
          el('p.troom__note', {}, '💡 k-NN은 이 계산을 학습 데이터마다, k-평균은 점마다 중심 k개에 대해 해요.')),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📥 거리 리스트 (append)'), listBox)),
      message: msg,
      quiz: quizBox(quiz, picked, (i) => { picked = i; pickB(nearestThree[0].id); }),
      links: algoLinks(store, [['knn', '질문점과 학습 데이터 사이'], ['kmeans', '점과 각 중심 사이']]),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
