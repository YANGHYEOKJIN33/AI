/**
 * k-평균 보기 — 반복할 때마다 점(집)이 대기 줄 ↔ 묶음 리스트 사이를 이동하고,
 * 묶음 평균이 새 중심이 되어 그림의 ◆가 미끄러진다.
 *
 *   [points 대기 줄] ──가장 가까운 중심──▶ [clusters[A] | [B] | [C]]
 *                                              │ 평균
 *   [centroids] ◀──교체── [new 새 중심] ◀───────┘
 */
import { el } from '../dom.js';
import { createPlot } from '../plot.js';
import { sbox, flowArrow, mark, varCell } from '../structures.js';
import { fmt } from '../../core/math.js';
import { HOUSES, HOUSE_AXES, CLUSTER_STYLE } from '../../core/datasets.js';
import { clusterName } from '../../core/algorithms/kmeans.js';

const byId = Object.fromEntries(HOUSES.map((p) => [p.id, p]));
const cat = (c) => String(c + 1);
const TARGET_NAME = { centroids: 'centroids', clusters: 'clusters', newCentroids: 'new', result: '결과' };


function assignOf(ds) {
  const map = {};
  ds.clusters.forEach((cl, c) => cl.forEach((id) => { map[id] = c; }));
  return map;
}

export default {
  stageTitle: '산점도 — 마을 지도',
  stageHint: '● 집 · ◆ 중심(배달 거점) · 점선 = 중심이 지나온 길',
  targetName: (t) => (t.startsWith('cluster') && t !== 'clusters' ? `묶음 ${clusterName(+t.slice(7))}` : TARGET_NAME[t] ?? t),

  intro: {
    question: '집 6채를 가까운 것끼리 2개 묶음으로 나누면 배달 거점(중심)은 어디일까?',
    input: '점들(가로, 세로 — 정답 레이블 없음), 묶음 수 k, 시작 중심',
    output: 'k개 묶음 + 묶음마다 중심(평균 위치)',
    tips: [
      '할당: 집1부터 차례로, d²이 가장 작은 중심의 묶음에 넣어요.',
      '갱신: 묶음에 든 점들의 x 평균, y 평균이 새 중심이에요.',
      '새 중심 = 지금 중심이면 멈춰요(수렴). 몇 회차에 멈추는지, 어떤 집이 묶음을 옮기는지 자주 물어요.',
    ],
  },
  introBoxes: ['pool', 'centroids'],

  createPlot() {
    return createPlot({
      x: [HOUSE_AXES.min, HOUSE_AXES.max], y: [HOUSE_AXES.min, HOUSE_AXES.max],
      width: 320, height: 296, xLabel: `${HOUSE_AXES.x} →`, yLabel: `${HOUSE_AXES.y} →`,
      ariaLabel: '집 위치와 묶음 중심',
    });
  },

  shapes(v) {
    const { ds } = v;
    const shapes = [];
    const assign = assignOf(ds);

    // 중심이 지나온 길
    ds.trail.forEach((t, c) => {
      if (t.length > 1) shapes.push({ key: `trail-${c}`, kind: 'path', points: t.map((p) => [p.x, p.y]), cls: `trail cat-${cat(c)}` });
    });
    // 지금 점에서 각 중심까지
    if (ds.cur) {
      const p = byId[ds.cur];
      const best = ds.curDists ? ds.curDists.indexOf(Math.min(...ds.curDists)) : -1;
      ds.centroids.forEach((ct, c) => shapes.push({
        key: `tc-${c}`, kind: 'line', x1: p.x, y1: p.y, x2: ct.x, y2: ct.y, cls: `toCentroid${c === best ? ' is-best' : ''}`,
      }));
    }
    // 새 중심으로 옮겨 갈 화살표
    if (ds.newCentroids) {
      ds.newCentroids.forEach((nc, c) => {
        const old = ds.centroids[c];
        if (Math.abs(nc.x - old.x) + Math.abs(nc.y - old.y) > 1e-9) {
          shapes.push({ key: `mv-${c}`, kind: 'line', x1: old.x, y1: old.y, x2: nc.x, y2: nc.y, cls: 'move-arrow' });
        }
      });
    }
    // 집
    for (const p of HOUSES) {
      const c = assign[p.id];
      const style = c === undefined ? null : CLUSTER_STYLE[c];
      shapes.push({
        key: `p-${p.id}`, kind: 'point', x: p.x, y: p.y,
        shape: style ? style.shape : 'circle', size: 5.5,
        cls: `${c === undefined ? 'unassigned' : `cat-${cat(c)}`}${p.id === ds.cur ? ' is-cur' : ''}`,
        label: p.name, labelBelow: true, title: `${p.name} (${p.x}, ${p.y})`,
      });
    }
    // 새 중심(속이 빈 ◆)
    if (ds.newCentroids) {
      ds.newCentroids.forEach((nc, c) => shapes.push({
        key: `nc-${c}`, kind: 'point', x: nc.x, y: nc.y, shape: 'diamond', size: 8, cls: `centroid ghost cat-${cat(c)}`, label: '',
      }));
    }
    // 중심
    ds.centroids.forEach((ct, c) => shapes.push({
      key: `c-${c}`, kind: 'point', x: ct.x, y: ct.y, shape: 'diamond', size: 8.5,
      cls: `centroid cat-${cat(c)}`, label: clusterName(c), title: `중심 ${clusterName(c)} (${fmt(ct.x)}, ${fmt(ct.y)})`,
    }));
    return shapes;
  },

  legend(v) {
    return el('div.legend', {},
      ...v.ds.centroids.map((_, c) => el('span.legend__item', { 'data-cat': cat(c) }, mark(CLUSTER_STYLE[c].shape, cat(c)), `묶음 ${clusterName(c)}`)),
      el('span.legend__item', {}, el('span.mark', {}, '○'), '아직 안 나뉨'),
      el('span.legend__item', {}, el('span.mark', {}, '◆'), '중심'));
  },

  data(v, { boxes }) {
    const { ds, frame } = v;
    const assign = assignOf(ds);
    const housechip = (id) => {
      const p = byId[id];
      const c = assign[id];
      const moved = ds.prevAssign[id] !== undefined && c !== undefined && ds.prevAssign[id] !== c;
      return el(`span.pchip${id === ds.cur ? '.is-cur' : ''}${moved ? '.is-moved' : ''}`, {
        'data-flip': `h-${id}`, 'data-cat': c === undefined ? null : cat(c),
        title: `${p.name} (${p.x}, ${p.y})${moved ? ` — 지난번 묶음 ${clusterName(ds.prevAssign[id])}에서 옮겨 옴` : ''}`,
      }, c === undefined ? null : mark(CLUSTER_STYLE[c].shape, cat(c)), `${p.name}`, el('small', {}, ` (${p.x},${p.y})`));
    };

    const pool = sbox({ target: 'pool', name: '점', kind: '리스트', title: '대기 줄 — 아직 나누지 않은 점', frame,
      count: ds.pool.length, hint: '모두 묶음에 들어갔어요', cls: 'sbox--pool', bodyCls: 'pool' },
    ds.pool.map(housechip));

    const bins = el('div.bins', {}, ds.clusters.map((cl, c) => el(`div.bin${frame.effects.some((e) => e.target === `cluster${c}`) ? '.is-hot' : ''}`, {
      'data-cat': cat(c), 'data-flip': `bin-${c}`,
    },
    el('div.bin__head', {}, mark(CLUSTER_STYLE[c].shape, cat(c)), `묶음 ${clusterName(c)}`, el('span.bin__sub', {}, `${cl.length}개`)),
    el('div.bin__body', {}, cl.map(housechip)))));

    const clustersBox = sbox({ target: 'clusters', name: '묶음', kind: '리스트', title: `묶음 ${ds.k}개`,
      op: frame.effects.find((e) => e.target === 'clusters' || e.target.startsWith('cluster'))?.op ?? null }, bins);

    const centroidRows = ds.centroids.map((ct, c) => el(`div.kv${ds.moved?.[c] === false ? '.is-win' : ''}`, {
      'data-cat': cat(c), 'data-flip': `c-${c}`,
      'data-from': frame.action === 'update' ? `nc-${c}` : null,
      'data-force': frame.action === 'update' ? '1' : null,
    },
    el('span.kv__key', {}, mark('diamond', cat(c)), ` ${clusterName(c)}`),
    el('span.kv__colon', {}, ':'),
    el('span', {}, `(${fmt(ct.x)}, ${fmt(ct.y)})`),
    el('span'),
    ));
    const newRows = ds.newCentroids ? ds.newCentroids.map((nc, c) => el(`div.kv${ds.moved?.[c] ? '.is-cur' : ''}`, {
      'data-cat': cat(c), 'data-flip': `nc-${c}`, 'data-from': `bin-${c}`,
    },
    el('span.kv__key', {}, mark('diamond', cat(c)), ` ${clusterName(c)}`),
    el('span.kv__colon', {}, ':'),
    el('span', {}, `(${fmt(nc.x)}, ${fmt(nc.y)})`),
    el('span.kv__val', {}, ds.moved ? (ds.moved[c] ? '움직임' : '그대로') : ''))) : [];

    const left = [];
    if (boxes.has('pool')) left.push(pool);
    if (boxes.has('pool') && boxes.has('clusters')) left.push(flowArrow('가장 가까운 중심의 묶음으로 이동', 'down'));
    if (boxes.has('clusters')) left.push(clustersBox);
    const right = [];
    if (boxes.has('newCentroids')) right.push(sbox({ target: 'newCentroids', name: '새 중심', kind: '리스트', title: '묶음마다 평균', frame,
      hint: '7줄에서 묶음마다 평균을 내요' }, newRows));
    if (boxes.has('centroids')) right.push(sbox({ target: 'centroids', name: '중심', kind: '리스트', title: '지금 중심', frame }, centroidRows));
    right.push(el('div.vars', {},
      varCell('회차', String(ds.iter), { hot: frame.action === 'loop' }),
      varCell('k', String(ds.k)),
      ds.done ? varCell('결과', '수렴 ✓', { hot: true }) : null));
    return el('div.flow.flow--kmeans', {},
      left.length ? el('div.flow__col.flow__col--wide', {}, left) : null,
      left.length ? flowArrow(boxes.has('newCentroids') ? '평균' : '') : null,
      el('div.flow__col', {}, right),
    );
  },
};
