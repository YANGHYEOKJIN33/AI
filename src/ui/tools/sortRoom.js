/**
 * 4쪽 · 정렬하고 앞에서 k개.
 *   distances(뒤섞인 카드)  ──sort()──▶  같은 리스트가 제자리를 찾아 미끄러짐  ──[:k]──▶  neighbors(복사)
 */
import { el, fill } from '../dom.js';
import { createFlip } from '../flip.js';
import { mark } from '../structures.js';
import { roomShell, btn, quizBox, algoLinks, codeLines } from './common.js';
import { FOODS, FOOD_LABELS, FOOD_QUERY } from '../../core/datasets.js';
import { dist, fmt } from '../../core/math.js';

const LABEL = Object.fromEntries(FOOD_LABELS.map((l, i) => [l.id, { ...l, cat: String(i + 1) }]));
const PICK = ['사과', '견과류', '바나나', '오렌지', '생선', '포도', '껍질콩'];
const CARDS = PICK.map((name) => {
  const f = FOODS.find((x) => x.name === name);
  return { id: f.id, name, label: f.label, d: dist([FOOD_QUERY.x, FOOD_QUERY.y], [f.x, f.y]) };
});

export function createSortRoom({ store }) {
  const root = el('div');
  const flip = createFlip();
  let list = CARDS.slice();
  let sorted = false;
  let k = 3;
  let picked = [];   // 잘라 온 카드
  let line = -1;
  let msg = null;
  let qPick = null;

  const order = CARDS.slice().sort((a, b) => a.d - b.d);
  const quiz = {
    q: 'sort() 하면 0번 자리에 올 카드는?',
    options: ['사과', '오렌지', '견과류', '바나나'],
    answer: 1,
    why: `튜플 (거리, 레이블)은 첫 값인 거리로 비교돼요. 거리가 가장 작은 오렌지(${fmt(order[0].d)})가 0번이에요.`,
  };

  function doSort() {
    list = list.slice().sort((a, b) => a.d - b.d);
    sorted = true; line = 0;
    msg = { tone: 'ok', text: 'distances.sort() — 새 리스트를 만들지 않고, 같은 리스트 안에서 카드들이 제자리(거리 오름차순)를 찾아 움직였어요.' };
    render();
  }
  function doSlice() {
    if (!sorted) { msg = { tone: 'warn', text: '정렬하지 않고 앞에서 자르면 "가장 가까운" k개가 아니라 그냥 "앞에 있던" k개가 와요! 먼저 sort()를 눌러 보세요.' }; }
    picked = list.slice(0, k);
    line = 1;
    if (sorted) msg = { tone: 'ok', text: `neighbors = distances[:${k}] — 앞에서 ${k}장을 복사해 새 리스트를 만들었어요. 원래 distances는 그대로예요.` };
    render();
  }
  function shuffle() { list = CARDS.slice(); sorted = false; picked = []; line = -1; msg = null; render(); }

  function card(c, i, { prefix, from = null, hl = false }) {
    return el(`div.chip.tuple.tuple--card${hl ? '.is-picked' : ''}`, {
      'data-flip': `${prefix}-${c.id}`, 'data-from': from, 'data-cat': LABEL[c.label].cat,
    },
    el('span.tuple__idx', {}, String(i)),
    el('span.tuple__val', {}, `(${fmt(c.d)}, `, mark(LABEL[c.label].shape, LABEL[c.label].cat), ` ${c.label})`),
    el('span.tuple__name', {}, c.name));
  }

  function render() {
    const inK = new Set(sorted ? list.slice(0, k).map((c) => c.id) : []);
    fill(root, roomShell({
      icon: '🔃', title: '정렬하고 앞에서 k개',
      rule: 'sort()는 리스트를 작은 값부터 다시 세우고, [:k]는 앞에서 k개를 잘라 새 리스트를 만들어요. 둘을 이으면 "가장 가까운 k개"가 됩니다.',
      controls: [
        btn('🔃 distances.sort()', doSort, { primary: !sorted, disabled: sorted }),
        el('span.troom__label', {}, 'k ='),
        [1, 3, 5].map((v) => btn(String(v), () => { k = v; if (picked.length) picked = list.slice(0, k); render(); }, { pressed: k === v })),
        btn(`✂ distances[:${k}]`, doSlice, { primary: sorted }),
        btn('↺ 다시 섞기', shuffle),
      ],
      body: el('div.tflow', {},
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `📋 distances — ${FOOD_QUERY.name}까지의 (거리, 레이블) ${sorted ? '· 정렬됨 ✓' : '· 아직 뒤섞임'}`),
          el('div.sbox', {}, el('div.sbox__body', {}, list.map((c, i) => card(c, i, { prefix: 'd', hl: inK.has(c.id) }))))),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col', {},
          el('div.tflow__cap', {}, '🐍 실행한 줄'),
          codeLines(['distances.sort()', `neighbors = distances[:${k}]`], line),
          el('p.troom__note', {}, '💡 0번부터 세니까 [:3]은 0·1·2번, 세 장이에요.')),
        el('div.tflow__arrow', {}, '➜'),
        el('div.tflow__col.tflow__col--grow', {},
          el('div.tflow__cap', {}, `🎯 neighbors — 앞에서 ${k}개`),
          el('div.sbox', {}, el('div.sbox__body', {}, picked.length === 0
            ? el('div.sbox__empty', {}, '[:k]를 누르면 앞의 카드가 복사되어 와요')
            : picked.map((c, i) => card(c, i, { prefix: 'n', from: `d-${c.id}` })))))),
      message: msg,
      quiz: quizBox(quiz, qPick, (i) => { qPick = i; render(); }),
      links: algoLinks(store, [['knn', 'distances.sort() → [:k]']]),
    }));
    flip(root);
  }

  return { node: root, render };
}
