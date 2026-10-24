/**
 * 📦 4쪽 · 정렬하고 앞에서 k개.
 *   distances(뒤섞인 카드) ──정렬──▶ 같은 리스트가 제자리를 찾아 미끄러짐 ──앞에서 k개──▶ 이웃(복사)
 */
import { el, fill } from '../dom.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { missionShell, btn, quizBox, codeLines, connectSection } from './common.js';
import { createMission } from './mission.js';
import { CONNECTIONS } from './connections.js';
import { FOODS, FOOD_LABELS, FOOD_QUERY } from '../../core/datasets.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const d2Of = (f) => (FOOD_QUERY.x - f.x) ** 2 + (FOOD_QUERY.y - f.y) ** 2;
/** 표 순서 그대로 = 거리 리스트에 추가된 순서 */
const CARDS = FOODS.map((f) => ({ id: f.id, name: f.name, label: f.label, d2: d2Of(f) }));

const STEPS = [
  { id: 'quiz', do: '🔮 먼저 맞혀 보기: 정렬하면 0번 자리에 올 카드는?', see: 'd²이 가장 작은 카드를 찾아요.' },
  { id: 'sort', do: '🔃 "정렬"을 누르세요.', see: '새 리스트가 생기는 게 아니라 같은 리스트 안에서 카드가 제자리를 찾아 움직여요.' },
  { id: 'slice', do: 'k를 고르고 ✂ "앞에서 k개"를 누르세요.', see: '0번부터 k−1번까지 k장이 이웃 리스트로 복사돼요. 원래 리스트는 그대로.' },
  { id: 'nosort', do: '↺ "다시 섞기"를 누른 뒤, 정렬하지 말고 ✂를 눌러 보세요.', see: '정렬하지 않고 자르면 "가장 가까운" 카드가 아니라 "앞에 있던" 카드가 와요.' },
  { id: 'connect', do: '아래 카드에서 "그 장면 보러 가기"를 하나 누르세요.', see: '' },
];
const LEARNED = [
  '정렬하면 0번이 가장 작은 값(가장 가까운 것)이 돼요.',
  '"앞에서 k개" = 가장 가까운 k개 — 단, 정렬한 뒤에만!',
  '잘라 오기는 복사예요. 원래 리스트는 그대로 남아요.',
];

export function createSortRoom({ store, jump }) {
  const root = el('div');
  const flip = createFlip();
  const mission = createMission('sort', STEPS, store);
  let list = CARDS.slice();
  let sorted = false;
  let k = 3;
  let picked = [];
  let line = -1;
  let msg = null;
  let qPick = null;
  let peek = false;

  const order = CARDS.slice().sort((a, b) => a.d2 - b.d2);
  const quiz = {
    q: '정렬하면 0번 자리에 올 카드는?',
    options: [CARDS[0].name, order[0].name, order[1].name, order[2].name],
    answer: 1,
    why: `거리(d²)가 가장 작은 ${order[0].name}(${order[0].d2})이 0번이에요. 지금 0번인 ${CARDS[0].name}은 표의 첫 줄이었을 뿐이에요.`,
  };

  function doSort() {
    list = list.slice().sort((a, b) => a.d2 - b.d2);
    sorted = true; line = 0;
    mission.complete('sort');
    msg = { tone: 'ok', text: '정렬 완료 — 같은 리스트 안에서 카드들이 거리 순서로 자리를 바꿨어요.' };
    render();
  }
  function doSlice() {
    picked = list.slice(0, k);
    line = 1;
    if (!sorted) {
      if (mission.has('slice')) mission.complete('nosort');
      msg = { tone: 'warn', text: `정렬하지 않고 앞에서 ${k}개를 잘랐더니 ${picked.map((c) => c.name).join(', ')} — 가장 가까운 카드가 아니에요! 그래서 반드시 정렬 먼저.` };
    } else {
      mission.complete('slice');
      msg = { tone: 'ok', text: `이웃 ← 앞에서 ${k}개: ${picked.map((c) => c.name).join(', ')}. 원래 distances는 그대로예요.` };
    }
    render();
  }
  function shuffle() { list = CARDS.slice(); sorted = false; picked = []; line = -1; msg = null; render(); }

  function card(c, i, { prefix, from = null, hl = false }) {
    return el(`div.chip.tuple.tuple--card${hl ? '.is-picked' : ''}`, { 'data-flip': `${prefix}-${c.id}`, 'data-from': from, 'data-cat': LABEL[c.label].cat },
      el('span.tuple__idx', {}, `${i}번`),
      el('span.tuple__val', {}, `${c.name}  d² = ${c.d2}`),
      el('span.tuple__name', {}, mark(LABEL[c.label].shape, LABEL[c.label].cat), ` ${c.label}`));
  }

  function render() {
    const inK = new Set(sorted ? list.slice(0, k).map((c) => c.id) : []);
    fill(root, missionShell({
      icon: '🔃', title: '정렬하고 앞에서 k개',
      mission: mission.view({ goal: '정렬된 리스트에서 n번째로 가까운 데이터와 "가장 가까운 k개"를 바로 찾을 수 있어요.', learned: LEARNED }),
      controls: [
        btn('🔃 정렬', doSort, { primary: !sorted, disabled: sorted, next: mission.isNext('sort') }),
        el('span.troom__label', {}, 'k ='),
        [1, 3, 5].map((v) => btn(String(v), () => { k = v; if (picked.length) picked = list.slice(0, k); render(); }, { pressed: k === v })),
        btn(`✂ 앞에서 ${k}개`, doSlice, { primary: sorted, next: mission.isNext('slice') || (mission.isNext('nosort') && !sorted) }),
        btn('↺ 다시 섞기', shuffle, { next: mission.isNext('nosort') && sorted }),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `📋 distances — ${FOOD_QUERY.name}까지의 거리 ${sorted ? '· 정렬됨 ✓' : '· 표 순서(정렬 전)'}`),
          el('div.sbox', {}, el('div.sbox__body', {}, list.map((c, i) => card(c, i, { prefix: 'd', hl: inK.has(c.id) }))))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, '📜 실행한 의사코드'),
          codeLines(['distances를 d가 작은 순서로 정렬한다', `이웃 ← distances의 앞에서 ${k}개`], line),
          el('p.troom__note', {}, `💡 0번부터 세니까 앞에서 ${k}개 = 0번 ~ ${k - 1}번.`)),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `🎯 이웃 — 앞에서 ${k}개`),
          el('div.sbox', {}, el('div.sbox__body', {}, picked.length === 0
            ? el('div.sbox__empty', {}, '✂를 누르면 앞의 카드가 복사되어 와요')
            : picked.map((c, i) => card(c, i, { prefix: 'n', from: `d-${c.id}` })))))),
      message: msg,
      quiz: quizBox(quiz, qPick, (i) => { qPick = i; mission.complete('quiz'); render(); }, { next: mission.isNext('quiz') }),
      connect: connectSection({ mission, cards: CONNECTIONS.sort, jump, peek, onPeek: () => { peek = true; render(); } }),
    }));
    flip(root);
  }

  return { node: root, render };
}
