/**
 * 선형회귀(경사하강법) 보기 — 에폭마다 표의 열(예측·오차·제곱·곱)이 위에서 아래로 채워지고,
 * 그 열을 평균 낸 값이 변수(loss·dw·db)로 모였다가, w·b를 고치고, 손실이 기록 리스트로 복사된다.
 *
 *   [X·Y 표 + 계산 열] ──평균──▶ [변수 w b lr loss dw db] ──append──▶ [history 리스트]
 */
import { el } from '../dom.js';
import { createPlot } from '../plot.js';
import { sbox, flowArrow, varCell } from '../structures.js';
import { fmt } from '../../core/math.js';
import { STUDY } from '../../core/datasets.js';

const TARGET_NAME = {
  vars: '변수', 'col-pred': 'pred', 'col-err': 'err', 'col-sq': 'err²', 'col-ex': 'err·x', history: 'history', result: '결과',
};
const XMAX = 6;
const YMAX = 10;

/** 화면 밖으로 튀는 값(발산)은 그림 가장자리에 붙인다 */
const clampY = (y) => Math.max(-2, Math.min(YMAX + 2, y));
function lineEnds(w, b) {
  // x ∈ [0, XMAX]에서 y가 그림 안에 들어오는 부분만
  let x1 = 0; let x2 = XMAX;
  if (Math.abs(w) > 1e-9) {
    const xa = (-2 - b) / w; const xb = (YMAX + 2 - b) / w;
    const lo = Math.min(xa, xb); const hi = Math.max(xa, xb);
    x1 = Math.max(0, lo); x2 = Math.min(XMAX, hi);
    if (x1 > x2) { x1 = 0; x2 = XMAX; }
  }
  return { x1, y1: clampY(w * x1 + b), x2, y2: clampY(w * x2 + b) };
}

function lossChart(history, { title = '📉 손실 기록 (history)' } = {}) {
  const n = Math.max(history.length, 1);
  const maxL = Math.max(1, ...history.filter(Number.isFinite));
  const chart = createPlot({
    x: [0, Math.max(5, n)], y: [0, maxL * 1.08], width: 300, height: 72, axes: true, tickLabels: false,
    tick: Math.max(1, Math.ceil(n / 10)), ytick: maxL / 2, pad: { l: 8, r: 6, t: 6, b: 8 }, ariaLabel: '손실 기록 그래프',
  });
  const pts = history.map((l, i) => [i + 1, Math.min(l, maxL)]);
  chart.update([
    pts.length > 1 ? { key: 'line', kind: 'path', points: pts, cls: 'lossline' } : null,
    ...pts.map(([x, y], i) => ({ key: `d${i}`, kind: 'point', x, y, shape: 'circle', size: 2.4, cls: `lossdot${i === pts.length - 1 ? ' is-last' : ''}` })),
  ]);
  return el('div.minichart', {},
    el('div.minichart__title', {}, title, history.length ? `  · 마지막 ${fmt(history[history.length - 1])}` : '  · 아직 없음'),
    chart.svg);
}

export default {
  stageTitle: '산점도 — 공부 시간 × 점수',
  stageHint: '파란 직선 = 지금의 y = wx + b · 빨간 막대 = 오차',
  targetName: (t) => TARGET_NAME[t] ?? t,

  intro: {
    question: '공부 시간 x로 퀴즈 점수 y를 예측하는 직선 y = wx + b는? (w = 0, b = 0에서 시작)',
    input: '(x, y) 데이터 5개, 학습률, 에폭 수',
    output: '학습된 w, b',
    tips: [
      '첫 에폭은 예측이 모두 0이라 손으로 풀기 쉬워요: 손실 35, dw = −39.2, db = −10.8.',
      'w ← w − 학습률 × dw. dw가 음수면 w는 커져요.',
      '학습률이 너무 크면(0.1) 손실이 에폭마다 커져요(발산).',
    ],
  },
  introBoxes: ['table'],

  createPlot() {
    return createPlot({
      x: [0, XMAX], y: [0, YMAX], width: 320, height: 296, clip: true, xLabel: `${STUDY.xName}(시간) →`, yLabel: `${STUDY.yName} →`,
      ariaLabel: '공부 시간과 점수, 학습 중인 직선',
    });
  },

  shapes(v) {
    const { ds, data, frame } = v;
    const shapes = [];
    if (frame.action === 'result' && !ds.diverged) {
      const e = lineEnds(STUDY.best.w, STUDY.best.b);
      shapes.push({ key: 'best', kind: 'line', ...e, cls: 'fitline is-best' });
    }
    const e = lineEnds(ds.w, ds.b);
    shapes.push({ key: 'fit', kind: 'line', ...e, cls: 'fitline' });
    // 오차 막대 — 오차를 구한 뒤부터 그 에폭 동안
    if (ds.err) {
      data.X.forEach((x, i) => {
        const p = ds.pred[i];
        shapes.push({ key: `r${i}`, kind: 'line', x1: x, y1: data.Y[i], x2: x, y2: clampY(p), cls: `residual${ds.err[i] > 0 ? ' is-pos' : ''}` });
        shapes.push({ key: `rt${i}`, kind: 'text', x: x, y: (data.Y[i] + clampY(p)) / 2, dx: 14, dy: 3, text: fmt(ds.err[i], 1), cls: 'residual-text' });
      });
    }
    if (ds.pred && !ds.err) {
      data.X.forEach((x, i) => shapes.push({ key: `pp${i}`, kind: 'point', x, y: clampY(ds.pred[i]), shape: 'circle', size: 3.5, cls: 'ghost cat-3' }));
    }
    data.X.forEach((x, i) => shapes.push({
      key: `pt${i}`, kind: 'point', x, y: data.Y[i], shape: 'circle', size: 6, cls: 'cat-2',
      label: `(${x}, ${data.Y[i]})`, labelBelow: false, title: `공부 ${x}시간 → ${data.Y[i]}점`,
    }));
    shapes.push({ key: 'eq', kind: 'text', x: 0.25, y: YMAX - 0.6, anchor: 'start', text: `y = ${fmt(ds.w)}x + ${fmt(ds.b)}`, cls: 'eq' });
    return shapes;
  },

  legend() {
    return el('div.legend', {},
      el('span.legend__item', { 'data-cat': '2' }, el('span.mark', {}, '●'), '실제 데이터'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--current)' }, '━'), '지금 직선'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--danger)' }, '┃'), '오차(−)'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--cat-3)' }, '┃'), '오차(+)'));
  },

  /** 손실 그래프는 갱신·반복 쪽에서만 */
  extra(v, { page }) {
    return page === 'update' ? lossChart(v.ds.history) : null;
  },

  data(v, { boxes, kind, page }) {
    const { ds, data, frame } = v;
    const hot = (t) => frame.effects.some((e) => e.target === t);
    const n = data.X.length;
    const cell = (val, col, i, { bad = false } = {}) => {
      if (val === null || val === undefined) return el('td.num', {}, '');
      const isHot = hot(col);
      return el(`td.num${isHot ? '.is-hot.is-fill' : ''}${bad ? '.is-bad' : ''}`, { style: `--i:${i}` }, fmt(val));
    };
    const sumOf = (arr) => (arr ? arr.reduce((s, x) => s + x, 0) : null);

    // 쪽마다 필요한 열만 — 예측·오차 쪽은 pred·err, 손실·기울기 쪽은 err·err²·err·x
    const COLS = [
      { key: 'pred', head: '예측', col: 'col-pred', val: (i) => ds.pred?.[i] },
      { key: 'err', head: '오차', col: 'col-err', val: (i) => ds.err?.[i] },
      { key: 'sq', head: '오차²', col: 'col-sq', val: (i) => ds.sq?.[i] },
      { key: 'ex', head: '오차·x', col: 'col-ex', val: (i) => ds.ex?.[i] },
    ];
    const want = kind === 'intro' ? [] : page === 'predict' ? ['pred', 'err'] : ['err', 'sq', 'ex'];
    const cols = COLS.filter((c) => want.includes(c.key));
    const foot = { err: ds.err ? `합 ${fmt(sumOf(ds.err))}` : '', sq: ds.sq ? `평균 ${fmt(sumOf(ds.sq) / n)}` : '', ex: ds.ex ? `합 ${fmt(sumOf(ds.ex))}` : '', pred: '' };
    const table = el('table.dtable.dtable--reg', {},
      el('thead', {}, el('tr', {}, el('th', {}, 'x 공부 시간'), el('th', {}, 'y 점수'), cols.map((c) => el('th', {}, c.head)))),
      el('tbody', {}, data.X.map((x, i) => el('tr', {},
        el('td.num', {}, String(x)), el('td.num', {}, String(data.Y[i])),
        cols.map((c) => cell(c.val(i), c.col, i, { bad: c.key === 'err' && ds.err?.[i] < 0 }))))),
      cols.length ? el('tfoot', {}, el('tr', {}, el('td', { colspan: '2' }, '합 / 평균'),
        cols.map((c) => el('td.num', c.key === 'sq' ? { 'data-flip': 'sq-mean' } : {}, foot[c.key])))) : null,
    );

    const vhot = hot('vars');
    const varsBox = sbox({ target: 'vars', name: '변수', kind: '변수', title: '값 하나씩 담는 상자', frame },
      el('div.vars', {},
        varCell('w', fmt(ds.w), { hot: vhot && frame.action !== 'loss' && frame.action !== 'gradient', prev: frame.action === 'update' ? fmt(ds.prevW) : null }),
        varCell('b', fmt(ds.b), { hot: vhot && frame.action !== 'loss' && frame.action !== 'gradient', prev: frame.action === 'update' ? fmt(ds.prevB) : null }),
        varCell('학습률', String(ds.lr)),
        varCell('에폭', String(ds.epoch), { hot: frame.action === 'loop' })),
      el('div.vars', {},
        el('span', { 'data-flip': 'var-loss', 'data-from': frame.action === 'loss' ? 'sq-mean' : null, 'data-force': frame.action === 'loss' ? '1' : null },
          varCell('손실', ds.loss === null ? '–' : fmt(ds.loss), { hot: frame.action === 'loss' })),
        varCell('dw', ds.dw === null ? '–' : fmt(ds.dw), { hot: frame.action === 'gradient' }),
        varCell('db', ds.db === null ? '–' : fmt(ds.db), { hot: frame.action === 'gradient' })));

    const shown = ds.history.slice(-8);
    const offset = ds.history.length - shown.length;
    const histBox = sbox({ target: 'history', name: '손실 기록', kind: '리스트', title: '에폭마다 한 칸', frame,
      count: ds.history.length, hint: '8줄에서 에폭마다 한 칸씩 붙어요', bodyCls: 'pool' },
    offset > 0 ? el('span.sbox__empty', {}, `…앞의 ${offset}개`) : null,
    shown.map((l, j) => {
      const i = offset + j;
      const isNew = frame.action === 'record' && i === ds.history.length - 1;
      return el(`span.pchip${isNew ? '.is-cur' : ''}`, {
        'data-flip': `hist-${i}`, 'data-from': isNew ? 'var-loss' : null,
        title: `${i + 1}번째 에폭의 손실`,
      }, el('small', {}, `[${i}] `), fmt(l));
    }));

    const parts = [];
    if (boxes.has('table')) parts.push(sbox({ target: 'table', name: '데이터', kind: '리스트', title: '열 하나 = 리스트 하나', frame,
      op: frame.effects.find((e) => e.target.startsWith('col-'))?.op ?? null, cls: 'sbox--table' }, table));
    if (boxes.has('table') && boxes.has('vars')) parts.push(flowArrow(page === 'loss' ? '평균 내서' : ''));
    const right = [];
    if (boxes.has('vars')) right.push(varsBox);
    if (boxes.has('vars') && boxes.has('history')) right.push(flowArrow('기록에 추가', 'down'));
    if (boxes.has('history')) right.push(histBox);
    if (right.length) parts.push(el('div.flow__col', {}, right));
    return el('div.flow.flow--reg', {}, parts);
  },
};
