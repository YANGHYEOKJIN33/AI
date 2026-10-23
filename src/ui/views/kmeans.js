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
import { fmt, dist } from '../../core/math.js';
import { HOUSES, HOUSE_AXES, CLUSTER_STYLE } from '../../core/datasets.js';
import { clusterName, assignPoint } from '../../core/algorithms/kmeans.js';

const byId = Object.fromEntries(HOUSES.map((p) => [p.id, p]));
const cat = (c) => String(c + 1);
const TARGET_NAME = { centroids: 'centroids', clusters: 'clusters', newCentroids: 'new', result: '결과' };

/** ①쪽 써 보기 — 그림을 눌러 놓은 새 집 */
let tryPoint = null;

function assignOf(ds) {
  const map = {};
  ds.clusters.forEach((cl, c) => cl.forEach((id) => { map[id] = c; }));
  return map;
}

export default {
  stageTitle: '산점도 — 마을 지도',
  stageHint: '● 집 · ◆ 중심(배달 거점) · 점선 = 중심이 지나온 길',
  targetName: (t) => (t.startsWith('cluster') && t !== 'clusters' ? `clusters[${clusterName(+t.slice(7))}]` : TARGET_NAME[t] ?? t),

  reviewInfo: {
    one: '정답 없이 가까운 점끼리 k개 묶음으로 나눠요. "가까운 중심으로 나누기 → 평균으로 중심 옮기기"를 중심이 멈출 때까지 반복해요.',
    input: '점들(특징만, 레이블 없음), 묶음 수 k',
    output: 'k개 묶음 + 묶음마다 중심',
    phaseDs: ['points[:k] ➜ centroids', 'points ➜ clusters[c] (append)', 'clusters ➜ 평균 ➜ new ➜ centroids', 'new == centroids ?'],
    tools: ['table', 'distance', 'group', 'update'],
    remember: [
      '비지도학습 — 정답 레이블 없이 묶음을 스스로 찾아요.',
      '시작 중심에 따라 결과가 달라질 수 있어요(지역 최적). 그래서 여러 번 시작해 보고 가장 좋은 결과를 고르기도 해요.',
      '묶음 수 k는 사람이 정해요. 반복할 때마다 묶음을 비우고 처음부터 다시 나눠요.',
    ],
  },

  outcome(run) {
    const sizes = run.result.clusters.map((cl, c) => `${clusterName(c)} ${cl.length}`).join(' · ');
    return `${run.result.iterations}번 반복 · 묶음 ${sizes}`;
  },

  createPlot({ store, player }) {
    return createPlot({
      x: [HOUSE_AXES.min, HOUSE_AXES.max], y: [HOUSE_AXES.min, HOUSE_AXES.max],
      width: 320, height: 296, xLabel: `${HOUSE_AXES.x} →`, yLabel: `${HOUSE_AXES.y} →`,
      ariaLabel: '집 위치와 묶음 중심',
      onClick: (x, y) => {
        const s = store.get();
        if (s.mode !== 'algo' || s.algoStep !== 0) return;
        tryPoint = { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2 };
        player.goTo(player.view().total - 1);   // 학습이 끝난 모델로 보여 준다
      },
    });
  },

  shapes(v, { page }) {
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
    // 써 보기: 새 집
    if (page === 'review' && tryPoint && v.atEnd) {
      const c = assignPoint(tryPoint, v.result.centroids);
      const ct = v.result.centroids[c];
      shapes.push({ key: 'try-line', kind: 'line', x1: tryPoint.x, y1: tryPoint.y, x2: ct.x, y2: ct.y, cls: 'toCentroid is-best' });
      shapes.push({ key: 'try', kind: 'point', x: tryPoint.x, y: tryPoint.y, shape: 'star', size: 8, cls: `query cat-${cat(c)}`, label: `새 집 → ${clusterName(c)}` });
    }
    return shapes;
  },

  legend(v) {
    return el('div.legend', {},
      ...v.ds.centroids.map((_, c) => el('span.legend__item', { 'data-cat': cat(c) }, mark(CLUSTER_STYLE[c].shape, cat(c)), `묶음 ${clusterName(c)}`)),
      el('span.legend__item', {}, el('span.mark', {}, '○'), '아직 안 나뉨'),
      el('span.legend__item', {}, el('span.mark', {}, '◆'), '중심'));
  },

  extra(v, { page }) {
    if (page !== 'review') return null;
    if (!tryPoint || !v.atEnd) {
      return el('div.tryit', {},
        el('div.tryit__title', {}, '👆 써 보기 — 학습이 끝난 뒤 그림을 눌러 새 집을 놓아 보세요'),
        el('div', {}, v.atEnd ? '어느 거점(중심)에 배정될까요?' : '⏩ 끝까지 또는 ▶ 재생으로 먼저 묶음을 완성하세요.'));
    }
    const ds = v.result.centroids.map((ct) => dist([tryPoint.x, tryPoint.y], [ct.x, ct.y]));
    const c = ds.indexOf(Math.min(...ds));
    return el('div.tryit', {},
      el('div.tryit__title', {}, `👆 새 집 (${tryPoint.x}, ${tryPoint.y})`),
      el('div', {}, ds.map((d, i) => `${clusterName(i)}까지 ${fmt(d)}`).join(' · ')),
      el('div.tryit__row', {}, '→ 가장 가까운 거점: ', el('strong.tryit__answer', { 'data-cat': cat(c) }, `묶음 ${clusterName(c)}`)));
  },

  data(v) {
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

    const pool = sbox({ target: 'pool', name: 'points', kind: '리스트', title: '대기 줄 — 아직 나누지 않은 점', frame,
      count: ds.pool.length, hint: '모두 묶음에 들어갔어요', cls: 'sbox--pool', bodyCls: 'pool' },
    ds.pool.map(housechip));

    const bins = el('div.bins', {}, ds.clusters.map((cl, c) => el(`div.bin${frame.effects.some((e) => e.target === `cluster${c}`) ? '.is-hot' : ''}`, {
      'data-cat': cat(c), 'data-flip': `bin-${c}`,
    },
    el('div.bin__head', {}, mark(CLUSTER_STYLE[c].shape, cat(c)), `clusters[${c}] · ${clusterName(c)}`, el('span.bin__sub', {}, `${cl.length}개`)),
    el('div.bin__body', {}, cl.map(housechip)))));

    const clustersBox = sbox({ target: 'clusters', name: 'clusters', kind: '리스트', title: `묶음 ${ds.k}개 (리스트의 리스트)`,
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

    return el('div.flow.flow--kmeans', {},
      el('div.flow__col.flow__col--wide', {},
        pool,
        flowArrow('가장 가까운 중심의 묶음으로 이동', 'down'),
        clustersBox),
      flowArrow('평균'),
      el('div.flow__col', {},
        sbox({ target: 'newCentroids', name: 'new', kind: '리스트', title: '새 중심 = 묶음 평균', frame,
          hint: '7줄에서 묶음마다 평균을 내요' }, newRows),
        sbox({ target: 'centroids', name: 'centroids', kind: '리스트', title: '지금 중심', frame }, centroidRows),
        el('div.vars', {},
          varCell('반복', String(ds.iter), { hot: frame.action === 'loop' }),
          varCell('k', String(ds.k)),
          ds.done ? varCell('결과', '수렴 ✓', { hot: true }) : null),
      ),
    );
  },
};
