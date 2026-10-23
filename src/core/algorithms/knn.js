/**
 * k-최근접 이웃 (k-Nearest Neighbors) — 분류 · 지도학습.
 *
 * 자료구조의 흐름
 *   학습 데이터(표) ──거리 재고 복사──▶ distances(리스트) ──sort──▶ 정렬된 distances
 *        ──앞에서 k개 복사──▶ neighbors(리스트) ──레이블 세기──▶ votes(딕셔너리) ──max──▶ 예측
 *
 * 이 파일은 화면을 모른다. 의사코드 한 줄마다의 자료구조 모습(frames)만 만든다.
 */
import { Recorder } from '../trace.js';
import { dist, fmt } from '../math.js';
import { FOODS, FOOD_QUERY, FOOD_LABELS } from '../datasets.js';

export const meta = Object.freeze({
  id: 'knn',
  name: 'k-최근접 이웃',
  en: 'k-Nearest Neighbors',
  short: 'k-NN',
  task: '분류',
  learning: '지도학습',
  jumpLabel: null,
  phases: ['거리 재기', '정렬하기', '앞에서 k개 고르기', '투표하기'],
});

export const defaults = Object.freeze({ k: 3, query: { x: FOOD_QUERY.x, y: FOOD_QUERY.y } });

export function pseudo(params = defaults) {
  return [
    'distances ← 빈 리스트',
    '각 학습 데이터 (x, 레이블)에 대해 반복:',
    '    d ← 거리(질문점 q, x)',
    '    distances에 (d, 레이블)을 추가한다',
    'distances를 d가 작은 순서로 정렬한다',
    `이웃 ← distances의 앞에서 k개   (k = ${params.k})`,
    'votes ← 빈 딕셔너리',
    '각 이웃의 레이블마다 votes[레이블]을 1 늘린다',
    'votes에서 가장 많은 레이블을 돌려준다',
  ];
}

export function python(params = defaults) {
  return [
    'distances = []',
    'for x, label in train:',
    '    d = dist(q, x)',
    '    distances.append((d, label))',
    'distances.sort()',
    `neighbors = distances[:${params.k}]`,
    'votes = {}',
    'for d, label in neighbors: votes[label] = votes.get(label, 0) + 1',
    'return max(votes, key=votes.get)',
  ];
}

/** 줄마다 하는 일과 이유 (②쪽 — 강조된 줄 아래에 펼쳐진다) */
export const notes = [
  '거리와 레이블을 모아 둘 빈 리스트를 만들어요. 학습 데이터 하나마다 한 칸씩 채워질 거예요.',
  '학습 데이터를 처음부터 끝까지 하나씩 돌아요. k-NN은 "학습"을 따로 하지 않고 예측할 때 데이터를 전부 훑어요.',
  '질문점 q(토마토)와 지금 데이터 x 사이의 유클리드 거리를 재요: √(Δx² + Δy²).',
  '(거리, 레이블) 한 쌍을 리스트 뒤에 붙여요(append). 원래 표는 그대로 두고 필요한 것만 "복사"해 오는 거예요.',
  '거리가 가까운 것이 앞으로 오도록 정렬해요(sort). 튜플은 첫 값(d)으로 비교되니 거리순이 돼요.',
  '정렬된 리스트의 앞에서 k개만 잘라 와요(슬라이싱 [:k]). 이것이 "가장 가까운 k개 이웃"이에요.',
  '레이블별 표를 셀 빈 딕셔너리를 만들어요. 키 = 레이블, 값 = 표 수.',
  '이웃마다 자기 레이블 칸에 한 표씩 더해요. 처음 나온 레이블이면 새 키가 생기고 값은 1이 돼요.',
  '표가 가장 많은 레이블이 예측 결과예요(다수결). 동점이면 먼저 들어온(더 가까운) 레이블이 이겨요.',
];

/** ③쪽 — 성격을 정하는 핵심 줄과, 바꿔 볼 수 있는 값 */
export const coreLine = 5;
export const coreWhy = 'k가 작으면 바로 옆 한두 개에 휘둘리고, 크면 멀리 있는 데이터까지 투표해요. k가 결과를 정해요.';
export const swap = Object.freeze({
  label: '이웃 수 k',
  options: [
    { id: 'k1', text: 'neighbors = distances[:1]', params: { k: 1 } },
    { id: 'k3', text: 'neighbors = distances[:3]', params: { k: 3 } },
    { id: 'k5', text: 'neighbors = distances[:5]', params: { k: 5 } },
    { id: 'k7', text: 'neighbors = distances[:7]', params: { k: 7 } },
  ],
});
export function swapIdOf(params) { return `k${params.k}`; }

const LABEL_ORDER = FOOD_LABELS.map((l) => l.id);

/** 파이썬 sort()와 같은 결과: 거리 → (같으면) 레이블 글자 순. 그래도 같으면 원래 순서(안정 정렬). */
function compareTuple(a, b) {
  if (a.d !== b.d) return a.d - b.d;
  if (a.label !== b.label) return a.label < b.label ? -1 : 1;
  return 0;
}

/**
 * @param {object} params { k, query:{x,y} }
 * @returns {{ frames, data, result, params }}
 */
export function run(params = defaults) {
  const k = params.k ?? defaults.k;
  const q = params.query ?? defaults.query;
  const train = FOODS;
  const rec = new Recorder();

  const ds = {
    query: { x: q.x, y: q.y }, k,
    cur: null,
    distances: [],
    sorted: false,
    neighbors: [],
    votes: [],          // [{ label, count }] — 넣은 순서 유지(파이썬 dict와 같다)
    voting: null,       // 지금 세는 이웃의 id
    result: null,
  };

  rec.frame({
    line: 1, action: 'new', phase: 0, ds,
    effects: [{ target: 'distances', op: '[ ]' }],
    narration: '거리를 모아 둘 빈 리스트 distances를 만듭니다.',
  });
  rec.frame({
    line: 2, action: 'loop', phase: 0, ds,
    narration: `학습 데이터 ${train.length}개를 처음부터 하나씩 돌며 질문점(${q.x}, ${q.y})과의 거리를 잽니다.`,
  });

  train.forEach((row, i) => {
    const d = dist([q.x, q.y], [row.x, row.y]);
    ds.cur = row.id;
    const dx = q.x - row.x;
    const dy = q.y - row.y;
    rec.frame({
      line: 3, action: 'measure', phase: 0, iter: 0, ds,
      narration: `${i + 1}번째 데이터 ${row.name}(${row.x}, ${row.y})와 질문점 사이의 거리를 잽니다.`,
      calc: {
        title: `📏 d = 거리(q, ${row.name})`,
        rows: [
          `q = (${q.x}, ${q.y}),   ${row.name} = (${row.x}, ${row.y})`,
          `d = √((${q.x}−${row.x})² + (${q.y}−${row.y})²)`,
          `  = √(${fmt(dx * dx)} + ${fmt(dy * dy)}) = √${fmt(dx * dx + dy * dy)}`,
          `  = ${fmt(d)}`,
        ],
      },
    });
    ds.distances.push({ id: row.id, name: row.name, label: row.label, d });
    rec.frame({
      line: 4, action: 'append', phase: 0, ds,
      effects: [{ target: 'distances', op: 'append' }],
      narration: `(${fmt(d)}, ${row.label}) 한 쌍을 distances 맨 뒤에 추가합니다. 이제 ${ds.distances.length}칸.`,
    });
  });

  // 5: 정렬 — 정렬 전에 "맨 앞에 올 것은?"을 묻는다
  ds.cur = null;
  const before = ds.distances.slice();
  const sorted = before.slice().sort(compareTuple);
  const nearest = sorted[0];
  const decoys = before.filter((x) => x.id !== nearest.id)
    .sort((a, b) => a.d - b.d).slice(0, 2);   // 가깝지만 1등은 아닌 것들
  const optionItems = [nearest, ...decoys].sort((a, b) => before.indexOf(a) - before.indexOf(b));
  ds.distances = sorted;
  ds.sorted = true;
  rec.frame({
    line: 5, action: 'sort', phase: 1, ds,
    effects: [{ target: 'distances', op: 'sort()' }],
    narration: `distances를 거리가 작은 순으로 정렬합니다. 맨 앞은 ${nearest.name}(${fmt(nearest.d)}).`,
    ask: {
      q: '🔮 정렬하면 distances의 맨 앞에 올 음식은?',
      options: optionItems.map((x) => x.name),
      answer: optionItems.indexOf(nearest),
      why: `거리가 가장 작은 ${nearest.name}(d = ${fmt(nearest.d)})이 맨 앞으로 와요.`,
    },
    calc: {
      title: '🔃 정렬: 거리가 작은 것부터',
      rows: sorted.slice(0, 6).map((x, i) => `${i + 1}. ${x.name}  d = ${fmt(x.d)}  (${x.label})`)
        .concat(sorted.length > 6 ? [`… 나머지 ${sorted.length - 6}개`] : []),
    },
  });

  // 6: 앞에서 k개
  ds.neighbors = sorted.slice(0, k).map((x) => ({ ...x }));
  const radius = sorted[k - 1].d;
  rec.frame({
    line: 6, action: 'slice', phase: 2, ds,
    effects: [{ target: 'neighbors', op: `[:${k}]` }],
    narration: `정렬된 distances의 앞에서 ${k}개를 잘라 neighbors로 가져옵니다. (반지름 ${fmt(radius)} 안쪽)`,
    calc: {
      title: `✂ neighbors = distances[:${k}]`,
      rows: ds.neighbors.map((x, i) => `${i + 1}. ${x.name}  d = ${fmt(x.d)}  → ${x.label}`),
    },
  });

  // 7: 빈 딕셔너리
  rec.frame({
    line: 7, action: 'new', phase: 3, ds,
    effects: [{ target: 'votes', op: '{ }' }],
    narration: '레이블별 표를 셀 빈 딕셔너리 votes를 만듭니다.',
  });

  // 8: 이웃마다 한 표
  ds.neighbors.forEach((nb) => {
    const slot = ds.votes.find((v) => v.label === nb.label);
    const old = slot ? slot.count : 0;
    if (slot) slot.count += 1;
    else ds.votes.push({ label: nb.label, count: 1 });
    ds.voting = nb.id;
    rec.frame({
      line: 8, action: 'count', phase: 3, ds,
      effects: [{ target: 'votes', op: slot ? '+1' : '새 키' }],
      narration: slot
        ? `${nb.name}의 레이블 "${nb.label}" 칸에 한 표를 더합니다 (${old} → ${old + 1}).`
        : `${nb.name}의 레이블 "${nb.label}"은 처음이라 새 키를 만들고 1표를 넣습니다.`,
      calc: {
        title: `🗳 votes["${nb.label}"] = votes.get("${nb.label}", 0) + 1`,
        rows: [`= ${old} + 1 = ${old + 1}`, '지금 votes = { ' + ds.votes.map((v) => `${v.label}: ${v.count}`).join(', ') + ' }'],
      },
    });
  });
  ds.voting = null;

  // 9: 가장 많은 레이블 — 파이썬 max는 같은 값이면 먼저 들어온 키를 고른다
  let best = ds.votes[0];
  for (const v of ds.votes) if (v.count > best.count) best = v;
  ds.result = best.label;
  const options = LABEL_ORDER.slice();
  rec.frame({
    line: 9, action: 'result', phase: 3, ds,
    effects: [{ target: 'result', op: 'max' }],
    narration: `votes에서 표가 가장 많은 "${best.label}"(${best.count}표)이 예측 결과입니다. ${FOOD_QUERY.name}는 ${best.label}!`,
    ask: {
      q: `🔮 k = ${k}일 때 예측 결과는?`,
      options,
      answer: options.indexOf(best.label),
      why: `이웃 ${k}개 중 "${best.label}"이 ${best.count}표로 가장 많아요.`,
    },
    calc: {
      title: '🏆 max(votes, key=votes.get)',
      rows: ds.votes.map((v) => `${v.label}: ${'■'.repeat(v.count)} ${v.count}표${v === best ? '  ← 가장 많음' : ''}`),
    },
  });

  return {
    frames: rec.frames,
    data: { train, query: { ...q, name: FOOD_QUERY.name } },
    result: { label: best.label, votes: ds.votes, neighbors: ds.neighbors, radius },
    params: { k, query: { ...q } },
  };
}

/** 결과만 빠르게 (써 보기·테스트용) */
export function classify(query, k) {
  const sorted = FOODS.map((r) => ({ id: r.id, label: r.label, d: dist([query.x, query.y], [r.x, r.y]) }))
    .sort(compareTuple);
  const votes = new Map();
  for (const n of sorted.slice(0, k)) votes.set(n.label, (votes.get(n.label) ?? 0) + 1);
  let best = null;
  for (const [label, count] of votes) if (!best || count > best.count) best = { label, count };
  return best.label;
}
