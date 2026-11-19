/**
 * 사이트 틀(v4) — 탭 줄 · 쪽 줄 · 두 칸 작업대(의사코드 | 자료구조) · 아래 띠(바뀐 것 + 실행 단추).
 * 자리는 어느 쪽에서나 같다. ▶ 한 단계에 왼쪽이나 오른쪽 한쪽만 바뀐다. (PLAN-v4 2 · 3장)
 *
 * 화면은 1600×900 기준으로 그리고 창 크기에 맞춰 통째로 확대·축소한다 — 가장 작은 글자가 늘 화면 높이의 2.4% 이상.
 */
import { el, fill } from '../ui/dom.js';
import { createMotion } from '../deck/motion.js';

const W = 1600; const H = 900;
const KEY = 'mlds-site:pos';

export function mountSite(root, { tabs, otherTabs }) {
  let tab = tabs[0];
  let pi = 0; let si = 0;
  let view = 'data';          // 오른쪽 칸: 자료구조 | 그림
  let showAll = false;        // 의사코드 전체 보기
  let notesOpen = false;

  // ── 주소 · 이어서 하기:  #knn/3.5 = k-NN 탭 3쪽의 5번째 단계
  const parse = (h) => { const m = /^#?(\w+)\/(\d+)(?:\.(\d+))?$/.exec(h ?? ''); if (!m) return null; const t = tabs.find((x) => x.id === m[1]); if (!t) return null;
    const p = Math.min(t.pages.length, Math.max(1, +m[2])) - 1; return { t, p, s: Math.min(t.pages[p].steps.length, Math.max(1, +(m[3] ?? 1))) - 1 }; };
  // 사이트는 늘 첫 쪽에서 시작한다. 주소에 위치(#knn/3.5)를 직접 적어 열 때만 그 자리로 간다.
  // 지난번에 멈춘 곳은 자동으로 가지 않고, 첫 화면 아래 띠에 [이어서 하기]로만 보여 준다.
  const linked = parse(location.hash);
  if (linked) { tab = linked.t; pi = linked.p; si = linked.s; }
  if (location.hash) history.replaceState(null, '', location.pathname + location.search);
  const savedRaw = (() => { try { return localStorage.getItem(KEY); } catch { return null; } })();
  let resume = linked ? null : parse(savedRaw);
  if (resume && resume.t === tab && resume.p === 0 && resume.s === 0) resume = null;

  // ── 뼈대
  const tabsBar = el('div.tabs'); const dots = el('div.dots'); const title = el('h2'); const sentence = el('p');
  const leftHead = el('h4'); const leftBody = el('div.body', { id: 'zone-left' });
  const rightHead = el('h4'); const rightBody = el('div.body', { id: 'zone-right' });
  const bottomText = el('span.btext', { id: 'zone-cap' }); const counter = el('small'); const timerBox = el('span.timer', { hidden: true });
  const btn = (label, fn, cls = '') => el(`button${cls}`, { type: 'button', onclick: fn }, label);
  const bottom = el('div.bottom', {}, bottomText, el('div.ctrl', {}, timerBox, counter, btn('⏮ 처음', () => go(pi, 0)), btn('◀ 뒤로', () => back()), btn('▶ 한 단계', () => forward(), '.main')));
  const stage = el('div.stage.site', { id: 'stage' }, tabsBar,
    el('div.pagebar', {}, dots, title, sentence, el('div.navbtn', {}, btn('← 이전', () => go(pi - 1, 0)), btn('다음 →', () => go(pi + 1, 0), '.go'))),
    el('div.work', {}, el('div.panel.left', {}, leftHead, leftBody), el('div.panel.right', {}, rightHead, rightBody)), bottom);
  const wrap = el('div', { id: 'stagewrap' }, stage);
  const notes = el('aside', { id: 'notes', hidden: true });
  fill(root, el('div', { id: 'shell' }, wrap, notes));

  let scale = 1;
  const fit = () => { const r = wrap.getBoundingClientRect(); scale = Math.min(r.width / W, r.height / H); stage.style.transform = `translate(-50%, -50%) scale(${scale})`; };
  window.addEventListener('resize', fit);
  const motion = createMotion(() => scale);

  // ── 타이머 (활동)
  let timer = { left: 0, total: 0, id: null };
  const drawTimer = () => { timerBox.hidden = !timer.total; if (!timer.total) return; timerBox.classList.toggle('done', timer.left === 0);
    timerBox.textContent = `⏱ ${Math.floor(timer.left / 60)}:${String(timer.left % 60).padStart(2, '0')}${timer.id || timer.left === 0 ? '' : ' (T)'}`; };
  const setTimer = (sec) => { if (timer.id) clearInterval(timer.id); timer = { left: sec ?? 0, total: sec ?? 0, id: null }; drawTimer(); };
  const toggleTimer = () => { if (!timer.total) return; if (timer.id) { clearInterval(timer.id); timer.id = null; } else { if (!timer.left) timer.left = timer.total;
    timer.id = setInterval(() => { timer.left = Math.max(0, timer.left - 1); if (!timer.left) { clearInterval(timer.id); timer.id = null; } drawTimer(); }, 1000); } drawTimer(); };

  // ── 이동
  const page = () => tab.pages[pi];
  function switchTab(t) { if (t === tab) return; tab = t; pi = 0; si = 0; view = 'data'; showAll = false; paint({ fresh: true }); }
  function go(p, s, { animate = false } = {}) {
    if (p < 0 || p >= tab.pages.length) return;
    const samePage = p === pi;
    pi = p; si = Math.max(0, Math.min(tab.pages[p].steps.length - 1, s));
    if (!samePage) { view = 'data'; showAll = false; }
    paint({ animate: animate && samePage, fresh: !samePage });
  }
  function forward() { if (si < page().steps.length - 1) go(pi, si + 1, { animate: true }); else go(pi + 1, 0); }
  function back() { if (si > 0) go(pi, si - 1, { animate: true }); else if (pi > 0) go(pi - 1, tab.pages[pi - 1].steps.length - 1); }

  // ── 그리기
  function paint({ animate = false, fresh = true } = {}) {
    const pg = page(); const st = pg.steps[si];
    fill(tabsBar, el('a.site', { href: './index.html' }, '자료구조로 배우는 머신러닝'),
      el('a.tab', { href: './practice.html?mode=tools' }, '📦 도구'), el('span.tab.on', {}, '🤖 알고리즘'), el('a.tab', { href: './practice.html?mode=wrap' }, '✅ 정리'), el('span.sep', {}, '|'),
      tabs.map((t) => el(`button.sub${t === tab ? '.on' : ''}`, { type: 'button', onclick: () => switchTab(t) }, `${t.emoji} ${t.name}`)),
      otherTabs.map((t) => el('a.sub', { href: t.href, title: '아직 이전 화면입니다' }, `${t.emoji} ${t.name}`)));
    dots.classList.toggle('many', tab.pages.length > 10);
    fill(dots, tab.pages.map((p, i) => el(`button${i === pi ? '.on' : i < pi ? '.done' : ''}`, { type: 'button', title: p.title, 'aria-label': `${i + 1}쪽 ${p.title}`, onclick: () => go(i, 0) }, String(i + 1))));
    title.textContent = `${pi + 1}. ${pg.title}`; sentence.textContent = pg.sentence;

    // 왼쪽 칸: 의사코드(이 쪽의 줄만) + 그 줄의 계산, 또는 개념 설명
    if (pg.code) {
      const [a, z] = pg.code;
      fill(leftHead, el('b', {}, '의사코드'), showAll ? '전체' : '이 쪽의 줄만',
        el('span.ptab', {}, btn(showAll ? '이 쪽 줄만' : '전체 보기', () => { showAll = !showAll; paint(); })));
      const shown = tab.code.map((t, i) => ({ t, n: i + 1 })).filter(({ n }) => showAll || (n >= a && n <= z));
      const indent = Math.min(...shown.map(({ t }) => t.match(/^ */)[0].length));
      fill(leftBody, el(`ol.code${shown.length > 5 ? '.long' : ''}`, {}, shown.map(({ t, n }) => el(`li${n === st.on ? '.on' : ''}${n < a || n > z ? '.off' : ''}`, {}, el('span.no', {}, String(n)),
        (st.k ? t.replace(`k = ${tab.k}`, `k = ${st.k}`) : t).slice(indent)))), st.left ? st.left() : null);
    } else {
      fill(leftHead, el('b', {}, pg.leftTitle ?? '개념'), pg.link ? '' : '한 번 누를 때마다 하나씩');
      fill(leftBody, st.left ? st.left() : null);
    }
    leftBody.classList.toggle('concept', !pg.code);

    // 오른쪽 칸: 자료구조(이 줄이 바꾸는 상자만) ↔ 그림
    const canPlot = Boolean(st.plot);
    const showPlot = canPlot && view === 'plot';
    fill(rightHead, el('b', {}, showPlot ? '그림' : (pg.code ? '자료구조' : '보기')), pg.code && !showPlot ? '이 줄이 바꾸는 상자만' : '',
      canPlot ? el('span.ptab', {}, btn('자료구조', () => { view = 'data'; paint(); }, showPlot ? '' : '.on'), btn('그림', () => { view = 'plot'; paint(); }, showPlot ? '.on' : '')) : null);
    fill(rightBody, showPlot ? st.plot() : (st.right ? st.right() : null));
    motion(rightBody, { reset: fresh || showPlot, animate });

    // 아래 띠: 바뀐 것 / 질문 · 활동
    bottom.className = `bottom${st.cap ? '' : st.ask ? ' ask' : ' wait'}`;
    const resumeBtn = resume ? el('button.resume', { type: 'button', onclick: () => { const r = resume; resume = null; tab = r.t; view = 'data'; showAll = false; pi = r.p; si = r.s; paint({ fresh: true }); } },
      `↪ 지난번에 멈춘 곳: ${resume.t.emoji} ${resume.t.name} ${resume.p + 1}쪽 ${resume.s + 1}단계 — 이어서 하기`) : null;
    fill(bottomText, st.cap ? [el('span.k', {}, st.capLabel ?? '바뀐 것'), el('span', {}, st.cap)] : st.ask ? el('span', {}, st.ask)
      : resumeBtn ?? el('span', {}, si === 0 ? '▶ 한 단계를 눌러 시작하세요.' : ''));
    counter.textContent = `${si + 1} / ${pg.steps.length}`;
    if (fresh || st.timer) setTimer(st.timer ?? null); else if (!st.timer && !st.ask) setTimer(null);

    drawNotes();
    // 위치는 주소창에 남기지 않는다(주소창 자동 완성으로 엉뚱한 쪽에서 시작하지 않게). [이어서 하기]용으로만 저장
    if (pi > 0 || si > 0 || tab !== tabs[0]) { resume = null; try { localStorage.setItem(KEY, `#${tab.id}/${pi + 1}${si ? `.${si + 1}` : ''}`); } catch { /* 저장이 막혀도 수업은 된다 */ } }
  }

  function drawNotes() {
    notes.hidden = !notesOpen;
    if (!notesOpen) return;
    const n = page().steps[si].note ?? {};
    fill(notes, el('div', {}, el('h4', {}, '이렇게 말해요'), n.say ?? '—'), el('div', {}, el('h4', {}, '이렇게 물어요'), n.ask ?? '—'),
      el('div', {}, el('h4', {}, '예상 답 · 주의'), n.expect ?? '—', n.watch ? el('span.watch', {}, `자주 하는 오해: ${n.watch}`) : null),
      el('div.time', {}, `${pi + 1}쪽`, el('small', {}, `단계 ${si + 1} / ${page().steps.length}`), el('small', {}, el('a', { href: `./teacher.html?l=${tab.id}`, style: 'color:#9fc0ff' }, '활동지 · 정답지'))));
  }

  document.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey || e.altKey || ['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target?.tagName)) return;
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    const actions = {
      ArrowRight: forward, ' ': forward, PageDown: forward, Enter: forward, ArrowLeft: back, PageUp: back, Backspace: back,
      ArrowDown: () => go(pi + 1, 0), ArrowUp: () => go(pi - 1, 0), Home: () => go(pi, 0), End: () => go(pi, page().steps.length - 1),
      n: () => { notesOpen = !notesOpen; drawNotes(); fit(); }, t: toggleTimer,
      f: () => { if (document.fullscreenElement) document.exitFullscreen(); else document.documentElement.requestFullscreen?.().catch(() => {}); },
    };
    if (!actions[key]) return;
    e.preventDefault(); actions[key]();
  });

  // 이미 열린 화면에서 주소에 위치를 적어 넣었을 때도 그 자리로 간다
  window.addEventListener('hashchange', () => {
    const l = parse(location.hash);
    history.replaceState(null, '', location.pathname + location.search);
    if (!l) return;
    resume = null; tab = l.t; view = 'data'; showAll = false; pi = l.p; si = l.s; paint({ fresh: true });
  });

  fit(); paint();
  return { go, forward, back, switchTab: (id) => switchTab(tabs.find((t) => t.id === id) ?? tab), pos: () => ({ tab: tab.id, page: pi, step: si, pages: tab.pages.length, steps: page().steps.length }), tabs };
}
