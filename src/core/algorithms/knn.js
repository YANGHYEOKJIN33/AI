/**
 * k-최근접 이웃 (k-Nearest Neighbors) — 분류 · 지도학습.
 *
 * 자료구조의 흐름
 *   학습 데이터(표) ──거리 재고 복사──▶ distances(리스트) ──정렬──▶ 정렬된 distances
 *        ──앞에서 k개 복사──▶ 이웃(리스트) ──레이블 세기──▶ votes(딕셔너리) ──가장 많은 것──▶ 예측
 *
 * 시험에서 손으로 풀 수 있도록 거리 제곱 d²(정수)을 함께 기록한다.
 * √는 크기 순서를 바꾸지 않으므로, d²으로 비교해도 정렬 결과가 같다.
 *
 * 이 파일은 화면을 모른다. 의사코드 한 줄마다의 자료구조 모습(frames)만 만든다.
 */
import { Recorder } from '../trace.js';
import { fmt } from '../math.js';
import { FOODS, FOOD_QUERY, FOOD_LABELS, FOOD_QUERY_CANDIDATES } from '../datasets.js';

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

const K_CHOICES = [1, 3, 5, 7];
const d2Of = (q, f) => (q.x - f.x) ** 2 + (q.y - f.y) ** 2;

/** 거리 정렬 → 동점이 없고, k = 1·3·5·7 투표에도 동점이 없는 질문점만 연습에 쓴다 */
function tieFree(q) {
  const ds = FOODS.map((f) => ({ label: f.label, d2: d2Of(q, f) })).sort((a, b) => a.d2 - b.d2);
  if (new Set(ds.map((d) => d.d2)).size < ds.length) return false;
  return K_CHOICES.every((k) => {
    const v = {};
    ds.slice(0, k).forEach((d) => { v[d.label] = (v[d.label] ?? 0) + 1; });
    const c = Object.values(v).sort((a, b) => b - a);
    return c.length < 2 || c[0] !== c[1];
  });
}
export const QUERIES = FOOD_QUERY_CANDIDATES.filter(tieFree);

export const defaults = Object.freeze({ k: 3, query: { ...FOOD_QUERY } });

/** 시험·추적표에서 바꿀 수 있는 조건 */
export const knobs = [
  { key: 'query', label: '질문점', options: QUERIES.map((q) => ({ id: q.name, label: `${q.name} (${q.x}, ${q.y})`, patch: { query: { ...q } } })) },
  { key: 'k', label: 'k (이웃 수)', options: K_CHOICES.map((k) => ({ id: String(k), label: `k = ${k}`, patch: { k } })) },
];
export function knobValue(params, key) {
  return key === 'k' ? String(params.k) : params.query?.name;
}

export function normalize(params) {
  const k = K_CHOICES.includes(params?.k) ? params.k : defaults.k;
  const q = QUERIES.find((c) => c.name === params?.query?.name && c.x === params.query.x && c.y === params.query.y);
  return { k, query: q ? { ...q } : { ...FOOD_QUERY } };
}

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

/** 줄마다 하는 일과 이유 — 강조된 줄 아래에 한 문장으로 펼쳐진다 */
export const notes = [
  '거리를 모아 둘 빈 리스트를 만들어요.',
  '학습 데이터를 표의 위에서부터 하나씩 돌아요. 그래서 distances에는 표 순서대로 들어가요.',
  '질문점과 이 데이터 사이의 거리 d = √(Δx² + Δy²). 손으로 풀 땐 d²만 비교해도 순서가 같아요.',
  '(거리, 레이블) 한 쌍을 리스트 맨 뒤에 붙여요. 원래 표는 그대로 두고 복사해 와요.',
  '거리가 작은 것이 앞(0번)으로 오도록 정렬해요.',
  '정렬된 리스트의 앞에서 k개만 잘라 와요. 이것이 "가장 가까운 k개 이웃"이에요.',
  '레이블별 표를 셀 빈 딕셔너리를 만들어요. 키 = 레이블, 값 = 표 수.',
  '이웃마다 자기 레이블 칸에 1표씩 더해요. 처음 나온 레이블이면 새 키가 생겨요.',
  '표가 가장 많은 레이블이 예측 결과예요(다수결).',
];

const LABEL_ORDER = FOOD_LABELS.map((l) => l.id);

/** 거리 오름차순 (같으면 레이블 글자 순 — 예제 데이터에는 동점이 없다) */
function compareTuple(a, b) {
  if (a.d2 !== b.d2) return a.d2 - b.d2;
  if (a.label !== b.label) return a.label < b.label ? -1 : 1;
  return 0;
}

/**
 * @param {object} params { k, query:{name,x,y} }
 * @returns {{ frames, data, result, params }}
 */
export function run(params = defaults) {
  const { k, query: q } = normalize(params);
  const train = FOODS;
  const rec = new Recorder();

  const ds = {
    query: { ...q }, k,
    cur: null,
    distances: [],
    sorted: false,
    neighbors: [],
    votes: [],          // [{ label, count }] — 넣은 순서 유지
    voting: null,
    result: null,
  };

  rec.frame({
    line: 1, action: 'new', phase: 0, ds,
    effects: [{ target: 'distances', op: '[ ]' }],
    narration: '거리를 모아 둘 빈 리스트 distances를 만듭니다.',
  });
  rec.frame({
    line: 2, action: 'loop', phase: 0, ds,
    narration: `학습 데이터 ${train.length}개를 표의 위에서부터 하나씩 돌며 ${q.name}(${q.x}, ${q.y})과의 거리를 잽니다.`,
  });

  train.forEach((row, i) => {
    const dx = q.x - row.x;
    const dy = q.y - row.y;
    const d2 = dx * dx + dy * dy;
    const d = Math.sqrt(d2);
    ds.cur = row.id;
    rec.frame({
      line: 3, action: 'measure', phase: 0, ds,
      narration: `${i + 1}번째 데이터 ${row.name}(${row.x}, ${row.y})까지의 거리를 잽니다: d² = ${d2}, d = ${fmt(d)}.`,
      calc: {
        title: `📏 ${q.name}(${q.x}, ${q.y}) ↔ ${row.name}(${row.x}, ${row.y})`,
        rows: [
          `d² = (${q.x}−${row.x})² + (${q.y}−${row.y})² = ${dx * dx} + ${dy * dy} = ${d2}`,
          `d  = √${d2} = ${fmt(d)}`,
        ],
      },
    });
    ds.distances.push({ id: row.id, name: row.name, label: row.label, d, d2 });
    rec.frame({
      line: 4, action: 'append', phase: 0, ds,
      effects: [{ target: 'distances', op: '추가' }],
      narration: `(${fmt(d)}, ${row.label})을 distances 맨 뒤 ${ds.distances.length - 1}번 칸에 추가합니다.`,
    });
  });

  // 5: 정렬 — 정렬 전에 "맨 앞에 올 것은?"을 묻는다
  ds.cur = null;
  const before = ds.distances.slice();
  const sorted = before.slice().sort(compareTuple);
  const nearest = sorted[0];
  const optionItems = [sorted[0], sorted[1], sorted[2]].sort((a, b) => before.indexOf(a) - before.indexOf(b));
  ds.distances = sorted;
  ds.sorted = true;
  rec.frame({
    line: 5, action: 'sort', phase: 1, ds,
    effects: [{ target: 'distances', op: '정렬' }],
    narration: `distances를 거리가 작은 순으로 정렬합니다. 0번은 ${nearest.name}(d² = ${nearest.d2}).`,
    ask: {
      q: '🔮 정렬하면 distances의 0번(맨 앞)에 올 음식은?',
      options: optionItems.map((x) => x.name),
      answer: optionItems.indexOf(nearest),
      why: `d²이 가장 작은 ${nearest.name}(d² = ${nearest.d2})이 맨 앞으로 와요.`,
    },
    calc: {
      title: '🔃 거리가 작은 순서',
      rows: sorted.map((x, i) => `${i}번 ${x.name}  d² = ${x.d2}  (${x.label})`),
    },
  });

  // 6: 앞에서 k개
  ds.neighbors = sorted.slice(0, k).map((x) => ({ ...x }));
  const radius = sorted[k - 1].d;
  rec.frame({
    line: 6, action: 'slice', phase: 2, ds,
    effects: [{ target: 'neighbors', op: `앞 ${k}개` }],
    narration: `정렬된 distances의 0번부터 ${k - 1}번까지 ${k}개를 이웃으로 가져옵니다.`,
    calc: {
      title: `✂ 이웃 = 앞에서 ${k}개`,
      rows: ds.neighbors.map((x, i) => `${i}번 ${x.name}  d² = ${x.d2}  → ${x.label}`),
    },
  });

  rec.frame({
    line: 7, action: 'new', phase: 3, ds,
    effects: [{ target: 'votes', op: '{ }' }],
    narration: '레이블별 표를 셀 빈 딕셔너리 votes를 만듭니다.',
  });

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
        ? `${nb.name}의 레이블 "${nb.label}" 칸에 1표를 더합니다 (${old} → ${old + 1}).`
        : `${nb.name}의 레이블 "${nb.label}"은 처음이라 새 키를 만들고 1표를 넣습니다.`,
      calc: {
        title: `🗳 votes["${nb.label}"]: ${old} → ${old + 1}`,
        rows: ['votes = { ' + ds.votes.map((v) => `${v.label}: ${v.count}`).join(', ') + ' }'],
      },
    });
  });
  ds.voting = null;

  let best = ds.votes[0];
  for (const v of ds.votes) if (v.count > best.count) best = v;
  ds.result = best.label;
  rec.frame({
    line: 9, action: 'result', phase: 3, ds,
    effects: [{ target: 'result', op: '가장 많은 것' }],
    narration: `votes에서 표가 가장 많은 "${best.label}"(${best.count}표)이 예측 결과입니다.`,
    ask: {
      q: `🔮 k = ${k}일 때 ${q.name}의 예측 레이블은?`,
      options: LABEL_ORDER.slice(),
      answer: LABEL_ORDER.indexOf(best.label),
      why: `이웃 ${k}개 중 "${best.label}"이 ${best.count}표로 가장 많아요.`,
    },
    calc: {
      title: '🏆 표가 가장 많은 레이블',
      rows: ds.votes.map((v) => `${v.label}: ${'■'.repeat(v.count)} ${v.count}표${v === best ? '  ← 가장 많음' : ''}`),
    },
  });

  return {
    frames: rec.frames,
    data: { train, query: { ...q } },
    result: { label: best.label, votes: ds.votes, neighbors: ds.neighbors, sorted, radius },
    params: { k, query: { ...q } },
  };
}

/** 결과만 빠르게 (추적표·연습 문제용) */
export function classify(query, k) {
  const sorted = FOODS.map((r) => ({ label: r.label, d2: d2Of(query, r) })).sort(compareTuple);
  const votes = new Map();
  for (const n of sorted.slice(0, k)) votes.set(n.label, (votes.get(n.label) ?? 0) + 1);
  let best = null;
  for (const [label, count] of votes) if (!best || count > best.count) best = { label, count };
  return { label: best.label, votes: [...votes].map(([label, count]) => ({ label, count })) };
}
