/**
 * 📦 7쪽 · 조금씩 고쳐 가기 — 갱신과 기록.
 *   손실 그릇 L(w) = (w − 3)² + 1 위의 공(w)을 "w ← w − 학습률 × 기울기"로 한 걸음씩 옮기고,
 *   그때마다 손실을 기록 리스트에 append 한다. 학습률이 너무 크면 골짜기를 넘어 튕겨 나간다(발산).
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { varCell } from '../structures.js';
import { missionShell, btn, quizBox, codeLines, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { fmt } from '../../core/math.js';

const L = (w) => (w - 3) ** 2 + 1;
const G = (w) => 2 * (w - 3);
const RATES = [
  { lr: 0.1, name: '0.1 · 작게' },
  { lr: 0.4, name: '0.4 · 알맞게' },
  { lr: 1.05, name: '1.05 · 너무 크게' },
];
const W0 = 0;

const STEPS = [
  { id: 'quiz', do: '🔮 먼저 맞혀 보기: 기울기가 −6이면 w는?', see: '"빼기 음수"는 더하기예요.' },
  { id: 'lr01', do: '학습률 0.1로 🔁 "한 번 갱신"을 3번 누르세요.', see: '공이 바닥(w = 3) 쪽으로 내려가고, 기록 리스트의 손실이 줄어요.' },
  { id: 'lr04', do: '학습률 0.4를 고르고 3번 누르세요.', see: '더 크게 움직여 더 빨리 바닥에 닿아요.' },
  { id: 'lr105', do: '학습률 1.05를 고르고 3번 누르세요.', see: '바닥을 지나쳐 반대편으로 더 멀리 튕겨 나가요 — 발산!' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '' },
];
const LEARNED = [
  'w ← w − 학습률 × 기울기: 기울기의 반대쪽으로 조금씩 옮겨요.',
  '고칠 때마다 손실을 기록 리스트에 붙여, 줄어드는지 확인해요.',
  '학습률이 너무 크면 바닥을 지나쳐 발산해요.',
];

export function createUpdateRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('update', STEPS, store);
  let peek = false;
  let lr = 0.1;
  let w = W0;
  let prevW = null;
  let history = [];
  let line = -1;
  let msg = null;
  let qPick = null;

  const plot = createPlot({
    x: [-2, 8], y: [0, 18], width: 300, height: 250, tick: 1, ytick: 3, clip: true,
    xLabel: '가중치 w →', yLabel: '손실 L(w) →', ariaLabel: '손실 그릇과 공',
  });
  const curve = [];
  const edge = Math.sqrt(17);   // L(w) = 18이 되는 곳 — 그림 위로 넘치는 부분은 그리지 않는다
  for (let x = 3 - edge; x <= 3 + edge + 1e-9; x += 0.1) curve.push([x, L(x)]);

  const quiz = { q: 'w = 0에서 기울기는 2 × (0 − 3) = −6이에요. 한 번 갱신하면 w는?', options: ['커진다 (오른쪽으로)', '작아진다 (왼쪽으로)'], answer: 0,
    why: 'w ← w − 학습률 × (−6) — 음수를 빼면 더하는 셈이라 w가 커져요. 공이 골짜기(w = 3) 쪽으로 굴러가요.' };

  function step() {
    prevW = w;
    const g = G(w);
    w = w - lr * g;
    history = [...history, L(w)];
    line = 1;
    if (history.length >= 3) mission.complete(lr === 0.1 ? 'lr01' : lr === 0.4 ? 'lr04' : 'lr105');
    const far = Math.abs(w - 3) > Math.abs(prevW - 3);
    msg = far
      ? { tone: 'warn', text: `w: ${fmt(prevW)} → ${fmt(w)} — 골짜기를 지나쳐 오히려 더 멀어졌어요! 학습률이 너무 커서 발산하는 중이에요.` }
      : { tone: 'ok', text: `w: ${fmt(prevW)} → ${fmt(w)}, 손실 ${fmt(L(prevW))} → ${fmt(L(w))}. 기울기 반대쪽으로 한 걸음 내려갔어요.` };
    render();
  }
  function reset() { w = W0; prevW = null; history = []; line = -1; msg = null; render(); }
  function resetAll() { mission.reset(); qPick = null; lr = 0.1; reset(); }
  function setLr(v) { lr = v; reset(); }

  function render() {
    const g = G(w);
    const clampW = Math.max(-2, Math.min(8, w));
    const shapes = [
      { key: 'curve', kind: 'path', points: curve, cls: 'lossline' },
      { key: 'valley', kind: 'line', x1: 3, y1: 0, x2: 3, y2: 1, cls: 'predict-guide' },
      { key: 'valley-t', kind: 'text', x: 3, y: 1, dy: -10, text: '바닥 w = 3', cls: 'small' },
    ];
    // 기울기(접선) 짧게
    const t = 1;
    shapes.push({ key: 'tan', kind: 'line', x1: clampW - t, y1: Math.max(0, Math.min(18, L(clampW) - g * t)), x2: clampW + t, y2: Math.max(0, Math.min(18, L(clampW) + g * t)), cls: 'toCentroid is-best' });
    if (prevW !== null) shapes.push({ key: 'ghost', kind: 'point', x: Math.max(-2, Math.min(8, prevW)), y: Math.min(18, L(prevW)), shape: 'circle', size: 6, cls: 'ghost cat-3' });
    shapes.push({ key: 'ball', kind: 'point', x: clampW, y: Math.min(18, L(w)), shape: 'circle', size: 8, cls: 'query', label: `w = ${fmt(w)}` });
    plot.update(shapes);

    const shown = history.slice(-10);
    const offset = history.length - shown.length;
    fill(root, missionShell({
      icon: '🔁', title: '조금씩 고쳐 가기 — 갱신과 기록',
      mission: mission.view({ goal: 'w ← w − 학습률 × 기울기로 값을 고쳐 가며, 학습률에 따라 수렴·발산이 어떻게 달라지는지 설명할 수 있어요.', learned: LEARNED }),
      controls: [
        el('span.troom__label', {}, '학습률'),
        RATES.map((r) => btn(r.name, () => setLr(r.lr), { pressed: lr === r.lr,
          next: lr !== r.lr && ((r.lr === 0.4 && mission.isNext('lr04')) || (r.lr === 1.05 && mission.isNext('lr105'))) })),
        btn('🔁 한 번 갱신', step, { primary: true, disabled: Math.abs(w) > 1e4,
          next: (mission.isNext('lr01') && lr === 0.1) || (mission.isNext('lr04') && lr === 0.4) || (mission.isNext('lr105') && lr === 1.05) }),
        btn('↺ 처음으로', resetAll),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '⛰ 손실 그릇 위의 공'), el('div.tplot', {}, plot.svg)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, '📦 변수 — 값 하나씩 담는 상자'),
          el('div.vars', {},
            varCell('w', fmt(w), { hot: line === 1, prev: prevW === null ? null : fmt(prevW) }),
            varCell('학습률', String(lr)),
            varCell('기울기', fmt(g), { note: g > 0 ? '(+ → w 줄이기)' : g < 0 ? '(− → w 늘리기)' : '(0 → 바닥!)' }),
            el('span', { 'data-flip': 'loss-var' }, varCell('손실', fmt(L(w))))),
          el('div.calc', {},
            el('div.calc__title', {}, '🧮 이번 계산'),
            el('div.calc__rows', {},
              el('div.calc__row', {}, `기울기 = 2 × (w − 3) = 2 × (${fmt(w)} − 3) = ${fmt(g)}`),
              el('div.calc__row', {}, `다음 w = ${fmt(w)} − ${lr} × (${fmt(g)}) = ${fmt(w - lr * g)}`))),
          codeLines(['기울기 ← 2 × (w − 3)', 'w ← w − 학습률 × 기울기', '손실 기록에 손실을 추가한다'], line === 1 ? 1 : -1)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, `📝 손실 기록 — ${history.length}칸`),
          el('div.sbox', {}, el('div.sbox__body.pool', {}, history.length === 0
            ? el('div.sbox__empty', {}, '갱신할 때마다 손실이 한 칸씩 붙어요')
            : [offset > 0 ? el('span.sbox__empty', {}, `…앞의 ${offset}개`) : null,
              ...shown.map((l, j) => {
                const i = offset + j;
                const isNew = i === history.length - 1;
                return el(`span.pchip${isNew ? '.is-cur' : ''}`, { 'data-flip': `hl-${i}`, 'data-from': isNew ? 'loss-var' : null }, el('small', {}, `[${i}] `), fmt(l));
              })])),
          el('p.troom__note', {}, history.length >= 2
            ? (history.at(-1) < history.at(-2) ? '📉 기록이 줄어들고 있어요 — 학습이 잘 되는 중!' : '📈 기록이 커지고 있어요 — 학습률을 줄여 보세요.')
            : '💡 선형회귀에서는 w와 b 두 개를 동시에 이렇게 고쳐요.'))),
      message: msg,
      quiz: quizBox(quiz, qPick, (i) => { qPick = i; mission.complete('quiz'); render(); }, { next: mission.isNext('quiz') }),
      connect: connectSection({ mission, cards: CONNECTIONS.update, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
  }

  return { node: root, render };
}
