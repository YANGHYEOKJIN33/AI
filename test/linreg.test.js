import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as linreg from '../src/core/algorithms/linreg.js';
import { STUDY } from '../src/core/datasets.js';

const { X, Y } = STUDY;
const mse = (w, b) => X.reduce((s, x, i) => s + (w * x + b - Y[i]) ** 2, 0) / X.length;

test('최소제곱 참값 w=1.7, b=0.3이 데이터와 맞는다', () => {
  const mx = X.reduce((s, v) => s + v, 0) / X.length;
  const my = Y.reduce((s, v) => s + v, 0) / Y.length;
  const w = X.reduce((s, x, i) => s + (x - mx) * (Y[i] - my), 0) / X.reduce((s, x) => s + (x - mx) ** 2, 0);
  assert.ok(Math.abs(w - STUDY.best.w) < 1e-9);
  assert.ok(Math.abs(my - w * mx - STUDY.best.b) < 1e-9);
});

test('학습률 0.05: 손실이 줄어들고 참값 근처에 도착한다', () => {
  const r = linreg.run({ lr: 0.05 });
  const h = r.result.history;
  assert.equal(h[0], 35);
  assert.ok(h.at(-1) < 0.1);
  assert.ok(Math.abs(r.result.w - STUDY.best.w) < 0.1);
  assert.equal(r.result.diverged, false);
});

test('학습률 0.01: 손실이 매 에폭 줄어든다(느리지만 꾸준히)', () => {
  const h = linreg.run({ lr: 0.01 }).result.history;
  for (let i = 1; i < h.length; i += 1) assert.ok(h[i] < h[i - 1]);
});

test('학습률 0.1: 손실이 커지며 발산한다', () => {
  const r = linreg.run({ lr: 0.1 });
  assert.equal(r.result.diverged, true);
  const h = r.result.history;
  assert.ok(h.at(-1) > h[0] * 100);
});

test('기울기 dw·db가 수치 미분과 같다', () => {
  const r = linreg.run({ lr: 0.05 });
  const f = r.frames.find((fr) => fr.action === 'gradient' && fr.iter === 3);
  const prev = r.frames[r.frames.indexOf(f) - 1].ds;   // 이 에폭의 w, b
  const eps = 1e-6;
  const dwNum = (mse(prev.w + eps, prev.b) - mse(prev.w - eps, prev.b)) / (2 * eps);
  const dbNum = (mse(prev.w, prev.b + eps) - mse(prev.w, prev.b - eps)) / (2 * eps);
  assert.ok(Math.abs(f.ds.dw - dwNum) < 1e-4);
  assert.ok(Math.abs(f.ds.db - dbNum) < 1e-4);
});

test('기록 리스트는 에폭마다 한 칸씩 자란다', () => {
  const r = linreg.run();
  const recs = r.frames.filter((f) => f.action === 'record');
  recs.forEach((f, i) => assert.equal(f.ds.history.length, i + 1));
});
