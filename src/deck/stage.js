/**
 * 수업 무대 — 16:9 화면 한 장을 창 크기에 맞춰 통째로 확대·축소하고, 키·리모컨·터치로 넘긴다.
 *
 * 자리는 늘 같다 (PLAN-v3 4.2):
 *   위 한 줄(어디쯤인지) / 지금 줄(실행 중인 의사코드 한 줄) / 가운데(주인공) / 자막(방금 바뀐 것)
 *
 * 장면(scene) = { id, sec, part, title, beats, group?, render(beat) → { line, main, cap, timer }, note }
 *   line : null이면 "지금 줄" 띠를 감춘다. { no, code, what, wait }
 *   cap  : undefined면 자막 띠를 감춘다. null이면 빈 띠(자리만), 아니면 내용
 *   group: 같은 group의 장면끼리는 넘어갈 때도 데이터가 이어서 움직인다
 */
import { el, fill } from '../ui/dom.js';
import { createDeck, flatIndex, totalBeats, toHash, fromHash } from './engine.js';
import { createMotion } from './motion.js';

const W = 1600;
const H = 900;

export function mountStage(root, lesson) {
  const { scenes } = lesson;
  const storeKey = `mlds-deck:${lesson.id}`;
  const saved = (() => { try { return localStorage.getItem(storeKey); } catch { return null; } })();
  const deck = createDeck(scenes, fromHash(location.hash, scenes) ?? fromHash(saved, scenes));

  // ── 뼈대
  const lessonName = el('span');
  const steps = el('div.steps');
  const count = el('span');
  const lineZone = el('div.s-line', { id: 'zone-line' });
  const mainZone = el('main.s-main', { id: 'zone-main' });
  const capZone = el('div.s-cap', { id: 'zone-cap' });
  const progress = el('i');
  const timerBox = el('div.s-timer', { hidden: true });
  const stage = el('div.stage', { id: 'stage' },
    el('header.s-top', {}, lessonName, steps, count), lineZone, mainZone, capZone, el('div.s-bar', {}, progress), timerBox);
  const wrap = el('div', { id: 'stagewrap' }, stage,
    el('div.edge.l', { title: '이전', onclick: () => deck.prev() }), el('div.edge.r', { title: '다음', onclick: () => deck.next() }));
  const notes = el('aside', { id: 'notes', hidden: true });
  const overview = el('div', { id: 'overview', hidden: true });
  const blank = el('div', { id: 'blank', hidden: true, onclick: () => { blank.hidden = true; } });
  const jumpBox = el('div', { id: 'jump', hidden: true });
  const nav = el('nav.s-nav', {},
    el('button', { type: 'button', title: '이전 (←)', 'aria-label': '이전', onclick: () => deck.prev() }, '◀'),
    el('button', { type: 'button', title: '다음 (→)', 'aria-label': '다음', onclick: () => deck.next() }, '▶'),
    el('button', { type: 'button', title: '장면 목록 · 도움말 (G)', 'aria-label': '장면 목록', onclick: () => toggleOverview() }, '☰'));
  fill(root, el('div', { id: 'shell' }, wrap, notes), overview, blank, jumpBox, nav);

  // ── 무대 맞춤
  let scale = 1;
  function fit() {
    const r = wrap.getBoundingClientRect();
    scale = Math.min(r.width / W, r.height / H);
    stage.style.transform = `translate(-50%, -50%) scale(${scale})`;
  }
  window.addEventListener('resize', fit);
  const motion = createMotion(() => scale);

  // ── 활동 타이머
  let timer = { left: 0, total: 0, id: null };
  function drawTimer() {
    if (!timer.total) { timerBox.hidden = true; return; }
    timerBox.hidden = false;
    const m = Math.floor(timer.left / 60); const s = String(timer.left % 60).padStart(2, '0');
    timerBox.classList.toggle('done', timer.left === 0);
    fill(timerBox, `⏱ ${m}:${s}`, el('small', {}, timer.left === 0 ? '시간 끝' : timer.id ? '' : 'T로 시작'));
  }
  function setTimer(seconds) {
    if (timer.id) clearInterval(timer.id);
    timer = { left: seconds ?? 0, total: seconds ?? 0, id: null };
    drawTimer();
  }
  function toggleTimer() {
    if (!timer.total) return;
    if (timer.id) { clearInterval(timer.id); timer.id = null; drawTimer(); return; }
    if (timer.left === 0) timer.left = timer.total;
    timer.id = setInterval(() => {
      timer.left = Math.max(0, timer.left - 1);
      if (timer.left === 0) { clearInterval(timer.id); timer.id = null; }
      drawTimer();
    }, 1000);
    drawTimer();
  }

  // ── 그리기
  const total = totalBeats(scenes);
  const minutesUpTo = (i) => scenes.slice(0, i + 1).reduce((s, sc) => s + (sc.note?.min ?? 0), 0);
  const minutesAll = minutesUpTo(scenes.length - 1);

  function paint(pos, before = null, how = 'jump') {
    const sc = scenes[pos.scene];
    const out = sc.render(pos.beat);
    stage.classList.toggle('no-line', !out.line);
    stage.classList.toggle('no-cap', out.cap === undefined);
    stage.dataset.scene = sc.id;
    stage.dataset.kind = sc.kind ?? '';
    stage.toggleAttribute('data-dense', Boolean(sc.dense));
    stage.toggleAttribute('data-exempt', Boolean(sc.budgetExempt));

    fill(lessonName, el('b', {}, lesson.badge), ` · ${lesson.title}`);
    if (sc.part !== null && sc.part !== undefined && lesson.parts) {
      fill(steps, lesson.parts.map((p, i) => el(`span${i === sc.part ? '.on' : i < sc.part ? '.done' : ''}`, {}, i < sc.part ? `${p} ✓` : p)));
    } else fill(steps, el('span', {}, sc.sec));
    count.textContent = `장면 ${pos.scene + 1} / ${scenes.length}`;

    if (out.line) {
      lineZone.classList.toggle('is-wait', Boolean(out.line.wait));
      fill(lineZone, el('span.no', {}, String(out.line.no)), el('code', {}, out.line.code), out.line.what ? el('span.what', {}, out.line.what) : null);
    } else fill(lineZone);
    fill(mainZone, out.main);
    capZone.classList.toggle('is-empty', out.cap === null || out.cap === undefined);
    fill(capZone, out.cap ? [el('span.k', {}, out.capLabel ?? '바뀐 것'), el('span', {}, out.cap)] : []);
    progress.style.width = `${((flatIndex(scenes, pos) + 1) / total) * 100}%`;

    const sameFlow = before && (before.scene === pos.scene || (sc.group && scenes[before.scene].group === sc.group));
    motion(mainZone, { reset: !sameFlow, animate: how !== 'still' });

    if (!before || before.scene !== pos.scene) setTimer(out.timer ?? null);
    drawNotes(pos);
    if (!overview.hidden) drawOverview();
    const hash = toHash(pos);
    if (location.hash !== hash) history.replaceState(null, '', hash);
    try { localStorage.setItem(storeKey, hash); } catch { /* 저장이 막혀 있어도 수업은 된다 */ }
  }

  function drawNotes(pos) {
    if (notes.hidden) return;
    const sc = scenes[pos.scene];
    const n = sc.note ?? {};
    const next = scenes[pos.scene + 1];
    fill(notes,
      el('div', {}, el('h4', {}, '이렇게 말해요'), n.say ?? '—'),
      el('div', {}, el('h4', {}, '이렇게 물어요'), n.ask ?? '—'),
      el('div', {}, el('h4', {}, '예상 답 · 주의'), n.expect ?? '—', n.watch ? el('span.watch', {}, `자주 하는 오해: ${n.watch}`) : null),
      el('div.time', {}, `${n.min ?? 0}분`, el('small', {}, `누적 ${Math.round(minutesUpTo(pos.scene))} / ${Math.round(minutesAll)}분`),
        el('small', {}, `박자 ${pos.beat + 1} / ${pos.beats}`), next ? el('small', {}, `다음: ${next.title}`) : null));
  }

  function drawOverview() {
    const now = deck.pos().scene;
    const groups = [];
    scenes.forEach((sc, i) => {
      if (!groups.length || groups[groups.length - 1].sec !== sc.sec) groups.push({ sec: sc.sec, items: [] });
      groups[groups.length - 1].items.push({ sc, i });
    });
    fill(overview,
      el('h2', {}, `${lesson.badge} · ${lesson.title} — 장면 목록`),
      groups.map((g) => [el('div.sec', {}, g.sec), el('div.grid', {}, g.items.map(({ sc, i }) => el(`button${i === now ? '.on' : ''}`, {
        type: 'button', onclick: () => { toggleOverview(false); deck.goTo(i); },
      }, el('b', {}, String(i + 1)), sc.title)))]),
      el('div.keys', {},
        el('kbd', {}, '→'), ' ', el('kbd', {}, 'Space'), ' ', el('kbd', {}, 'PageDown'), ' 다음 · ', el('kbd', {}, '←'), ' ', el('kbd', {}, 'PageUp'), ' 이전 · ',
        el('kbd', {}, '↓'), ' ', el('kbd', {}, '↑'), ' 장면 건너뛰기 · ', el('kbd', {}, 'R'), ' 방금 변화 다시 보기 · ', el('kbd', {}, 'N'), ' 교사 노트 · ',
        el('kbd', {}, 'G'), ' 장면 목록 · ', el('kbd', {}, 'F'), ' 전체 화면 · ', el('kbd', {}, 'B'), ' 화면 가리기 · ', el('kbd', {}, 'T'), ' 타이머 · 숫자 + ', el('kbd', {}, 'Enter'), ' 그 장면으로',
        el('br'), el('a', { href: './index.html', style: 'color:#9fc0ff' }, '← 수업 홈으로'), ' · ',
        el('a', { href: `./teacher.html?l=${lesson.id}`, style: 'color:#9fc0ff' }, '교사용 자료(활동지 · 정답지 · 수업 대본)')));
  }
  function toggleOverview(show = overview.hidden) {
    overview.hidden = !show;
    if (show) { drawOverview(); overview.querySelector('button.on')?.scrollIntoView({ block: 'center' }); }
  }
  function toggleNotes() {
    notes.hidden = !notes.hidden;
    fit();
    drawNotes(deck.pos());
  }
  /** 방금 변화를 다시 — 바로 앞 모습으로 돌려놓았다가 다시 움직인다 */
  function replay() {
    const pos = deck.pos();
    if (pos.beat === 0) { paint(pos, null, 'still'); return; }
    paint({ ...pos, beat: pos.beat - 1 }, pos, 'still');
    setTimeout(() => paint(pos, { ...pos, beat: pos.beat - 1 }, 'next'), 350);
  }

  // ── 키 · 리모컨
  let digits = '';
  function showDigits() { jumpBox.hidden = !digits; jumpBox.textContent = digits ? `장면 ${digits} ⏎` : ''; }
  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!blank.hidden) { blank.hidden = true; e.preventDefault(); return; }
    if (/^\d$/.test(e.key)) { digits = (digits + e.key).slice(-3); showDigits(); return; }
    if (e.key === 'Enter' && digits) { deck.goTo(Number(digits) - 1); digits = ''; showDigits(); toggleOverview(false); e.preventDefault(); return; }
    digits = ''; showDigits();
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const actions = {
      ArrowRight: () => deck.next(), ' ': () => deck.next(), PageDown: () => deck.next(), Enter: () => deck.next(),
      ArrowLeft: () => deck.prev(), PageUp: () => deck.prev(), Backspace: () => deck.prev(),
      ArrowDown: () => deck.nextScene(), ArrowUp: () => deck.prevScene(),
      Home: () => deck.first(), End: () => deck.last(),
      r: replay, n: toggleNotes, g: () => toggleOverview(), t: toggleTimer,
      b: () => { blank.hidden = false; }, '.': () => { blank.hidden = false; },
      f: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); },
      Escape: () => toggleOverview(false),
    };
    const fn = actions[key];
    if (!fn) return;
    e.preventDefault();
    if (!overview.hidden && !['g', 'Escape', 'f'].includes(key)) return;   // 목록이 열려 있으면 넘기지 않는다
    fn();
  });
  window.addEventListener('hashchange', () => {
    const p = fromHash(location.hash, scenes);
    if (p && (p.scene !== deck.pos().scene || p.beat !== deck.pos().beat)) deck.goTo(p.scene, p.beat);
  });

  deck.subscribe(paint);
  fit();
  paint(deck.pos());

  return { deck, replay, toggleNotes, toggleOverview, getScale: () => scale };
}
