/**
 * 자료구조 상자 — 데이터 패널에서 리스트·딕셔너리·표·스택을 같은 모양의 "상자"로 그린다.
 *
 *   ┌ distances  리스트 · 거리 목록         [append] ┐   ← 이 줄이 바꾼 상자는 빛나고 꼬리표가 붙는다
 *   │  [오렌지 1.41] [견과류 2.24] …                 │
 *   └────────────────────────────────────────────────┘
 *
 * 상자 안 항목에 data-flip(고유 id)을 달면 장면이 바뀔 때 FLIP으로 미끄러져 움직인다.
 * data-from(원본 id)을 달면 원본 자리에서 복사되어 날아온다.
 */
import { el } from './dom.js';
import { infoTerm } from './infoTip.js';

/** 이 장면에서 target 상자가 바뀌었으면 그 꼬리표(op)를, 아니면 null */
export function hotOf(frame, target) {
  if (!frame) return null;
  const hit = frame.effects.find((e) => e.target === target || (target.endsWith('*') && e.target.startsWith(target.slice(0, -1))));
  return hit ? hit.op : null;
}

/**
 * @param {object} o
 *   target : effects와 맞춰 볼 이름
 *   name   : 코드 속 이름 (예: distances)
 *   kind   : 자료구조 종류 (리스트 · 딕셔너리 · 표 · 스택 · 변수)
 *   title  : 우리말 이름
 *   frame  : 지금 장면 — 빛날지 정한다
 *   cls    : 덧붙일 클래스
 *   hint   : 비었을 때 문구
 *   count  : 항목 수 (꼬리에 [n])
 */
export function sbox(o, ...children) {
  const op = o.op ?? (o.frame ? hotOf(o.frame, o.target) : null);
  const items = children.flat(Infinity).filter(Boolean);
  const kindTerm = { 리스트: '리스트', 딕셔너리: '딕셔너리', 스택: '스택', 표: '2차원 리스트', 튜플: '튜플', 변수: '변수' }[o.kind];
  return el(`section.sbox${op ? '.is-hot' : ''}${o.cls ? `.${o.cls}` : ''}`, { 'data-target': o.target },
    el('header.sbox__head', {},
      el('code.sbox__name', {}, o.name),
      o.kind ? el('span.sbox__kind', {}, kindTerm ? infoTerm(kindTerm, { label: o.kind }) : o.kind) : null,
      o.title ? el('span.sbox__title', {}, o.title) : null,
      o.count !== undefined ? el('span.sbox__count', {}, `${o.count}칸`) : null,
      op ? el('span.sbox__op', {}, op) : null,
    ),
    el(`div.sbox__body${o.bodyCls ? `.${o.bodyCls}` : ''}`, {},
      items.length ? items : el('div.sbox__empty', {}, o.hint ?? '비어 있음')),
  );
}

/** 상자 사이 화살표 — 데이터가 흐르는 방향 */
export function flowArrow(label = '', dir = 'right') {
  return el(`div.flowarrow.flowarrow--${dir}`, { 'aria-hidden': 'true' },
    el('span.flowarrow__head', {}, dir === 'down' ? '⬇' : '➜'),
    label ? el('span.flowarrow__label', {}, label) : null);
}

/** 작은 칩(데이터 하나) */
export function chip(o, ...children) {
  const attrs = { title: o.title ?? null };
  if (o.flip) attrs['data-flip'] = o.flip;
  if (o.from) attrs['data-from'] = o.from;
  if (o.enter) attrs['data-enter'] = o.enter;
  if (o.cat) attrs['data-cat'] = o.cat;
  return el(`div.chip${o.cls ? `.${o.cls}` : ''}`, attrs, ...children);
}

/** 레이블·묶음 기호(모양 + 색) — 색만으로 구분하지 않게 모양 글자를 함께 */
const SHAPE_CHAR = { circle: '●', triangle: '▲', square: '■', diamond: '◆', cross: '✖', star: '★' };
export function mark(shape, cat) {
  return el('span.mark', { 'data-cat': cat, 'aria-hidden': 'true' }, SHAPE_CHAR[shape] ?? '●');
}

/** 이름표 붙은 변수 상자 하나 (w = 1.52) */
export function varCell(name, value, { hot = false, prev = null, note = null } = {}) {
  return el(`div.varcell${hot ? '.is-hot' : ''}`, {},
    el('code.varcell__name', {}, name),
    el('span.varcell__eq', {}, '='),
    prev !== null ? el('span.varcell__prev', {}, prev) : null,
    prev !== null ? el('span.varcell__arrow', {}, '→') : null,
    el('strong.varcell__value', {}, value),
    note ? el('span.varcell__note', {}, note) : null,
  );
}
