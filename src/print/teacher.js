/**
 * 교사용 자료 — 차시 안내 · 활동지 · 정답지 · 수업 대본을 A4로 인쇄한다 (PLAN-v3 6.2 · 6.3 · 6.7).
 * 내용은 모두 차시 파일(src/lessons/*.js)에서 가져온다 — 활동지의 수와 수업 화면의 수가 언제나 같다.
 */
import { el, fill } from '../ui/dom.js';
import { LESSONS, findLesson } from '../lessons/index.js';

const params = new URLSearchParams(location.search);
const TABS = [['guide', '차시 안내'], ['sheet', '활동지'], ['answers', '정답지'], ['script', '수업 대본']];
const ready = LESSONS.filter((l) => l.ready || l.teacher);
const lessonId = ready.some((l) => l.id === params.get('l')) ? params.get('l') : ready[0].id;
const view = TABS.some(([k]) => k === params.get('v')) ? params.get('v') : 'guide';

const go = (patch) => { const p = new URLSearchParams(location.search); for (const [k, v] of Object.entries(patch)) p.set(k, v); location.search = p.toString(); };
fill(document.getElementById('pick'), ready.map((l) => el('option', { value: l.id, selected: l.id === lessonId }, `${l.badge} ${l.title}`)));
document.getElementById('pick').addEventListener('change', (e) => go({ l: e.target.value }));
fill(document.getElementById('tabs'), TABS.map(([k, name]) => el(`button${k === view ? '.on' : ''}`, { type: 'button', onclick: () => go({ v: k }) }, name)));

const { lesson } = await findLesson(lessonId).load();
const doc = document.getElementById('doc');
const head = (title) => el('div.meta', {}, el('b', {}, `${lesson.badge} ${title} — ${lesson.title}`), el('span', {}, '학년      반      번   이름 ____________'));
const cellText = (c, answers) => (c && typeof c === 'object' && c.blank ? (answers ? el('span.ans', {}, c.answer) : '') : c);

function sheetPage(answers) {
  const s = lesson.sheet;
  return el('section.page', {},
    head(answers ? '정답지' : '활동지'),
    el('h1', {}, s.title),
    s.sections.map((sec) => el('div.sec', {},
      el('h2', {}, sec.title),
      sec.hint ? el('p.hint', {}, sec.hint) : null,
      sec.head ? el('table', {}, el('tr', {}, sec.head.map((h) => el('th', {}, h))),
        sec.rows.map((r) => el('tr', {}, r.map((c) => el(`td${c && c.blank ? '.blank' : ''}`, {}, cellText(c, answers)))))) : null,
      sec.boxes ? el('div.boxes', {}, sec.boxes.map((b) => el('span', {}, el('i', {}, b.label), answers ? el('span.ans', {}, b.answer) : null))) : null,
      sec.lines ? el('div.lines', { style: `height:${sec.lines * 34}px` }, answers ? el('span.ans', {}, sec.answer) : null) : null,
      sec.answers ? el('p.answers', {}, sec.answers.map((a) => el('span', {}, `${a.label} (`, answers ? el('span.ans', {}, a.answer) : '   ', ')'))) : null)));
}

function guidePage() {
  const mins = lesson.scenes.reduce((s, x) => s + (x.note?.min ?? 0), 0);
  const secs = [];
  for (const sc of lesson.scenes) { const last = secs[secs.length - 1]; if (last && last.sec === sc.sec) { last.n += 1; last.min += sc.note?.min ?? 0; } else secs.push({ sec: sc.sec, n: 1, min: sc.note?.min ?? 0 }); }
  return el('section.page', {},
    el('h1', {}, `${lesson.badge} ${lesson.title} — 차시 안내`),
    el('h2', {}, '학습 목표'), el('ol', {}, lesson.goals.map((g) => el('li', {}, g))),
    el('h2', {}, '성취기준'), el('div.lines', { style: 'height:60px' }),
    el('h2', {}, '준비물'), el('ul', {}, lesson.materials.map((m) => el('li', {}, m))),
    el('h2', {}, `흐름 (장면 ${lesson.scenes.length}개 · 약 ${Math.round(mins)}분)`),
    el('table', {}, el('tr', {}, el('th', {}, '구간'), el('th', {}, '장면 수'), el('th', {}, '시간')), secs.map((s) => el('tr', {}, el('td', {}, s.sec), el('td', {}, String(s.n)), el('td', {}, `${Math.round(s.min * 2) / 2}분`)))),
    el('h2', {}, '평가'), el('p', {}, `차시 끝 확인 문제 ${lesson.checks.length}개(활동지 ⑤번)와 활동지의 빈칸으로 확인합니다. 정답지는 [정답지] 탭.`),
    el('h2', {}, '수업 화면 조작'),
    el('p', {}, '→ · Space · PageDown 다음 / ← · PageUp 이전 / F 전체 화면 / N 교사 노트 / G 장면 목록 / R 방금 변화 다시 보기 / T 타이머 / B 화면 가리기 / 숫자 + Enter 그 장면으로'),
    el('p.hint', {}, '시간이 모자라면 장면 목록(G)에서 "깊이" 구간의 장면을 건너뛰어도 학습 목표는 달성됩니다.'));
}

function scriptPage() {
  return el('section.page.script', {},
    el('h1', {}, `${lesson.badge} ${lesson.title} — 수업 대본`),
    el('table', {}, el('tr', {}, el('th', {}, '#'), el('th', {}, '장면'), el('th', {}, '이렇게 말해요'), el('th', {}, '이렇게 물어요 / 예상 답'), el('th', {}, '분')),
      lesson.scenes.map((sc, i) => el('tr', {},
        el('td', {}, String(i + 1)), el('td', {}, el('b', {}, sc.title), el('br'), el('span.hint', {}, `${sc.sec} · 박자 ${sc.beats}`)),
        el('td', {}, sc.note?.say ?? ''),
        el('td', {}, sc.note?.ask && sc.note.ask !== '—' ? [sc.note.ask, el('br'), el('span.ans', {}, `→ ${sc.note.expect}`)] : '', sc.note?.watch ? el('div.watch', {}, `오해: ${sc.note.watch}`) : null),
        el('td', {}, String(sc.note?.min ?? ''))))));
}

fill(doc, view === 'guide' ? guidePage() : view === 'sheet' ? sheetPage(false) : view === 'answers' ? sheetPage(true) : scriptPage());
document.title = `${lesson.badge} ${TABS.find(([k]) => k === view)[1]} — 교사용 자료`;
