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
let tryX = 3.5;   // ①쪽 써 보기 — 공부 시간

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

  reviewInfo: {
    one: '데이터를 가장 잘 지나는 직선 y = wx + b를 찾아요. 손실(오차² 평균)이 줄어드는 쪽으로 w, b를 조금씩 고쳐 가요(경사하강법).',
    input: '(x, y) 데이터, 학습률, 반복 횟수',
    output: '학습된 w, b → 새 x의 예측값',
    phaseDs: ['X ➜ pred (리스트)', 'pred − Y ➜ err ➜ loss', 'err ➜ dw, db ➜ w, b 갱신', 'loss ➜ history.append'],
    tools: ['table', 'group', 'update'],
    remember: [
      '학습률이 너무 크면 발산하고, 너무 작으면 아주 느려요.',
      'history(손실 기록)가 줄어드는지 보면 학습이 잘 되는지 알 수 있어요.',
      '최소제곱법으로 한 번에 풀 수도 있지만, 경사하강법은 신경망까지 이어지는 학습의 기본 방법이에요.',
    ],
  },

  outcome(run) {
    const r = run.result;
    if (r.diverged) return `발산! ${r.history.length}에폭 만에 손실 ${fmt(r.history.at(-1))}`;
    return `y = ${fmt(r.w)}x + ${fmt(r.b)} · 손실 ${fmt(r.history[0])} → ${fmt(r.history.at(-1), 3)}`;
  },

  createPlot() {
    return createPlot({
      x: [0, XMAX], y: [0, YMAX], width: 320, height: 296, clip: true, xLabel: `${STUDY.xName}(시간) →`, yLabel: `${STUDY.yName} →`,
      ariaLabel: '공부 시간과 점수, 학습 중인 직선',
    });
  },

  shapes(v, { page }) {
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
    if (page === 'review' && v.atEnd && !ds.diverged) {
      const y = ds.w * tryX + ds.b;
      shapes.push({ key: 'try-v', kind: 'line', x1: tryX, y1: 0, x2: tryX, y2: clampY(y), cls: 'predict-guide' });
      shapes.push({ key: 'try', kind: 'point', x: tryX, y: clampY(y), shape: 'star', size: 8, cls: 'query', label: `${fmt(y, 1)}점` });
    }
    return shapes;
  },

  legend() {
    return el('div.legend', {},
      el('span.legend__item', { 'data-cat': '2' }, el('span.mark', {}, '●'), '실제 데이터'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--current)' }, '━'), '지금 직선'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--danger)' }, '┃'), '오차(−)'),
      el('span.legend__item', {}, el('span.mark', { style: 'color:var(--cat-3)' }, '┃'), '오차(+)'));
  },

  extra(v, { page, refreshPlot }) {
    const chart = lossChart(v.ds.history);
    if (page !== 'review') return chart;
    let tryBox;
    if (!v.atEnd) {
      tryBox = el('div.tryit', {}, el('div.tryit__title', {}, '👆 써 보기'), el('div', {}, '⏩ 끝까지 학습한 뒤, 공부 시간으로 점수를 예측해 보세요.'));
    } else if (v.ds.diverged) {
      tryBox = el('div.tryit', {}, el('div.tryit__title', {}, '⚠ 발산한 직선으로는 예측할 수 없어요'), el('div', {}, '③쪽에서 학습률을 0.05로 돌려 보세요.'));
    } else {
      const { w, b } = v.ds;
      const out = el('strong.tryit__answer');
      const label = el('span');
      const formula = el('span');
      const show = () => {
        label.textContent = `공부 ${tryX}시간 → `;
        out.textContent = `${fmt(w * tryX + b, 1)}점`;
        const y = w * tryX + b;
        formula.textContent = `  (= ${fmt(w)} × ${tryX} + ${fmt(b)})` +
          (y > 10 ? '  ⚠ 10점 만점을 넘었어요 — 직선은 데이터 범위 밖에서도 그대로 뻗어요(외삽)' : '');
      };
      show();
      tryBox = el('div.tryit', {},
        el('div.tryit__title', {}, '👆 써 보기 — 공부 시간을 바꿔 예측 점수를 보세요'),
        // 끄는 동안 슬라이더를 다시 만들지 않도록 글자와 그림만 고친다
        el('input', {
          type: 'range', min: '0', max: String(XMAX), step: '0.5', value: String(tryX), 'aria-label': '공부 시간',
          oninput: (e) => { tryX = +e.target.value; show(); refreshPlot(); },
        }),
        el('div.tryit__row', {}, label, out, formula));
    }
    return el('div', { style: 'display:flex;flex-direction:column;gap:6px' }, tryBox, chart);
  },

  data(v) {
    const { ds, data, frame } = v;
    const hot = (t) => frame.effects.some((e) => e.target === t);
    const n = data.X.length;
    const cell = (val, col, i, { bad = false } = {}) => {
      if (val === null || val === undefined) return el('td.num', {}, '');
      const isHot = hot(col);
      return el(`td.num${isHot ? '.is-hot.is-fill' : ''}${bad ? '.is-bad' : ''}`, { style: `--i:${i}` }, fmt(val));
    };
    const sumOf = (arr) => (arr ? arr.reduce((s, x) => s + x, 0) : null);

    const table = el('table.dtable.dtable--reg', {},
      el('thead', {}, el('tr', {},
        el('th', {}, 'i'), el('th', {}, 'x'), el('th', {}, 'y'),
        el('th', {}, '예측 pred'), el('th', {}, '오차 err'), el('th', {}, 'err²'), el('th', {}, 'err·x'))),
      el('tbody', {}, data.X.map((x, i) => el('tr', {},
        el('td.num', {}, String(i)), el('td.num', {}, String(x)), el('td.num', {}, String(data.Y[i])),
        cell(ds.pred?.[i], 'col-pred', i),
        cell(ds.err?.[i], 'col-err', i, { bad: ds.err?.[i] < 0 }),
        cell(ds.sq?.[i], 'col-sq', i),
        cell(ds.ex?.[i], 'col-ex', i)))),
      el('tfoot', {}, el('tr', {},
        el('td', { colspan: '3' }, '합 / 평균'),
        el('td.num', {}, ''),
        el('td.num', {}, ds.err ? `Σ ${fmt(sumOf(ds.err))}` : ''),
        el('td.num', { 'data-flip': 'sq-mean' }, ds.sq ? `÷${n} = ${fmt(sumOf(ds.sq) / n)}` : ''),
        el('td.num', {}, ds.ex ? `Σ ${fmt(sumOf(ds.ex))}` : ''))),
    );

    const vhot = hot('vars');
    const varsBox = sbox({ target: 'vars', name: '변수', kind: '변수', title: '값 하나씩 담는 상자', frame },
      el('div.vars', {},
        varCell('w', fmt(ds.w), { hot: vhot && frame.action !== 'loss' && frame.action !== 'gradient', prev: frame.action === 'update' ? fmt(ds.prevW) : null }),
        varCell('b', fmt(ds.b), { hot: vhot && frame.action !== 'loss' && frame.action !== 'gradient', prev: frame.action === 'update' ? fmt(ds.prevB) : null }),
        varCell('lr', String(ds.lr)),
        varCell('에폭', String(ds.epoch), { hot: frame.action === 'loop' })),
      el('div.vars', {},
        el('span', { 'data-flip': 'var-loss', 'data-from': frame.action === 'loss' ? 'sq-mean' : null, 'data-force': frame.action === 'loss' ? '1' : null },
          varCell('loss', ds.loss === null ? '–' : fmt(ds.loss), { hot: frame.action === 'loss' })),
        varCell('dw', ds.dw === null ? '–' : fmt(ds.dw), { hot: frame.action === 'gradient' }),
        varCell('db', ds.db === null ? '–' : fmt(ds.db), { hot: frame.action === 'gradient' })));

    const shown = ds.history.slice(-8);
    const offset = ds.history.length - shown.length;
    const histBox = sbox({ target: 'history', name: 'history', kind: '리스트', title: '손실 기록', frame,
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

    return el('div.flow.flow--reg', {},
      sbox({ target: 'table', name: 'X, Y, pred, err …', kind: '리스트', title: '데이터와 계산 열 (열 하나 = 리스트 하나)', frame,
        op: frame.effects.find((e) => e.target.startsWith('col-'))?.op ?? null, cls: 'sbox--table' }, table),
      flowArrow('평균 내서'),
      el('div.flow__col', {}, varsBox, flowArrow('append', 'down'), histBox),
    );
  },
};
