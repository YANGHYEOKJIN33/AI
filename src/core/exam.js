/**
 * 시험 대비 — 추적표(손으로 따라가 적는 표)와 시험 형식 연습 문제.
 *
 * 8-퍼즐 중간고사의 "OPEN에서 세 번째로 꺼낸 노드는?", "목표 노드는 몇 번째로 꺼내지는가?"처럼
 * 이 사이트의 시험도 "자료구조가 어떤 순서로 어떻게 바뀌는가"를 묻는다. 파이썬 코드는 묻지 않는다.
 *
 * 문제는 알고리즘을 실제로 돌린 기록(frames)에서 정답을 뽑아 만든다 — 그래서 정답이 언제나 화면과 같고,
 * 문제마다 "그 장면 보기"로 정답이 나오는 장면(쪽 + 프레임)으로 바로 갈 수 있다.
 * 화면을 모르는 순수 함수라 node에서 테스트한다.
 */
import { getAlgorithm, normalizeParams, conditionText } from './algorithms/index.js';
import { fmt, gini, entropy } from './math.js';
import { HOUSES, PLAY_DAYS, PLAY_FEATURES, PLAY_VALUES, STUDY } from './datasets.js';
import { clusterName } from './algorithms/kmeans.js';
import { classify as knnClassify } from './algorithms/knn.js';
import { classify as treeClassify } from './algorithms/dtree.js';

/* ───────────────────────── 작은 도구 ───────────────────────── */

/** 씨앗(seed)이 같으면 언제나 같은 수열 — 문제 세트가 다시 열어도 같게 */
export function rng(seed) {
  let a = (seed >>> 0) + 0x9e3779b9;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const pick = (r, list) => list[Math.floor(r() * list.length)];

/** 정답 + 오답 후보 → 중복을 지우고 섞은 보기 4개(이하) */
function choice(r, correct, wrongs, n = 4) {
  const seen = new Set([correct]);
  const opts = [correct];
  for (const w of wrongs) {
    if (opts.length >= n) break;
    if (w === null || w === undefined || seen.has(w)) continue;
    seen.add(w);
    opts.push(w);
  }
  for (let i = opts.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1));
    [opts[i], opts[j]] = [opts[j], opts[i]];
  }
  return { options: opts, answer: opts.indexOf(correct) };
}

const firstIndex = (frames, pred) => frames.findIndex(pred);
const ORD = ['첫', '두', '세', '네', '다섯', '여섯', '일곱', '여덟', '아홉', '열'];
const ord = (n) => `${ORD[n - 1] ?? n} 번째`;

/** 조건(knob) 조합 전체 */
function allParams(id) {
  const algo = getAlgorithm(id);
  let combos = [{}];
  for (const k of algo.knobs) combos = combos.flatMap((c) => k.options.map((o) => ({ ...c, ...o.patch })));
  return combos.map((c) => normalizeParams(id, c));
}

/* ───────────────────────── 추적표 ───────────────────────── */

/**
 * 추적표 — 시험지에 그리는 것과 같은 표. hide에 든 열은 처음엔 "?"로 가려 두고 눌러서 확인한다.
 * @returns [{ title, note, columns, rows: [[칸…]], hide: [열 번호] }]
 */
export function traceTables(id, run) {
  return TABLES[id](run);
}

const TABLES = {
  knn(run) {
    const { train, query: q } = run.data;
    const sorted = run.result.sorted;
    const rank = Object.fromEntries(sorted.map((s, i) => [s.id, i]));
    const t1 = {
      title: `① 거리 추적표 — ${q.name}(${q.x}, ${q.y})`,
      note: 'distances에는 표 순서대로 추가되고, 정렬하면 d²이 작은 것이 0번으로 와요.',
      columns: ['추가 순서', '음식', '(단맛, 아삭함)', 'd²', 'd', '레이블', '정렬 후 자리'],
      rows: train.map((f, i) => {
        const d2 = (q.x - f.x) ** 2 + (q.y - f.y) ** 2;
        return [`${i}번`, f.name, `(${f.x}, ${f.y})`, String(d2), fmt(Math.sqrt(d2)), f.label, `${rank[f.id]}번`];
      }),
      hide: [3, 4, 6],
    };
    const t2 = {
      title: '② k에 따른 이웃과 투표',
      note: '같은 정렬 결과에서 앞에서 몇 개를 자르느냐(k)만 달라져요.',
      columns: ['k', '이웃 (가까운 순)', 'votes', '예측'],
      rows: [1, 3, 5, 7].map((k) => {
        const c = knnClassify(q, k);
        const tie = c.votes.filter((v) => v.count === Math.max(...c.votes.map((x) => x.count))).length > 1;
        return [`k = ${k}`, sorted.slice(0, k).map((s) => s.name).join(', '),
          `{ ${c.votes.map((v) => `${v.label}: ${v.count}`).join(', ')} }`, tie ? `${c.label} (동점 — 더 가까운 쪽)` : c.label];
      }),
      hide: [1, 2, 3],
    };
    return [t1, t2];
  },

  kmeans(run) {
    const hist = run.result.history;
    const k = hist[0].start.length;
    const pt = (c) => `(${fmt(c.x)}, ${fmt(c.y)})`;
    const t1 = {
      title: '① 회차별 추적표',
      note: '회차마다 묶음을 비우고 다시 나눠요. 새 중심 = 그 묶음에 든 점들의 평균. 새 중심이 시작 중심과 같으면 수렴.',
      columns: ['회차', '시작 중심', ...HOUSES.map((p) => `${p.name}${`(${p.x},${p.y})`}`), '새 중심', '수렴?'],
      rows: hist.map((h) => [
        `${h.iter}회차`,
        h.start.map((c, i) => `${clusterName(i)}${pt(c)}`).join(' '),
        ...HOUSES.map((p) => clusterName(h.assign[p.id]) + (h.changed.includes(p.id) ? ' ↺' : '')),
        h.next.map((c, i) => `${clusterName(i)}${pt(c)}`).join(' '),
        h.converged ? '예 ✓' : '아니요',
      ]),
      hide: [...HOUSES.map((_, i) => i + 2), HOUSES.length + 2, HOUSES.length + 3],
    };
    const first = hist[0];
    const t2 = {
      title: '② 1회차 거리 제곱 표 (가장 작은 것의 묶음으로)',
      note: '√를 하지 않고 d²끼리 비교해도 가장 가까운 중심은 같아요.',
      columns: ['집', ...first.start.map((c, i) => `중심 ${clusterName(i)}${pt(c)}까지 d²`), '들어갈 묶음'],
      rows: HOUSES.map((p) => [
        `${p.name} (${p.x}, ${p.y})`,
        ...first.start.map((c) => fmt((p.x - c.x) ** 2 + (p.y - c.y) ** 2)),
        clusterName(first.assign[p.id]),
      ]),
      hide: [...first.start.map((_, i) => i + 1), k + 1],
    };
    return [t1, t2];
  },

  linreg(run) {
    const { X, Y } = run.data;
    const n = X.length;
    // 1에폭 (w = b = 0)
    const err1 = X.map((x, i) => 0 - Y[i]);
    const t1 = {
      title: '① 1에폭 계산표 (w = 0, b = 0에서 시작)',
      note: '예측 = w·x + b, 오차 = 예측 − y. 손실 = 오차²의 평균, dw = 2 × (오차·x)의 평균, db = 2 × 오차의 평균.',
      columns: ['x', 'y', '예측', '오차', '오차²', '오차·x'],
      rows: [
        ...X.map((x, i) => [String(x), String(Y[i]), '0', fmt(err1[i]), fmt(err1[i] ** 2), fmt(err1[i] * x)]),
        ['평균', '', '', fmt(err1.reduce((s, e) => s + e, 0) / n), `손실 ${fmt(err1.reduce((s, e) => s + e * e, 0) / n)}`, fmt(err1.reduce((s, e, i) => s + e * X[i], 0) / n)],
      ],
      hide: [2, 3, 4, 5],
    };
    // 에폭별
    const rows = [];
    const frames = run.frames;
    for (const f of frames) {
      if (f.action !== 'update') continue;
      const lossF = frames.find((g) => g.iter === f.iter && g.action === 'loss');
      rows.push([`${f.iter}`, fmt(f.ds.prevW), fmt(f.ds.prevB), fmt(lossF.ds.loss), fmt(f.ds.dw), fmt(f.ds.db), fmt(f.ds.w), fmt(f.ds.b)]);
    }
    const shown = rows.length > 6 ? [...rows.slice(0, 5), ['…', '', '', '', '', '', '', ''], rows[rows.length - 1]] : rows;
    const t2 = {
      title: `② 에폭별 추적표 (학습률 ${run.params.lr})`,
      note: 'w ← w − 학습률 × dw, b ← b − 학습률 × db. 손실이 줄면 잘 배우는 중이에요.',
      columns: ['에폭', '시작 w', '시작 b', '손실', 'dw', 'db', '갱신 뒤 w', '갱신 뒤 b'],
      rows: shown,
      hide: [3, 4, 5, 6, 7],
    };
    const t3 = {
      title: '③ 학습률 비교 (첫 에폭 dw = −39.2, db = −10.8은 학습률과 상관없이 같아요)',
      note: `참값(최소제곱)은 y = ${STUDY.best.w}x + ${STUDY.best.b}.`,
      columns: ['학습률', '1에폭 뒤 w', '1에폭 뒤 b', '2에폭 손실', '마지막 손실', '결과'],
      rows: [0.01, 0.05, 0.1].map((lr) => {
        const r = getAlgorithm('linreg').run({ lr });
        const h = r.result.history;
        return [String(lr), fmt(lr * 39.2), fmt(lr * 10.8), fmt(h[1]), fmt(h.at(-1)), r.result.diverged ? '발산 ✗' : (h.at(-1) < 0.1 ? '수렴 ✓' : '느리게 수렴')];
      }),
      hide: [1, 2, 3, 4, 5],
    };
    return [t1, t2, t3];
  },

  dtree(run) {
    const crit = run.params.criterion;
    const imp = crit === 'entropy' ? entropy : gini;
    const name = crit === 'entropy' ? '엔트로피' : '지니';
    const all = PLAY_DAYS;
    const best = minScoreFeature(all, PLAY_FEATURES, imp);
    const t1 = {
      title: `① 뿌리 점수표 (14개 · ${name})`,
      note: '값별로 나눠 레이블을 세고, 묶음마다 불순도 → 크기로 가중 평균. 점수가 가장 작은 특징이 뿌리 질문.',
      columns: ['특징', '값별 묶음 (⚽한다 / ✋안 한다)', `값별 ${name}`, '가중 평균 점수', '뿌리로 선택?'],
      rows: PLAY_FEATURES.map((f) => {
        const bins = binsOf(all, f);
        const score = bins.reduce((s, b) => s + (b.n / all.length) * imp(b.counts), 0);
        return [f,
          bins.map((b) => `${b.value} ${b.counts['한다']}/${b.counts['안 한다']}`).join(' · '),
          bins.map((b) => `${b.value} ${fmt(imp(b.counts), 3)}`).join(' · '),
          fmt(score, 3),
          f === best ? '✓ 선택' : ''];
      }),
      hide: [2, 3, 4],
    };
    // 호출(노드 생성) 순서
    const rows = [];
    const final = run.frames.at(-1).ds.nodes;
    for (const f of run.frames) {
      if (f.action !== 'call') continue;
      const nd = final[f.ds.cur];
      const path = pathText(final, nd.id);
      rows.push([`${rows.length + 1}번째`, path || '전체(뿌리)', String(nd.n),
        `⚽${nd.counts['한다']} ✋${nd.counts['안 한다']}`, String(f.ds.stack.length),
        nd.kind === 'leaf' ? `잎: ${nd.label}${nd.forced ? ' (다수결)' : ''}` : `질문: ${nd.feature}`]);
    }
    const t2 = {
      title: '② 트리만들기 호출 순서 (= 노드가 만들어지는 순서)',
      note: '가지를 값의 순서(맑음 → 흐림 → 비)대로 내려가며, 한 가지를 끝까지 만든 뒤 다음 가지로 가요(재귀).',
      columns: ['호출 순서', '들어온 데이터', '개수', '레이블 세기', '호출 스택 칸 수', '만들어진 노드'],
      rows,
      hide: [3, 4, 5],
    };
    return [t1, t2];
  },
};

function countLabels(rows) {
  const c = { 한다: 0, '안 한다': 0 };
  rows.forEach((r) => { c[r.label] += 1; });
  return c;
}
function binsOf(rows, f) {
  return PLAY_VALUES[f].map((value) => {
    const sub = rows.filter((r) => r[f] === value);
    return { value, n: sub.length, counts: countLabels(sub) };
  }).filter((b) => b.n > 0);
}
function minScoreFeature(rows, features, imp) {
  let best = null; let bestS = Infinity;
  for (const f of features) {
    const s = binsOf(rows, f).reduce((t, b) => t + (b.n / rows.length) * imp(b.counts), 0);
    if (s < bestS - 1e-12) { best = f; bestS = s; }
  }
  return best;
}
function pathText(nodes, id) {
  const parts = [];
  let nd = nodes[id];
  while (nd && nd.parent !== null) {
    const parent = nodes[nd.parent];
    parts.unshift(`${parent.feature}=${nd.edge}`);
    nd = parent;
  }
  return parts.join(', ');
}

/* ───────────────────────── 연습 문제 ───────────────────────── */

/**
 * 시험 형식 연습 문제 한 세트.
 * seed 0은 기본 조건(수업에서 따라간 예제), 다른 seed는 조건을 바꾼 새 문제.
 * @returns {{ params, condition, questions: [{ q, options, answer, why, jump: { page, frame } }] }}
 */
export function makeExam(id, seed = 0, count = 5) {
  const r = rng(seed * 7919 + id.length * 104729);
  const algo = getAlgorithm(id);
  const candidates = allParams(id).filter((p) => (GOOD_PARAMS[id] ? GOOD_PARAMS[id](p) : true));
  const params = seed === 0 ? normalizeParams(id, algo.defaults) : pick(r, candidates);
  const run = algo.run(params);
  const pool = POOLS[id](run, r).filter(Boolean);
  // 순서를 묻는 문제(자료구조 변화)를 꼭 넣고, 나머지는 고르게
  const ordered = pool.filter((q) => q.kind === 'order');
  const rest = pool.filter((q) => q.kind !== 'order');
  const out = [];
  if (ordered.length) out.push(ordered.splice(Math.floor(r() * ordered.length), 1)[0]);
  const mixed = [...ordered, ...rest];
  while (out.length < count && mixed.length) out.push(mixed.splice(Math.floor(r() * mixed.length), 1)[0]);
  out.sort((a, b) => a.jump.frame - b.jump.frame);   // 알고리즘이 진행되는 순서대로
  return { params, condition: conditionText(id, params), questions: out };
}

/** 시험에 쓰기 좋은 조건만 (투표 동점 없음 등) */
const GOOD_PARAMS = {
  knn: (p) => {
    const c = knnClassify(p.query, p.k);
    const max = Math.max(...c.votes.map((v) => v.count));
    return c.votes.filter((v) => v.count === max).length === 1;
  },
};

const POOLS = {
  knn(run, r) {
    const { train, query: q } = run.data;
    const fr = run.frames;
    const { k } = run.params;
    const sorted = run.result.sorted;
    const qs = [];

    // 거리 계산
    const row = pick(r, train);
    const dx = q.x - row.x; const dy = q.y - row.y;
    const d2 = dx * dx + dy * dy;
    qs.push({ kind: 'calc',
      q: `${q.name}(${q.x}, ${q.y})와 학습 데이터 ${row.name}(${row.x}, ${row.y}) 사이 거리의 제곱 d²은?`,
      ...choice(r, String(d2), [String((Math.abs(dx) + Math.abs(dy)) ** 2), String(Math.abs(dx) + Math.abs(dy)), String(d2 + 2), String(Math.max(1, d2 - 3)), String(dx * dx)]),
      why: `d² = (${q.x}−${row.x})² + (${q.y}−${row.y})² = ${dx * dx} + ${dy * dy} = ${d2}`,
      jump: { page: 'dist', frame: firstIndex(fr, (f) => f.action === 'measure' && f.ds.cur === row.id) } });

    // 추가 순서 vs 정렬 순서
    const m = 2 + Math.floor(r() * 4);   // 2~5번째
    const appended = train[m - 1];
    qs.push({ kind: 'order',
      q: `distances에 ${ord(m)}로 추가되는 학습 데이터는?`,
      ...choice(r, appended.name, [sorted[m - 1].name, train[m].name, train[m - 2].name, sorted[0].name, train[m + 1]?.name, sorted[1].name]),
      why: `distances에는 표의 위에서부터 차례로 추가돼요(정렬 전). ${m}번째 줄은 ${appended.name}.`,
      jump: { page: 'dist', frame: firstIndex(fr, (f) => f.action === 'append' && f.ds.distances.length === m) } });

    const n = 2 + Math.floor(r() * 3);   // 2~4번째로 가까운
    qs.push({ kind: 'order',
      q: `distances를 정렬했을 때 ${ord(n)}로 가까운(인덱스 ${n - 1}번) 학습 데이터는?`,
      ...choice(r, sorted[n - 1].name, [sorted[n - 2].name, sorted[n].name, train[n - 1].name, sorted[n + 1]?.name]),
      why: `정렬 결과: ${sorted.slice(0, n + 1).map((s, i) => `${i}번 ${s.name}(d² ${s.d2})`).join(', ')} …`,
      jump: { page: 'sort', frame: firstIndex(fr, (f) => f.action === 'sort') } });

    const votesText = (vs) => `{ ${vs.map((v) => `${v.label}: ${v.count}`).join(', ')} }`;
    const right = votesText(run.result.votes);
    const otherK = [1, 3, 5, 7].filter((x) => x !== k).map((x) => votesText(knnClassify(q, x).votes));
    qs.push({ kind: 'order',
      q: `k = ${k}일 때 투표가 끝난 votes 딕셔너리는?`,
      ...choice(r, right, [...otherK, votesText(run.result.votes.map((v, i) => ({ ...v, count: v.count + (i === 0 ? -1 : 1) })).filter((v) => v.count > 0))]),
      why: `이웃 ${k}개: ${run.result.neighbors.map((nb) => `${nb.name}(${nb.label})`).join(', ')} → ${right}`,
      jump: { page: 'vote', frame: fr.length - 1 } });

    qs.push({ kind: 'result',
      q: `k = ${k}일 때 ${q.name}의 예측 레이블은?`,
      ...choice(r, run.result.label, ['과일', '채소', '단백질']),
      why: `votes에서 가장 많은 레이블은 "${run.result.label}".`,
      jump: { page: 'vote', frame: fr.length - 1 } });

    const results = [1, 3, 5, 7].map((x) => [x, knnClassify(q, x).label]);
    const flip = results.find(([x, lab]) => x > k && lab !== run.result.label);
    if (k < 7) qs.push({ kind: 'result',
      q: `k를 ${k}에서 ${[1, 3, 5, 7].filter((x) => x > k).join(', ')}(으)로 늘려 갈 때 예측이 처음으로 바뀌는 k는?`,
      ...choice(r, flip ? `k = ${flip[0]}` : '바뀌지 않는다', [...[3, 5, 7].filter((x) => x > k).map((x) => `k = ${x}`), '바뀌지 않는다']),
      why: results.map(([x, lab]) => `k = ${x} → ${lab}`).join(', '),
      jump: { page: 'vote', frame: fr.length - 1 } });
    return qs;
  },

  kmeans(run, r) {
    const fr = run.frames;
    const hist = run.result.history;
    const qs = [];
    const pt = (c) => `(${fmt(c.x)}, ${fmt(c.y)})`;
    const h1 = hist[0];
    const k = h1.start.length;

    // 자기 자신이 시작 중심인 집(거리 0)은 빼고 고른다
    const pairs = HOUSES.flatMap((h) => h1.start.map((st, ci) => [h, ci, st])).filter(([h, , st]) => h.x !== st.x || h.y !== st.y);
    const [p, c] = pick(r, pairs);
    const d2 = (p.x - h1.start[c].x) ** 2 + (p.y - h1.start[c].y) ** 2;
    qs.push({ kind: 'calc',
      q: `1회차에서 ${p.name}(${p.x}, ${p.y})와 시작 중심 ${clusterName(c)}${pt(h1.start[c])} 사이 거리의 제곱은?`,
      ...choice(r, fmt(d2), [fmt(Math.abs(p.x - h1.start[c].x) + Math.abs(p.y - h1.start[c].y)), fmt((Math.abs(p.x - h1.start[c].x) + Math.abs(p.y - h1.start[c].y)) ** 2), fmt(d2 + 1), fmt(d2 + 4), fmt(d2 * 2)]),
      why: `(${p.x}−${fmt(h1.start[c].x)})² + (${p.y}−${fmt(h1.start[c].y)})² = ${fmt(d2)}`,
      jump: { page: 'assign', frame: firstIndex(fr, (f) => f.action === 'nearest' && f.iter === 1 && f.ds.cur === p.id) } });

    const setText = (assign, ci) => HOUSES.filter((h) => assign[h.id] === ci).map((h) => h.name).join(', ') || '없음';
    const final = hist.at(-1);
    qs.push({ kind: 'order',
      q: `1회차 할당이 끝났을 때 묶음 A에 들어 있는 집은?`,
      ...choice(r, setText(h1.assign, 0), [setText(final.assign, 0), setText(h1.assign, 1), setText(final.assign, 1),
        ...HOUSES.map((h) => setText({ ...h1.assign, [h.id]: h1.assign[h.id] === 0 ? 1 : 0 }, 0))]),
      why: `1회차 시작 중심 ${h1.start.map((s, i) => `${clusterName(i)}${pt(s)}`).join(', ')}에서 가장 가까운 중심으로 나누면 A = {${setText(h1.assign, 0)}}`,
      jump: { page: 'assign', frame: firstIndex(fr, (f) => f.action === 'mean' && f.iter === 1) - 1 } });

    const ci = Math.floor(r() * k);
    const right = pt(h1.next[ci]);
    qs.push({ kind: 'calc',
      q: `1회차가 끝나고 계산한 새 중심 ${clusterName(ci)}의 좌표는?`,
      ...choice(r, right, [pt(h1.start[ci]), pt(h1.next[(ci + 1) % k]), `(${fmt(h1.next[ci].y)}, ${fmt(h1.next[ci].x)})`, pt(final.next[ci])]),
      why: `묶음 ${clusterName(ci)} = {${setText(h1.assign, ci)}}의 x 평균, y 평균 → ${right}`,
      jump: { page: 'update', frame: firstIndex(fr, (f) => f.action === 'mean' && f.iter === 1) } });

    qs.push({ kind: 'order',
      q: '몇 번째 반복(회차)에서 "새 중심 = 중심"이 되어 멈추는가?',
      ...choice(r, `${hist.length}회차`, ['1회차', '2회차', '3회차', '4회차', '5회차']),
      why: hist.map((h) => `${h.iter}회차 새 중심 ${h.next.map((x) => pt(x)).join(' ')}${h.converged ? ' = 시작 중심 → 멈춤' : ''}`).join(' / '),
      jump: { page: 'repeat', frame: firstIndex(fr, (f) => f.action === 'converged') } });

    if (hist.length >= 2) {
      const ch = hist[1].changed.map((id) => HOUSES.find((h) => h.id === id).name).join(', ') || '없다';
      qs.push({ kind: 'order',
        q: '2회차에 1회차와 다른 묶음으로 옮겨 가는 집은?',
        ...choice(r, ch, ['없다', ...HOUSES.map((h) => h.name)]),
        why: `1회차 ${HOUSES.map((h) => clusterName(h1.assign[h.id])).join('')} → 2회차 ${HOUSES.map((h) => clusterName(hist[1].assign[h.id])).join('')} (집1부터 차례로)`,
        jump: { page: 'repeat', frame: firstIndex(fr, (f) => f.action === 'mean' && f.iter === 2) - 1 } });
    }

    const cf = Math.floor(r() * k);
    qs.push({ kind: 'result',
      q: `알고리즘이 끝났을 때 묶음 ${clusterName(cf)}의 중심은?`,
      ...choice(r, pt(final.next[cf]), [pt(h1.next[cf]), pt(h1.start[cf]), pt(final.next[(cf + 1) % k]), `(${fmt(final.next[cf].x + 1)}, ${fmt(final.next[cf].y)})`]),
      why: `마지막 회차 묶음 ${clusterName(cf)} = {${setText(final.assign, cf)}}의 평균`,
      jump: { page: 'repeat', frame: fr.length - 1 } });
    return qs;
  },

  linreg(run, r) {
    const fr = run.frames;
    const lr = run.params.lr;
    const h = run.result.history;
    const qs = [];
    const f1 = (a) => firstIndex(fr, (f) => f.iter === 1 && f.action === a);
    qs.push({ kind: 'calc',
      q: 'w = 0, b = 0에서 시작할 때 첫 에폭의 손실(평균제곱오차)은?',
      ...choice(r, '35', ['175', '5.4', '70', '27']),
      why: '예측이 모두 0이라 오차 = −y. (4 + 16 + 25 + 49 + 81) / 5 = 175 / 5 = 35',
      jump: { page: 'loss', frame: f1('loss') } });
    qs.push({ kind: 'calc',
      q: '첫 에폭의 기울기 dw = 2 × (오차·x)의 평균은?',
      ...choice(r, '−39.2', ['39.2', '−19.6', '−98', '−10.8']),
      why: '오차·x = −2, −8, −15, −28, −45 → 합 −98, 평균 −19.6, × 2 = −39.2',
      jump: { page: 'loss', frame: f1('gradient') } });
    const w1 = lr * 39.2;
    qs.push({ kind: 'order',
      q: `학습률 ${lr}일 때 첫 에폭 갱신 뒤 w는?`,
      ...choice(r, fmt(w1), [fmt(-w1), fmt(39.2), fmt(lr * 19.6), fmt(lr * 10.8)]),
      why: `w ← 0 − ${lr} × (−39.2) = ${fmt(w1)} (음수를 빼면 커져요)`,
      jump: { page: 'update', frame: f1('update') } });
    const b1 = lr * 10.8;
    qs.push({ kind: 'order',
      q: `학습률 ${lr}일 때 첫 에폭 갱신 뒤 b는?`,
      ...choice(r, fmt(b1), [fmt(-b1), fmt(10.8), fmt(lr * 5.4), fmt(lr * 39.2)]),
      why: `db = 2 × (−27 / 5) = −10.8 → b ← 0 − ${lr} × (−10.8) = ${fmt(b1)}`,
      jump: { page: 'update', frame: f1('update') } });
    qs.push({ kind: 'result',
      q: `학습률 ${lr}일 때 두 번째 에폭의 손실은 첫 번째(35)보다?`,
      ...choice(r, h[1] < h[0] ? '줄어든다' : '커진다', ['줄어든다', '커진다', '똑같다']),
      why: `두 번째 에폭 손실 = ${fmt(h[1])}${h[1] > h[0] ? ' — 학습률이 너무 커서 골짜기를 넘어갔어요(발산)' : ''}`,
      jump: { page: 'update', frame: firstIndex(fr, (f) => f.iter === 2 && f.action === 'loss') } });
    const p2 = w1 * 1 + b1;
    qs.push({ kind: 'order',
      q: `학습률 ${lr}일 때 두 번째 에폭에서 x = 1의 예측값은?`,
      ...choice(r, fmt(p2), [fmt(w1), fmt(b1), fmt(w1 - b1), '0']),
      why: `예측 = w × 1 + b = ${fmt(w1)} + ${fmt(b1)} = ${fmt(p2)}`,
      jump: { page: 'update', frame: firstIndex(fr, (f) => f.iter === 2 && f.action === 'predict') } });
    return qs;
  },

  dtree(run, r) {
    const fr = run.frames;
    const crit = run.params.criterion;
    const imp = crit === 'entropy' ? entropy : gini;
    const name = crit === 'entropy' ? '엔트로피' : '지니 불순도';
    const nodes = fr.at(-1).ds.nodes;
    const root = nodes[run.result.root];
    const qs = [];

    const f = pick(r, PLAY_FEATURES);
    const bin = pick(r, binsOf(PLAY_DAYS, f));
    const others = binsOf(PLAY_DAYS, f).filter((b) => b.value !== bin.value).map((b) => fmt(imp(b.counts), 3));
    qs.push({ kind: 'calc',
      q: `뿌리에서 "${f}"로 나눴을 때 "${bin.value}" 묶음(${bin.n}개: 한다 ${bin.counts['한다']}, 안 한다 ${bin.counts['안 한다']})의 ${name}는?`,
      ...choice(r, fmt(imp(bin.counts), 3), [...others, fmt(1 - imp(bin.counts), 3), fmt(bin.counts['한다'] / bin.n, 3), '0']),
      why: crit === 'entropy' ? '엔트로피 = −Σ p·log₂p' : `1 − (${bin.counts['한다']}/${bin.n})² − (${bin.counts['안 한다']}/${bin.n})²`,
      jump: { page: 'root', frame: firstIndex(fr, (g) => g.action === 'score' && g.ds.cur === run.result.root && g.ds.groups?.feature === f) } });

    const scores = PLAY_FEATURES.map((g) => [g, binsOf(PLAY_DAYS, g).reduce((s, b) => s + (b.n / 14) * imp(b.counts), 0)]);
    qs.push({ kind: 'result',
      q: `뿌리 노드의 질문으로 선택되는 특징은? (${name} 기준)`,
      ...choice(r, root.feature, PLAY_FEATURES),
      why: scores.map(([g, s]) => `${g} ${fmt(s, 3)}`).join(', ') + ' → 가장 작은 것',
      jump: { page: 'root', frame: firstIndex(fr, (g) => g.action === 'choose') } });

    const worst = scores.reduce((a, b) => (b[1] > a[1] ? b : a));
    qs.push({ kind: 'calc',
      q: `뿌리에서 가중 평균 점수가 가장 큰(데이터를 가장 덜 깨끗하게 나누는) 특징은?`,
      ...choice(r, worst[0], PLAY_FEATURES),
      why: scores.map(([g, s]) => `${g} ${fmt(s, 3)}`).join(', '),
      jump: { page: 'root', frame: firstIndex(fr, (g) => g.action === 'choose') } });

    const callFrames = fr.filter((g) => g.action === 'call');
    const splitsInOrder = callFrames.map((g) => nodes[g.ds.cur]).filter((nd) => nd.kind === 'split');
    if (splitsInOrder.length >= 2) {
      const second = splitsInOrder[1];
      qs.push({ kind: 'order',
        q: '두 번째로 만들어지는 질문 노드의 특징은?',
        ...choice(r, second.feature, PLAY_FEATURES.filter((g) => g !== root.feature).concat([root.feature])),
        why: `뿌리(${root.feature}) 다음, 값 순서대로 처음 내려간 "${second.edge}" 가지가 섞여 있어 "${second.feature}"로 나눠요.`,
        jump: { page: 'grow', frame: firstIndex(fr, (g) => g.action === 'node' && g.ds.cur === second.id) } });
    }

    const leavesInOrder = callFrames.map((g) => nodes[g.ds.cur]).filter((nd) => nd.kind === 'leaf');
    const li = Math.min(leavesInOrder.length, 1 + Math.floor(r() * Math.min(3, leavesInOrder.length)));
    const leaf = leavesInOrder[li - 1];
    qs.push({ kind: 'order',
      q: `${ord(li)}로 만들어지는 잎 노드는 어떤 조건의 잎인가?`,
      ...choice(r, `${pathText(nodes, leaf.id)} → ${leaf.label}`, leavesInOrder.map((l) => `${pathText(nodes, l.id)} → ${l.label}`)),
      why: `잎이 만들어지는 순서: ${leavesInOrder.map((l, i) => `${i + 1}) ${pathText(nodes, l.id)}`).join(' ')}`,
      jump: { page: 'grow', frame: firstIndex(fr, (g) => (g.action === 'leaf') && g.ds.cur === leaf.id) } });

    const maxStack = Math.max(...fr.map((g) => g.ds.stack.length));
    qs.push({ kind: 'order',
      q: '트리를 만드는 동안 호출 스택이 가장 높이 쌓였을 때 몇 칸인가?',
      ...choice(r, `${maxStack}칸`, ['1칸', '2칸', '3칸', '4칸', '5칸']),
      why: '뿌리 호출(1칸) → 가지로 재귀(2칸) → 그 아래 가지(3칸)… 트리 깊이 + 1만큼 쌓여요.',
      jump: { page: 'grow', frame: firstIndex(fr, (g) => g.ds.stack.length === maxStack) } });

    qs.push({ kind: 'order',
      q: '트리만들기 함수는 모두 몇 번 호출되는가? (= 만들어지는 노드 수)',
      ...choice(r, `${callFrames.length}번`, [`${callFrames.length - 1}번`, `${callFrames.length + 1}번`, `${Object.values(nodes).filter((nd) => nd.kind === 'leaf').length}번`, '14번']),
      why: `질문 노드 ${splitsInOrder.length}개 + 잎 노드 ${leavesInOrder.length}개 = ${callFrames.length}`,
      jump: { page: 'grow', frame: fr.length - 1 } });

    const day = { 날씨: pick(r, PLAY_VALUES.날씨), 기온: pick(r, PLAY_VALUES.기온), 습도: pick(r, PLAY_VALUES.습도), 바람: pick(r, PLAY_VALUES.바람) };
    const pred = treeClassify(nodes, run.result.root, day);
    qs.push({ kind: 'result',
      q: `완성된 트리로 (${PLAY_FEATURES.map((g) => `${g} ${day[g]}`).join(', ')})인 날을 예측하면?`,
      ...choice(r, pred.label, ['한다', '안 한다']),
      why: `지나가는 길: ${pred.path.map((id) => nodes[id]).map((nd) => (nd.kind === 'leaf' ? nd.label : `${nd.feature}=${day[nd.feature]}`)).join(' → ')}`,
      jump: { page: 'grow', frame: fr.length - 1 } });
    return qs;
  },
};

/** 종합 모의시험 — 알고리즘마다 2문제씩 */
export function makeMockExam(seed, perAlgo = 2) {
  return ['knn', 'kmeans', 'linreg', 'dtree'].flatMap((id) => {
    const ex = makeExam(id, seed + 1, perAlgo);
    return ex.questions.map((q) => ({ ...q, algo: id, params: ex.params, condition: ex.condition }));
  });
}

export const _test = { allParams };
