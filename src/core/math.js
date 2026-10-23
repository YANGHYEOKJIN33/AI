/**
 * 작은 수학 도구 — 네 알고리즘이 함께 쓴다. 화면을 전혀 모른다.
 */

/** 두 점 (x, y) 사이의 유클리드 거리 */
export function dist(a, b) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

/** 수 목록의 평균 (비어 있으면 NaN) */
export function mean(values) {
  if (values.length === 0) return NaN;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** 소수 d자리에서 반올림한 수 */
export function round(value, d = 2) {
  const p = 10 ** d;
  return Math.round(value * p) / p;
}

/**
 * 화면에 보일 수 — 소수 d자리까지, 뒤쪽 0은 떼고, 음수는 진짜 빼기표(−)로.
 * 아주 큰 수(발산)는 지수 표기로 줄인다.
 */
export function fmt(value, d = 2) {
  if (value === null || value === undefined || Number.isNaN(value)) return '–';
  if (!Number.isFinite(value)) return value > 0 ? '∞' : '−∞';
  const abs = Math.abs(value);
  let text;
  if (abs >= 1e5) text = abs.toExponential(1).replace('e+', '×10^');
  else text = String(round(abs, d));
  if (round(value, d) === 0 && abs < 1e5) return '0';
  return value < 0 ? `−${text}` : text;
}

/** 레이블 개수(딕셔너리처럼 {레이블: 개수})로 지니 불순도: 1 − Σ p² */
export function gini(counts) {
  const n = Object.values(counts).reduce((s, v) => s + v, 0);
  if (n === 0) return 0;
  return 1 - Object.values(counts).reduce((s, c) => s + (c / n) ** 2, 0);
}

/** 레이블 개수로 엔트로피: −Σ p·log₂p */
export function entropy(counts) {
  const n = Object.values(counts).reduce((s, v) => s + v, 0);
  if (n === 0) return 0;
  return Object.values(counts).reduce((s, c) => {
    if (c === 0) return s;
    const p = c / n;
    return s - p * Math.log2(p);
  }, 0);
}

/** 목록에서 키별 개수를 센다 — 넣은 순서를 지키는 [ [키, 개수], ... ] (파이썬 dict와 같은 순서) */
export function countBy(items, keyOf = (x) => x) {
  const map = new Map();
  for (const it of items) {
    const k = keyOf(it);
    map.set(k, (map.get(k) ?? 0) + 1);
  }
  return map;
}

/** Map을 평범한 객체로 (순서 유지) */
export function mapToObject(map) {
  return Object.fromEntries(map);
}
