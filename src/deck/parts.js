/**
 * 수업 화면의 큰 부품들 — 표 · 리스트 · 딕셔너리 · 계산 · 보기 단추.
 * 모두 DOM 노드를 돌려주는 작은 함수다. 움직여야 하는 것에는 data-flip / data-from을 단다(motion.js).
 */
import { el } from '../ui/dom.js';
import { FOOD_LABELS } from '../core/datasets.js';

const SHAPE = { circle: '●', triangle: '▲', square: '■' };
const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cls: `c${i + 1}`, cat: String(i + 1) }]));
export const labelInfo = (label) => LABEL[label];

/** 레이블 = 색 + 모양 + 글자 (색만으로 구분하지 않는다) */
export function labelMark(label, { text = true } = {}) {
  const l = LABEL[label];
  return el(`span.${l.cls}`, {}, `${SHAPE[l.shape]}${text ? ` ${label}` : ''}`);
}

export function arrow() {
  return el('div', { html: '<svg width="110" height="70" viewBox="0 0 110 70"><path d="M4 35h78" stroke="#1857c4" stroke-width="14" stroke-linecap="round"/><path d="M66 10l34 25-34 25" fill="none" stroke="#1857c4" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
}

/** 자료구조 상자: 이름(코드 글꼴) + 종류 + 내용 */
export function dsBox({ name, kind = '', hot = false, dim = false, dense = false, width = null, flip = null }, ...children) {
  return el(`div.ds${hot ? '.hot' : ''}${dim ? '.dim' : ''}${dense ? '.dense' : ''}`, { style: width ? `flex:0 0 ${width}px` : null, 'data-flip': flip },
    el('h3', {}, el('code', {}, name), kind ? el('small', {}, kind) : null),
    ...children);
}

/** 리스트의 한 칸 */
export function cell({ ix = null, value, name = null, state = '', flip = null, from = null, tag = null }) {
  return el(`div.cell${state ? `.${state}` : ''}`, { 'data-flip': flip, 'data-from': from },
    ix === null ? null : el('span.ix', {}, `[${ix}]`),
    el('span.v', {}, value),
    name ? el('span.nm', {}, name) : null,
    tag ? el('span.tagnew', {}, tag) : null);
}

/** (d², 레이블) 한 쌍 */
export const pairValue = (d2, label) => ['(', String(d2), ', ', labelMark(label), ')'];

/** 계산을 한 줄씩 — shown줄까지 보이고 마지막 줄을 강조한다 (나머지는 자리만 차지) */
export function calcLines(lines, shown, { small = false } = {}) {
  return el(`div.calc${small ? '.sm' : ''}`, {}, lines.map((t, i) => el(`div${i < shown ? (i === shown - 1 ? '.now' : '') : '.hidden'}`, {}, t)));
}

/** 보기 단추들 — answer를 주면 정답은 초록, 나머지는 흐리게 */
export function options(list, answer = null) {
  return el('div.opts', {}, list.map((o, i) => el(`div.opt${answer === null ? '' : i === answer ? '.right' : '.off'}`, {}, o)));
}

export function flowChips(items, upTo = items.length) {
  const out = [];
  items.forEach((t, i) => { if (i > 0) out.push(el(`span${i < upTo ? '' : '.hidden'}`, {}, '▸')); out.push(el(`span.pill${i < upTo ? '' : '.hidden'}`, {}, t)); });
  return el('div.flowchips', {}, out);
}

/** 그림 상자 — createPlot으로 만든 svg를 정해진 크기로 */
export function plotBox(plot, size = 590) {
  const ratio = plot.height / plot.width;
  return el('div.plotbox', { style: `width:${size}px;height:${Math.round(size * ratio)}px` }, plot.svg);
}
