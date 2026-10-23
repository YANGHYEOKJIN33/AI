/**
 * 선형회귀 (Linear Regression) — 경사하강법으로 학습 · 회귀 · 지도학습.
 *
 * 자료구조의 흐름 (에폭마다)
 *   X, Y(리스트) ──w·x+b──▶ pred(리스트) ──빼기──▶ err(리스트) ──제곱 평균──▶ loss(변수)
 *   err, X ──평균──▶ dw, db(변수) ──w ← w − lr·dw──▶ w, b(변수 교체) ──append──▶ history(리스트)
 */
import { Recorder } from '../trace.js';
import { fmt } from '../math.js';
import { STUDY } from '../datasets.js';

export const meta = Object.freeze({
  id: 'linreg',
  name: '선형회귀',
  en: 'Linear Regression',
  short: '선형회귀',
  task: '회귀',
  learning: '지도학습',
  jumpLabel: '다음 에폭',
  phases: ['직선으로 예측하기', '오차와 손실 재기', '기울기로 w·b 고치기', '손실 기록하기(반복)'],
});

export const EPOCHS = 20;
/** 손실이 이만큼 커지면 발산으로 보고 멈춘다(화면이 엉뚱한 수로 가득 차지 않게) */
const DIVERGE_AT = 1e5;

export const defaults = Object.freeze({ lr: 0.05 });

export function pseudo(params = defaults) {
  return [
    'w ← 0,  b ← 0                 (처음 직선: y = 0)',
    `정해진 횟수(에폭 ${EPOCHS}번)만큼 반복:`,
    '    각 i에 대해 예측[i] ← w × x[i] + b',
    '    각 i에 대해 오차[i] ← 예측[i] − y[i]',
    '    손실 ← 오차[i]²의 평균   (평균제곱오차 MSE)',
    '    dw ← 2 × (오차[i] × x[i])의 평균,   db ← 2 × 오차[i]의 평균',
    `    w ← w − 학습률 × dw,   b ← b − 학습률 × db   (학습률 = ${params.lr})`,
    '    손실 기록에 손실을 추가한다',
    'w, b를 돌려준다',
  ];
}

export function python(params = defaults) {
  return [
    'w, b = 0, 0',
    `for epoch in range(${EPOCHS}):`,
    '    pred = [w * x + b for x in X]',
    '    err = [p - y for p, y in zip(pred, Y)]',
    '    loss = sum(e * e for e in err) / n',
    '    dw = 2 * sum(e * x for e, x in zip(err, X)) / n; db = 2 * sum(err) / n',
    `    w = w - ${params.lr} * dw; b = b - ${params.lr} * db`,
    '    history.append(loss)',
    'return w, b',
  ];
}

export const notes = [
  '기울기 w와 절편 b를 0으로 두고 시작해요. 처음 직선은 바닥에 누운 y = 0이에요.',
  '같은 과정을 정해진 횟수만큼 되풀이해요. 데이터 전체를 한 번 훑는 것을 에폭(epoch)이라고 해요.',
  '지금의 w, b로 모든 x의 예측값을 계산해 예측 리스트를 채워요. 그림의 직선이 바로 이 예측이에요.',
  '예측에서 실제 y를 빼 오차 리스트를 만들어요. 그림의 세로 막대가 오차예요(+면 직선이 위, −면 아래).',
  '오차를 제곱해 평균 낸 값이 손실(MSE)이에요. 제곱하면 +와 −가 상쇄되지 않고, 큰 오차가 더 크게 벌 받아요.',
  '손실이 w, b 쪽으로 얼마나 기울었는지(기울기)를 구해요. dw > 0이면 w를 줄여야 손실이 줄어요.',
  '기울기의 반대 방향으로 학습률만큼 한 걸음 옮겨요(갱신). 이것이 경사하강법의 핵심 한 줄이에요.',
  '이번 에폭의 손실을 기록 리스트 뒤에 붙여요(append). 기록이 줄어들면 학습이 잘 되고 있는 거예요.',
  '반복이 끝나면 마지막 w, b가 학습된 직선이에요.',
];

export const coreLine = 6;
export const coreWhy = '학습률이 작으면 천천히, 알맞으면 빠르게 내려가고, 너무 크면 골짜기를 넘어 튕겨 나가요(발산).';
export const swap = Object.freeze({
  label: '학습률 lr',
  options: [
    { id: 'lr0.01', text: 'w = w - 0.01 * dw   # 작은 학습률',  params: { lr: 0.01 } },
    { id: 'lr0.05', text: 'w = w - 0.05 * dw   # 알맞은 학습률', params: { lr: 0.05 } },
    { id: 'lr0.1',  text: 'w = w - 0.1 * dw    # 너무 큰 학습률', params: { lr: 0.1 } },
  ],
});
export function swapIdOf(params) { return `lr${params.lr}`; }

export function run(params = defaults) {
  const lr = params.lr ?? defaults.lr;
  const { X, Y } = STUDY;
  const n = X.length;
  const rec = new Recorder();

  const ds = {
    lr, epoch: 0,
    w: 0, b: 0,
    pred: null, err: null, sq: null, ex: null,
    loss: null, dw: null, db: null,
    prevW: null, prevB: null,
    history: [],
    diverged: false,
    done: false,
  };

  rec.frame({
    line: 1, action: 'init', phase: 0, ds,
    effects: [{ target: 'vars', op: '= 0' }],
    narration: 'w = 0, b = 0에서 출발합니다. 처음 직선은 y = 0 (바닥).',
  });

  let stoppedEarly = false;
  for (let epoch = 1; epoch <= EPOCHS; epoch += 1) {
    ds.epoch = epoch;
    ds.pred = null; ds.err = null; ds.sq = null; ds.ex = null;
    ds.dw = null; ds.db = null; ds.prevW = null; ds.prevB = null;
    rec.frame({
      line: 2, action: 'loop', phase: 0, iter: epoch, ds,
      narration: `${epoch}번째 에폭을 시작합니다. 지난 에폭의 계산 열은 비웁니다.`,
    });

    // 3: 예측
    ds.pred = X.map((x) => ds.w * x + ds.b);
    rec.frame({
      line: 3, action: 'predict', phase: 0, iter: epoch, ds,
      effects: [{ target: 'col-pred', op: '리스트 채우기' }],
      narration: `지금 직선 y = ${fmt(ds.w)}x + ${fmt(ds.b)}로 x 다섯 개의 예측값을 계산해 예측 열을 채웁니다.`,
      calc: {
        title: '📈 예측[i] = w × x[i] + b',
        rows: X.map((x, i) => `x = ${x}:  ${fmt(ds.w)} × ${x} + ${fmt(ds.b)} = ${fmt(ds.pred[i])}`),
      },
    });

    // 4: 오차
    ds.err = ds.pred.map((p, i) => p - Y[i]);
    rec.frame({
      line: 4, action: 'error', phase: 1, iter: epoch, ds,
      effects: [{ target: 'col-err', op: '리스트 채우기' }],
      narration: '예측에서 실제 점수를 빼 오차 열을 채웁니다. 그림의 세로 막대가 오차입니다.',
      calc: {
        title: '↕ 오차[i] = 예측[i] − y[i]',
        rows: X.map((x, i) => `x = ${x}:  ${fmt(ds.pred[i])} − ${Y[i]} = ${fmt(ds.err[i])}`),
      },
    });

    // 5: 손실
    ds.sq = ds.err.map((e) => e * e);
    const loss = ds.sq.reduce((s, v) => s + v, 0) / n;
    const prevLoss = ds.history.length ? ds.history[ds.history.length - 1] : null;
    ds.loss = loss;
    rec.frame({
      line: 5, action: 'loss', phase: 1, iter: epoch, ds,
      effects: [{ target: 'col-sq', op: '제곱' }, { target: 'vars', op: 'loss' }],
      narration: `오차를 제곱해 평균 내면 손실은 ${fmt(loss)}입니다.` +
        (prevLoss !== null ? ` (지난 에폭 ${fmt(prevLoss)}보다 ${loss < prevLoss ? '줄었어요' : '커졌어요!'})` : ''),
      calc: {
        title: '🎯 손실 = 오차²의 평균',
        rows: [
          `(${ds.sq.map((v) => fmt(v)).join(' + ')}) / ${n}`,
          `= ${fmt(loss)}`,
        ],
      },
      ask: (epoch === 2 || epoch === 3) && prevLoss !== null ? {
        q: `🔮 이번 손실은 지난 에폭(${fmt(prevLoss)})보다?`,
        options: ['줄어든다', '커진다'],
        answer: loss < prevLoss ? 0 : 1,
        why: loss < prevLoss
          ? '기울기 반대 방향으로 알맞게 한 걸음 옮겨서 직선이 점들에 더 가까워졌어요.'
          : '학습률이 너무 커서 골짜기 반대편으로 넘어가 버렸어요(발산).',
      } : null,
    });

    // 6: 기울기
    ds.ex = ds.err.map((e, i) => e * X[i]);
    const dw = (2 * ds.ex.reduce((s, v) => s + v, 0)) / n;
    const db = (2 * ds.err.reduce((s, v) => s + v, 0)) / n;
    ds.dw = dw;
    ds.db = db;
    rec.frame({
      line: 6, action: 'gradient', phase: 2, iter: epoch, ds,
      effects: [{ target: 'col-ex', op: '곱하기' }, { target: 'vars', op: 'dw, db' }],
      narration: `기울기를 구합니다: dw = ${fmt(dw)}, db = ${fmt(db)}. ${dw < 0 ? 'dw가 음수 → w를 키워야 손실이 줄어요.' : 'dw가 양수 → w를 줄여야 손실이 줄어요.'}`,
      calc: {
        title: '⛰ 기울기',
        rows: [
          `dw = 2 × (${ds.ex.map((v) => fmt(v)).join(' + ')}) / ${n} = ${fmt(dw)}`,
          `db = 2 × (${ds.err.map((v) => fmt(v)).join(' + ')}) / ${n} = ${fmt(db)}`,
        ],
      },
    });

    // 7: 갱신
    ds.prevW = ds.w;
    ds.prevB = ds.b;
    const newW = ds.w - lr * dw;
    const newB = ds.b - lr * db;
    const wUp = newW > ds.w;
    ds.w = newW;
    ds.b = newB;
    rec.frame({
      line: 7, action: 'update', phase: 2, iter: epoch, ds,
      effects: [{ target: 'vars', op: 'w, b 교체' }],
      narration: `w를 ${fmt(ds.prevW)} → ${fmt(newW)}, b를 ${fmt(ds.prevB)} → ${fmt(newB)}로 고칩니다. 직선이 움직여요.`,
      calc: {
        title: '🔁 w ← w − 학습률 × dw',
        rows: [
          `w = ${fmt(ds.prevW)} − ${lr} × (${fmt(dw)}) = ${fmt(newW)}`,
          `b = ${fmt(ds.prevB)} − ${lr} × (${fmt(db)}) = ${fmt(newB)}`,
        ],
      },
      ask: epoch <= 2 ? {
        q: `🔮 dw = ${fmt(dw)}입니다. 이번 갱신으로 w는?`,
        options: ['커진다', '작아진다'],
        answer: wUp ? 0 : 1,
        why: `w ← w − 학습률 × dw. dw가 ${dw < 0 ? '음수라 빼면 오히려 더해져서 w가 커져요' : '양수라 빼면 w가 작아져요'}.`,
      } : null,
    });

    // 8: 기록
    ds.history.push(loss);
    rec.frame({
      line: 8, action: 'record', phase: 3, iter: epoch, ds,
      effects: [{ target: 'history', op: 'append' }],
      narration: `손실 ${fmt(loss)}을 기록 리스트에 추가합니다 (기록 ${ds.history.length}개).`,
    });

    if (!Number.isFinite(loss) || loss > DIVERGE_AT) {
      ds.diverged = true;
      stoppedEarly = true;
      rec.frame({
        line: 2, action: 'diverge', phase: 3, iter: epoch, ds,
        narration: '손실이 너무 커졌습니다(발산). 학습률이 너무 커서 더 돌려도 소용없으니 여기서 멈춰 봅니다.',
      });
      break;
    }
  }

  ds.done = true;
  ds.pred = null; ds.err = null; ds.sq = null; ds.ex = null;
  rec.frame({
    line: 9, action: 'result', phase: 3, iter: ds.epoch, ds,
    effects: [{ target: 'result', op: 'return' }],
    narration: ds.diverged
      ? `발산했습니다: w = ${fmt(ds.w)}, b = ${fmt(ds.b)}. 학습률을 줄여 보세요.`
      : `학습 끝! 직선 y = ${fmt(ds.w)}x + ${fmt(ds.b)} (최소제곱 참값 y = ${STUDY.best.w}x + ${STUDY.best.b}에 가까워요).`,
    calc: {
      title: '🏁 학습된 직선',
      rows: [
        `y = ${fmt(ds.w)} × x + ${fmt(ds.b)}`,
        `마지막 손실 = ${fmt(ds.history[ds.history.length - 1])}`,
        ds.diverged ? '⚠ 발산 — 학습률이 너무 커요' : `참값(최소제곱) y = ${STUDY.best.w}x + ${STUDY.best.b}`,
      ],
    },
  });

  return {
    frames: rec.frames,
    data: { X, Y },
    result: { w: ds.w, b: ds.b, history: ds.history, diverged: ds.diverged, stoppedEarly },
    params: { lr },
  };
}

/** 학습된 직선으로 예측 — 써 보기용 */
export function predict(w, b, x) { return w * x + b; }
