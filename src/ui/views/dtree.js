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
import { classify } from '../../core/algorithms/dtree.js';

const byId = Object.fromEntries(PLAY_DAYS.map((r) => [r.id, r]));
const LABEL = Object.fromEntries(PLAY_LABELS.map((l, i) => [l.id, { ...l, cat: i === 0 ? '2' : '1' }]));
const TARGET_NAME = { stack: '호출 스택', groups: 'groups', scores: 'score', counts: '레이블 세기', tree: '트리' };
const W = 400;
const H = 250;
const NODE_W = 82;
const NODE_H = 36;

/** ①쪽 써 보기 — 오늘 날씨 */
const sample = { 날씨: '맑음', 기온: '쌀쌀', 습도: '높음', 바람: '강함' };

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

  reviewInfo: {
    one: '질문(특징)으로 데이터를 계속 나눠, 묶음이 한 레이블로 깨끗해지면 멈춰요. 가장 깨끗하게 나누는 질문을 불순도로 골라요.',
    input: '표(특징 + 레이블)',
    output: '질문 트리 → 새 데이터의 레이블',
    phaseDs: ['레이블 세기(딕셔너리) → 잎?', 'rows ➜ groups (값별 리스트)', 'score 딕셔너리 → min', 'build(…) 재귀 = 스택 push/pop'],
    tools: ['table', 'dict', 'group'],
    remember: [
      '불순도는 작을수록 깨끗해요 — 점수가 가장 "작은" 특징을 골라요(정보 이득으로 말하면 가장 큰 것).',
      '끝까지 키우면 학습 데이터에만 딱 맞는 과대적합이 생길 수 있어, 최대 깊이에서 멈추기도 해요.',
      '재귀 호출은 호출 스택에 쌓였다 빠져요 — 8-퍼즐에서 배운 스택이 여기서도 일해요.',
    ],
  },

  outcome(run) {
    const { nodes, root, depth, leaves } = run.result;
    const correct = PLAY_DAYS.filter((d) => classify(nodes, root, d).label === d.label).length;
    return `뿌리 "${nodes[root].feature}" · 깊이 ${depth} · 잎 ${leaves}개 · 학습 데이터 ${correct}/${PLAY_DAYS.length} 맞힘`;
  },

  createPlot() {
    return createPlot({ x: [0, W], y: [0, H], width: W, height: H, axes: false, flipY: false, ariaLabel: '의사결정트리', cls: 'plot--tree' });
  },

  shapes(v, { page }) {
    const { ds } = v;
    const pos = layoutOf(v);
    const shapes = [];
    const nodes = Object.values(ds.nodes);
    const onPath = new Set();
    if (page === 'review' && v.atEnd) {
      for (const id of classify(ds.nodes, ds.root, sample).path) onPath.add(id);
    }
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

  extra(v, { page, player }) {
    if (page !== 'review') return null;
    if (!v.atEnd) {
      return el('div.tryit', {}, el('div.tryit__title', {}, '👆 써 보기'), el('div', {}, '⏩ 끝까지 트리를 만든 뒤, 오늘 날씨를 골라 예측해 보세요.'));
    }
    const res = classify(v.ds.nodes, v.ds.root, sample);
    return el('div.tryit', {},
      el('div.tryit__title', {}, '👆 써 보기 — 오늘 날씨를 고르면 트리에서 길이 켜져요'),
      el('div.tryit__row', {}, PLAY_FEATURES.map((f) => el('label', {}, `${f} `,
        el('select', {
          'aria-label': f,
          onchange: (e) => { sample[f] = e.target.value; player.goTo(player.view().index); },
        }, PLAY_VALUES[f].map((val) => el('option', { value: val, selected: sample[f] === val }, val)))))),
      el('div.tryit__row', {}, '→ 예측: ', el('strong.tryit__answer', { 'data-cat': LABEL[res.label].cat }, `${LABEL[res.label].icon} ${res.label}`)));
  },

  data(v) {
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
      }, `build(${f.rows}행${f.edge ? `, ${f.edge}` : ''}, 깊이 ${f.depth})`))),
      el('div.stack__label', {}, '▲ 맨 위 = 지금 실행 중 · 바닥 = 처음 호출'));

    // 지금 데이터 / 묶음
    const rowsBox = ds.groups
      ? sbox({ target: 'groups', name: 'groups', kind: '딕셔너리', title: `"${ds.groups.feature}"의 값 → 행 리스트`, frame },
        el('div.bins', {}, ds.groups.bins.map((b) => el(`div.bin${ds.branch === b.value ? '.is-hot' : ''}${ds.branch && ds.branch !== b.value ? '.is-dim' : ''}`, {},
          el('div.bin__head', {}, `${b.value}`, el('span.bin__sub', {}, `${b.rows.length}개 · ${ds.criterion === 'entropy' ? 'H' : 'G'}=${fmt(b.imp, 3)}`)),
          el('div.bin__body', {}, b.rows.map(rowChip))))))
      : sbox({ target: 'rows', name: 'rows', kind: '리스트', title: ds.cur ? '이 호출이 받은 데이터 행' : '데이터 행', frame,
        count: ds.rows.length, hint: ds.done ? '트리 완성 — 호출이 모두 끝났어요' : '', bodyCls: 'pool' }, ds.rows.map(rowChip));

    const counts = ds.labelCounts
      ? Object.entries(ds.labelCounts).map(([label, n]) => el('div.kv', { 'data-cat': LABEL[label].cat },
        el('span.kv__key', {}, labelMark(label), ` "${label}"`), el('span.kv__colon', {}, ':'), el('span'), el('strong.kv__val', {}, String(n))))
      : [];

    const scoreRows = ds.scores.map((s) => el(`div.kv.kv--score${ds.best === s.feature ? '.is-win' : ''}${!ds.best && ds.groups?.feature === s.feature ? '.is-cur' : ''}`, {},
      el('span.kv__key', {}, `"${s.feature}"`), el('span.kv__colon', {}, ':'),
      el('span.scorebar', {}, el('span.scorebar__fill', { style: `width:${Math.min(100, (s.score / (ds.criterion === 'entropy' ? 1 : 0.5)) * 100)}%` })),
      el('strong.kv__val', {}, fmt(s.score, 3))));

    return el('div.flow.flow--tree', {},
      sbox({ target: 'stack', name: 'call stack', kind: '스택', title: '호출 스택', frame, cls: 'sbox--stack' }, stack),
      el('div.flow__col.flow__col--wide', {}, rowsBox),
      flowArrow('세고 재기'),
      el('div.flow__col', {},
        sbox({ target: 'counts', name: 'counts', kind: '딕셔너리', title: '레이블 세기', frame, hint: '호출되면 먼저 레이블을 세요' }, counts),
        sbox({ target: 'scores', name: 'score', kind: '딕셔너리', title: `특징 → 가중 ${ds.criterion === 'entropy' ? '엔트로피' : '지니'} (작을수록 좋음)`, frame,
          hint: '특징을 시험할 때마다 한 줄씩' }, scoreRows),
      ),
    );
  },
};
