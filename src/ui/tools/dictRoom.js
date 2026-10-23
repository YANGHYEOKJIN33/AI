/**
 * 5쪽 · 딕셔너리로 세기.
 *   labels(리스트) ──하나씩──▶ votes(딕셔너리: 레이블 → 개수) ──max──▶ 1등
 * 처음 보는 레이블이면 새 키가 생기고(값 1), 있던 레이블이면 값이 1 늘어난다.
 */
import { el, fill } from '../dom.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { roomShell, btn, quizBox, algoLinks, codeLines } from './common.js';
import { FOOD_LABELS } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
/** k-NN에서 k = 7일 때 이웃들의 레이블 (가까운 순) */
const TOKENS = ['과일', '단백질', '과일', '단백질', '단백질', '채소', '단백질'].map((label, i) => ({ id: `tk${i}`, label }));

export function createDictRoom({ store }) {
  const root = el('div');
  const flip = createFlip();
  let done = 0;          // 센 개수
  let winner = null;
  let line = -1;
  let msg = null;
  let qPick = null;
  let timer = null;

  const quiz = { q: '7개를 다 세면 가장 많은 레이블은?', options: ['과일', '채소', '단백질'], answer: 2,
    why: '과일 2 · 단백질 4 · 채소 1 — 단백질이 가장 많아요. (k-NN에서 k = 7이면 토마토는 단백질로 분류돼요!)' };

  function votes() {
    const out = [];
    for (const t of TOKENS.slice(0, done)) {
      const slot = out.find((v) => v.label === t.label);
      if (slot) slot.items.push(t); else out.push({ label: t.label, items: [t] });
    }
    return out;
  }

  function countOne() {
    if (done >= TOKENS.length) return;
    const t = TOKENS[done];
    const existed = votes().some((v) => v.label === t.label);
    const before = votes().find((v) => v.label === t.label)?.items.length ?? 0;
    done += 1; winner = null; line = 0;
    msg = existed
      ? { tone: 'ok', text: `votes["${t.label}"]가 이미 있어요 → 값 ${before} → ${before + 1}` }
      : { tone: 'info', text: `"${t.label}"은 처음 나왔어요 → 새 키를 만들고 값 0 + 1 = 1 (votes.get("${t.label}", 0)이 0을 돌려줘서)` };
    render();
  }
  function countAll() {
    if (timer) return;
    timer = setInterval(() => { if (done >= TOKENS.length) { clearInterval(timer); timer = null; render(); return; } countOne(); }, 450);
  }
  function findMax() {
    const v = votes();
    if (!v.length) { msg = { tone: 'warn', text: '아직 센 것이 없어요. 하나 세기를 먼저 눌러 보세요.' }; render(); return; }
    let best = v[0];
    for (const x of v) if (x.items.length > best.items.length) best = x;
    winner = best.label; line = 1;
    msg = { tone: 'ok', text: `max(votes, key=votes.get) = "${best.label}" — 값(개수)이 가장 큰 키를 골랐어요.` };
    render();
  }
  function reset() { if (timer) { clearInterval(timer); timer = null; } done = 0; winner = null; line = -1; msg = null; render(); }

  function render() {
    const v = votes();
    fill(root, roomShell({
      icon: '🗳', title: '딕셔너리로 세기',
      rule: '딕셔너리 = "키 → 값" 짝의 모음. 레이블을 키로, 개수를 값으로 두면 몇 표씩인지 셀 수 있어요.',
      controls: [
        btn(`➕ 하나 세기 (${done}/${TOKENS.length})`, countOne, { primary: true, disabled: done >= TOKENS.length || Boolean(timer) }),
        btn('⏩ 모두 세기', countAll, { disabled: done >= TOKENS.length || Boolean(timer) }),
        btn('🏆 max — 가장 많은 것', findMax, { disabled: Boolean(timer) }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, '📋 labels — 셀 것 (이웃 7개의 레이블)'),
          el('div.sbox', {}, el('div.sbox__body.pool', {}, TOKENS.map((t, i) => (i < done
            ? el('span.pchip.is-dim', { 'data-cat': LABEL[t.label].cat }, el('small', {}, `[${i}] `), '·')
            : el(`span.pchip${i === done ? '.is-cur' : ''}`, { 'data-flip': t.id, 'data-cat': LABEL[t.label].cat },
              el('small', {}, `[${i}] `), mark(LABEL[t.label].shape, LABEL[t.label].cat), ` ${t.label}`)))))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, '🐍 실행한 줄'),
          codeLines(['votes[label] = votes.get(label, 0) + 1', 'max(votes, key=votes.get)'], line)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `🗳 votes = { ${v.map((x) => `${x.label}: ${x.items.length}`).join(', ')} }`),
          el('div.sbox.sbox--dict', {}, el('div.sbox__body', {}, v.length === 0 ? el('div.sbox__empty', {}, '{ } — 빈 딕셔너리') : v.map((x) => el(`div.kv${winner === x.label ? '.is-win' : ''}`, { 'data-cat': LABEL[x.label].cat },
            el('span.kv__key', {}, mark(LABEL[x.label].shape, LABEL[x.label].cat), ` "${x.label}"`),
            el('span.kv__colon', {}, ':'),
            el('span.kv__tokens', {}, x.items.map((t) => el('span.chip.token', { 'data-flip': t.id, 'data-cat': LABEL[t.label].cat }, '●'))),
            el('strong.kv__val', {}, String(x.items.length)))))),
          winner ? el('div.answer', { 'data-cat': LABEL[winner].cat }, el('span.answer__label', {}, '1등'), mark(LABEL[winner].shape, LABEL[winner].cat), ` ${winner}`) : null)),
      message: msg,
      quiz: quizBox(quiz, qPick, (i) => { qPick = i; render(); }),
      links: algoLinks(store, [['knn', '이웃 레이블 투표 → 다수결'], ['dtree', '묶음마다 레이블 세기 → 불순도·다수결 잎']]),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
