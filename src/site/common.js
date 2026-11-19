/**
 * 사이트 틀(v4)의 탭들이 함께 쓰는 도우미 — 쪽 만들기 · 숨기기 · 줄 · 확인 문제 · 연습 연결 쪽.
 *
 * 쪽 = { id, title, sentence, code: [처음 줄, 끝 줄] | null, min(분), steps: [단계] }
 * 단계 = { on(지금 줄), left(왼쪽 칸), right(오른쪽 칸), plot(그림으로 바꿔 볼 때),
 *          cap(아래 띠: 바뀐 것), ask(아래 띠: 질문 · 활동), timer, note(교사 노트) }
 * 규칙: ▶ 한 단계에 왼쪽이나 오른쪽 한쪽만 바뀐다(아래 띠는 함께 바뀌어도 된다).
 */
import { el } from '../ui/dom.js';

/** 앞 단계의 모습을 이어받아 바뀐 것만 적는다. cap · ask · timer는 그 단계에서만 */
export function page(def, build) {
  const steps = [];
  let cur = { on: null, left: null, right: null, plot: null, note: null };
  const step = (patch) => { cur = { ...cur, cap: null, capLabel: null, ask: null, timer: null, ...patch }; steps.push(cur); };
  build(step);
  return { ...def, steps };
}
export const hide = (node, shown) => { if (!shown) node.classList.add('hidden'); return node; };
/** 줄을 n개까지 보인다(나머지는 자리만) */
export const lines = (items, n, style = '') => el('div.col', { style: `gap:20px; ${style}` }, items.map((it, i) => hide(typeof it === 'string' ? el('p.lead', {}, it) : it, i < n)));
export const arrowRight = (rotate = 0) => el('div', { style: rotate ? `transform:rotate(${rotate}deg)` : null, html: '<svg width="56" height="40" viewBox="0 0 110 70"><path d="M4 35h78" stroke="#1857c4" stroke-width="14" stroke-linecap="round"/><path d="M66 10l34 25-34 25" fill="none" stroke="#1857c4" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>' });
export const tag = (text, color = 'var(--muted)') => el('div.small', { style: `font-weight:700; color:${color}` }, text);
export const big = (text, style = '') => el('p.lead', { style: `font-size:28px; ${style}` }, text);

/** 확인 문제 한 개를 오른쪽 칸에 */
export const quizView = (c, i, n, done) => () => el('div.col', { style: 'gap:14px; width:100%;' },
  el('div.label', { style: 'font-size:26px' }, `📝 확인 문제 ${i + 1} / ${n} — 활동지에 답을 적으세요`),
  el('p.lead', { style: 'font-size:30px; font-weight:800;' }, c.q),
  el('div.col', { style: 'gap:8px;' }, c.opts.map((o, j) => el(`div.opt${done ? (j === c.answer ? '.right' : '.off') : ''}`, { style: 'text-align:left; font-size:26px; padding:6px 18px; font-family:var(--font-code);' }, `${'①②③④'[j]} `, o))));

/** 정리 · 확인 문제 쪽: 왼쪽에 문장을 하나씩, 오른쪽에 흐름 → 확인 문제 */
export function wrapPage({ points, next, flow, checks, note }) {
  const left = (n) => () => lines([el('div.label', {}, '오늘 정리'), ...points.map((p, i) => big([`${'①②③'[i]} `, p])), big(next, 'color:var(--orange); font-weight:800;')], n);
  const flowView = () => el('div.col', { style: 'gap:12px; align-items:center;' }, flow.flatMap((t, i) => [i ? el('div', { style: 'color:var(--blue); font-size:26px; line-height:1' }, '⬇') : null, el('span.pill', {}, t)]));
  return page({ id: 'wrap', title: '정리 · 확인 문제', sentence: '세 문장으로 정리하고, 확인 문제 3개를 풀어요.', code: null, leftTitle: '정리', min: 8 }, (s) => {
    s({ left: left(1), right: flowView, note });
    for (let n = 2; n <= points.length + 1; n += 1) s({ left: left(n) });
    checks.forEach((c, i) => {
      s({ right: quizView(c, i, checks.length, false), note: { say: '활동지에 답을 적게 한 뒤 정답을 보여 줍니다.', ask: '왜 그 답인가요?', expect: `${'①②③④'[c.answer]} — ${c.why}` } });
      s({ right: quizView(c, i, checks.length, true), cap: [`${'①②③④'[c.answer]} ${c.opts[c.answer]}`], capLabel: '정답' });
    });
    s({ left: left(points.length + 2) });
  });
}

/** 아직 이전 화면(연습)에 있는 쪽으로 보내는 쪽 */
export const linkPage = (algo, id, title, sentence, pageId, text) => page({ id, title, sentence, code: null, leftTitle: '연습', link: true, min: 0 }, (s) => {
  s({ left: () => lines([el('h2', { style: 'font-size:40px' }, title), big(text)], 2),
    right: () => el('a.biglink', { href: `./practice.html?mode=algo&algo=${algo}&page=${pageId}` }, `${title} 열기 →`),
    note: { say: text, ask: '—', expect: '—' } });
});
export const practicePages = (algo) => [
  linkPage(algo, 'trace', '추적표로 정리', '시험처럼 표를 직접 채워 봐요.', 'trace', '칸의 "?"를 먼저 스스로 계산하고, 눌러서 확인합니다. 조건을 바꿔 다시 풀 수 있어요.'),
  linkPage(algo, 'exam', '시험 대비 연습', '기말고사와 같은 형식의 문제예요.', 'exam', '조건이 바뀌는 문제를 한 문제씩 풀고, 틀리면 그 장면으로 돌아가 확인합니다.'),
];

/** 의사코드를 사이트 틀에 맞게 (두 칸 이상 띄어 쓴 주석 정리, 들여쓰기 반으로) */
export const codeOf = (pseudo) => pseudo.map((t) => t.replace(/(\S)\s{2,}/g, '$1  ').replace(/^( {4})+/, (m) => ' '.repeat(m.length / 2)));

/**
 * 교사용 자료(teacher.html)가 읽는 차시 모양으로 바꾼다 — 쪽마다, 교사 노트가 바뀌는 단계마다 대본 한 줄.
 * 시간은 쪽의 min을 그 쪽의 대본 줄 수로 나눈다.
 */
export function lessonFromTab(tab, { badge, title, goals, materials, sheet }) {
  const scenes = [];
  tab.pages.forEach((pg, i) => {
    const notes = [];
    pg.steps.forEach((st, k) => { if (st.note && st.note !== pg.steps[k - 1]?.note) notes.push({ st, k }); });
    notes.forEach(({ st, k }) => scenes.push({ id: `${pg.id}-${k}`, title: `${pg.title}${notes.length > 1 ? ` (단계 ${k + 1})` : ''}`, sec: `${i + 1}쪽`, beats: pg.steps.length,
      note: { ...st.note, min: (pg.min ?? 0) / notes.length } }));
  });
  return { id: tab.id, badge, title, goals, materials, checks: tab.checks, sheet, scenes };
}
