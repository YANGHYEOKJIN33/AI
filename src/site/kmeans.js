/**
 * 🎯 k-평균 탭 — 사이트 틀(v4)의 쪽 10개. (PLAN-v4 4장, 장면 구성안 2차시)
 * 숫자는 모두 엔진(core/algorithms/kmeans.js)의 실행 기록에서 가져온다.
 */
import { el } from '../ui/dom.js';
import { createPlot } from '../ui/plot.js';
import { ALGORITHMS } from '../core/algorithms/index.js';
import { HOUSES, HOUSE_AXES } from '../core/datasets.js';
import { fmt } from '../core/math.js';
import { josa } from '../core/josa.js';
import { dsBox, calcLines, plotBox } from '../deck/parts.js';
import { page, hide, lines, arrowRight, big, wrapPage, practicePages, codeOf, lessonFromTab } from './common.js';

const algo = ALGORITHMS.kmeans;
const run = algo.run(algo.defaults);
const H = run.result.history;                 // [{ iter, start, assign, next, changed, converged }]
const byId = Object.fromEntries(HOUSES.map((h) => [h.id, h]));
const NAME = ['A', 'B', 'C'];
const CLS = ['c1', 'c2', 'c3'];
const MARK = ['●', '▲', '■'];
const d2 = (p, c) => (p.x - c.x) ** 2 + (p.y - c.y) ** 2;
const pt = (c) => `(${fmt(c.x)}, ${fmt(c.y)})`;
const clustersOf = (round) => [0, 1].map((c) => HOUSES.filter((h) => H[round].assign[h.id] === c).map((h) => h.id));
const nearest = (h, cents) => { const ds = cents.map((c) => d2(h, c)); return { ds, c: ds.indexOf(Math.min(...ds)) }; };
const startP14 = algo.run({ start: 'p14' }).result.history;
export const CODE = codeOf(algo.pseudo(run.params));

/* ───────────── 부품 ───────────── */
const chip = (id, c = null, { cur = false, moved = false } = {}) => el(`span.hchip${c === null ? '' : `.${CLS[c]}`}${cur ? '.cur' : ''}${moved ? '.moved' : ''}`, { 'data-flip': `h-${id}` },
  c === null ? '' : `${MARK[c]} `, byId[id].name, el('small', {}, ` (${byId[id].x},${byId[id].y})`));
/** 대기 줄 + 묶음 리스트 두 개 */
function poolAndClusters(pool, clusters, { cur = null, moved = [], hot = false, poolHidden = false, clHidden = false } = {}) {
  return el('div.col', { style: 'gap:12px; width:100%;' },
    hide(dsBox({ name: '대기 줄', kind: `리스트 · ${pool.length}개`, dense: true },
      el('div.hrow', {}, pool.length ? pool.map((id) => chip(id, null, { cur: id === cur })) : el('span.small', {}, '비어 있음 — 모두 묶음에 들어갔어요'))), !poolHidden),
    hide(dsBox({ name: '묶음', kind: '리스트 2개', hot, dense: true },
      el('div.bins2', {}, clusters.map((ids, c) => el(`div.bin2.${CLS[c]}`, {},
        el('div.binhead', {}, `${MARK[c]} 묶음 ${NAME[c]}`, el('span', {}, `${ids.length}개`)),
        el('div.hrow', {}, ids.map((id) => chip(id, c, { cur: id === cur, moved: moved.includes(id) }))))))), !clHidden));
}
/** 중심 리스트 (이름, 좌표). prev를 주면 이전 값에 줄을 긋는다 */
function centBox(name, cents, { prev = null, hot = false, hidden = false, empty = false } = {}) {
  return hide(dsBox({ name, kind: `리스트 · ${cents.length}칸`, hot, dense: true },
    [0, 1].map((c) => el(`div.kv${hot && (!prev || pt(prev[c]) !== pt(cents[c])) && cents[c] ? '.cur' : ''}`, { style: 'font-size:30px; padding:6px 18px;' },
      el(`span.${CLS[c]}`, {}, `◆ ${NAME[c]}`), el('span', {}, ':'),
      el('span.val', { style: 'font-size:32px' }, cents[c] ? [prev && pt(prev[c]) !== pt(cents[c]) ? [el('span.old', { style: 'font-size:26px' }, pt(prev[c])), ' → '] : null, pt(cents[c])] : (empty ? '?' : ''))))), !hidden);
}
const twoBoxes = (a, b) => el('div.row', { style: 'gap:14px; align-items:center;' }, a, arrowRight(), b);

/** 마을 지도 — 집 색은 묶음, ◆는 중심 */
function map() {
  let plot = null;
  return ({ assign = {}, cents = [], only = null, prevCents = null } = {}) => {
    plot ??= createPlot({ x: [HOUSE_AXES.min, HOUSE_AXES.max], y: [HOUSE_AXES.min, HOUSE_AXES.max], width: 320, height: 296, xLabel: `${HOUSE_AXES.x} →`, yLabel: `${HOUSE_AXES.y} →`, ariaLabel: '마을 지도' });
    const shapes = [];
    cents.forEach((c, i) => { if (prevCents && pt(prevCents[i]) !== pt(c)) shapes.push({ key: `tr-${i}`, kind: 'line', x1: prevCents[i].x, y1: prevCents[i].y, x2: c.x, y2: c.y, cls: 'dline is-cur' }); });
    HOUSES.filter((h) => !only || only.includes(h.id)).forEach((h) => {
      const c = assign[h.id];
      shapes.push({ key: `p-${h.id}`, kind: 'point', x: h.x, y: h.y, shape: c === undefined ? 'circle' : ['circle', 'triangle'][c], size: 6.5, cls: c === undefined ? 'unassigned' : `cat-${c + 1}`, label: h.name, labelBelow: true });
    });
    cents.forEach((c, i) => shapes.push({ key: `c-${i}`, kind: 'point', x: c.x, y: c.y, shape: 'diamond', size: 8, cls: `centroid cat-${i + 1}`, label: NAME[i] }));
    plot.update(shapes);
    return plotBox(plot, 600);
  };
}
const assignAt = (round, upTo = 6) => Object.fromEntries(HOUSES.slice(0, upTo).map((h) => [h.id, H[round].assign[h.id]]));

/** 집 하나를 나누는 계산 (왼쪽 칸) */
const nearCalc = (h, cents) => () => { const { ds, c } = nearest(h, cents);
  return calcLines([`${h.name} (${h.x}, ${h.y})`, ...cents.map((ct, i) => `◆${NAME[i]} ${pt(ct)}: d² = ${fmt(ds[i])}${i === c ? '  ← 가까움' : ''}`)], 3, { small: true }); };

/* ───────────── 확인 문제 ───────────── */
const r1 = clustersOf(0); const rounds = H.length;
const movedIds = H[1].changed;
const names = (ids) => ids.map((id) => byId[id].name).join(' · ');
export const checks = [
  { q: '1회차 나누기가 끝났을 때 묶음 A에 들어 있는 집은?', opts: [names(r1[1]), names(r1[0]), names(HOUSES.slice(3).map((h) => h.id)), names(['p0', 'p3'])], answer: 1,
    why: `중심 A ${pt(H[0].start[0])}, B ${pt(H[0].start[1])}에서 d²을 비교하면 A = ${names(r1[0])}, B = ${names(r1[1])}.` },
  { q: '몇 회차에 "새 중심 = 중심"이 되어 멈추는가?', opts: ['1회차', '2회차', `${rounds}회차`, '4회차'], answer: 2,
    why: `${rounds}회차에 묶음이 그대로라 새 중심이 지금 중심과 같다 → 멈춘다.` },
  { q: '2회차에 1회차와 다른 묶음으로 옮겨 가는 집은?', opts: ['집1', '집2', '집4', '옮기는 집 없음'].map((x) => x), answer: ['집1', '집2', '집4', '옮기는 집 없음'].indexOf(names(movedIds)),
    why: `중심이 A ${pt(H[1].start[0])}, B ${pt(H[1].start[1])}로 옮겨 가서 ${josa(names(movedIds), '은')} B가 더 가까워졌다.` },
];

/* ───────────── 쪽 ───────────── */
const P = [];
const S0 = H[0].start; const N0 = H[0].next; const S1 = H[1].start; const N1 = H[1].next;

// 1 문제와 목표
{
  const fig = map();
  const left = (n) => () => lines([el('div.label', {}, '오늘의 질문'), el('h2', { style: 'font-size:42px' }, '집 6채에 배달 거점 2곳을 어디에 둘까?'),
    big(['① 정답 없이 ', el('b', {}, '가까운 것끼리 묶는'), ' 군집을 설명할 수 있다.']), big(['② ', el('b', {}, '묶음 리스트'), '와 ', el('b', {}, '중심'), '이 회차마다 어떻게 바뀌는지 따라갈 수 있다.'])], n);
  P.push(page({ id: 'goal', title: '문제와 목표', sentence: '정답(레이블)이 없는 집들을 두 무리로 나눠요.', code: null, leftTitle: '오늘의 수업', min: 4 }, (s) => {
    s({ left: left(2), right: () => fig({}), note: { say: 'k-NN은 레이블(정답)이 있었습니다. 오늘 데이터에는 레이블이 없습니다. 가까운 집끼리 묶어 배달 거점을 정합니다.', ask: '지도를 보고 두 무리로 나눠 보세요.', expect: '왼쪽 아래 셋, 오른쪽 위 셋.' } });
    s({ left: left(3) }); s({ left: left(4) });
    s({ cap: ['정답 없이 데이터의 모양만으로 묶는다 = ', el('b', {}, '군집'), ' (비지도학습)'], capLabel: '개념' });
  }));
}

// 2 개념: 평균과 중심
{
  const fig = map();
  const g = ['p3', 'p4', 'p5'].map((id) => byId[id]); const g2 = ['p0', 'p1', 'p2'].map((id) => byId[id]);
  const mean = (arr) => ({ x: arr.reduce((t, h) => t + h.x, 0) / arr.length, y: arr.reduce((t, h) => t + h.y, 0) / arr.length });
  const m = mean(g); const m2 = mean(g2);
  const left = (n) => () => el('div.col', { style: 'gap:18px;' }, el('h2', { style: 'font-size:38px' }, '중심 = 묶음의 한가운데 = 평균'),
    calcLines([`${g.map((h) => h.name).join(' · ')}`, `x = (${g.map((h) => h.x).join(' + ')}) / 3 = ${fmt(m.x)}`, `y = (${g.map((h) => h.y).join(' + ')}) / 3 = ${fmt(m.y)}`, `중심 = ${pt(m)}`], n, { small: true }));
  P.push(page({ id: 'idea', title: '평균과 중심', sentence: 'x끼리, y끼리 평균을 내면 묶음의 중심이에요.', code: null, leftTitle: '개념', min: 7 }, (s) => {
    s({ left: left(1), right: () => fig({ only: g.map((h) => h.id), assign: Object.fromEntries(g.map((h) => [h.id, 0])) }), note: { say: '세 집의 한가운데를 구합니다. x끼리 더해 나누고, y끼리 더해 나눕니다.', ask: 'x의 평균은?', expect: fmt(m.x) } });
    s({ left: left(2) }); s({ left: left(3) }); s({ left: left(4) });
    s({ right: () => fig({ only: g.map((h) => h.id), assign: Object.fromEntries(g.map((h) => [h.id, 0])), cents: [m] }), cap: ['◆ 중심 ', el('b', {}, pt(m)), ' — 세 집의 한가운데'] });
    s({ ask: `✏️ 활동지 ①번 — ${g2.map((h) => h.name).join(' · ')}의 중심은? (1분)`, timer: 60, note: { say: '활동지 ①번입니다.', ask: '—', expect: pt(m2) } });
    s({ cap: [`x = (${g2.map((h) => h.x).join(' + ')}) / 3 = ${fmt(m2.x)},  y = (${g2.map((h) => h.y).join(' + ')}) / 3 = ${fmt(m2.y)} → `, el('b', {}, pt(m2))], capLabel: '답' });
    s({ left: () => lines([el('h2', { style: 'font-size:38px' }, 'k-평균 — 다섯 단계'), big('① 시작 중심 k개를 정한다'), big('② 집마다 가장 가까운 중심의 묶음에 넣는다'), big('③ 묶음마다 평균 = 새 중심'), big('④ 새 중심 = 중심이면 멈춘다'), big('⑤ 아니면 중심을 바꾸고 ②로')], 6),
      note: { say: '오늘 따라갈 길입니다. k-평균의 k는 묶음 수입니다(k-NN의 k는 이웃 수).', ask: 'k-평균의 k와 k-NN의 k는 같은 뜻인가요?', expect: '아니다. 묶음 수 / 이웃 수.', watch: '두 k를 같은 것으로 안다.' } });
  }));
}

// 3 ① 묶음에 나누기 (1회차)
{
  const fig = map();
  const order = HOUSES.map((h) => h.id);
  const right = (k, o = {}) => () => poolAndClusters(order.slice(k), [0, 1].map((c) => order.slice(0, k).filter((id) => H[0].assign[id] === c)), o);
  P.push(page({ id: 'assign', title: '① 묶음에 나누기', sentence: '집마다 d²이 가장 작은 중심의 묶음에 넣어요.', code: [1, 6], min: 12 }, (s) => {
    s({ right: right(0, { clHidden: true }), plot: () => fig({}), note: { say: '의사코드 1~6줄입니다. 4~6줄은 집마다 되풀이합니다.', ask: '—', expect: '—' } });
    s({ on: 1, left: () => calcLines([`중심 ◆A = 집1 ${pt(S0[0])}`, `중심 ◆B = 집2 ${pt(S0[1])}`], 2, { small: true }), note: { say: '시작 중심은 집1과 집2 자리로 정했습니다.', ask: '—', expect: '—' } });
    s({ plot: () => fig({ cents: S0 }), cap: ['시작 중심 ◆A ', el('b', {}, pt(S0[0])), ' · ◆B ', el('b', {}, pt(S0[1]))] });
    s({ on: 3 });
    s({ right: right(0, { hot: true }), cap: ['빈 묶음 ', el('b', {}, 'A · B'), '가 생겼다'] });
    const slow = (i, note) => {
      const h = HOUSES[i]; const { c } = nearest(h, S0);
      s({ on: 5, left: nearCalc(h, S0), note });
      s({ on: 6, right: right(i, { cur: h.id }) });
      s({ right: right(i + 1, { cur: h.id, hot: true }), plot: () => fig({ assign: assignAt(0, i + 1), cents: S0 }), cap: [`${josa(h.name, '이')} 대기 줄 → `, el('b', {}, `묶음 ${NAME[c]}`), ' (맨 뒤에)'] });
    };
    slow(0, { say: '집1에서 두 중심까지 d²을 잽니다. 더 작은 쪽의 묶음에 넣습니다.', ask: '집1은 어느 중심이 가까운가요?', expect: 'A (d² = 0).' });
    slow(1, { say: '집2도 같은 일을 합니다.', ask: '—', expect: 'B.' });
    s({ ask: `✋ 집3 ${'(' + HOUSES[2].x + ', ' + HOUSES[2].y + ')'}은 어느 묶음에 들어갈까요?`, note: { say: '두 d²을 먼저 계산해 보게 합니다.', ask: 'A까지, B까지 d²은?', expect: nearest(HOUSES[2], S0).ds.join(', ') } });
    slow(2, { say: '더 작은 d²의 묶음입니다.', ask: '—', expect: `묶음 ${NAME[nearest(HOUSES[2], S0).c]}.` });
    s({ on: 4, left: null, ask: '✏️ 활동지 ②번 — 집4 · 집5 · 집6은 어느 묶음일까요? (2분)', timer: 120, note: { say: '각자 d²을 비교합니다.', ask: '—', expect: HOUSES.slice(3).map((h) => `${h.name} ${NAME[nearest(h, S0).c]}`).join(', ') } });
    for (let i = 3; i < 6; i += 1) {
      const h = HOUSES[i]; const { ds, c } = nearest(h, S0);
      s({ right: right(i + 1, { cur: h.id, hot: true }), plot: () => fig({ assign: assignAt(0, i + 1), cents: S0 }), cap: [`${h.name}: A ${fmt(ds[0])} · B ${fmt(ds[1])} → `, el('b', {}, `묶음 ${NAME[c]}`)] });
    }
    s({ ask: '✋ 지도로 보면 이상한 집이 있나요?', plot: () => fig({ assign: assignAt(0), cents: S0 }), note: { say: '그림 단추를 눌러 지도로 봅니다. 집1이 오른쪽 위 집들과 한 묶음입니다.', ask: '이상한 집이 있나요?', expect: '집1 — 시작 중심이 집1 자리라서 묶음 A에 들어갔다.' } });
  }));
}

// 4 ② 새 중심
{
  const fig = map();
  const left = (n) => () => calcLines([0, 1].map((c) => { const ids = r1[c]; const hs = ids.map((id) => byId[id]);
    return `${NAME[c]}: x = (${hs.map((h) => h.x).join('+')})/${hs.length} = ${fmt(N0[c].x)},  y = (${hs.map((h) => h.y).join('+')})/${hs.length} = ${fmt(N0[c].y)}`; }), n, { small: true });
  const right = (n) => () => twoBoxes(poolAndClusters([], r1, { poolHidden: true }), centBox('새 중심', [N0[0], n >= 2 ? N0[1] : null].slice(0, 2).map((c, i) => (i < n ? c : null)), { hot: n > 0, empty: true }));
  P.push(page({ id: 'mean', title: '② 새 중심 구하기', sentence: '묶음마다 x끼리, y끼리 평균을 내요.', code: [7, 7], min: 5 }, (s) => {
    s({ right: right(0), plot: () => fig({ assign: assignAt(0), cents: S0 }), note: { say: '나눈 묶음마다 평균을 냅니다. 이것이 새 중심입니다.', ask: '—', expect: '—' } });
    s({ on: 7 });
    s({ left: left(1) });
    s({ right: right(1), cap: ['새 중심 A = ', el('b', {}, pt(N0[0]))] });
    s({ left: left(2) });
    s({ right: right(2), plot: () => fig({ assign: assignAt(0), cents: N0, prevCents: S0 }), cap: ['새 중심 B = ', el('b', {}, pt(N0[1]))], note: { say: '그림 단추를 누르면 중심이 묶음의 한가운데로 옮겨 간 모습이 보입니다.', ask: '—', expect: '—' } });
  }));
}

// 5 ③ 비교하고 바꾸기
{
  const fig = map();
  const right = (replaced) => () => twoBoxes(centBox('새 중심', N0), centBox('중심', replaced ? N0 : S0, { prev: replaced ? S0 : null, hot: replaced }));
  P.push(page({ id: 'update', title: '③ 비교하고 바꾸기', sentence: '새 중심이 지금 중심과 다르면 바꾸고 다시 나눠요.', code: [8, 9], min: 4 }, (s) => {
    s({ right: right(false), plot: () => fig({ assign: assignAt(0), cents: S0 }), ask: '✋ 새 중심과 지금 중심이 같나요?', note: { say: '두 리스트를 칸끼리 비교합니다.', ask: '같나요?', expect: '다르다 → 멈추지 않는다.' } });
    s({ on: 8, left: () => calcLines([0, 1].map((c) => `${NAME[c]}: ${pt(S0[c])} → ${pt(N0[c])}  다름`), 2, { small: true }) });
    s({ on: 9, cap: ['다르다 → 멈추지 않고 중심을 바꾼다'], capLabel: '판단' });
    s({ right: right(true), plot: () => fig({ assign: assignAt(0), cents: N0, prevCents: S0 }), cap: ['중심 A ', el('span.old', {}, pt(S0[0])), ' → ', el('b', {}, pt(N0[0])), ' · B ', el('span.old', {}, pt(S0[1])), ' → ', el('b', {}, pt(N0[1]))],
      note: { say: '중심 리스트의 값을 새 중심으로 바꿉니다. 그리고 2줄로 돌아가 다시 나눕니다.', ask: '중심이 움직였습니다. 옮겨 갈 집이 있을까요?', expect: '집1 (다음 쪽에서 확인).' } });
  }));
}

// 6 2회차
{
  const fig = map();
  const order = HOUSES.map((h) => h.id);
  const right = (k, o = {}) => () => poolAndClusters(order.slice(k), [0, 1].map((c) => order.slice(0, k).filter((id) => H[1].assign[id] === c)), { moved: movedIds, ...o });
  const h1 = HOUSES[0]; const n1 = nearest(h1, S1);
  P.push(page({ id: 'round2', title: '2회차', sentence: '묶음을 비우고, 옮긴 중심으로 다시 나눠요.', code: [3, 9], min: 6 }, (s) => {
    s({ right: () => poolAndClusters([], r1), plot: () => fig({ assign: assignAt(0), cents: S1 }), note: { say: '2회차입니다. 묶음을 빈 리스트로 새로 만듭니다.', ask: '지난 묶음은 어떻게 되나요?', expect: '모든 집이 대기 줄로 돌아간다.', watch: '지난 묶음에 그대로 남는다.' } });
    s({ on: 3 });
    s({ right: right(0, { hot: true }), cap: ['여섯 집이 모두 대기 줄로 — 처음부터 다시 나눈다'] });
    s({ on: 5, left: nearCalc(h1, S1), note: { say: `중심이 옮겨 갔으므로 집1에서 다시 잽니다. 이번에는 B가 더 가깝습니다(${fmt(n1.ds[0])} > ${fmt(n1.ds[1])}).`, ask: '집1은 어느 묶음으로?', expect: `B (d² ${fmt(n1.ds[1])}).` } });
    s({ right: right(1, { cur: h1.id, hot: true }), plot: () => fig({ assign: assignAt(1, 1), cents: S1 }), cap: ['집1 → ', el('b', {}, `묶음 ${NAME[n1.c]}`), ` — 1회차의 A에서 옮겨 왔다 (점선)`] });
    for (let i = 1; i < 6; i += 1) {
      const h = HOUSES[i]; const { ds, c } = nearest(h, S1);
      s({ right: right(i + 1, { cur: h.id, hot: true }), plot: () => fig({ assign: assignAt(1, i + 1), cents: S1 }), cap: [`${h.name}: A ${fmt(ds[0])} · B ${fmt(ds[1])} → `, el('b', {}, `묶음 ${NAME[c]}`)] });
    }
    s({ on: 7, left: () => calcLines([0, 1].map((c) => `새 중심 ${NAME[c]} = ${pt(N1[c])}`), 2, { small: true }) });
    s({ right: () => twoBoxes(centBox('새 중심', N1), centBox('중심', N1, { prev: S1, hot: true })), plot: () => fig({ assign: assignAt(1), cents: N1, prevCents: S1 }),
      cap: ['다르다 → 중심 A ', el('span.old', {}, pt(S1[0])), ' → ', el('b', {}, pt(N1[0])), ' · B ', el('span.old', {}, pt(S1[1])), ' → ', el('b', {}, pt(N1[1]))] });
  }));
}

// 7 수렴과 회차별 표
{
  const grp = (r, c) => `집${HOUSES.filter((h) => r.assign[h.id] === c).map((h) => h.name.slice(1)).join('·')}`;
  const roundRow = (r) => el('tr', {}, el('td', {}, `${r.iter}`), el('td.num', {}, `${pt(r.start[0])} ${pt(r.start[1])}`),
    el('td', {}, grp(r, 0)), el('td', {}, grp(r, 1)), el('td', {}, r.converged ? '같다 → 멈춤' : '다르다'));
  const table = (hist, n, title) => () => dsBox({ name: title, kind: '회차별 추적표', dense: true },
    el('table.big', { style: 'font-size:24px; width:100%;' }, el('tr', {}, ['회차', '시작 중심 A · B', '묶음 A', '묶음 B', '새 = 지금?'].map((t) => el('th', {}, t))), hist.slice(0, n).map(roundRow)));
  P.push(page({ id: 'converge', title: '수렴과 회차별 표', sentence: '묶음이 그대로면 새 중심도 그대로 — 멈춰요.', code: [8, 8], min: 6 }, (s) => {
    s({ right: table(H, 2, '시작 = 집1 · 집2'), ask: '✏️ 활동지 ③번 — 3회차에 묶음이 바뀔까요? (1분)', timer: 60, note: { say: '중심 A (6, 7), B (2, 3)으로 다시 나누면 어떻게 될지 예상합니다.', ask: '—', expect: '바뀌지 않는다.' } });
    s({ right: table(H, 3, '시작 = 집1 · 집2'), cap: [`${rounds}회차: 묶음이 그대로 → 새 중심 = 중심`] });
    s({ on: 8, left: () => calcLines([`새 중심 ${pt(H[rounds - 1].next[0])} ${pt(H[rounds - 1].next[1])}`, `= 중심 ${pt(H[rounds - 1].start[0])} ${pt(H[rounds - 1].start[1])}`, '→ 멈춘다 (수렴)'], 3, { small: true }),
      note: { say: '묶음이 그대로면 평균도 그대로입니다. 더 돌려도 바뀔 것이 없으니 멈춥니다. 이것을 수렴이라고 합니다.', ask: '왜 더 돌려도 소용없나요?', expect: '같은 묶음 → 같은 평균 → 같은 중심.' } });
    s({ right: table(startP14, startP14.length, '시작 = 집1 · 집4'), cap: ['시작 중심을 바꾸면 ', el('b', {}, `${startP14.length}회차`), '에 멈춘다 — 최종 묶음은 같다'],
      note: { say: '시작 중심이 달라지면 회차 수가 달라집니다. 이 예제는 최종 묶음이 같지만, 데이터에 따라 결과가 달라지기도 합니다(지역 최적).', ask: '시작 중심은 결과에 영향을 줄까요?', expect: '회차 수가 달라지고, 데이터에 따라 결과도 달라질 수 있다.' } });
  }));
}

// 8 정리 · 확인 문제
P.push(wrapPage({
  points: [['집마다 가장 가까운 중심의 ', el('b', {}, '묶음 리스트 맨 뒤에'), ' 넣는다.'], ['묶음마다 ', el('b', {}, '평균'), '을 내면 새 중심 — 다르면 중심을 바꾸고 다시 나눈다.'], ['새 중심 = 중심이면 ', el('b', {}, '멈춘다'), '(수렴). 회차마다 묶음은 비우고 다시 시작한다.']],
  next: '다음 시간: 레이블이 아니라 수(점수)를 맞히려면?',
  flow: ['대기 줄', '묶음 A · B (넣기)', '평균', '새 중심', '중심 (바꾸기)', '반복 · 수렴'], checks,
  note: { say: '오늘 데이터가 지나간 상자를 순서대로 다시 짚습니다.', ask: '묶음을 비우지 않고 다시 나누면 어떻게 될까요?', expect: '집이 두 묶음에 겹쳐 들어간다.' },
}));
P.push(...practicePages('kmeans'));

export const tab = { id: 'kmeans', name: 'k-평균', emoji: '🎯', full: 'k-평균 군집', code: CODE, pages: P, checks };

/* ───────────── 활동지 · 정답지 (교사용 자료에서 인쇄) ───────────── */
const blank = (answer) => ({ blank: true, answer: String(answer) });
const g123 = HOUSES.slice(0, 3);
const mean123 = { x: g123.reduce((t, h) => t + h.x, 0) / 3, y: g123.reduce((t, h) => t + h.y, 0) / 3 };
const grpText = (r, c) => names(HOUSES.filter((h) => r.assign[h.id] === c).map((h) => h.id));
export const lesson = lessonFromTab(tab, {
  badge: '2차시', title: 'k-평균 군집',
  goals: ['정답 없이 가까운 것끼리 묶는 군집을 설명할 수 있다.', '묶음 리스트와 중심이 회차마다 어떻게 바뀌는지 따라갈 수 있다.'],
  materials: ['사이트 🎯 k-평균 탭', '활동지(학생 수만큼 인쇄)', '정답지 · 수업 대본(교사용)'],
  sheet: {
    title: '집 6채에 배달 거점 2곳을 어디에 둘까?',
    sections: [
      { title: `① 평균 — ${g123.map((h) => `${h.name}(${h.x}, ${h.y})`).join(' · ')}의 중심`, head: ['x의 평균', 'y의 평균', '중심'],
        rows: [[blank(fmt(mean123.x)), blank(fmt(mean123.y)), blank(pt(mean123))]] },
      { title: `② 1회차 나누기 — 시작 중심 A ${pt(S0[0])}, B ${pt(S0[1])}`, hint: '집1 ~ 집3은 수업 화면과 함께 · 활동 ②: 집4 ~ 집6',
        head: ['집', '(x, y)', 'A까지 d²', 'B까지 d²', '묶음'],
        rows: HOUSES.map((h, i) => { const { ds, c } = nearest(h, S0); const given = i < 3;
          return [h.name, `(${h.x}, ${h.y})`, given ? fmt(ds[0]) : blank(fmt(ds[0])), given ? fmt(ds[1]) : blank(fmt(ds[1])), given ? NAME[c] : blank(NAME[c])]; }) },
      { title: '③ 회차별 추적표', hint: '1 · 2회차는 수업 화면과 함께 · 활동 ③: 3회차',
        head: ['회차', '중심 A', '중심 B', '묶음 A', '묶음 B', '새 중심 A', '새 중심 B', '새 = 지금?'],
        rows: H.map((r) => [`${r.iter}`, blank(pt(r.start[0])), blank(pt(r.start[1])), blank(grpText(r, 0)), blank(grpText(r, 1)), blank(pt(r.next[0])), blank(pt(r.next[1])), blank(r.converged ? '같다' : '다르다')]) },
      { title: '④ 한 문장으로 — 3회차에 멈추는 까닭은?', lines: 2, answer: '묶음이 2회차와 같아서 평균(새 중심)도 지금 중심과 같다 → 더 바뀔 것이 없어 멈춘다(수렴).' },
      { title: '⑤ 확인 문제 답', answers: checks.map((c, i) => ({ label: `${i + 1}번`, answer: '①②③④'[c.answer] })) },
    ],
  },
});
