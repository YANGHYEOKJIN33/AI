/**
 * k-평균 군집 (k-Means Clustering) — 군집 · 비지도학습.
 *
 * 자료구조의 흐름 (한 번 반복할 때마다)
 *   points(대기 줄) ──가장 가까운 중심 찾기──▶ clusters[c](묶음 리스트)로 "이동"
 *   clusters ──묶음마다 평균──▶ new(새 중심 리스트) ──같은가?──▶ 멈춤 / centroids 교체
 * 다음 반복이 시작되면 묶음을 비우므로 점들은 다시 대기 줄로 돌아간다.
 */
import { Recorder } from '../trace.js';
import { dist, mean, fmt } from '../math.js';
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

/** 바꿔 볼 수 있는 설정 — k와 시작 중심(데이터 몇 번째 점) */
const VARIANTS = {
  k3:  { k: 3, init: [0, 1, 2], code: 'centroids = points[:3]' },
  k2:  { k: 2, init: [0, 1],    code: 'centroids = points[:2]' },
  k4:  { k: 4, init: [0, 1, 2, 3], code: 'centroids = points[:4]' },
  bad: { k: 3, init: [3, 4, 2], code: 'centroids = [points[3], points[4], points[2]]' },
};

export const defaults = Object.freeze({ variant: 'k3' });
const MAX_ITER = 10;

function variantOf(params) { return VARIANTS[params?.variant] ?? VARIANTS.k3; }

export function pseudo(params = defaults) {
  const v = variantOf(params);
  const initText = params?.variant === 'bad'
    ? `중심 ← 데이터에서 k개를 골라 시작 (k = ${v.k}, 4·5·3번째 집)`
    : `중심 ← 데이터의 앞에서 k개를 골라 시작 (k = ${v.k})`;
  return [
    initText,
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

export function python(params = defaults) {
  return [
    variantOf(params).code,
    'while True:',
    '    clusters = [[] for _ in range(k)]',
    '    for p in points:',
    '        c = nearest(p, centroids)',
    '        clusters[c].append(p)',
    '    new = [mean(cl) for cl in clusters]',
    '    if new == centroids: break',
    '    centroids = new',
    'return clusters, centroids',
  ];
}

export const notes = [
  '처음 중심을 정해요. 여기서는 데이터의 앞에서 k개 점을 그대로 중심으로 삼아요. 시작이 결과를 바꿀 수 있어요!',
  '중심이 더 이상 움직이지 않을 때까지 "나누기 → 평균 내기"를 되풀이해요.',
  '묶음 k개를 빈 리스트로 새로 만들어요. 지난번 묶음은 버리므로 모든 점이 대기 줄로 돌아가요.',
  '모든 점을 하나씩 돌아요.',
  '점 p에서 각 중심까지 거리를 재서, 가장 가까운 중심의 번호 c를 골라요.',
  '점 p를 묶음 c 리스트에 넣어요(append). 점이 대기 줄에서 묶음으로 "이동"해요.',
  '묶음마다 속한 점들의 x 평균, y 평균을 내면 그 묶음의 새 중심이 돼요.',
  '새 중심이 지금 중심과 똑같으면 더 바뀔 것이 없다는 뜻 — 수렴했으니 멈춰요.',
  '아니면 중심을 새 중심으로 바꾸고(교체) 처음으로 돌아가 다시 나눠요.',
  '마지막 묶음(군집)과 중심을 돌려줘요. 비지도학습이라 정답 레이블 없이 묶음을 스스로 찾았어요.',
];

export const coreLine = 0;
export const coreWhy = 'k와 시작 중심이 결과를 정해요. 시작이 나쁘면 엉뚱한 묶음에서 멈출 수 있어요(지역 최적).';
export const swap = Object.freeze({
  label: '묶음 수 k와 시작 중심',
  options: [
    { id: 'k3',  text: VARIANTS.k3.code + '   # k = 3',  params: { variant: 'k3' } },
    { id: 'k2',  text: VARIANTS.k2.code + '   # k = 2',  params: { variant: 'k2' } },
    { id: 'k4',  text: VARIANTS.k4.code + '   # k = 4',  params: { variant: 'k4' } },
    { id: 'bad', text: VARIANTS.bad.code + '   # 나쁜 시작', params: { variant: 'bad' } },
  ],
});
export function swapIdOf(params) { return params?.variant ?? 'k3'; }

export const clusterName = (c) => CLUSTER_STYLE[c]?.name ?? String(c + 1);

function nearestIndex(p, centroids) {
  let best = 0;
  let bestD = Infinity;
  centroids.forEach((c, i) => {
    const d = dist([p.x, p.y], [c.x, c.y]);
    if (d < bestD - 1e-12) { best = i; bestD = d; }
  });
  return best;
}

const same = (a, b) => Math.abs(a - b) < 1e-9;

export function run(params = defaults) {
  const v = variantOf(params);
  const { k } = v;
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
      title: `🎯 ${v.code}`,
      rows: ds.centroids.map((c) => `중심 ${clusterName(c.c)} ← ${byId[c.from].name} (${c.x}, ${c.y})`),
    },
  });

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
      const dists = ds.centroids.map((c) => dist([p.x, p.y], [c.x, c.y]));
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
            `중심 ${clusterName(j)} (${fmt(ct.x)}, ${fmt(ct.y)}) → d = ${fmt(dists[j])}${j === c ? '  ← 가장 가까움' : ''}`),
        },
        ask: askHere ? {
          q: `🔮 ${p.name}(${p.x}, ${p.y})는 어느 묶음으로 갈까요?`,
          options: ds.centroids.map((_, j) => `묶음 ${clusterName(j)}`),
          answer: c,
          why: `중심 ${clusterName(c)}까지의 거리(${fmt(dists[c])})가 가장 짧아요.`,
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
    },
    params: { variant: params?.variant ?? 'k3' },
  };
}

/** 새 점이 어느 거점(묶음)에 배정되는지 — 써 보기용 */
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
