/**
 * 📦 5쪽 · 딕셔너리로 세기.
 *   레이블 목록 ──하나씩──▶ votes(딕셔너리: 레이블 → 개수) ──가장 많은 것──▶ 1등
 * 처음 보는 레이블이면 새 키가 생기고(값 1), 있던 레이블이면 값이 1 늘어난다.
 */
import { el, fill } from '../dom.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { missionShell, btn, quizBox, codeLines, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { FOODS, FOOD_LABELS, FOOD_QUERY } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
/** 토마토에서 가까운 7개(k-NN에서 k = 7일 때의 이웃)의 레이블 — 가까운 순 */
const NEAR7 = FOODS.slice()
  .sort((a, b) => ((FOOD_QUERY.x - a.x) ** 2 + (FOOD_QUERY.y - a.y) ** 2) - ((FOOD_QUERY.x - b.x) ** 2 + (FOOD_QUERY.y - b.y) ** 2))
  .slice(0, 7);
const TOKENS = NEAR7.map((f, i) => ({ id: `tk${i}`, label: f.label, name: f.name }));

const STEPS = [
  { id: 'quiz', do: '🔮 먼저 맞혀 보기: 7개를 다 세면 가장 많은 레이블은?', see: '왼쪽 목록을 눈으로 세어 봐요.' },
  { id: 'count3', do: '➕ "하나 세기"를 3번 누르세요.', see: '처음 나온 레이블은 새 키(값 1), 있던 레이블은 값 +1 — 메시지로 구분해 보세요.' },
  { id: 'countAll', do: '⏩ "모두 세기"를 누르세요.', see: '토큰이 하나씩 딕셔너리 칸으로 날아가요.' },
  { id: 'max', do: '🏆 "가장 많은 것"을 누르세요.', see: '값(개수)이 가장 큰 키가 다수결 결과예요.' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '' },
];
const LEARNED = [
  '딕셔너리 = 키 → 값. 레이블을 키로, 개수를 값으로 두면 셀 수 있어요.',
  '처음 나온 키는 새로 만들어 1, 이미 있는 키는 +1.',
  '값이 가장 큰 키 = 다수결 결과 (k-NN의 예측, 트리의 다수결 잎).',
];

export function createDictRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('dict', STEPS, store);
  let done = 0;
  let winner = null;
  let line = -1;
  let msg = null;
  let qPick = null;
  let timer = null;
  let peek = false;

  const counts = {};
  TOKENS.forEach((t) => { counts[t.label] = (counts[t.label] ?? 0) + 1; });
  const best = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
  const quiz = { q: '7개를 다 세면 가장 많은 레이블은?', options: FOOD_LABELS.map((l) => l.id), answer: FOOD_LABELS.findIndex((l) => l.id === best),
    why: `${Object.entries(counts).map(([k, v]) => `${k} ${v}`).join(' · ')} — ${best}이 가장 많아요. (그래서 k = 7이면 토마토는 ${best}!)` };

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
    const before = votes().find((v) => v.label === t.label)?.items.length ?? 0;
    done += 1; winner = null; line = 0;
    if (done >= 3) mission.complete('count3');
    if (done >= TOKENS.length && !timer) mission.complete('countAll');
    msg = before
      ? { tone: 'ok', text: `${t.name}: "${t.label}" 키가 이미 있어요 → 값 ${before} → ${before + 1}` }
      : { tone: 'info', text: `${t.name}: "${t.label}"은 처음 나왔어요 → 새 키를 만들고 값 1` };
    render();
  }
  function countAll() {
    if (timer) return;
    timer = setInterval(() => {
      if (done >= TOKENS.length) { clearInterval(timer); timer = null; mission.complete('count3'); mission.complete('countAll'); render(); return; }
      countOne();
    }, 450);
  }
  function findMax() {
    const v = votes();
    if (!v.length) { msg = { tone: 'warn', text: '아직 센 것이 없어요. "하나 세기"를 먼저 눌러 보세요.' }; render(); return; }
    let b = v[0];
    for (const x of v) if (x.items.length > b.items.length) b = x;
    winner = b.label; line = 1;
    if (done >= TOKENS.length) mission.complete('max');
    msg = { tone: 'ok', text: `값이 가장 큰 키 = "${b.label}"(${b.items.length}개).${done < TOKENS.length ? ' (아직 다 안 셌어요!)' : ''}` };
    render();
  }
  function reset() { if (timer) { clearInterval(timer); timer = null; } done = 0; winner = null; line = -1; msg = null; render(); }

  function render() {
    const v = votes();
    fill(root, missionShell({
      icon: '🗳', title: '딕셔너리로 세기',
      mission: mission.view({ goal: '레이블을 딕셔너리로 세어 다수결을 구하고, 세는 도중의 딕셔너리 모습을 쓸 수 있어요.', learned: LEARNED }),
      controls: [
        btn(`➕ 하나 세기 (${done}/${TOKENS.length})`, countOne, { primary: true, disabled: done >= TOKENS.length || Boolean(timer), next: mission.isNext('count3') }),
        btn('⏩ 모두 세기', countAll, { disabled: done >= TOKENS.length || Boolean(timer), next: mission.isNext('countAll') }),
        btn('🏆 가장 많은 것', findMax, { disabled: Boolean(timer), next: mission.isNext('max') }),
        btn('↺ 처음으로', reset),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, `📋 셀 레이블 — ${FOOD_QUERY.name}에서 가까운 7개`),
          el('div.sbox', {}, el('div.sbox__body', {}, TOKENS.map((t, i) => (i < done
            ? el('span.pchip.is-dim', { 'data-cat': LABEL[t.label].cat }, `${i}. ${t.name} ✓`)
            : el(`span.pchip${i === done ? '.is-cur' : ''}`, { 'data-flip': t.id, 'data-cat': LABEL[t.label].cat },
              `${i}. ${t.name} `, mark(LABEL[t.label].shape, LABEL[t.label].cat), ` ${t.label}`)))))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, '📜 실행한 의사코드'),
          codeLines(['votes[레이블]을 1 늘린다 (없으면 새로 만들고 1)', 'votes에서 가장 많은 레이블을 돌려준다'], line)),
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
      quiz: quizBox(quiz, qPick, (i) => { qPick = i; mission.complete('quiz'); render(); }, { next: mission.isNext('quiz') }),
      connect: connectSection({ mission, cards: CONNECTIONS.dict, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
  }

  return { node: root, render, leave: () => { if (timer) { clearInterval(timer); timer = null; } } };
}
