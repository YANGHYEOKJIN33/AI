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

/** 저장된 값이 깨졌거나 예전 형식이어도 안전하게 기본값으로 메워 준다 */
export function normalizeParams(id, params) {
  const algo = getAlgorithm(id);
  const merged = { ...algo.defaults, ...(params ?? {}) };
  // 바꿔 보기 목록에 없는 조합이면 기본값으로 (k-NN의 질문점은 자유롭게 둔다)
  const ids = algo.swap.options.map((o) => o.id);
  if (!ids.includes(algo.swapIdOf(merged))) {
    const def = { ...algo.defaults };
    if (id === 'knn' && merged.query) def.query = merged.query;
    return def;
  }
  return merged;
}
