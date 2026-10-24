/**
 * 📦 6쪽 · 묶음으로 나누고 평균 내기.
 *   점(대기 줄) ──규칙──▶ 묶음 리스트들 ──평균──▶ 묶음의 가운데(◆)
 * 규칙 ① 질문으로 나누기("가로 < 5 ?")  → 의사결정트리의 나누기
 * 규칙 ② 가까운 중심으로 나누기          → k-평균의 할당, 평균 = 새 중심
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { missionShell, btn, quizBox, codeLines, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { HOUSES, HOUSE_AXES } from '../../core/datasets.js';
import { mean, fmt } from '../../core/math.js';

const d2 = (p, c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2;

const RULES = {
  question: {
    name: '① 질문으로 나누기 (트리처럼)',
    bins: ['예 (x < 5)', '아니요 (x ≥ 5)'],
    shapes: ['circle', 'square'],
    code: ['묶음 ← {예: 빈 리스트, 아니요: 빈 리스트}', '질문의 답 묶음에 p를 넣는다', '묶음마다 평균 (x끼리, y끼리)'],
    pick: (p) => (p.x < 5 ? 0 : 1),
    why: (p) => `질문 "가로 위치 < 5 ?" — ${p.x} < 5 는 ${p.x < 5 ? '참 → 예' : '거짓 → 아니요'}`,
  },
  center: {
    name: '② 가까운 중심으로 (k-평균처럼)',
    bins: ['중심 A (2, 2)', '중심 B (7, 7)'],
    shapes: ['circle', 'triangle'],
    centers: [{ x: 2, y: 2 }, { x: 7, y: 7 }],
    code: ['묶음 ← 빈 리스트 2개', '가장 가까운 중심의 묶음에 p를 넣는다', '새 중심 ← 묶음마다 평균'],
    pick: (p) => (d2(p, { x: 2, y: 2 }) <= d2(p, { x: 7, y: 7 }) ? 0 : 1),
    why: (p) => `A까지 d² ${d2(p, { x: 2, y: 2 })}, B까지 d² ${d2(p, { x: 7, y: 7 })} → 더 가까운 ${d2(p, { x: 2, y: 2 }) <= d2(p, { x: 7, y: 7 }) ? 'A' : 'B'}`,
  },
};

const STEPS = [
  { id: 'quiz', do: '🔮 먼저 맞혀 보기: 경계에 있는 집4는 어느 묶음?', see: '"<"는 같으면 거짓이에요.' },
  { id: 'qsplit', do: '규칙 ①에서 ⏩ "모두 나누기"를 누르세요.', see: '질문의 답(예/아니요)마다 묶음 리스트에 하나씩 추가돼요 — 트리의 나누기.' },
  { id: 'csplit', do: '규칙 ②(가까운 중심으로)를 누르고 ⏩ "모두 나누기"를 누르세요.', see: '중심 A·B 중 d²이 더 작은 쪽 묶음으로 — k-평균의 할당.' },
  { id: 'mean', do: '➗ "평균 내기"를 누르세요.', see: '묶음마다 x끼리, y끼리 평균 → 그림의 화살표가 k-평균의 "중심 갱신"이에요.' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '' },
];
const LEARNED = [
  '묶음 = 리스트. 규칙에 맞는 묶음에 하나씩 추가해요.',
  '평균 = 묶음의 가운데 (x끼리 더해 나누고, y끼리 더해 나눠요).',
  '질문의 답으로 나누면 의사결정트리, 가까운 중심으로 나누면 k-평균.',
];

export function createGroupRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('group', STEPS, store);
  let ruleId = 'question';
  let done = 0;
  let means = null;
  let line = -1;
  let msg = null;
  let qPick = null;
  let timer = null;
  let peek = false;

  const plot = createPlot({
    x: [HOUSE_AXES.min, HOUSE_AXES.max], y: [HOUSE_AXES.min, HOUSE_AXES.max], width: 300, height: 280,
    xLabel: `${HOUSE_AXES.x} →`, yLabel: `${HOUSE_AXES.y} →`, ariaLabel: '점을 묶음으로 나누기',
  });

  const edge = HOUSES.find((h) => h.x === 5) ?? HOUSES[3];
  const quiz = { q: `${edge.name} (${edge.x}, ${edge.y})은 "가로 < 5 ?"에서 어느 묶음으로 갈까요?`, options: ['예', '아니요'], answer: 1,
    why: '5 < 5 는 거짓이에요(같으면 작지 않아요). 그래서 "아니요" 묶음 — 경계값을 조심해요!' };

  function setRule(id) { if (timer) { clearInterval(timer); timer = null; } ruleId = id; done = 0; means = null; line = -1; msg = null; render(); }
  function finishSplit() { mission.complete(ruleId === 'question' ? 'qsplit' : 'csplit'); }
  function splitOne() {
    if (done >= HOUSES.length) return;
    const rule = RULES[ruleId];
    const p = HOUSES[done];
    done += 1; means = null; line = 1;
    msg = { tone: 'info', text: `${p.name} (${p.x}, ${p.y}): ${rule.why(p)} → "${rule.bins[rule.pick(p)]}" 묶음에 추가` };
    if (done >= HOUSES.length) finishSplit();
    render();
  }
  function splitAll() {
    if (timer) return;
    timer = setInterval(() => { if (done >= HOUSES.length) { clearInterval(timer); timer = null; finishSplit(); render(); return; } splitOne(); }, 380);
  }
  function average() {
    if (done < HOUSES.length) { msg = { tone: 'warn', text: '먼저 모든 점을 나눠 주세요 (⏩ 모두 나누기).' }; render(); return; }
    const rule = RULES[ruleId];
    means = [0, 1].map((b) => {
      const ps = HOUSES.filter((p) => rule.pick(p) === b);
      return { x: mean(ps.map((p) => p.x)), y: mean(ps.map((p) => p.y)), xs: ps.map((p) => p.x), ys: ps.map((p) => p.y) };
    });
    line = 2;
    if (ruleId === 'center') mission.complete('mean');
    msg = ruleId === 'center'
      ? { tone: 'ok', text: '묶음마다 평균을 냈어요. k-평균은 이 평균 자리로 중심을 옮기고(갱신), 다시 나누기를 반복해요. 그림의 화살표를 보세요.' }
      : { tone: 'ok', text: '묶음마다 평균을 냈어요. 질문 하나로 나눴을 뿐인데 두 묶음의 가운데가 확실히 갈라졌죠?' };
    render();
  }
  function reset() { mission.reset(); qPick = null; setRule('question'); }

  function render() {
    const rule = RULES[ruleId];
    const assigned = HOUSES.slice(0, done);
    const shapes = [];
    if (ruleId === 'question') {
      shapes.push({ key: 'qline', kind: 'line', x1: 5, y1: 0, x2: 5, y2: HOUSE_AXES.max, cls: 'toCentroid is-best' });
      shapes.push({ key: 'qtext', kind: 'text', x: 5, y: HOUSE_AXES.max - 0.4, dx: 4, anchor: 'start', text: 'x = 5', cls: 'dtext' });
    }
    for (const p of HOUSES) {
      const b = HOUSES.indexOf(p) < done ? rule.pick(p) : null;
      shapes.push({ key: p.id, kind: 'point', x: p.x, y: p.y, shape: b === null ? 'circle' : rule.shapes[b], size: 5.5,
        cls: `${b === null ? 'unassigned' : `cat-${b + 1}`}${HOUSES.indexOf(p) === done - 1 ? ' is-cur' : ''}`, label: p.name, labelBelow: true });
    }
    if (rule.centers) rule.centers.forEach((c, i) => shapes.push({ key: `c${i}`, kind: 'point', x: c.x, y: c.y, shape: 'diamond', size: 8, cls: `centroid cat-${i + 1}`, label: 'AB'[i] }));
    if (means) {
      means.forEach((m, i) => {
        if (rule.centers) shapes.push({ key: `mv${i}`, kind: 'line', x1: rule.centers[i].x, y1: rule.centers[i].y, x2: m.x, y2: m.y, cls: 'move-arrow' });
        shapes.push({ key: `m${i}`, kind: 'point', x: m.x, y: m.y, shape: 'diamond', size: 8, cls: `centroid ghost cat-${i + 1}`, label: `평균 (${fmt(m.x, 1)}, ${fmt(m.y, 1)})` });
      });
    }
    plot.update(shapes);

    const chipOf = (p, cat) => el(`span.pchip${HOUSES.indexOf(p) === done - 1 ? '.is-cur' : ''}`, { 'data-flip': `g-${p.id}`, 'data-cat': cat },
      cat ? mark(rule.shapes[+cat - 1], cat) : null, p.name, el('small', {}, ` (${p.x},${p.y})`));

    fill(root, missionShell({
      icon: '🧺', title: '묶음으로 나누고 평균 내기',
      mission: mission.view({ goal: '규칙(질문 · 가까운 중심)으로 데이터를 묶음에 나누고, 묶음의 평균(새 중심)을 계산할 수 있어요.', learned: LEARNED }),
      controls: [
        Object.entries(RULES).map(([id, r]) => btn(r.name, () => setRule(id), { pressed: ruleId === id, next: id === 'center' && mission.isNext('csplit') && ruleId !== 'center' })),
        btn(`➕ 하나 나누기 (${done}/${HOUSES.length})`, splitOne, { primary: true, disabled: done >= HOUSES.length || Boolean(timer) }),
        btn('⏩ 모두 나누기', splitAll, { disabled: done >= HOUSES.length || Boolean(timer), next: (mission.isNext('qsplit') && ruleId === 'question') || (mission.isNext('csplit') && ruleId === 'center') }),
        btn('➗ 평균 내기', average, { disabled: Boolean(timer), next: mission.isNext('mean') && ruleId === 'center' && done >= HOUSES.length }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 마을 지도'), el('div.tplot', {}, plot.svg)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `📋 대기 줄 (${HOUSES.length - done}개)`),
          el('div.sbox', {}, el('div.sbox__body.pool', {}, HOUSES.slice(done).length ? HOUSES.slice(done).map((p) => chipOf(p, null)) : el('div.sbox__empty', {}, '모두 나눴어요'))),
          el('div.flowarrow.flowarrow--down', {}, el('span.flowarrow__head', {}, '⬇'), el('span.flowarrow__label', {}, '묶음에 추가')),
          el('div.bins', {}, [0, 1].map((b) => el('div.bin', { 'data-cat': String(b + 1) },
            el('div.bin__head', {}, mark(rule.shapes[b], String(b + 1)), rule.bins[b], el('span.bin__sub', {}, `${assigned.filter((p) => rule.pick(p) === b).length}개`)),
            el('div.bin__body', {}, assigned.filter((p) => rule.pick(p) === b).map((p) => chipOf(p, String(b + 1)))),
            means ? el('div.bin__mean', {}, `x = (${means[b].xs.join('+')})/${means[b].xs.length} = ${fmt(means[b].x)}`, el('br'), `y = (${means[b].ys.join('+')})/${means[b].ys.length} = ${fmt(means[b].y)}`) : null)))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📜 실행한 의사코드'), codeLines(rule.code, line))),
      message: msg,
      quiz: ruleId === 'question' ? quizBox(quiz, qPick, (i) => { qPick = i; mission.complete('quiz'); render(); }, { next: mission.isNext('quiz') }) : null,
      connect: connectSection({ mission, cards: CONNECTIONS.group, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
