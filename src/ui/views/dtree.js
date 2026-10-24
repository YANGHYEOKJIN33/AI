/**
 * 의사결정트리 보기 — 트리가 자라는 그림, 그리고
 *   [호출 스택] | [지금 데이터 행] ──특징값으로 나누기──▶ [묶음들] | [레이블 세기 · 점수표]
 * 특징을 바꿔 시험할 때마다 행 칩이 묶음 사이를 옮겨 다니고, 재귀 호출 때 스택이 쌓였다 빠진다.
 */
import { el } from '../dom.js';
import { createPlot } from '../plot.js';
import { sbox, flowArrow, mark } from '../structures.js';
import { fmt } from '../../core/math.js';
import { PLAY_DAYS, PLAY_FEATURES, PLAY_VALUES, PLAY_LABELS } from '../../core/datasets.js';

const byId = Object.fromEntries(PLAY_DAYS.map((r) => [r.id, r]));
const LABEL = Object.fromEntries(PLAY_LABELS.map((l, i) => [l.id, { ...l, cat: i === 0 ? '2' : '1' }]));
const TARGET_NAME = { stack: '호출 스택', groups: 'groups', scores: 'score', counts: '레이블 세기', tree: '트리' };
const W = 400;
const H = 250;
const NODE_W = 82;
const NODE_H = 36;


function labelMark(label) { const l = LABEL[label]; return mark(l.shape, l.cat); }
const countShort = (c) => `⚽${c['한다']} ✋${c['안 한다']}`;

/** 최종 트리로 자리를 미리 정한다 — 노드가 늘어나도 이미 그린 노드가 움직이지 않게 */
function layout(nodes, rootId) {
  const kids = (id) => Object.values(nodes).filter((n) => n.parent === id)
    .sort((a, b) => {
      const feat = nodes[id].feature;
      const order = PLAY_VALUES[feat] ?? [];
      return order.indexOf(a.edge) - order.indexOf(b.edge);
    });
  const pos = {};
  let slot = 0;
  const maxDepth = Math.max(...Object.values(nodes).map((n) => n.depth));
  function walk(id) {
    const ch = kids(id);
    if (ch.length === 0) { pos[id] = { slot: slot++ }; }
    else {
      ch.forEach((c) => walk(c.id));
      pos[id] = { slot: (pos[ch[0].id].slot + pos[ch[ch.length - 1].id].slot) / 2 };
    }
    pos[id].depth = nodes[id].depth;
  }
  walk(rootId);
  const slots = Math.max(1, slot - 1);
  const levelGap = maxDepth === 0 ? 0 : (H - NODE_H - 24) / maxDepth;
  for (const id of Object.keys(pos)) {
    pos[id].x = slot === 1 ? W / 2 : 50 + (pos[id].slot / slots) * (W - 100);
    pos[id].y = 14 + pos[id].depth * levelGap;
  }
  return pos;
}

let layoutFor = null;
let layoutCache = null;
function layoutOf(v) {
  if (layoutFor !== v.result) { layoutFor = v.result; layoutCache = layout(v.result.nodes, v.result.root); }
  return layoutCache;
}

export default {
  stageTitle: '트리 — 운동장에서 축구할까?',
  plotRatio: W / H,
  stageHint: '점선 상자 = 만드는 중 · 색 상자 = 잎(답)',
  targetName: (t) => TARGET_NAME[t] ?? t,

  intro: {
    question: '14일의 기록으로 "오늘 운동장에서 축구할까?"를 맞히는 질문 트리를 만들면?',
    input: '표 14줄 (날씨 · 기온 · 습도 · 바람 → 한다 / 안 한다)',
    output: '질문 트리 (질문 노드 + 잎 노드)',
    tips: [
      '지니 불순도 = 1 − (한다 비율)² − (안 한다 비율)². 모두 같으면 0, 반반이면 0.5.',
      '점수 = 묶음 불순도를 묶음 크기로 가중 평균. 점수가 가장 작은 특징이 질문이 돼요.',
      '가지는 값 순서(맑음 → 흐림 → 비)대로 끝까지 만든 뒤 다음 가지로 가요. 노드가 만들어지는 순서를 자주 물어요.',
    ],
  },
  introBoxes: ['table'],

  createPlot() {
    return createPlot({ x: [0, W], y: [0, H], width: W, height: H, axes: false, flipY: false, ariaLabel: '의사결정트리', cls: 'plot--tree' });
  },

  shapes(v) {
    const { ds } = v;
    const pos = layoutOf(v);
    const shapes = [];
    const nodes = Object.values(ds.nodes);
    const onPath = new Set();
    // 가지
    for (const nd of nodes) {
      if (nd.parent === null || !pos[nd.id] || !pos[nd.parent]) continue;
      const a = pos[nd.parent]; const b = pos[nd.id];
      const cls = `${nd.id === ds.cur ? 'is-cur' : ''}${onPath.has(nd.id) ? ' on-path' : ''}`;
      shapes.push({ key: `e-${nd.id}`, kind: 'line', x1: a.x, y1: a.y + NODE_H, x2: b.x, y2: b.y, cls: `tedge ${cls}` });
      shapes.push({ key: `el-${nd.id}`, kind: 'text', x: (a.x + b.x) / 2, y: (a.y + NODE_H + b.y) / 2 + 3, text: nd.edge, cls: `tedge-label ${cls}` });
    }
    // 노드
    for (const nd of nodes) {
      const p = pos[nd.id];
      if (!p) continue;
      const leafCat = nd.kind === 'leaf' ? ` cat-${LABEL[nd.label].cat}` : '';
      const cls = `tnode ${nd.kind}${leafCat}${nd.id === ds.cur ? ' is-cur' : ''}${onPath.has(nd.id) ? ' on-path' : ''}`;
      shapes.push({ key: `n-${nd.id}`, kind: 'rect', x: p.x - NODE_W / 2, y: p.y, w: NODE_W, h: NODE_H, cls, rx: 8 });
      const main = nd.kind === 'split' ? `${nd.feature}는?` : nd.kind === 'leaf' ? `${LABEL[nd.label].icon} ${nd.label}` : '? 만드는 중';
      shapes.push({ key: `t-${nd.id}`, kind: 'text', x: p.x, y: p.y + 15, text: main, cls: 'tlabel' });
      shapes.push({ key: `s-${nd.id}`, kind: 'text', x: p.x, y: p.y + 29, text: `${nd.n}개 · ${countShort(nd.counts)}`, cls: 'tsub' });
    }
    return shapes;
  },

  legend() {
    return el('div.legend', {},
      ...PLAY_LABELS.map((l) => el('span.legend__item', { 'data-cat': LABEL[l.id].cat }, labelMark(l.id), `${l.icon} ${l.id}`)),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--current)' }, '▢'), '지금 만드는 노드'));
  },

  data(v, { boxes }) {
    const { ds, frame } = v;
    const hot = (t) => frame.effects.some((e) => e.target === t);
    const rowChip = (id) => {
      const r = byId[id];
      const l = LABEL[r.label];
      return el('span.pchip', {
        'data-flip': `r-${id}`, 'data-cat': l.cat,
        title: `#${r.no}: ${PLAY_FEATURES.map((f) => `${f} ${r[f]}`).join(', ')} → ${r.label}`,
      }, mark(l.shape, l.cat), `#${r.no}`, ds.groups ? null : el('small', {}, ` ${r[PLAY_FEATURES[0]]}`));
    };

    // 호출 스택 — 아래가 바닥(먼저 부른 것), 위가 지금 실행 중인 호출
    const stack = el('div.stackwrap', {},
      el('div.stack', {}, ds.stack.map((f, i) => el(`div.stack__frame${i === ds.stack.length - 1 ? '.is-top' : ''}`, {
        'data-flip': `sf-${f.nodeId}`, 'data-enter': 'up',
      }, `트리만들기(${f.rows}행${f.edge ? ` · ${f.edge}` : ''}, 깊이 ${f.depth})`))),
      el('div.stack__label', {}, '▲ 맨 위 = 지금 실행 중 · 바닥 = 처음 호출'));

    // 지금 데이터 / 묶음
    const rowsBox = ds.groups
      ? sbox({ target: 'groups', name: '묶음', kind: '딕셔너리', title: `"${ds.groups.feature}"의 값 → 행 리스트`, frame },
        el('div.bins', {}, ds.groups.bins.map((b) => el(`div.bin${ds.branch === b.value ? '.is-hot' : ''}${ds.branch && ds.branch !== b.value ? '.is-dim' : ''}`, {},
          el('div.bin__head', {}, `${b.value}`, el('span.bin__sub', {}, `${b.rows.length}개 · ${ds.criterion === 'entropy' ? 'H' : 'G'}=${fmt(b.imp, 3)}`)),
          el('div.bin__body', {}, b.rows.map(rowChip))))))
      : sbox({ target: 'rows', name: '데이터 행', kind: '리스트', title: ds.cur ? '이 호출이 받은 행' : '', frame,
        count: ds.rows.length, hint: ds.done ? '트리 완성 — 호출이 모두 끝났어요' : '', bodyCls: 'pool' }, ds.rows.map(rowChip));

    const counts = ds.labelCounts
      ? Object.entries(ds.labelCounts).map(([label, n]) => el('div.kv', { 'data-cat': LABEL[label].cat },
        el('span.kv__key', {}, labelMark(label), ` "${label}"`), el('span.kv__colon', {}, ':'), el('span'), el('strong.kv__val', {}, String(n))))
      : [];

    const scoreRows = ds.scores.map((s) => el(`div.kv.kv--score${ds.best === s.feature ? '.is-win' : ''}${!ds.best && ds.groups?.feature === s.feature ? '.is-cur' : ''}`, {},
      el('span.kv__key', {}, `"${s.feature}"`), el('span.kv__colon', {}, ':'),
      el('span.scorebar', {}, el('span.scorebar__fill', { style: `width:${Math.min(100, (s.score / (ds.criterion === 'entropy' ? 1 : 0.5)) * 100)}%` })),
      el('strong.kv__val', {}, fmt(s.score, 3))));

    // 문제 보기 쪽 — 14일 기록 표
    if (boxes.has('table')) {
      return el('div.flow.flow--tree', {}, sbox({ target: 'table', name: '기록', kind: '표', title: '14일 (행 = 하루)', cls: 'sbox--table' },
        el('table.dtable', {},
          el('thead', {}, el('tr', {}, el('th', {}, '#'), PLAY_FEATURES.map((f) => el('th', {}, f)), el('th', {}, '축구'))),
          el('tbody', {}, PLAY_DAYS.map((r) => el('tr', {},
            el('td.num', {}, String(r.no)), PLAY_FEATURES.map((f) => el('td', {}, r[f])),
            el('td', {}, labelMark(r.label), ` ${r.label}`)))))));
    }
    const parts = [];
    if (boxes.has('stack')) parts.push(sbox({ target: 'stack', name: '호출 스택', kind: '스택', title: '맨 위 = 지금 실행 중', frame, cls: 'sbox--stack' }, stack));
    if (boxes.has('groups')) parts.push(el('div.flow__col.flow__col--wide', {}, rowsBox));
    const right = [];
    if (boxes.has('counts')) right.push(sbox({ target: 'counts', name: '레이블 세기', kind: '딕셔너리', title: '지금 데이터', frame, hint: '호출되면 먼저 레이블을 세요' }, counts));
    if (boxes.has('scores')) right.push(sbox({ target: 'scores', name: '점수표', kind: '딕셔너리', title: `특징 → 가중 ${ds.criterion === 'entropy' ? '엔트로피' : '지니'} (작을수록 좋음)`, frame,
      hint: '특징을 시험할 때마다 한 줄씩' }, scoreRows));
    if (right.length) { parts.push(flowArrow('세고 재기')); parts.push(el('div.flow__col', {}, right)); }
    return el('div.flow.flow--tree', {}, parts);
  },
};
