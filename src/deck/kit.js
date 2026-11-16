/**
 * 장면 틀 — 차시마다 되풀이되는 화면(표지 · 설명 · 질문 · 활동 · 지도 · 확인 문제 · 정리)을 만드는 함수들.
 * 알고리즘을 한 줄씩 따라가는 장면은 차시 파일(src/lessons/*.js)에서 직접 그린다.
 *
 * 모든 틀은 { id, sec, part, kind, title, beats, render(beat), note }를 돌려준다.
 * 규칙: 박자 하나에 화면의 한 곳만 바뀐다.
 */
import { el } from '../ui/dom.js';
import { options, flowChips } from './parts.js';

const vis = (cond) => (cond ? '' : '.hidden');
const wide = 'flex-direction:column; align-items:flex-start; justify-content:center; padding:36px 90px; gap:30px;';

/** 표지 · 오늘의 목표 — 목표를 하나씩 */
export function cover({ id, question, goals, flow, note }) {
  return {
    id, sec: '도입', part: null, kind: 'cover', title: '표지 · 오늘의 목표', beats: 1 + goals.length, note,
    render: (b) => ({
      main: el('div', { style: `display:flex; width:100%; ${wide}` },
        el('div.label', {}, '오늘의 질문'),
        el('h1', {}, question),
        el(`div.card${vis(b >= 1)}`, { style: 'width:100%' },
          el('div.label', { style: 'margin-bottom:10px' }, '오늘의 목표'),
          goals.map((g, i) => el(`p.lead${vis(b >= i + 1)}`, {}, `${'①②③'[i]} `, g))),
        flowChips(flow)),
    }),
  };
}

/**
 * 설명 — 큰 제목 한 줄 + 문장을 하나씩 (+ 오른쪽에 그림 하나).
 * lines: [문자열 | 노드 | (beat) => 노드], figure: (beat) => 노드
 */
export function say({ id, sec, part = null, title, heading, lines = [], figure = null, beats = null, note, kind = 'idea', group = null }) {
  const n = beats ?? Math.max(1, lines.length);
  return {
    id, sec, part, kind, title, beats: n, note, group,
    render: (b) => {
      const text = el('div.col', { style: figure ? 'flex:0 0 640px; gap:26px;' : 'gap:28px; max-width:1300px;' },
        heading ? el('h2', {}, heading) : null,
        lines.map((ln, i) => el(`p.lead${vis(b >= i)}`, {}, typeof ln === 'function' ? ln(b) : ln)));
      return { main: figure ? [text, figure(b)] : el('div', { style: `display:flex; width:100%; ${wide}` }, text) };
    },
  };
}

/** 멈춤 질문 — 먼저 생각하게 하고, 답은 다음 클릭에 */
export function ask({ id, sec, part = null, title, q, opts = null, answer = null, answerText = null, figure = null, side = null, talk = '짝과 30초 이야기해 보세요.', note, group = null }) {
  return {
    id, sec, part, kind: 'ask', title, beats: 2, note, group,
    render: (b) => {
      const body = el('div.col', { style: 'align-items:center; gap:30px;' },
        el('div.label', {}, '✋ 먼저 생각해 보기'),
        figure ? figure(b) : null,
        el('div.q', side ? { style: 'font-size:48px' } : {}, q),
        opts ? options(opts, b >= 1 ? answer : null) : null,
        b >= 1 && answerText ? el('div.why', {}, answerText) : null,
        b === 0 ? el('div.hint', {}, talk, ' ', el('span.key', {}, '→'), ' 를 누르면 답이 나와요.') : null);
      return { main: side ? [side(b), body] : body };
    },
  };
}

/** 활동 — 활동지 번호와 할 일, 타이머(T). 다음 클릭에 답 */
export function activity({ id, sec, part = null, no, task, seconds, answer, note, group = null }) {
  return {
    id, sec, part, kind: 'activity', title: `활동 ${'①②③④'[no - 1]}`, beats: 2, note, group,
    render: (b) => ({
      timer: seconds,
      main: el('div.col', { style: 'align-items:center; gap:34px; max-width:1300px;' },
        el('div.label', { style: 'font-size:32px' }, `✏️ 활동지 ${'①②③④'[no - 1]}번`),
        el('div.q', { style: 'font-size:50px' }, task),
        b >= 1 ? el('div.why', { style: 'font-size:36px' }, answer) : el('div.hint', {}, el('span.key', {}, 'T'), ' 타이머 시작 · ', el('span.key', {}, '→'), ' 답 확인')),
    }),
  };
}

/** 지도 — 의사코드 전체에서 "지금 여기"를 보여 준다 */
export function codeMap({ id, part, lines, range, title = null, note }) {
  const [a, z] = range;
  return {
    id, sec: '전개', part, kind: 'map', title: title ?? `지도 — 의사코드 ${a === z ? `${a}줄` : `${a}~${z}줄`}`, beats: 1, note,
    render: () => ({
      main: el('div.col', { style: 'gap:14px;' },
        el('div.label', {}, `지금 여기 — ${a === z ? `${a}줄` : `${a}~${z}줄`}`),
        el('ol.codemap', {}, lines.map((t, i) => el(`li${i + 1 < a ? '.was' : i + 1 > z ? '.off' : '.on'}`, {}, el('span.no', {}, String(i + 1)), t)))),
    }),
  };
}

/** 확인 문제 — 시험 형식. 다음 클릭에 정답과 풀이 */
export function check({ id, n, total, q, opts, answer, why, note }) {
  return {
    id, sec: '정리', part: null, kind: 'check', title: `확인 문제 ${n}`, beats: 2, note,
    render: (b) => ({
      main: el('div.col', { style: 'gap:28px; width:100%; padding:0 70px;' },
        el('div.label', { style: 'font-size:30px' }, `📝 확인 문제 ${n} / ${total} — 활동지에 답을 적으세요`),
        el('div.q', { style: 'font-size:48px; text-align:left;' }, q),
        el('div', { style: 'display:grid; grid-template-columns:1fr 1fr; gap:18px;' },
          opts.map((o, i) => el(`div.opt${b >= 1 ? (i === answer ? '.right' : '.off') : ''}`, { style: 'text-align:left; font-family:var(--font-code);' }, `${'①②③④'[i]} `, o))),
        b >= 1 ? el('div.why', {}, why) : el('div.hint', {}, el('span.key', {}, '→'), ' 정답과 풀이')),
    }),
  };
}

/** 한 장 정리 — 자료구조 흐름 한 줄 + 문장 셋 */
export function summary({ id, flow, points, note }) {
  return {
    id, sec: '정리', part: null, kind: 'summary', title: '한 장 정리', beats: 1 + points.length, note,
    render: (b) => ({
      main: el('div', { style: `display:flex; width:100%; ${wide}` },
        el('div.label', {}, '오늘 따라간 길 — 데이터가 옮겨 간 자료구조'),
        flowChips(flow),
        el('div.card', { style: 'width:100%' }, points.map((p, i) => el(`p.lead${vis(b >= i + 1)}`, {}, `${'①②③④'[i]} `, p)))),
    }),
  };
}
