/**
 * 교실 가독성 점검 — 실제 교실 화면에 띄워 뒷자리에서 어느 크기까지 읽히는지 확인한다 (PLAN-v3 4.1).
 * 수업 화면은 가장 작은 글자를 화면 높이의 2.4%로 잡았다. 이 줄이 뒷자리에서 안 읽히면 알려 주세요 — 기준을 키웁니다.
 */
import { el } from '../ui/dom.js';
import { dsBox, cell, pairValue, labelMark } from '../deck/parts.js';

const SIZES = [[45, '5.0%', '제목'], [34, '3.8%', '본문'], [30, '3.3%', '자료구조 칸'], [26, '2.9%', '칸 번호'], [22, '2.4%', '가장 작은 글자 — 여기까지 읽혀야 합니다'], [18, '2.0%', '쓰지 않음'], [14, '1.6%', '쓰지 않음(예전 화면의 본문 크기)']];
const note = (say) => ({ min: 1, say, ask: '맨 뒷자리에서 몇 번째 줄까지 읽히나요?', expect: '다섯째 줄(2.4%)까지 읽히면 합격.' });

const scenes = [
  // 쓰지 않는 크기(2.0%·1.6%)를 일부러 보여 주는 견본이라 정보량 점검에서 뺀다
  { id: 'c1', sec: '점검', part: null, kind: 'check', title: '글자 크기 견본', beats: 1, budgetExempt: true, note: note('맨 뒷자리에 앉아 위에서부터 읽어 봅니다. 읽히는 마지막 줄을 확인합니다.'),
    render: () => ({ main: el('div.col', { style: 'gap:10px; align-items:flex-start; width:100%; padding:0 60px;' },
      SIZES.map(([px, pct, use], i) => el('div', { 'data-sample': '1', style: `font-size:${px}px; line-height:1.35; ${i === 4 ? 'color:var(--blue); font-weight:700;' : ''} ${i > 4 ? 'color:var(--muted);' : ''}` },
        `${i + 1}. 화면 높이의 ${pct} · 토마토 (6, 4) ↔ 오렌지 (7, 3) d² = 2 · ${use}`))) }) },
  { id: 'c2', sec: '점검', part: null, kind: 'check', title: '자료구조 견본', beats: 1, note: note('실제 수업 장면과 같은 크기의 리스트입니다. 칸 번호와 이름까지 읽히는지 봅니다.'),
    render: () => ({ line: { no: 4, code: 'distances에 (d², 레이블)을 추가한다', what: '견본' },
      main: [dsBox({ name: 'distances', kind: '리스트 · 3칸', hot: true, width: 640 },
        cell({ ix: 0, value: pairValue(34, '과일'), name: '사과' }), cell({ ix: 1, value: pairValue(8, '과일'), name: '포도' }), cell({ ix: 2, value: pairValue(5, '단백질'), name: '견과류', state: 'new', tag: '방금 추가' })),
      dsBox({ name: 'distances', kind: '촘촘한 칸', dense: true, width: 580 },
        cell({ ix: 0, value: pairValue(34, '과일'), name: '사과' }), cell({ ix: 1, value: pairValue(17, '채소'), name: '당근' }), cell({ ix: 2, value: pairValue(5, '단백질'), name: '견과류' }))],
      cap: [el('code', {}, 'distances'), ' ', el('span.old', {}, '2칸'), ' → ', el('b', {}, '3칸')] }) },
  { id: 'c3', sec: '점검', part: null, kind: 'check', title: '색과 모양 견본', beats: 1, note: { min: 1, say: '색이 흐린 프로젝터에서도 모양(● ▲ ■)으로 구분되는지 봅니다.', ask: '세 레이블이 구분되나요?', expect: '색이 비슷해 보여도 모양으로 구분된다.' },
    render: () => ({ main: el('div.col', { style: 'gap:30px; align-items:center;' },
      el('h2', {}, '색이 흐려도 모양으로 구분됩니다'),
      el('div.row', { style: 'font-size:56px; gap:60px; font-weight:800;' }, labelMark('과일'), labelMark('채소'), labelMark('단백질')),
      el('div.row', {}, el('span.pill.on', {}, '지금 = 파랑'), el('span.pill', { style: 'background:var(--green-bg); color:var(--green); font-weight:700;' }, '방금 들어옴 = 초록'), el('span.pill', { style: 'background:var(--orange-bg); color:var(--orange); font-weight:700;' }, '결과 = 주황'))) }) },
];

export const lesson = { id: 'check', badge: '점검', title: '교실 가독성 점검', parts: null, scenes, goals: [], materials: [] };
