/**
 * k-평균 군집 (k-Means Clustering) — 군집 · 비지도학습.
 *
 * 자료구조의 흐름 (한 번 반복할 때마다)
 *   points(대기 줄) ──가장 가까운 중심 찾기──▶ clusters[c](묶음 리스트)로 "이동"
 *   clusters ──묶음마다 평균──▶ new(새 중심 리스트) ──같은가?──▶ 멈춤 / centroids 교체
 * 다음 반복이 시작되면 묶음을 비우므로 점들은 다시 대기 줄로 돌아간다.
 */
import { Recorder } from '../trace.js';
import { mean, fmt } from '../math.js';
import { HOUSES, CLUSTER_STYLE } from '../datasets.js';

export const meta = Object.freeze({
  id: 'kmeans',
  name: 'k-평균 군집',
  en: 'k-Means Clustering',
  short: 'k-평균',
  task: '군집',
  learning: '비지도학습',
  jumpLabel: '다음 반복',
  phases: ['시작 중심 고르기', '가까운 중심으로 나누기(할당)', '평균으로 중심 옮기기(갱신)', '바뀌지 않으면 멈추기(수렴)'],
});

/**
 * 시험·연습에서 바꿀 수 있는 조건 — 시작 중심으로 쓸 집(과 k).
 * 모두 거리 동점이 없고 2~4번 만에 수렴하도록 골랐다(test/kmeans.test.js가 확인).
 */
export const STARTS = [
  { id: 'p12', init: [0, 1], label: '집1·집2에서 시작 (k = 2)' },
  { id: 'p13', init: [0, 2], label: '집1·집3에서 시작 (k = 2)' },
  { id: 'p45', init: [3, 4], label: '집4·집5에서 시작 (k = 2)' },
  { id: 'p14', init: [0, 3], label: '집1·집4에서 시작 (k = 2)' },
  { id: 'p123', init: [0, 1, 2], label: '집1·집2·집3에서 시작 (k = 3)' },
];

export const defaults = Object.freeze({ start: 'p12' });
const MAX_ITER = 10;

function startOf(params) { return STARTS.find((s) => s.id === params?.start) ?? STARTS[0]; }

export const knobs = [
  { key: 'start', label: '시작 중심', options: STARTS.map((s) => ({ id: s.id, label: s.label, patch: { start: s.id } })) },
];
export function knobValue(params) { return startOf(params).id; }
export function normalize(params) { return { start: startOf(params).id }; }

export function pseudo(params = defaults) {
  const st = startOf(params);
  return [
    `중심 ← 데이터에서 k개를 골라 시작   (k = ${st.init.length}, ${st.init.map((i) => `집${i + 1}`).join('·')})`,
    '반복:',
    '    묶음 ← 빈 리스트 k개',
    '    각 점 p에 대해:',
    '        c ← p에서 가장 가까운 중심의 번호',
    '        묶음[c]에 p를 넣는다',
    '    새 중심 ← 묶음마다 속한 점들의 평균',
    '    만약 새 중심 = 중심 이면 멈춘다 (수렴)',
    '    중심 ← 새 중심',
    '묶음과 중심을 돌려준다',
  ];
}

export const notes = [
  '처음 중심 k개를 정해요. 시작이 다르면 반복 횟수나 결과가 달라질 수 있어요.',
  '중심이 더 이상 움직이지 않을 때까지 "나누기 → 평균 내기"를 되풀이해요.',
  '묶음 k개를 빈 리스트로 새로 만들어요. 지난번 묶음은 버리므로 모든 점이 대기 줄로 돌아가요.',
  '모든 점을 집1부터 차례로 돌아요.',
  '점 p에서 각 중심까지 거리를 재서 가장 가까운 중심을 골라요. 손으로 풀 땐 d²만 비교해도 돼요.',
  '점 p를 그 묶음 리스트 맨 뒤에 넣어요. 점이 대기 줄에서 묶음으로 이동해요.',
  '묶음마다 x끼리, y끼리 평균을 내면 그 묶음의 새 중심이 돼요.',
  '새 중심이 지금 중심과 똑같으면 더 바뀔 것이 없어요 — 수렴했으니 멈춰요.',
  '아니면 중심을 새 중심으로 바꾸고 2줄로 돌아가 다시 나눠요.',
  '마지막 묶음(군집)과 중심을 돌려줘요.',
];

export const clusterName = (c) => CLUSTER_STYLE[c]?.name ?? String(c + 1);

const d2Of = (p, c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2;

function nearestIndex(p, centroids) {
  let best = 0;
  let bestD = Infinity;
  centroids.forEach((c, i) => {
    const d = d2Of(p, c);
    if (d < bestD - 1e-12) { best = i; bestD = d; }
  });
  return best;
}

const same = (a, b) => Math.abs(a - b) < 1e-9;

export function run(params = defaults) {
  const v = startOf(params);
  const k = v.init.length;
  const points = HOUSES;
  const byId = Object.fromEntries(points.map((p) => [p.id, p]));
  const rec = new Recorder();

  const ds = {
    k, iter: 0,
    centroids: v.init.map((idx, c) => ({ c, x: points[idx].x, y: points[idx].y, from: points[idx].id })),
    newCentroids: null,
    pool: points.map((p) => p.id),
    clusters: Array.from({ length: k }, () => []),
    cur: null,
    curDists: null,
    trail: v.init.map((idx) => [{ x: points[idx].x, y: points[idx].y }]),
    prevAssign: {},
    moved: null,
    done: false,
  };

  rec.frame({
    line: 1, action: 'init', phase: 0, ds,
    effects: [{ target: 'centroids', op: '복사' }],
    narration: `시작 중심 ${k}개를 고릅니다: ${ds.centroids.map((c) => `${clusterName(c.c)}(${c.x}, ${c.y})`).join(', ')}.`,
    calc: {
      title: `🎯 시작 중심 = ${v.init.map((i) => `집${i + 1}`).join('·')}`,
      rows: ds.centroids.map((c) => `중심 ${clusterName(c.c)} ← ${byId[c.from].name} (${c.x}, ${c.y})`),
    },
  });

  const history = [];   // 추적표: 회차마다 시작 중심 · 소속 · 새 중심
  let converged = false;
  for (let it = 1; it <= MAX_ITER; it += 1) {
    ds.iter = it;
    ds.newCentroids = null;
    ds.moved = null;
    rec.frame({
      line: 2, action: 'loop', phase: 1, iter: it, ds,
      narration: `${it}번째 반복을 시작합니다.`,
    });

    // 3: 묶음을 비운다 — 점들이 대기 줄로 돌아간다
    const prevAssign = {};
    ds.clusters.forEach((cl, c) => cl.forEach((id) => { prevAssign[id] = c; }));
    ds.prevAssign = prevAssign;
    ds.clusters = Array.from({ length: k }, () => []);
    ds.pool = points.map((p) => p.id);
    rec.frame({
      line: 3, action: 'reset', phase: 1, iter: it, ds,
      effects: [{ target: 'clusters', op: '[ ] × k' }],
      narration: it === 1
        ? `빈 묶음 ${k}개를 만듭니다. 모든 점이 대기 줄에서 기다립니다.`
        : `묶음 ${k}개를 새로 비웁니다. 지난번에 나눈 점들이 모두 대기 줄로 돌아갑니다.`,
    });

    // 4~6: 점마다 가장 가까운 중심으로
    points.forEach((p, i) => {
      ds.cur = p.id;
      const dists = ds.centroids.map((c) => d2Of(p, c));
      const c = nearestIndex(p, ds.centroids);
      ds.curDists = dists;
      const changed = it > 1 && prevAssign[p.id] !== c;
      const askHere = (it === 1 && i >= k && i < k + 2) || changed;
      rec.frame({
        line: 5, action: 'nearest', phase: 1, iter: it, ds,
        narration: `${p.name}(${p.x}, ${p.y})에서 중심까지 거리를 재 보니 ${clusterName(c)}가 가장 가깝습니다.` +
          (changed ? ` (지난번엔 ${clusterName(prevAssign[p.id])} — 바뀌었어요!)` : ''),
        calc: {
          title: `📏 ${p.name}에서 가장 가까운 중심은?`,
          rows: ds.centroids.map((ct, j) =>
            `중심 ${clusterName(j)} (${fmt(ct.x)}, ${fmt(ct.y)}): d² = (${p.x}−${fmt(ct.x)})² + (${p.y}−${fmt(ct.y)})² = ${fmt(dists[j])}${j === c ? '  ← 가장 가까움' : ''}`),
        },
        ask: askHere ? {
          q: `🔮 ${p.name}(${p.x}, ${p.y})는 어느 묶음으로 갈까요?`,
          options: ds.centroids.map((_, j) => `묶음 ${clusterName(j)}`),
          answer: c,
          why: `중심 ${clusterName(c)}까지의 거리 제곱(${fmt(dists[c])})이 가장 작아요.`,
        } : null,
      });
      ds.pool = ds.pool.filter((id) => id !== p.id);
      ds.clusters[c].push(p.id);
      rec.frame({
        line: 6, action: 'assign', phase: 1, iter: it, ds,
        effects: [{ target: `cluster${c}`, op: 'append' }],
        narration: `${p.name}를 묶음 ${clusterName(c)} 리스트에 넣습니다 (이제 ${ds.clusters[c].length}개).`,
      });
    });
    ds.cur = null;
    ds.curDists = null;

    // 7: 묶음마다 평균 → 새 중심
    const calcRows = [];
    ds.newCentroids = ds.clusters.map((cl, c) => {
      if (cl.length === 0) {
        calcRows.push(`${clusterName(c)}: 빈 묶음 → 중심을 그대로 둡니다`);
        return { c, x: ds.centroids[c].x, y: ds.centroids[c].y };
      }
      const xs = cl.map((id) => byId[id].x);
      const ys = cl.map((id) => byId[id].y);
      const nx = mean(xs);
      const ny = mean(ys);
      calcRows.push(`${clusterName(c)}: x = (${xs.join('+')})/${cl.length} = ${fmt(nx)},  y = (${ys.join('+')})/${cl.length} = ${fmt(ny)}`);
      return { c, x: nx, y: ny };
    });
    rec.frame({
      line: 7, action: 'mean', phase: 2, iter: it, ds,
      effects: [{ target: 'newCentroids', op: 'mean' }],
      narration: '묶음마다 속한 점들의 평균을 내어 새 중심을 구합니다.',
      calc: { title: '➗ 새 중심 = 묶음의 평균', rows: calcRows },
    });

    // 8: 수렴 판정
    ds.moved = ds.newCentroids.map((nc, c) => !(same(nc.x, ds.centroids[c].x) && same(nc.y, ds.centroids[c].y)));
    const movedCount = ds.moved.filter(Boolean).length;
    converged = movedCount === 0;
    const assign = {};
    ds.clusters.forEach((cl, c) => cl.forEach((id) => { assign[id] = c; }));
    history.push({
      iter: it,
      start: ds.centroids.map((ct) => ({ x: ct.x, y: ct.y })),
      assign,
      changed: it > 1 ? points.filter((p) => prevAssign[p.id] !== assign[p.id]).map((p) => p.id) : [],
      next: ds.newCentroids.map((ct) => ({ x: ct.x, y: ct.y })),
      converged,
    });
    rec.frame({
      line: 8, action: converged ? 'converged' : 'check', phase: 3, iter: it, ds,
      effects: [{ target: 'newCentroids', op: '==' }],
      narration: converged
        ? '새 중심이 지금 중심과 똑같습니다. 더 바뀔 것이 없으니 멈춥니다(수렴)!'
        : `새 중심 중 ${movedCount}개가 움직였습니다. 아직 수렴하지 않았으니 계속합니다.`,
      calc: {
        title: '⚖ 새 중심 = 중심 ?',
        rows: ds.newCentroids.map((nc, c) => {
          const old = ds.centroids[c];
          return `${clusterName(c)}: (${fmt(old.x)}, ${fmt(old.y)}) → (${fmt(nc.x)}, ${fmt(nc.y)})  ${ds.moved[c] ? '움직임' : '그대로 ✓'}`;
        }),
      },
      ask: it >= 2 ? {
        q: '🔮 이번 반복에서 멈출까요?',
        options: ['멈춘다 (수렴)', '한 번 더 반복한다'],
        answer: converged ? 0 : 1,
        why: converged
          ? '이번에 묶음에 든 점이 지난번과 같아서 평균(새 중심)도 그대로예요.'
          : '묶음이 바뀐 점이 있어서 평균(새 중심)도 움직였어요.',
      } : null,
    });
    if (converged) break;

    // 9: 중심 교체
    ds.centroids = ds.newCentroids.map((nc) => ({ c: nc.c, x: nc.x, y: nc.y }));
    ds.trail = ds.trail.map((t, c) => [...t, { x: ds.centroids[c].x, y: ds.centroids[c].y }]);
    ds.newCentroids = null;
    rec.frame({
      line: 9, action: 'update', phase: 2, iter: it, ds,
      effects: [{ target: 'centroids', op: '교체' }],
      narration: '중심을 새 중심으로 바꿉니다. 그림에서 중심 ◆가 평균 자리로 옮겨 갑니다.',
    });
  }

  ds.done = true;
  rec.frame({
    line: 10, action: 'result', phase: 3, iter: ds.iter, ds,
    effects: [{ target: 'result', op: 'return' }],
    narration: `${ds.iter}번 반복해 ${k}개 묶음을 찾았습니다: ` +
      ds.clusters.map((cl, c) => `${clusterName(c)} ${cl.length}채`).join(', ') + '.',
    calc: {
      title: '🏁 결과 — 배달 거점(중심)',
      rows: ds.centroids.map((ct, c) =>
        `거점 ${clusterName(c)} (${fmt(ct.x)}, ${fmt(ct.y)}) ← ${ds.clusters[c].map((id) => byId[id].name).join(', ') || '없음'}`),
    },
  });

  return {
    frames: rec.frames,
    data: { points },
    result: {
      iterations: ds.iter,
      converged,
      centroids: ds.centroids,
      clusters: ds.clusters,
      history,
    },
    params: { start: v.id },
  };
}

/** 새 점이 어느 거점(묶음)에 배정되는지 */
export function assignPoint(point, centroids) {
  return nearestIndex(point, centroids);
}

/** 묶음 안 거리 제곱합(SSE) — 좋은 묶음일수록 작다. 테스트·비교용 */
export function sse(clusters, centroids) {
  const byId = Object.fromEntries(HOUSES.map((p) => [p.id, p]));
  return clusters.reduce((s, cl, c) => s + cl.reduce((t, id) => {
    const p = byId[id];
    return t + (p.x - centroids[c].x) ** 2 + (p.y - centroids[c].y) ** 2;
  }, 0), 0);
}
