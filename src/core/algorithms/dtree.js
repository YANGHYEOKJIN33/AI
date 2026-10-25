/**
 * 의사결정트리 (Decision Tree) — 분류 · 지도학습.
 *
 * 자료구조의 흐름
 *   호출 스택 : 트리만들기(…)를 부를 때마다 한 칸 쌓이고(push), 돌려주면 빠진다(pop)
 *   데이터 행  : 특징 A의 값에 따라 묶음(리스트)들로 "이동" — 특징을 바꿔 시험할 때마다 다시 나뉜다
 *   레이블 세기: 묶음마다 딕셔너리 {한다: n, 안 한다: m} → 지니 불순도
 *   점수표     : 딕셔너리 {특징: 가중 불순도} → 가장 작은 특징이 질문이 된다
 *   트리       : 질문 노드와 잎 노드가 하나씩 자란다
 */
import { Recorder } from '../trace.js';
import { gini, entropy, fmt } from '../math.js';
import { PLAY_DAYS, PLAY_FEATURES, PLAY_VALUES, PLAY_LABELS } from '../datasets.js';

export const meta = Object.freeze({
  id: 'dtree',
  name: '의사결정트리',
  en: 'Decision Tree',
  short: '결정트리',
  task: '분류',
  learning: '지도학습',
  jumpLabel: '다음 노드',
  phases: ['멈출지 확인하기(잎?)', '특징마다 나눠 보기', '가장 깨끗한 특징 고르기', '가지마다 다시 만들기(재귀)'],
});

export const defaults = Object.freeze({ criterion: 'gini', maxDepth: null });

function variantOf(params) { return normalize(params); }
const critName = (c) => (c === 'entropy' ? '엔트로피' : '지니 불순도');

export function pseudo(params = defaults) {
  const v = variantOf(params);
  return [
    '함수 트리만들기(데이터, 특징들, 깊이):',
    '    만약 레이블이 모두 같으면 → 그 레이블로 잎 노드를 돌려준다',
    `    만약 남은 특징이 없거나 깊이가 한계면 → 다수결 잎 노드 (한계 = ${v.maxDepth ?? '없음'})`,
    '    각 특징 A에 대해:',
    '        데이터를 A의 값에 따라 묶음으로 나눈다',
    `        점수[A] ← 묶음별 ${critName(v.criterion)}의 가중 평균`,
    '    best ← 점수가 가장 작은 특징',
    '    노드 ← "best는?" 질문 노드',
    '    best의 값 v마다: 가지[v] ← 트리만들기(묶음[v], 특징들 − best, 깊이 + 1)',
    '    노드를 돌려준다',
  ];
}

export const notes = [
  '트리를 만드는 함수가 불릴 때마다 호출 스택에 한 칸이 쌓여요. 처음엔 데이터 14개, 특징 4개로 불려요.',
  '이 묶음의 레이블이 모두 같다면 더 나눌 필요가 없어요. 그 레이블을 답으로 하는 잎 노드를 돌려줘요.',
  '쓸 특징이 다 떨어졌거나 정해 둔 깊이에 닿으면, 가장 많은 레이블(다수결)로 잎 노드를 만들어요.',
  '특징을 하나씩 시험해 봐요. 점수표(딕셔너리)를 비우고 시작해요.',
  '특징 A의 값(맑음·흐림·비 …)마다 데이터 행을 묶음 리스트로 나눠요. 행이 묶음으로 이동해요.',
  '묶음마다 레이블을 세어 불순도(섞인 정도)를 구하고, 묶음 크기로 가중 평균해 점수표에 적어요. 작을수록 깨끗하게 나뉜 것.',
  '점수표에서 가장 작은 값의 특징을 골라요. 그 질문이 데이터를 가장 깨끗하게 나눠요(정보 이득이 가장 커요).',
  '고른 특징으로 질문 노드를 트리에 달아요.',
  '값마다 가지를 뻗고, 그 묶음으로 함수를 다시 불러요(재귀). 호출 스택에 한 칸이 더 쌓여요.',
  '모든 가지를 다 만들었으면 이 노드를 돌려줘요. 호출 스택에서 한 칸이 빠져요(pop).',
];

export const knobs = [
  { key: 'criterion', label: '불순도 기준', options: [
    { id: 'gini', label: '지니 불순도', patch: { criterion: 'gini' } },
    { id: 'entropy', label: '엔트로피', patch: { criterion: 'entropy' } },
  ] },
  { key: 'maxDepth', label: '최대 깊이', options: [
    { id: 'none', label: '제한 없음', patch: { maxDepth: null } },
    { id: '1', label: '최대 깊이 1', patch: { maxDepth: 1 } },
  ] },
];
export function knobValue(params, key) {
  return key === 'criterion' ? params.criterion : (params.maxDepth === 1 ? '1' : 'none');
}
export function normalize(params) {
  return {
    criterion: params?.criterion === 'entropy' ? 'entropy' : 'gini',
    maxDepth: params?.maxDepth === 1 ? 1 : null,
  };
}

const LABEL_IDS = PLAY_LABELS.map((l) => l.id);

/** 레이블 개수 — 항상 [한다, 안 한다] 순서로 담아 화면이 흔들리지 않게 */
function countLabels(rows) {
  const counts = Object.fromEntries(LABEL_IDS.map((l) => [l, 0]));
  for (const r of rows) counts[r.label] += 1;
  return counts;
}

function majority(rows) {
  // 파이썬 Counter.most_common처럼 먼저 나온 레이블이 동점에서 이긴다
  const seen = [];
  const counts = {};
  for (const r of rows) {
    if (!(r.label in counts)) { seen.push(r.label); counts[r.label] = 0; }
    counts[r.label] += 1;
  }
  return seen.reduce((best, l) => (counts[l] > counts[best] ? l : best), seen[0]);
}

const countText = (c) => LABEL_IDS.map((l) => `${l} ${c[l]}`).join(', ');

export function run(params = defaults) {
  const v = variantOf(params);
  const impurity = v.criterion === 'entropy' ? entropy : gini;
  const byId = Object.fromEntries(PLAY_DAYS.map((r) => [r.id, r]));
  const rec = new Recorder();
  let nodeSeq = 0;
  let nodeVisit = 0;   // "다음 노드" 단추가 쓰는 번호

  const ds = {
    criterion: v.criterion, maxDepth: v.maxDepth,
    stack: [],
    nodes: {},
    root: null,
    cur: null,
    rows: [],
    groups: null,
    scores: [],
    best: null,
    branch: null,
    labelCounts: null,
    done: false,
  };

  const impText = (counts) => {
    const n = LABEL_IDS.reduce((s, l) => s + counts[l], 0);
    const ps = LABEL_IDS.map((l) => `${counts[l]}/${n}`);
    return v.criterion === 'entropy'
      ? `−Σ p·log₂p (${ps.join(', ')}) = ${fmt(impurity(counts), 3)}`
      : `1 − (${ps.map((p) => `(${p})²`).join(' + ')}) = ${fmt(impurity(counts), 3)}`;
  };

  function splitRows(rowIds, feature) {
    return PLAY_VALUES[feature]
      .map((value) => {
        const ids = rowIds.filter((id) => byId[id][feature] === value);
        const counts = countLabels(ids.map((id) => byId[id]));
        return { value, rows: ids, counts, imp: impurity(counts) };
      })
      .filter((b) => b.rows.length > 0);
  }

  /** 재귀 호출 하나. ctx = 돌아왔을 때 화면을 부모 상태로 되돌리기 위한 정보 */
  function build(rowIds, features, depth, parentId, edge) {
    const id = `n${nodeSeq++}`;
    const rows = rowIds.map((r) => byId[r]);
    const counts = countLabels(rows);
    ds.nodes[id] = { id, parent: parentId, edge, depth, kind: 'pending', feature: null, label: null, counts, n: rows.length };
    if (!ds.root) ds.root = id;
    ds.stack.push({ nodeId: id, rows: rowIds.length, features: features.slice(), depth, edge });
    ds.cur = id;
    ds.rows = rowIds.slice();
    ds.groups = null;
    ds.scores = [];
    ds.best = null;
    ds.branch = null;
    ds.labelCounts = null;
    nodeVisit += 1;

    rec.frame({
      line: 1, action: 'call', phase: 0, iter: nodeVisit, ds,
      effects: [{ target: 'stack', op: 'push' }],
      narration: parentId === null
        ? `트리만들기(데이터 ${rows.length}개, 특징 ${features.length}개)를 부릅니다. 호출 스택에 첫 칸이 쌓입니다.`
        : `가지 "${edge}"로 내려가 트리만들기(데이터 ${rows.length}개, 특징 ${features.length}개, 깊이 ${depth})를 다시 부릅니다(재귀).`,
    });

    // 2: 모두 같은 레이블인가?
    ds.labelCounts = counts;
    const pure = LABEL_IDS.filter((l) => counts[l] > 0).length === 1;
    const leafAsk = depth === 1 ? {
      q: `🔮 "${edge}" 묶음(${rows.length}개)은 바로 잎 노드가 될까요?`,
      options: ['예 — 레이블이 모두 같아요', '아니요 — 섞여 있어요'],
      answer: pure ? 0 : 1,
      why: pure ? `레이블이 모두 "${rows[0].label}"이라 더 나눌 필요가 없어요.` : `${countText(counts)}로 섞여 있어서 더 나눠야 해요.`,
    } : null;
    if (pure) {
      Object.assign(ds.nodes[id], { kind: 'leaf', label: rows[0].label });
      rec.frame({
        line: 2, action: 'leaf', phase: 0, iter: nodeVisit, ds,
        effects: [{ target: 'counts', op: 'set' }, { target: 'tree', op: '잎' }],
        narration: `레이블이 모두 "${rows[0].label}"입니다. 더 나눌 필요 없이 잎 노드 "${rows[0].label}"을 만듭니다.`,
        calc: { title: '🏷 레이블 세기', rows: [countText(counts), '→ 모두 같음: 잎 노드'] },
        ask: leafAsk,
      });
      return { id, ret: 'leaf' };
    }
    rec.frame({
      line: 2, action: 'check', phase: 0, iter: nodeVisit, ds,
      effects: [{ target: 'counts', op: 'set' }],
      narration: `레이블을 세어 보니 ${countText(counts)} — 섞여 있어 더 나눠야 합니다.`,
      calc: { title: '🏷 레이블 세기 (딕셔너리)', rows: [`{ ${countText(counts).replace(/ (\d)/g, ': $1')} }`, `불순도 = ${impText(counts)}`] },
      ask: leafAsk,
    });

    // 3: 특징이 없거나 깊이 한계
    if (features.length === 0 || (v.maxDepth !== null && depth >= v.maxDepth)) {
      const label = majority(rows);
      Object.assign(ds.nodes[id], { kind: 'leaf', label, forced: true });
      rec.frame({
        line: 3, action: 'leaf', phase: 0, iter: nodeVisit, ds,
        effects: [{ target: 'tree', op: '다수결 잎' }],
        narration: features.length === 0
          ? `남은 특징이 없어 다수결로 잎 노드 "${label}"을 만듭니다.`
          : `깊이 한계(${v.maxDepth})에 닿았습니다. 섞여 있지만 다수결로 잎 노드 "${label}"을 만듭니다.`,
        calc: { title: '🗳 다수결', rows: [countText(counts), `→ 가장 많은 "${label}"`] },
      });
      return { id, ret: 'leaf' };
    }

    // 4: 특징마다 시험
    const parentImp = impurity(counts);
    ds.scores = [];
    rec.frame({
      line: 4, action: 'loop', phase: 1, iter: nodeVisit, ds,
      effects: [{ target: 'scores', op: '{ }' }],
      narration: `특징 ${features.length}개(${features.join('·')})를 하나씩 시험해 점수표에 적습니다.`,
    });
    for (const A of features) {
      const bins = splitRows(rowIds, A);
      ds.groups = { feature: A, bins };
      rec.frame({
        line: 5, action: 'split', phase: 1, iter: nodeVisit, ds,
        effects: [{ target: 'groups', op: '나누기' }],
        narration: `"${A}"의 값(${bins.map((b) => b.value).join('·')})에 따라 데이터 행을 묶음으로 나눕니다.`,
        calc: {
          title: `✂ "${A}"로 나누기`,
          rows: bins.map((b) => `${b.value}: ${b.rows.length}개 (${countText(b.counts)})`),
        },
      });
      const n = rowIds.length;
      const score = bins.reduce((s, b) => s + (b.rows.length / n) * b.imp, 0);
      ds.scores.push({ feature: A, score, gain: parentImp - score });
      rec.frame({
        line: 6, action: 'score', phase: 1, iter: nodeVisit, ds,
        effects: [{ target: 'scores', op: `[${A}]` }],
        narration: `"${A}"로 나눈 묶음들의 ${critName(v.criterion)}를 크기로 가중 평균하면 ${fmt(score, 3)}입니다.`,
        calc: {
          title: `🧮 점수["${A}"] = 가중 평균 ${critName(v.criterion)}`,
          rows: [
            ...bins.map((b) => `${b.value}: ${impText(b.counts)}`),
            `가중 평균 = ${bins.map((b) => `${b.rows.length}/${n}×${fmt(b.imp, 3)}`).join(' + ')} = ${fmt(score, 3)}`,
          ],
        },
      });
    }

    // 7: 가장 작은 점수
    const best = ds.scores.reduce((m, s) => (s.score < m.score - 1e-12 ? s : m), ds.scores[0]);
    ds.best = best.feature;
    ds.groups = { feature: best.feature, bins: splitRows(rowIds, best.feature) };
    rec.frame({
      line: 7, action: 'choose', phase: 2, iter: nodeVisit, ds,
      effects: [{ target: 'scores', op: 'min' }],
      narration: `점수가 가장 작은 "${best.feature}"(${fmt(best.score, 3)})를 고릅니다. 가장 깨끗하게 나누는 질문이에요.`,
      calc: {
        title: '🏅 best = 점수가 가장 작은 특징',
        rows: ds.scores.map((s) => `${s.feature}: ${fmt(s.score, 3)}${s.feature === best.feature ? '  ← 가장 작음' : ''}`),
      },
      ask: depth <= 1 ? {
        q: '🔮 어떤 특징이 질문으로 뽑힐까요?',
        options: ds.scores.map((s) => s.feature),
        answer: ds.scores.indexOf(best),
        why: `점수(가중 불순도)가 가장 작은 "${best.feature}"예요. 불순도는 작을수록 깨끗해요 — 큰 것을 고르면 안 돼요!`,
      } : null,
    });

    // 8: 질문 노드
    Object.assign(ds.nodes[id], { kind: 'split', feature: best.feature });
    rec.frame({
      line: 8, action: 'node', phase: 2, iter: nodeVisit, ds,
      effects: [{ target: 'tree', op: '질문 노드' }],
      narration: `트리에 "${best.feature}는?" 질문 노드를 답니다.`,
    });

    // 9: 가지마다 재귀
    const rest = features.filter((f) => f !== best.feature);
    const bins = ds.groups.bins;
    const myScores = ds.scores.slice();
    for (const bin of bins) {
      ds.branch = bin.value;
      rec.frame({
        line: 9, action: 'branch', phase: 3, iter: nodeVisit, ds,
        effects: [{ target: 'groups', op: `[${bin.value}]` }],
        narration: `"${best.feature} = ${bin.value}" 가지(${bin.rows.length}개)로 트리를 다시 만들러 갑니다.`,
      });
      const child = build(bin.rows, rest, depth + 1, id, bin.value);
      // 돌아왔다 — 스택에서 빠지고 화면은 이 노드 상태로
      ds.stack.pop();
      ds.cur = id;
      ds.rows = rowIds.slice();
      ds.groups = { feature: best.feature, bins };
      ds.scores = myScores.slice();
      ds.best = best.feature;
      ds.branch = bin.value;
      ds.labelCounts = counts;
      const childNode = ds.nodes[child.id];
      rec.frame({
        line: child.ret === 'leaf' ? (childNode.forced ? 3 : 2) : 10,
        action: 'return', phase: 3, iter: nodeVisit, ds,
        effects: [{ target: 'stack', op: 'pop' }],
        narration: childNode.kind === 'leaf'
          ? `잎 노드 "${childNode.label}"을 돌려받아 가지 "${bin.value}"에 답니다. 호출 스택에서 한 칸 빠집니다.`
          : `"${bin.value}" 쪽 하위 트리를 다 만들어 돌려받았습니다. 호출 스택에서 한 칸 빠집니다.`,
      });
    }
    ds.branch = null;
    return { id, ret: 'node' };
  }

  build(PLAY_DAYS.map((r) => r.id), PLAY_FEATURES.slice(), 0, null, null);

  // 뿌리 호출이 끝났다
  ds.stack.pop();
  ds.cur = null;
  ds.groups = null;
  ds.rows = [];
  ds.scores = [];
  ds.best = null;
  ds.labelCounts = null;
  ds.done = true;
  const leaves = Object.values(ds.nodes).filter((nd) => nd.kind === 'leaf');
  const depthMax = Math.max(...Object.values(ds.nodes).map((nd) => nd.depth));
  rec.frame({
    line: 10, action: 'result', phase: 3, iter: nodeVisit + 1, ds,
    effects: [{ target: 'stack', op: 'pop' }],
    narration: `트리 완성! 뿌리 질문 "${ds.nodes[ds.root].feature ?? '-'}", 깊이 ${depthMax}, 잎 ${leaves.length}개. 호출 스택이 비었습니다.`,
    calc: {
      title: '🌳 완성된 트리',
      rows: describe(ds.nodes, ds.root),
    },
  });

  return {
    frames: rec.frames,
    data: { rows: PLAY_DAYS, features: PLAY_FEATURES, values: PLAY_VALUES },
    result: { nodes: ds.nodes, root: ds.root, depth: depthMax, leaves: leaves.length },
    params: variantOf(params),
  };
}

/** 트리를 "만약 … 이면 …" 문장 목록으로 */
export function describe(nodes, rootId) {
  const out = [];
  const kids = (id) => Object.values(nodes).filter((n) => n.parent === id);
  function walk(id, conds) {
    const nd = nodes[id];
    if (nd.kind === 'leaf') {
      out.push(`${conds.length ? conds.join(' 그리고 ') : '항상'} → ${nd.label}`);
      return;
    }
    for (const c of kids(id)) walk(c.id, [...conds, `${nd.feature}=${c.edge}`]);
  }
  walk(rootId, []);
  return out;
}

/** 완성된 트리로 새 날을 분류 — 지나간 노드 경로도 함께. (써 보기용) */
export function classify(nodes, rootId, sample) {
  const path = [rootId];
  let nd = nodes[rootId];
  while (nd && nd.kind === 'split') {
    const next = Object.values(nodes).find((c) => c.parent === nd.id && c.edge === sample[nd.feature]);
    if (!next) break;
    path.push(next.id);
    nd = next;
  }
  return { label: nd?.label ?? null, path };
}
