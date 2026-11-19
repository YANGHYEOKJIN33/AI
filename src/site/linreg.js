/**
 * 📈 선형회귀 탭 — 사이트 틀(v4)의 쪽 15개 (1부 직선 · 예측 · 오차 · 손실 / 2부 기울기 · 갱신 · 반복).
 * (PLAN-v4 4장, 장면 구성안 3 · 4차시) 숫자는 모두 엔진(core/algorithms/linreg.js)의 실행 기록에서 가져온다.
 */
import { el } from '../ui/dom.js';
import { createPlot } from '../ui/plot.js';
import { ALGORITHMS } from '../core/algorithms/index.js';
import { STUDY } from '../core/datasets.js';
import { fmt } from '../core/math.js';
import { dsBox, calcLines, plotBox } from '../deck/parts.js';
import { page, hide, lines, big, wrapPage, practicePages, codeOf, lessonFromTab } from './common.js';

const algo = ALGORITHMS.linreg;
const LR = 0.05;
const run = algo.run({ lr: LR });
const F = run.frames;
const { X, Y } = STUDY;
const n = X.length;
const at = (iter, action) => F.find((f) => f.iter === iter && f.action === action).ds;
const e1 = { pred: at(1, 'predict'), err: at(1, 'error'), loss: at(1, 'loss'), grad: at(1, 'gradient'), upd: at(1, 'update') };
const e2 = { loss: at(2, 'loss'), upd: at(2, 'update') };
const W1 = e1.upd.w; const B1 = e1.upd.b;
const histOf = (lr) => algo.run({ lr }).result.history;
const lossAt = (w, b = 0) => X.reduce((t, x, i) => t + (w * x + b - Y[i]) ** 2, 0) / n;
const sum = (a) => a.reduce((t, v) => t + v, 0);
export const CODE = codeOf(algo.pseudo({ lr: LR }));

/* ───────────── 부품 ───────────── */
/** 데이터 표: x · y + 고른 열. fill = { 열 이름: 채운 줄 수 } */
const COLS = { pred: ['예측', (i, d) => d.pred?.[i]], err: ['오차', (i, d) => d.err?.[i]], sq: ['오차²', (i, d) => d.sq?.[i]], ex: ['오차 × x', (i, d) => d.ex?.[i]] };
function table(cols, ds, fill = {}, { hot = null, foot = {} } = {}) {
  return dsBox({ name: '데이터', kind: '열 하나 = 리스트 하나', dense: true },
    el('table.big', { style: 'font-size:28px;' },
      el('tr', {}, el('th', {}, 'x 공부 시간'), el('th', {}, 'y 점수'), cols.map((c) => el(`th${c === hot ? '.colhl' : ''}`, {}, COLS[c][0]))),
      X.map((x, i) => el('tr', {}, el('td.num', {}, String(x)), el('td.num', {}, String(Y[i])),
        cols.map((c) => { const shown = i < (fill[c] ?? n); const v = COLS[c][1](i, ds);
          return el(`td.num${c === hot && i === (fill[c] ?? n) - 1 ? '.colhl' : ''}`, { 'data-flip': shown ? `${c}-${i}` : null }, shown && v !== null && v !== undefined ? fmt(v) : ''); }))),
      Object.keys(foot).length ? el('tr', {}, el('td', { colspan: '2', style: 'font-weight:700' }, '합 / 평균'), cols.map((c) => el('td.num', { style: 'font-weight:700' }, foot[c] ?? ''))) : null));
}
/** 변수 상자: [{ name, val, prev, hot }] */
const varBox = (vars, { hidden = false } = {}) => hide(dsBox({ name: '변수', kind: '값 하나씩', dense: true, width: 320 },
  vars.map((v) => el(`div.kv${v.hot ? '.cur' : ''}`, { style: 'font-size:30px; padding:6px 18px;' }, el('code', {}, v.name), el('span', {}, '='),
    el('span.val', { style: 'font-size:32px' }, v.prev !== undefined && v.prev !== null ? [el('span.old', { style: 'font-size:26px' }, v.prev), ' → '] : null, v.val)))), !hidden);
const side = (a, b) => el('div.row', { style: 'gap:18px; align-items:center;' }, a, b);

/** 산점도 + 직선(+ 이전 직선 점선, 오차 막대) */
function scatter() {
  let plot = null;
  return ({ w = 0, b = 0, prev = null, bars = false, preds = false, only = null, line = true } = {}) => {
    plot ??= createPlot({ x: [0, 6], y: [0, 10], width: 320, height: 296, clip: true, xLabel: '공부 시간 →', yLabel: '점수 →', ariaLabel: '공부 시간과 점수' });
    const shapes = [];
    if (prev) shapes.push({ key: 'prev', kind: 'line', x1: 0, y1: prev.b, x2: 6, y2: prev.w * 6 + prev.b, cls: 'dline' });
    if (line) shapes.push({ key: 'fit', kind: 'line', x1: 0, y1: b, x2: 6, y2: w * 6 + b, cls: 'fitline' });
    X.forEach((x, i) => {
      if (only !== null && !only.includes(i)) return;
      const p = w * x + b;
      if (bars) shapes.push({ key: `r${i}`, kind: 'line', x1: x, y1: Y[i], x2: x, y2: p, cls: `residual${p - Y[i] > 0 ? ' is-pos' : ''}` });
      if (bars) shapes.push({ key: `rt${i}`, kind: 'text', x, y: (Y[i] + p) / 2, dx: 22, dy: 4, text: fmt(p - Y[i], 1), cls: 'residual-text' });
      if (preds) shapes.push({ key: `pp${i}`, kind: 'point', x, y: p, shape: 'circle', size: 4, cls: 'ghost cat-3' });
      shapes.push({ key: `pt${i}`, kind: 'point', x, y: Y[i], shape: 'circle', size: 6.5, cls: 'cat-2', label: `(${x}, ${Y[i]})` });
    });
    shapes.push({ key: 'eq', kind: 'text', x: 0.3, y: 9.3, anchor: 'start', text: line ? `y = ${fmt(w)}x + ${fmt(b)}` : '', cls: 'eq' });
    plot.update(shapes);
    return plotBox(plot, 600);
  };
}
/** 손실 골짜기 — w에 따른 손실 (b = 0) */
function valley() {
  let plot = null;
  return ({ pts = [], curve = false, tangent = null, ball = null } = {}) => {
    plot ??= createPlot({ x: [0, 3.5], y: [0, 40], width: 320, height: 296, tick: 0.5, ytick: 10, clip: false, xLabel: 'w →', yLabel: '손실 →', ariaLabel: '손실 골짜기' });
    const shapes = [];
    if (curve) shapes.push({ key: 'curve', kind: 'path', points: Array.from({ length: 71 }, (_, i) => [i * 0.05, lossAt(i * 0.05)]), cls: 'lossline' });
    if (tangent !== null) { const w = tangent; const g = (2 / n) * X.reduce((t, x, i) => t + (w * x - Y[i]) * x, 0);
      shapes.push({ key: 'tan', kind: 'line', x1: w - 0.45, y1: lossAt(w) - 0.45 * g, x2: w + 0.45, y2: lossAt(w) + 0.45 * g, cls: 'dline is-cur' }); }
    pts.forEach((w) => { shapes.push({ key: `v${w}`, kind: 'point', x: w, y: lossAt(w), shape: 'circle', size: 6, cls: 'cat-1', label: '' });
      shapes.push({ key: `vt${w}`, kind: 'text', x: w, y: lossAt(w), dx: w === 0 ? 34 : w === 3 ? -40 : 0, dy: w >= 1 && w <= 2 ? -16 : 4, text: fmt(lossAt(w)), cls: 'eq' }); });
    if (ball !== null) shapes.push({ key: 'ball', kind: 'point', x: ball, y: lossAt(ball), shape: 'circle', size: 8, cls: 'query', label: '' });
    plot.update(shapes);
    return plotBox(plot, 600);
  };
}

/* ───────────── 확인 문제 ───────────── */
export const checks = [
  { q: 'w = 0, b = 0에서 시작할 때 첫 에폭의 손실(평균제곱오차)은?', opts: ['175', fmt(e1.loss.loss), '27', '5.4'], answer: 1,
    why: `오차 = ${e1.err.err.map((v) => fmt(v)).join(', ')} → 제곱의 합 ${fmt(sum(e1.loss.sq))} ÷ ${n} = ${fmt(e1.loss.loss)}` },
  { q: '첫 에폭의 손실의 기울기 dw는?', opts: [fmt(-e1.grad.dw), fmt(e1.grad.dw / 2), fmt(e1.grad.dw), fmt(e1.grad.db)], answer: 2,
    why: `오차 × x의 합 ${fmt(sum(e1.grad.ex))}, 평균 ${fmt(sum(e1.grad.ex) / n)}, × 2 = ${fmt(e1.grad.dw)}` },
  { q: `학습률 ${LR}일 때 첫 갱신 뒤 w는?`, opts: [fmt(-W1), fmt(W1), fmt(e1.grad.dw), '0.05'], answer: 1,
    why: `w = 0 − ${LR} × (${fmt(e1.grad.dw)}) = ${fmt(W1)} — 음수를 빼면 커진다` },
];

/* ───────────── 쪽 ───────────── */
const P = [];

// ─── 1부
{
  const fig = scatter();
  const left = (k) => () => lines([el('div.label', {}, '오늘의 질문'), el('h2', { style: 'font-size:42px' }, '3.5시간 공부하면 몇 점일까?'),
    big(['① 직선 ', el('b', {}, 'y = wx + b'), '로 수를 예측하는 방법을 설명할 수 있다.']), big(['② ', el('b', {}, '예측 · 오차 리스트'), '와 ', el('b', {}, '손실'), '이 만들어지는 과정을 따라갈 수 있다.'])], k);
  P.push(page({ id: 'goal', title: '1부 · 문제와 목표', sentence: '공부 시간으로 점수를 예측하는 직선을 찾아요.', code: null, leftTitle: '오늘의 수업', min: 4 }, (s) => {
    s({ left: left(2), right: () => table([], {}), note: { say: '분류 · 군집은 종류나 무리를 맞혔습니다. 오늘은 점수 같은 수를 맞힙니다. 이것을 회귀라고 합니다.', ask: '3.5시간이면 몇 점쯤일까요?', expect: '6점 안팎.' } });
    s({ left: left(3) }); s({ left: left(4) });
    s({ right: () => fig({ line: false }), cap: ['표의 한 줄 = 그림의 한 점'], capLabel: '보기' });
  }));
}
{
  const fig = scatter();
  const left = (k) => () => lines([el('h2', { style: 'font-size:38px' }, '직선 y = w × x + b'), big([el('b', {}, 'w'), ' — 직선의 기울기(가중치): x가 1 늘 때 예측이 얼마나 느는지']), big([el('b', {}, 'b'), ' — 직선의 높이(편향): x가 0일 때의 예측']), big('점들에 가장 잘 맞는 w, b를 찾는 것이 학습이에요.')], k);
  P.push(page({ id: 'line', title: '개념: 직선의 w와 b', sentence: 'w는 기울기, b는 높이예요.', code: null, leftTitle: '개념', min: 4 }, (s) => {
    s({ left: left(1), right: () => fig({ w: 0, b: 0 }), note: { say: '직선 하나로 예측합니다. w를 바꾸면 기울어지고, b를 바꾸면 위아래로 움직입니다.', ask: 'w가 커지면 직선은 어떻게 되나요?', expect: '더 가파르게 선다.' } });
    s({ left: left(2) });
    for (const w of [1, 2]) s({ right: () => fig({ w, b: 0, prev: { w: w - 1, b: 0 } }), cap: ['w ', el('span.old', {}, String(w - 1)), ' → ', el('b', {}, String(w)), ' · 직선이 더 기울었다'] });
    s({ left: left(3) });
    s({ right: () => fig({ w: 2, b: 1, prev: { w: 2, b: 0 } }), cap: ['b ', el('span.old', {}, '0'), ' → ', el('b', {}, '1'), ' · 직선이 위로 1만큼'] });
    s({ left: left(4), ask: '✋ 어떤 직선이 "잘 맞는" 직선일까요?', note: { say: '점과 직선 사이가 가까운 직선입니다. 그 거리를 다음 쪽에서 수로 잽니다.', ask: '—', expect: '점과 직선 사이가 가까운 직선.' } });
  }));
}
{
  const fig = scatter();
  const left = (k) => () => lines([el('h2', { style: 'font-size:38px' }, '얼마나 틀렸나 — 오차와 손실'), big([el('b', {}, '오차'), ' = 예측 − 실제']), big('+2와 −2를 그냥 평균 내면 0 → 잘 맞는 것처럼 보인다'), big(['그래서 제곱해서 평균: ', el('b', {}, '손실 = 오차²의 평균'), ' (MSE)'])], k);
  P.push(page({ id: 'loss-idea', title: '개념: 오차와 손실', sentence: '오차를 제곱해서 평균 내면 손실이에요.', code: null, leftTitle: '개념', min: 5 }, (s) => {
    s({ left: left(1), right: () => fig({ w: 1, b: 0, only: [2], bars: true }), note: { say: 'w = 1, b = 0일 때 x = 3이면 예측은 3, 실제는 5입니다. 오차는 예측 − 실제 = −2. 세로 막대가 오차입니다.', ask: '오차가 음수면 직선은 점보다 위인가요, 아래인가요?', expect: '아래.' } });
    s({ left: left(2) });
    s({ left: left(3), note: { say: '오차가 +2, −2인 두 점이 있으면 평균은 0이지만 둘 다 틀렸습니다. 제곱하면 4, 4 → 평균 4.', ask: '왜 제곱할까요?', expect: '+와 −가 서로 지우지 않게.', watch: '오차를 그냥 평균 내면 된다.' } });
    s({ left: left(4) });
    s({ right: () => fig({ w: 1, b: 0, bars: true }), cap: ['직선 하나 → 오차 다섯 개 → 손실 하나'], capLabel: '보기' });
  }));
}
// ① 예측
{
  const fig = scatter();
  P.push(page({ id: 'predict', title: '① 예측', sentence: 'w = 0, b = 0에서 시작해 x마다 예측값을 구해요.', code: [1, 3], min: 4 }, (s) => {
    s({ right: () => side(table(['pred'], e1.pred, { pred: 0 }), varBox([{ name: 'w', val: '?' }, { name: 'b', val: '?' }])), plot: () => fig({ line: false }), note: { say: '의사코드 1~3줄입니다. 처음 직선은 w = 0, b = 0입니다.', ask: '—', expect: '—' } });
    s({ on: 1 });
    s({ right: () => side(table(['pred'], e1.pred, { pred: 0 }), varBox([{ name: 'w', val: '0', hot: true }, { name: 'b', val: '0', hot: true }])), plot: () => fig({ w: 0, b: 0 }), cap: ['w = 0, b = 0 — 바닥에 누운 직선 y = 0'] });
    s({ on: 3, left: () => calcLines(['예측[i] = w × x[i] + b', '      = 0 × x[i] + 0 = 0'], 2, { small: true }) });
    s({ right: () => side(table(['pred'], e1.pred, {}, { hot: 'pred' }), varBox([{ name: 'w', val: '0' }, { name: 'b', val: '0' }])), plot: () => fig({ w: 0, b: 0, preds: true }), cap: ['예측 열(리스트) 5칸이 채워졌다 — 모두 0'],
      note: { say: 'w, b가 0이므로 예측은 모두 0입니다.', ask: '왜 모두 0인가요?', expect: 'w도 b도 0이라서.' } });
  }));
}
// ② 오차
{
  const fig = scatter();
  P.push(page({ id: 'error', title: '② 오차', sentence: '오차 = 예측 − 실제. 그림의 세로 막대예요.', code: [4, 4], min: 5 }, (s) => {
    s({ right: () => table(['pred', 'err'], e1.err, { err: 0 }), plot: () => fig({ w: 0, b: 0 }), note: { say: '4줄입니다. 줄마다 예측에서 실제를 뺍니다.', ask: '—', expect: '—' } });
    s({ on: 4, left: () => calcLines(['오차[i] = 예측[i] − y[i]'], 1, { small: true }) });
    const row = (i) => s({ right: () => table(['pred', 'err'], e1.err, { err: i + 1 }, { hot: 'err' }), plot: () => fig({ w: 0, b: 0, bars: true, only: X.map((_, j) => j).slice(0, i + 1) }),
      cap: [`오차[${i}] = ${fmt(e1.err.pred[i])} − ${Y[i]} = `, el('b', {}, fmt(e1.err.err[i]))] });
    row(0);
    s({ ask: '✏️ 활동지 ①번 — 나머지 오차 4칸을 채우세요 (1분)', timer: 60, note: { say: '활동지 ①번 표의 오차 열입니다.', ask: '—', expect: e1.err.err.slice(1).map((v) => fmt(v)).join(', ') } });
    for (let i = 1; i < n; i += 1) row(i);
  }));
}
// ③ 손실
{
  P.push(page({ id: 'loss', title: '③ 손실', sentence: '오차를 제곱해서 평균 내면 손실이에요.', code: [5, 5], min: 6 }, (s) => {
    s({ right: () => side(table(['err', 'sq'], e1.loss, { sq: 0 }), varBox([{ name: '손실', val: '?' }])), note: { say: '5줄입니다. 오차를 제곱해 오차² 열을 채우고, 평균을 냅니다.', ask: '—', expect: '—' } });
    s({ on: 5, left: () => calcLines(['손실 = 오차²의 평균'], 1, { small: true }) });
    s({ right: () => side(table(['err', 'sq'], e1.loss, { sq: 1 }, { hot: 'sq' }), varBox([{ name: '손실', val: '?' }])), cap: [`(${fmt(e1.err.err[0])})² = `, el('b', {}, fmt(e1.loss.sq[0]))] });
    s({ ask: '✏️ 활동지 ②번 — 나머지 오차²과 평균을 구하세요 (2분)', timer: 120, note: { say: '활동지 ②번입니다.', ask: '—', expect: `${e1.loss.sq.slice(1).map((v) => fmt(v)).join(', ')} → 평균 ${fmt(e1.loss.loss)}` } });
    s({ right: () => side(table(['err', 'sq'], e1.loss, {}, { hot: 'sq', foot: { sq: `합 ${fmt(sum(e1.loss.sq))}` } }), varBox([{ name: '손실', val: '?' }])), cap: ['오차² 열이 다 찼다 · 합 ', el('b', {}, fmt(sum(e1.loss.sq)))] });
    s({ left: () => calcLines(['손실 = 오차²의 평균', `     = ${fmt(sum(e1.loss.sq))} ÷ ${n} = ${fmt(e1.loss.loss)}`], 2, { small: true }) });
    s({ right: () => side(table(['err', 'sq'], e1.loss, {}, { foot: { sq: `평균 ${fmt(e1.loss.loss)}` } }), varBox([{ name: '손실', val: fmt(e1.loss.loss), prev: '?', hot: true }])), cap: ['손실 ', el('span.old', {}, '?'), ' → ', el('b', {}, fmt(e1.loss.loss))],
      note: { say: '직선 y = 0은 손실이 35입니다. 많이 틀렸습니다.', ask: '손실이 작아지려면 직선을 어떻게 바꿔야 할까요?', expect: '점들 쪽으로 세운다(w를 키운다).' } });
  }));
}
// 손실 골짜기
{
  const v = valley(); const fig = scatter();
  const left = (k) => () => lines([el('h2', { style: 'font-size:38px' }, '직선을 바꾸면 손실은? (b = 0)'), big('w를 0, 1, 2, 3으로 바꾸며 손실을 재 본다'), big(['손실이 가장 작은 곳 = ', el('b', {}, '골짜기의 바닥'), ' = 가장 잘 맞는 직선'])], k);
  P.push(page({ id: 'valley', title: '손실 골짜기', sentence: 'w에 따라 손실이 달라져요. 바닥을 찾아요.', code: null, leftTitle: '개념', min: 6 }, (s) => {
    s({ left: left(2), right: () => v({ pts: [0] }), plot: () => fig({ w: 0, b: 0, bars: true }), note: { say: '가로가 w, 세로가 손실입니다. w = 0일 때 손실 35였습니다.', ask: '—', expect: '—' } });
    s({ right: () => v({ pts: [0, 1] }), plot: () => fig({ w: 1, b: 0, bars: true }), cap: [`w = 1 → 손실 `, el('b', {}, fmt(lossAt(1)))] });
    s({ right: () => v({ pts: [0, 1, 2] }), plot: () => fig({ w: 2, b: 0, bars: true }), cap: [`w = 2 → 손실 `, el('b', {}, fmt(lossAt(2)))], note: { say: '그림 단추를 누르면 그 직선과 오차 막대가 보입니다.', ask: '어느 직선이 더 잘 맞나요?', expect: 'w = 2.' } });
    s({ ask: '✏️ 활동지 ③번 — w = 3, b = 0일 때 손실은? (2분)', timer: 120, note: { say: '활동지 ③번입니다.', ask: '—', expect: fmt(lossAt(3)) } });
    s({ right: () => v({ pts: [0, 1, 2, 3] }), plot: () => fig({ w: 3, b: 0, bars: true }), cap: [`w = 3 → 손실 `, el('b', {}, fmt(lossAt(3))), ' — 다시 커졌다'] });
    s({ left: left(3) });
    s({ right: () => v({ pts: [0, 1, 2, 3], curve: true }), cap: ['점들을 이으면 골짜기 — 바닥은 w = 2 근처'], ask: null,
      note: { say: '컴퓨터는 이 그림을 다 그려 보지 않습니다. 지금 서 있는 곳의 비탈만 보고 내려갑니다. 그것이 2부의 경사하강법입니다.', ask: '눈을 가리고 골짜기 바닥으로 가려면?', expect: '발밑이 낮아지는 쪽으로 조금씩.' } });
  }));
}

// ─── 2부
{
  const v = valley();
  const left = (k) => () => lines([el('h2', { style: 'font-size:38px' }, '비탈의 반대쪽으로 조금씩'), big([el('b', {}, '손실의 기울기 dw'), ' — 지금 자리의 비탈. 음수면 오른쪽이 낮다']), big(['규칙: ', el('b', {}, 'w ← w − 학습률 × dw'), ' (비탈 반대쪽으로)']), big(['학습률 = 한 걸음의 크기. ', el('span.small', {}, '직선의 기울기 w와 손실의 기울기 dw는 다른 것!')])], k);
  P.push(page({ id: 'grad-idea', title: '2부 · 개념: 기울기와 학습률', sentence: '손실의 기울기 반대쪽으로 한 걸음씩 가요.', code: null, leftTitle: '개념', min: 6 }, (s) => {
    s({ left: left(1), right: () => v({ curve: true, ball: 0 }), note: { say: '지난 시간의 골짜기입니다. w = 0에 서 있습니다.', ask: '어느 쪽으로 가야 낮아지나요?', expect: '오른쪽(w를 키운다).' } });
    s({ left: left(2) });
    s({ right: () => v({ curve: true, ball: 0, tangent: 0 }), cap: ['w = 0의 비탈: 오른쪽으로 내려간다 → dw는 음수'] });
    s({ left: left(3) });
    s({ right: () => v({ curve: true, ball: W1, tangent: null }), cap: ['한 걸음: w ', el('span.old', {}, '0'), ' → ', el('b', {}, fmt(W1)), ' (다음 쪽에서 계산)'] });
    s({ left: left(4), note: { say: '"기울기"가 두 번 나옵니다. w는 직선의 기울기(가중치), dw는 손실의 기울기입니다.', ask: '학습률이 0이면 어떻게 되나요?', expect: '움직이지 않는다.', watch: '두 기울기를 같은 것으로 안다.' } });
  }));
}
// ④ 기울기
{
  P.push(page({ id: 'grad', title: '④ 손실의 기울기', sentence: '오차와 x로 dw, db를 구해요.', code: [6, 6], min: 6 }, (s) => {
    const dsv = (vals) => varBox([{ name: 'dw', val: vals ? fmt(e1.grad.dw) : '?', hot: Boolean(vals) }, { name: 'db', val: vals === 2 ? fmt(e1.grad.db) : '?', hot: vals === 2 }]);
    s({ right: () => side(table(['err', 'ex'], e1.grad, { ex: 0 }), dsv(0)), note: { say: '6줄입니다. 오차에 x를 곱한 열을 만들고 평균의 2배가 dw입니다. db는 오차 평균의 2배입니다.', ask: '—', expect: '—' } });
    s({ on: 6, left: () => calcLines(['dw = 2 × (오차 × x)의 평균', 'db = 2 × 오차의 평균'], 2, { small: true }) });
    s({ right: () => side(table(['err', 'ex'], e1.grad, { ex: 1 }, { hot: 'ex' }), dsv(0)), cap: [`${fmt(e1.err.err[0])} × ${X[0]} = `, el('b', {}, fmt(e1.grad.ex[0]))] });
    s({ ask: '✏️ 활동지 ④번 — 나머지 오차 × x를 채우세요 (1분)', timer: 60, note: { say: '활동지 ④번입니다.', ask: '—', expect: e1.grad.ex.slice(1).map((v) => fmt(v)).join(', ') } });
    s({ right: () => side(table(['err', 'ex'], e1.grad, {}, { hot: 'ex', foot: { err: `합 ${fmt(sum(e1.grad.err))}`, ex: `합 ${fmt(sum(e1.grad.ex))}` } }), dsv(0)), cap: ['오차 × x 열이 다 찼다'] });
    s({ left: () => calcLines(['dw = 2 × (오차 × x)의 평균', `   = 2 × ${fmt(sum(e1.grad.ex))} ÷ ${n} = ${fmt(e1.grad.dw)}`, `db = 2 × ${fmt(sum(e1.grad.err))} ÷ ${n} = ${fmt(e1.grad.db)}`], 3, { small: true }) });
    s({ right: () => side(table(['err', 'ex'], e1.grad, {}, { foot: { err: `합 ${fmt(sum(e1.grad.err))}`, ex: `합 ${fmt(sum(e1.grad.ex))}` } }), dsv(2)), cap: ['dw = ', el('b', {}, fmt(e1.grad.dw)), ' · db = ', el('b', {}, fmt(e1.grad.db)), ' — 둘 다 음수'],
      note: { say: '둘 다 음수입니다. 오른쪽(키우는 쪽)이 낮다는 뜻입니다.', ask: 'dw가 음수면 w를 키워야 할까요, 줄여야 할까요?', expect: '키운다.' } });
  }));
}
// ⑤ 갱신
{
  const fig = scatter();
  const vars = (w, b) => varBox([{ name: '학습률', val: String(LR) }, { name: 'dw', val: fmt(e1.grad.dw) }, { name: 'db', val: fmt(e1.grad.db) },
    { name: 'w', val: w ? fmt(W1) : '0', prev: w ? '0' : null, hot: Boolean(w) }, { name: 'b', val: b ? fmt(B1) : '0', prev: b ? '0' : null, hot: Boolean(b) }]);
  P.push(page({ id: 'update', title: '⑤ 갱신', sentence: 'w ← w − 학습률 × dw. 직선이 움직여요.', code: [7, 7], min: 5 }, (s) => {
    s({ right: () => vars(0, 0), plot: () => fig({ w: 0, b: 0 }), ask: `✋ dw = ${fmt(e1.grad.dw)}이에요. 이번 갱신으로 w는 커질까요, 작아질까요?`, note: { say: '짝과 30초 이야기한 뒤 손을 듭니다.', ask: '—', expect: '커진다.' } });
    s({ on: 7, left: () => calcLines([`w = 0 − ${LR} × (${fmt(e1.grad.dw)})`, `  = ${fmt(W1)}`], 2, { small: true }) });
    s({ right: () => vars(1, 0), plot: () => fig({ w: W1, b: 0, prev: { w: 0, b: 0 } }), cap: ['w ', el('span.old', {}, '0'), ' → ', el('b', {}, fmt(W1)), ' · 누워 있던 직선이 일어섰다'],
      note: { say: '음수를 빼면 더해집니다. 그림 단추로 직선이 일어서는 것을 봅니다.', ask: '—', expect: '—' } });
    s({ left: () => calcLines([`w = 0 − ${LR} × (${fmt(e1.grad.dw)}) = ${fmt(W1)}`, `b = 0 − ${LR} × (${fmt(e1.grad.db)}) = ${fmt(B1)}`], 2, { small: true }) });
    s({ right: () => vars(1, 1), plot: () => fig({ w: W1, b: B1, prev: { w: W1, b: 0 } }), cap: ['b ', el('span.old', {}, '0'), ' → ', el('b', {}, fmt(B1)), ` · 직선 y = ${fmt(W1)}x + ${fmt(B1)}`] });
  }));
}
// ⑥ 기록하고 반복
{
  const fig = scatter();
  const h = run.result.history;
  const hist = (k, fresh = -1) => dsBox({ name: '손실 기록', kind: `리스트 · ${k}칸`, dense: true, width: 330 },
    el('div.hrow', {}, k ? h.slice(0, k).map((v, i) => el(`span.hchip${i === fresh ? '.new' : ''}`, { 'data-flip': `h-${i}` }, `[${i}] ${fmt(v)}`)) : el('span.small', {}, '비어 있음')));
  const epochs = (k) => () => dsBox({ name: '에폭별 추적표', kind: `학습률 ${LR}`, dense: true },
    el('table.big', { style: 'font-size:24px;' }, el('tr', {}, ['에폭', '시작 w', '시작 b', '손실', '갱신 뒤 w', '갱신 뒤 b'].map((t) => el('th', {}, t))),
      Array.from({ length: k }, (_, i) => { const u = at(i + 1, 'update'); return el('tr', {}, el('td', {}, String(i + 1)), el('td.num', {}, fmt(u.prevW)), el('td.num', {}, fmt(u.prevB)), el('td.num', {}, fmt(u.loss)), el('td.num', {}, fmt(u.w)), el('td.num', {}, fmt(u.b))); })));
  const vars2 = (o) => varBox([{ name: '에폭', val: String(o.e ?? 1), hot: o.eh }, { name: '손실', val: fmt(o.loss ?? e1.loss.loss), prev: o.lp, hot: o.lh }, { name: 'w', val: fmt(o.w ?? W1), prev: o.wp, hot: o.wh }, { name: 'b', val: fmt(o.b ?? B1), prev: o.bp, hot: o.wh }]);
  P.push(page({ id: 'repeat', title: '⑥ 기록하고 반복', sentence: '손실을 기록에 붙이고, 에폭마다 되풀이해요.', code: [8, 8], min: 7 }, (s) => {
    s({ right: () => side(vars2({}), hist(0)), note: { say: '8줄: 이번 에폭의 손실을 기록 리스트 맨 뒤에 붙입니다. 그리고 2줄로 돌아가 다시 합니다.', ask: '—', expect: '—' } });
    s({ on: 8 });
    s({ right: () => side(vars2({}), hist(1, 0)), cap: ['손실 기록 ', el('span.old', {}, '0칸'), ' → ', el('b', {}, '1칸'), ` · [0]에 ${fmt(h[0])}`] });
    s({ ask: `✋ 2줄로 돌아가 2번째 에폭 — 손실은 ${fmt(h[0])}보다 커질까요, 줄어들까요?`, note: { say: '에폭 = 데이터 전체를 한 번 훑는 것. w, b는 지우지 않고 그대로 이어서 씁니다.', ask: 'w, b도 다시 0이 되나요?', expect: '아니다. 그대로.', watch: '에폭마다 처음부터 다시 시작한다.' } });
    s({ right: () => side(vars2({ e: 2, eh: true, loss: e2.loss.loss, lp: fmt(e1.loss.loss), lh: true }), hist(1)), plot: () => fig({ w: W1, b: B1, bars: true }), cap: ['2에폭 손실 ', el('span.old', {}, fmt(h[0])), ' → ', el('b', {}, fmt(h[1])), ' · 줄었다'] });
    s({ right: () => side(vars2({ e: 2, loss: e2.loss.loss, w: e2.upd.w, b: e2.upd.b, wp: fmt(W1), bp: fmt(B1), wh: true }), hist(2, 1)), plot: () => fig({ w: e2.upd.w, b: e2.upd.b, prev: { w: W1, b: B1 } }),
      cap: [`dw = ${fmt(e2.upd.dw)} (양수) → w `, el('span.old', {}, fmt(W1)), ' → ', el('b', {}, fmt(e2.upd.w)), ' · 기록 2칸'], note: { say: '이번에는 dw가 양수라 w가 줄었습니다. 골짜기 바닥을 지나쳐서 되돌아오는 것입니다.', ask: '왜 w가 줄었나요?', expect: 'dw가 양수라서.' } });
    s({ right: epochs(5), cap: ['에폭 1 ~ 5 — 시험에서 이 표를 채운다'] });
    s({ right: () => side(vars2({ e: h.length, loss: h[h.length - 1], w: run.result.w, b: run.result.b }), hist(Math.min(6, h.length))), plot: () => fig({ w: run.result.w, b: run.result.b, bars: true }),
      cap: [`${h.length}에폭 뒤 y = ${fmt(run.result.w)}x + ${fmt(run.result.b)} · 3.5시간 → `, el('b', {}, `${fmt(run.result.w * 3.5 + run.result.b, 1)}점`)], capLabel: '결과',
      note: { say: '20번 되풀이한 뒤의 직선입니다. 처음 질문에 답할 수 있습니다.', ask: '3.5시간이면 몇 점인가요?', expect: `약 ${fmt(run.result.w * 3.5 + run.result.b, 1)}점.` } });
  }));
}
// 학습률을 바꾸면
{
  const LRS = [0.01, 0.05, 0.1];
  const tableLr = (k) => () => dsBox({ name: '학습률 비교', kind: '손실 기록 앞 4칸', dense: true },
    el('table.big', { style: 'font-size:26px;' }, el('tr', {}, ['학습률', '[0]', '[1]', '[2]', '[3]', '모습'].map((t) => el('th', {}, t))),
      LRS.slice(0, k).map((lr) => { const hh = histOf(lr); return el('tr', {}, el('td', {}, String(lr)), hh.slice(0, 4).map((v) => el('td.num', {}, fmt(v))), el('td', {}, lr === 0.01 ? '느리게 준다' : lr === 0.05 ? '빠르게 준다' : '커진다(발산)')); })));
  const w1 = (lr) => fmt(0 - lr * e1.grad.dw);
  P.push(page({ id: 'lr', title: '학습률을 바꾸면', sentence: '한 걸음이 너무 작으면 느리고, 너무 크면 튕겨 나가요.', code: null, leftTitle: '깊이', min: 5 }, (s) => {
    s({ left: () => lines([el('h2', { style: 'font-size:38px' }, '한 걸음의 크기 = 학습률'), big('너무 작으면 — 바닥까지 오래 걸린다'), big('너무 크면 — 바닥을 지나 반대편으로 튕긴다(발산)')], 1), right: tableLr(0),
      note: { say: '같은 데이터를 학습률만 바꿔 돌린 손실 기록입니다.', ask: '—', expect: '—' } });
    s({ right: tableLr(1), cap: ['0.01: 35 → 20.42 → … 느리다'] });
    s({ right: tableLr(2), cap: ['0.05: 35 → 1.24 → … 빠르게 바닥 근처로'] });
    s({ ask: '✏️ 활동지 ⑤번 — 학습률 0.1이면 첫 갱신 뒤 w는? (1분)', timer: 60, note: { say: '활동지 ⑤번입니다.', ask: '—', expect: w1(0.1) } });
    s({ cap: [`w = 0 − 0.1 × (${fmt(e1.grad.dw)}) = `, el('b', {}, w1(0.1))], capLabel: '답' });
    s({ right: tableLr(3), cap: ['0.1: 손실이 커지기만 한다 → ', el('b', {}, '발산')], note: { say: '한 걸음이 너무 커서 골짜기 반대편으로 넘어가고, 갈수록 더 멀어집니다.', ask: '학습률은 클수록 좋은가요?', expect: '아니다. 너무 크면 발산한다.', watch: '학습률은 클수록 빨리 배운다.' } });
    s({ left: () => lines([el('h2', { style: 'font-size:38px' }, '한 걸음의 크기 = 학습률'), big('너무 작으면 — 바닥까지 오래 걸린다'), big('너무 크면 — 바닥을 지나 반대편으로 튕긴다(발산)')], 3) });
  }));
}
// 정리
P.push(wrapPage({
  points: [['직선의 ', el('b', {}, '예측 · 오차 열(리스트)'), '을 채우고, 오차²의 평균이 ', el('b', {}, '손실'), '이다.'], ['손실의 기울기 dw, db를 구해 ', el('b', {}, 'w ← w − 학습률 × dw'), '로 고친다.'], ['손실을 ', el('b', {}, '기록 리스트'), '에 붙이며 에폭마다 되풀이한다. 학습률이 크면 발산한다.']],
  next: '다음 시간: 스무고개처럼 질문으로 분류할 수 있을까?',
  flow: ['x · y', '예측 · 오차 (열)', '손실 (변수)', 'dw · db (변수)', 'w · b (갱신)', '손실 기록 (반복)'], checks,
  note: { say: '1부와 2부를 이어서 정리합니다.', ask: 'dw가 양수면 w는 어떻게 되나요?', expect: '줄어든다.' },
}));
P.push(...practicePages('linreg'));

export const tab = { id: 'linreg', name: '선형회귀', emoji: '📈', full: '선형회귀', code: CODE, pages: P, checks };

/* ───────────── 활동지 · 정답지 (교사용 자료에서 인쇄) ───────────── */
const blank = (answer) => ({ blank: true, answer: String(answer) });
export const lesson = lessonFromTab(tab, {
  badge: '3 · 4차시', title: '선형회귀',
  goals: ['직선 y = wx + b로 수를 예측하고, 오차와 손실을 설명할 수 있다.', '손실의 기울기 반대쪽으로 w · b를 고치는 경사하강법과, 에폭마다 바뀌는 변수 · 기록 리스트를 따라갈 수 있다.'],
  materials: ['사이트 📈 선형회귀 탭(1부: 3차시, 2부: 4차시)', '활동지(학생 수만큼 인쇄)', '정답지 · 수업 대본(교사용)'],
  sheet: {
    title: '3.5시간 공부하면 몇 점일까? — w = 0, b = 0에서 시작',
    sections: [
      { title: '① · ② · ④ 첫 에폭 계산표 (예측 = 0 × x + 0)', hint: '활동 ①: 오차 · 활동 ②: 오차²과 평균 · 활동 ④: 오차 × x (첫 줄은 수업 화면과 함께)',
        head: ['x', 'y', '예측', '오차', '오차²', '오차 × x'],
        rows: [...X.map((x, i) => [String(x), String(Y[i]), String(fmt(e1.pred.pred[i])), i ? blank(fmt(e1.err.err[i])) : fmt(e1.err.err[i]), i ? blank(fmt(e1.loss.sq[i])) : fmt(e1.loss.sq[i]), i ? blank(fmt(e1.grad.ex[i])) : fmt(e1.grad.ex[i])]),
          ['합 · 평균', '', '', blank(`합 ${fmt(sum(e1.err.err))}`), blank(`평균 ${fmt(e1.loss.loss)}`), blank(`합 ${fmt(sum(e1.grad.ex))}`)]] },
      { title: '③ w = 3, b = 0일 때 손실은?', head: ['예측', '오차', '오차²의 평균 = 손실'],
        rows: [[blank(X.map((x) => 3 * x).join(', ')), blank(X.map((x, i) => 3 * x - Y[i]).join(', ')), blank(fmt(lossAt(3)))]] },
      { title: '④ 손실의 기울기와 ⑤ 갱신', head: ['dw', 'db', `w (학습률 ${LR})`, `b (학습률 ${LR})`, 'w (학습률 0.1)'],
        rows: [[blank(fmt(e1.grad.dw)), blank(fmt(e1.grad.db)), blank(fmt(W1)), blank(fmt(B1)), blank(fmt(-0.1 * e1.grad.dw))]] },
      { title: `⑥ 에폭별 추적표 (학습률 ${LR})`, head: ['에폭', '시작 w', '시작 b', '손실', '갱신 뒤 w', '갱신 뒤 b'],
        rows: [1, 2, 3].map((k) => { const u = at(k, 'update'); return [String(k), k === 1 ? '0' : blank(fmt(u.prevW)), k === 1 ? '0' : blank(fmt(u.prevB)), blank(fmt(u.loss)), blank(fmt(u.w)), blank(fmt(u.b))]; }) },
      { title: '⑦ 확인 문제 답', answers: checks.map((c, i) => ({ label: `${i + 1}번`, answer: '①②③④'[c.answer] })) },
    ],
  },
});
