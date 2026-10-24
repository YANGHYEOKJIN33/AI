/**
 * 📦 3쪽 · 거리 재기 — 토마토(A)와 고른 음식(B) 사이의 거리를 한 단계씩.
 * 그림에 가로(Δx)·세로(Δy)·빗변(d) 직각삼각형을 그려 "왜 제곱해서 더하고 √인가"를 보인다.
 * 마지막에 모든 음식과 거리를 재서 거리 리스트를 채운다 (k-NN의 distances가 그렇게 만들어진다).
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { missionShell, btn, quizBox, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { FOODS, FOOD_LABELS, FOOD_AXES, FOOD_QUERY } from '../../core/datasets.js';
import { fmt } from '../../core/math.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const A = FOOD_QUERY;
const d2Of = (f) => (A.x - f.x) ** 2 + (A.y - f.y) ** 2;

const STEPS = [
  { id: 'pick', do: '그림에서 음식 점 하나를 누르거나, 목록에서 B를 고르세요.', see: 'A(★ 토마토)와 B 사이에 직각삼각형이 생겨요.' },
  { id: 'calc', do: '⏭ "한 단계 계산"을 4번 누르세요.', see: '차이 → 제곱 → 더하기 → √ 순서. 시험에서는 3단계(d²)까지만 해도 비교할 수 있어요.' },
  { id: 'quiz', do: '🔮 맞혀 보기 문제를 푸세요.', see: '그림 눈대중과 d² 계산이 같은지 확인해요.' },
  { id: 'fill', do: '📏 "모든 음식과 거리 재기"를 누르세요.', see: '거리 리스트에 표의 순서대로 한 칸씩 추가돼요 — 아직 정렬 전!' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '' },
];
const LEARNED = [
  '거리 d = √(Δx² + Δy²). 어느 쪽이 더 가까운지 비교만 할 땐 d²으로 충분해요.',
  'k-NN은 질문점 ↔ 모든 학습 데이터, k-평균은 점 ↔ 모든 중심의 거리를 재요.',
  '거리 리스트는 표 순서대로 쌓여요. 가까운 순서가 되려면 정렬해야 해요(다음 쪽).',
];

export function createDistanceRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('distance', STEPS, store);
  let bId = 't1';     // 포도 — 가장 가까운 오렌지는 맞혀 보기의 정답이라 처음엔 고르지 않는다
  let step = 0;
  let filled = [];
  let timer = null;
  let picked = null;
  let msg = null;
  let peek = false;

  const plot = createPlot({
    x: [FOOD_AXES.min, FOOD_AXES.max], y: [FOOD_AXES.min, FOOD_AXES.max], width: 300, height: 280,
    xLabel: `${FOOD_AXES.x} →`, yLabel: `${FOOD_AXES.y} →`, ariaLabel: '거리를 잴 두 점',
    onClick: (x, y) => {
      let best = FOODS[0];
      for (const f of FOODS) if ((x - f.x) ** 2 + (y - f.y) ** 2 < (x - best.x) ** 2 + (y - best.y) ** 2) best = f;
      pickB(best.id);
    },
  });

  const near = FOODS.slice().sort((p, q) => d2Of(p) - d2Of(q));
  const quiz = {
    q: `${A.name}(${A.x}, ${A.y})에서 가장 가까운 음식은?`,
    options: [near[2].name, near[0].name, near[1].name, near[3].name],
    answer: 1,
    why: `d²: ${near.slice(0, 4).map((f) => `${f.name} ${d2Of(f)}`).join(', ')} — 가장 작은 ${near[0].name}.`,
  };

  function pickB(id) { bId = id; step = 0; msg = null; mission.complete('pick'); render(); }
  function next() {
    if (step < 4) step += 1;
    if (step === 4) mission.complete('calc');
    render();
  }
  function fillAll() {
    if (timer) return;
    filled = [];
    timer = setInterval(() => {
      if (filled.length >= FOODS.length) {
        clearInterval(timer); timer = null;
        mission.complete('fill');
        msg = { tone: 'ok', text: '거리 리스트 완성! 표 순서 그대로예요. k-NN은 이 리스트를 정렬해서 가까운 k개를 골라요.' };
        render();
        return;
      }
      filled = [...filled, FOODS[filled.length].id];
      render();
    }, 260);
  }
  function reset() { if (timer) { clearInterval(timer); timer = null; } filled = []; step = 0; msg = null; picked = null; mission.reset(); render(); }

  function render() {
    const B = FOODS.find((f) => f.id === bId);
    const dx = A.x - B.x; const dy = A.y - B.y;
    const d2 = dx * dx + dy * dy;
    const shapes = [];
    if (step >= 1) {
      shapes.push({ key: 'leg-x', kind: 'line', x1: B.x, y1: B.y, x2: A.x, y2: B.y, cls: 'toCentroid is-best' });
      shapes.push({ key: 'leg-y', kind: 'line', x1: A.x, y1: B.y, x2: A.x, y2: A.y, cls: 'toCentroid is-best' });
      shapes.push({ key: 'leg-xt', kind: 'text', x: (A.x + B.x) / 2, y: B.y, dy: 14, text: `Δx = ${dx}`, cls: 'dtext' });
      shapes.push({ key: 'leg-yt', kind: 'text', x: A.x, y: (A.y + B.y) / 2, dx: 26, text: `Δy = ${dy}`, cls: 'dtext' });
    }
    shapes.push({ key: 'hyp', kind: 'line', x1: A.x, y1: A.y, x2: B.x, y2: B.y, cls: `dline${step >= 4 ? ' is-nb' : ' is-cur is-measuring'}` });
    if (step >= 4) shapes.push({ key: 'hyp-t', kind: 'text', x: (A.x + B.x) / 2, y: (A.y + B.y) / 2, dx: -18, dy: -6, text: `d = ${fmt(Math.sqrt(d2))}`, cls: 'dtext' });
    for (const f of FOODS) {
      const l = LABEL[f.label];
      shapes.push({ key: f.id, kind: 'point', x: f.x, y: f.y, shape: l.shape, size: f.id === bId ? 8 : 5.5,
        cls: `cat-${l.cat}${f.id === bId ? ' is-cur' : ''}${filled.includes(f.id) ? ' is-nb' : ''}`, label: f.id === bId ? `B ${f.name}` : f.name });
    }
    shapes.push({ key: 'A', kind: 'point', x: A.x, y: A.y, shape: 'star', size: 8.5, cls: 'query', label: `A ${A.name}` });
    plot.update(shapes);

    const rows = [
      ['① 차이', `Δx = ${A.x} − ${B.x} = ${dx},   Δy = ${A.y} − ${B.y} = ${dy}`],
      ['② 제곱', `Δx² = ${dx * dx},   Δy² = ${dy * dy}   (음수도 양수가 돼요)`],
      ['③ 더하기', `d² = ${dx * dx} + ${dy * dy} = ${d2}   ← 비교만 할 땐 여기까지!`],
      ['④ 제곱근', `d = √${d2} = ${fmt(Math.sqrt(d2))}`],
    ];
    const calc = el('div.calc.calc--big', {},
      el('div.calc__title', {}, `📏 A ${A.name}(${A.x}, ${A.y}) ↔ B ${B.name}(${B.x}, ${B.y})`),
      el('div.calc__rows', {}, rows.map(([k, t], i) => el(`div.calc__row.calcstep${i < step ? '.is-done' : ''}${i === step - 1 ? '.is-on' : ''}`, {},
        el('strong', {}, `${k}  `), i < step ? t : '…'))));

    const listBox = el('div.sbox', {},
      el('header.sbox__head', {}, el('code.sbox__name', {}, 'distances'), el('span.sbox__kind', {}, '리스트'), el('span.sbox__count', {}, `${filled.length}칸`)),
      el('div.sbox__body', {}, filled.length === 0 ? el('div.sbox__empty', {}, '"모든 음식과 거리 재기"를 누르면 한 칸씩 추가돼요') : filled.map((id, i) => {
        const f = FOODS.find((x) => x.id === id);
        return el('div.chip.tuple', { 'data-flip': `dl-${id}`, 'data-enter': 'left', 'data-cat': LABEL[f.label].cat },
          el('span.tuple__idx', {}, `${i}번`),
          el('span.tuple__val', {}, `${f.name} d² = ${d2Of(f)}`),
          el('span.tuple__name', {}, mark(LABEL[f.label].shape, LABEL[f.label].cat), ` ${f.label}`));
      })));

    fill(root, missionShell({
      icon: '📏', title: '거리 재기 — 얼마나 가까운가',
      mission: mission.view({ goal: '두 점 사이의 거리 제곱 d²을 손으로 계산하고, 어느 점이 더 가까운지 비교할 수 있어요.', learned: LEARNED }),
      controls: [
        btn(step < 4 ? `⏭ 한 단계 계산 (${step}/4)` : '✓ 계산 끝', next, { primary: true, disabled: step >= 4, next: mission.isNext('calc') }),
        el('label.troom__select', {}, 'B = ', el('select', {
          class: mission.isNext('pick') ? 'is-next' : null,
          onchange: (e) => pickB(e.target.value), 'aria-label': '거리를 잴 음식',
        }, FOODS.map((f) => el('option', { value: f.id, selected: f.id === bId }, `${f.name} (${f.x}, ${f.y})`)))),
        btn('📏 모든 음식과 거리 재기', fillAll, { disabled: Boolean(timer), next: mission.isNext('fill') }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 두 점과 직각삼각형'), el(`div.tplot${mission.isNext('pick') ? '.is-next-box' : ''}`, {}, plot.svg)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {}, el('div.tflow__cap', {}, '🧮 한 단계씩 계산'), calc),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📥 거리 리스트 (표 순서대로 추가)'), listBox)),
      message: msg,
      quiz: mission.has('calc') ? quizBox(quiz, picked, (i) => { picked = i; mission.complete('quiz'); render(); }, { next: mission.isNext('quiz') }) : null,
      connect: connectSection({ mission, cards: CONNECTIONS.distance, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
