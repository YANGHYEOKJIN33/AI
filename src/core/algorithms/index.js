/**
 * 알고리즘 목록 — 화면은 이 표만 보고 알고리즘을 부른다.
 * 새 알고리즘을 더할 때: 이 폴더에 한 파일 + 이 표에 한 줄 + src/ui/views/에 보기 한 파일.
 */
import * as knn from './knn.js';
import * as kmeans from './kmeans.js';
import * as linreg from './linreg.js';
import * as dtree from './dtree.js';

export const ALGORITHMS = { knn, kmeans, linreg, dtree };

/** 하위 탭 순서 */
export const ALGO_ORDER = ['knn', 'kmeans', 'linreg', 'dtree'];

export function getAlgorithm(id) {
  return ALGORITHMS[id] ?? ALGORITHMS.knn;
}

/** 저장된 값이 깨졌거나 예전 형식이어도 안전하게 정해진 조건으로 메워 준다 */
export function normalizeParams(id, params) {
  return getAlgorithm(id).normalize(params ?? {});
}

/** 조건(knob) 하나를 바꾼 새 설정 */
export function withKnob(id, params, key, optionId) {
  const knob = getAlgorithm(id).knobs.find((k) => k.key === key);
  const opt = knob?.options.find((o) => o.id === optionId);
  return normalizeParams(id, { ...params, ...(opt?.patch ?? {}) });
}

/** 조건을 사람 말로 (예: "토마토 (6, 4) · k = 3") */
export function conditionText(id, params) {
  const algo = getAlgorithm(id);
  const p = normalizeParams(id, params);
  return algo.knobs.map((k) => k.options.find((o) => o.id === algo.knobValue(p, k.key))?.label ?? '').join(' · ');
}
