/**
 * 6쪽 · 묶음으로 나누고 평균 내기.
 *   points(대기 줄) ──규칙──▶ 묶음 리스트들 ──평균──▶ 묶음의 가운데(◆)
 * 규칙 ① 질문으로 나누기("가로 < 5 ?")  → 의사결정트리의 나누기
 * 규칙 ② 가까운 중심으로 나누기          → k-평균의 할당, 평균 = 새 중심
 */
import { el, fill } from '../dom.js';
import { createPlot } from '../plot.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { roomShell, btn, quizBox, algoLinks, codeLines } from './common.js';
import { HOUSES, HOUSE_AXES } from '../../core/datasets.js';
import { dist, mean, fmt } from '../../core/math.js';

const RULES = {
  question: {
    name: '① 질문으로 나누기 (트리처럼)',
    bins: ['예 (x < 5)', '아니요 (x ≥ 5)'],
    shapes: ['circle', 'square'],
    code: ['groups = {"예": [], "아니요": []}', 'groups["예" if p.x < 5 else "아니요"].append(p)', 'center = (mean(xs), mean(ys))'],
    pick: (p) => (p.x < 5 ? 0 : 1),
    why: (p) => `질문 "가로 위치 < 5 ?" — ${p.x} < 5 는 ${p.x < 5 ? '참 → 예' : '거짓 → 아니요'}`,
  },
  center: {
    name: '② 가까운 중심으로 (k-평균처럼)',
    bins: ['중심 A (2, 2)', '중심 B (7, 7)'],
    shapes: ['circle', 'triangle'],
    centers: [{ x: 2, y: 2 }, { x: 7, y: 7 }],
    code: ['clusters = [[], []]', 'clusters[nearest(p, centers)].append(p)', 'new_center = (mean(xs), mean(ys))'],
    pick: (p) => (dist([p.x, p.y], [2, 2]) <= dist([p.x, p.y], [7, 7]) ? 0 : 1),
    why: (p) => `A까지 ${fmt(dist([p.x, p.y], [2, 2]))}, B까지 ${fmt(dist([p.x, p.y], [7, 7]))} → 더 가까운 ${dist([p.x, p.y], [2, 2]) <= dist([p.x, p.y], [7, 7]) ? 'A' : 'B'}`,
  },
};

export function createGroupRoom({ store }) {
  const root = el('div');
  const flip = createFlip();
  let ruleId = 'question';
  let done = 0;
  let means = null;
  let line = -1;
  let msg = null;
  let qPick = null;
  let timer = null;

  const plot = createPlot({
    x: [HOUSE_AXES.min, HOUSE_AXES.max], y: [HOUSE_AXES.min, HOUSE_AXES.max], width: 300, height: 280,
    xLabel: `${HOUSE_AXES.x} →`, yLabel: `${HOUSE_AXES.y} →`, ariaLabel: '점을 묶음으로 나누기',
  });

  const quizzes = {
    question: { q: '집3 (5, 7)은 "가로 < 5 ?"에서 어느 묶음으로 갈까요?', options: ['예', '아니요'], answer: 1,
      why: '5 < 5 는 거짓이에요(같으면 작지 않아요). 그래서 "아니요" 묶음 — 경계값을 조심해요!' },
    center: { q: '집10 (8, 4)는 어느 중심에 더 가까울까요?', options: ['중심 A (2, 2)', '중심 B (7, 7)'], answer: 1,
      why: `A까지 ${fmt(dist([8, 4], [2, 2]))}, B까지 ${fmt(dist([8, 4], [7, 7]))} — B가 더 가까워요.` },
  };

  function setRule(id) { if (timer) { clearInterval(timer); timer = null; } ruleId = id; done = 0; means = null; line = -1; msg = null; qPick = null; render(); }
  function splitOne() {
    if (done >= HOUSES.length) return;
    const rule = RULES[ruleId];
    const p = HOUSES[done];
    done += 1; means = null; line = 1;
    msg = { tone: 'info', text: `${p.name} (${p.x}, ${p.y}): ${rule.why(p)} → ${rule.bins[rule.pick(p)]} 묶음 리스트에 append` };
    render();
  }
  function splitAll() {
    if (timer) return;
    timer = setInterval(() => { if (done >= HOUSES.length) { clearInterval(timer); timer = null; render(); return; } splitOne(); }, 380);
  }
  function average() {
    if (done < HOUSES.length) { msg = { tone: 'warn', text: '먼저 모든 점을 나눠 주세요 (⏩ 모두 나누기).' }; render(); return; }
    const rule = RULES[ruleId];
    means = [0, 1].map((b) => {
      const ps = HOUSES.filter((p) => rule.pick(p) === b);
      return { x: mean(ps.map((p) => p.x)), y: mean(ps.map((p) => p.y)), xs: ps.map((p) => p.x), ys: ps.map((p) => p.y) };
    });
    line = 2;
    msg = ruleId === 'center'
      ? { tone: 'ok', text: '묶음마다 평균을 냈어요. k-평균은 이 평균 자리로 중심을 옮기고(갱신), 다시 나누기를 반복해요. 그림의 화살표를 보세요.' }
      : { tone: 'ok', text: '묶음마다 평균을 냈어요. 질문 하나로 나눴을 뿐인데 두 묶음의 가운데가 확실히 갈라졌죠?' };
    render();
  }
  function reset() { setRule(ruleId); }

  function render() {
    const rule = RULES[ruleId];
    const assigned = HOUSES.slice(0, done);
    const shapes = [];
    if (ruleId === 'question') {
      shapes.push({ key: 'qline', kind: 'line', x1: 5, y1: 0, x2: 5, y2: 10, cls: 'toCentroid is-best' });
      shapes.push({ key: 'qtext', kind: 'text', x: 5, y: 9.6, dx: 4, anchor: 'start', text: 'x = 5', cls: 'dtext' });
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

    fill(root, roomShell({
      icon: '🧺', title: '묶음으로 나누고 평균 내기',
      rule: '규칙에 따라 점을 묶음 리스트에 하나씩 넣고(append), 묶음마다 x 평균·y 평균을 내면 그 묶음의 "가운데"가 나와요.',
      controls: [
        Object.entries(RULES).map(([id, r]) => btn(r.name, () => setRule(id), { pressed: ruleId === id })),
        btn(`➕ 하나 나누기 (${done}/${HOUSES.length})`, splitOne, { primary: true, disabled: done >= HOUSES.length || Boolean(timer) }),
        btn('⏩ 모두 나누기', splitAll, { disabled: done >= HOUSES.length || Boolean(timer) }),
        btn('➗ 평균 내기', average, { disabled: Boolean(timer) }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '📈 마을 지도'), el('div.tplot', {}, plot.svg)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `📋 points — 대기 줄 (${HOUSES.length - done}개)`),
          el('div.sbox', {}, el('div.sbox__body.pool', {}, HOUSES.slice(done).length ? HOUSES.slice(done).map((p) => chipOf(p, null)) : el('div.sbox__empty', {}, '모두 나눴어요'))),
          el('div.flowarrow.flowarrow--down', {}, el('span.flowarrow__head', {}, '⬇'), el('span.flowarrow__label', {}, 'append')),
          el('div.bins', {}, [0, 1].map((b) => el('div.bin', { 'data-cat': String(b + 1) },
            el('div.bin__head', {}, mark(rule.shapes[b], String(b + 1)), rule.bins[b], el('span.bin__sub', {}, `${assigned.filter((p) => rule.pick(p) === b).length}개`)),
            el('div.bin__body', {}, assigned.filter((p) => rule.pick(p) === b).map((p) => chipOf(p, String(b + 1)))),
            means ? el('div.bin__mean', {}, `x = (${means[b].xs.join('+')})/${means[b].xs.length} = ${fmt(means[b].x)}`, el('br'), `y = (${means[b].ys.join('+')})/${means[b].ys.length} = ${fmt(means[b].y)}`) : null)))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {}, el('div.tflow__cap', {}, '🐍 실행한 줄'), codeLines(rule.code, line))),
      message: msg,
      quiz: quizBox(quizzes[ruleId], qPick, (i) => { qPick = i; render(); }),
      links: algoLinks(store, [['kmeans', '가까운 중심으로 나누고 평균으로 중심 옮기기'], ['dtree', '특징값(질문)으로 행 나누기']]),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
