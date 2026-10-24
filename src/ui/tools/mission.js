/**
 * 📦 도구 방의 "미션" — 무엇을 해야 하는지 모르겠다는 학생을 위해
 *   ① 지금 할 일 하나만 크게(다음에 누를 단추가 반짝인다)
 *   ② 해낸 일은 ✓, 앞으로 할 일은 흐리게
 *   ③ 다 하면 "🎓 배운 것"을 보여 주고, 알고리즘 속에서 그 도구가 어떻게 쓰이는지로 잇는다.
 *
 * steps: [{ id, do: '무엇을 누르나', see: '무엇을 보나' }]  — 마지막은 늘 'connect'(알고리즘에서 확인)
 */
import { el } from '../dom.js';
import { getAlgorithm } from '../../core/algorithms/index.js';
import { ALGO_ICON } from '../topbar.js';

export function createMission(toolId, steps, store) {
  const done = new Set();
  const markStore = () => {
    const all = store.get().toolsDone ?? {};
    if (!all[toolId]) store.set({ toolsDone: { ...all, [toolId]: true } });
  };

  const api = {
    current() { return steps.find((s) => !done.has(s.id)) ?? null; },
    isNext(id) { return api.current()?.id === id; },
    has(id) { return done.has(id); },
    complete(id) {
      done.add(id);
      if (steps.every((s) => s.id === 'connect' || done.has(s.id))) markStore();
    },
    /** 손으로 하는 일을 다 해서 알고리즘 연결을 보여 줄 때인가 */
    handsOnDone() { return steps.every((s) => s.id === 'connect' || done.has(s.id)); },
    reset() { done.clear(); },

    view({ goal, learned }) {
      const cur = api.current();
      return el('aside.mission', { 'aria-label': '미션' },
        el('div.mission__goal', {}, el('span.mission__goalcap', {}, '🎯 이 쪽을 마치면'), goal),
        el('ol.mission__steps', {}, steps.map((s, i) => {
          const state = done.has(s.id) ? 'done' : cur?.id === s.id ? 'now' : 'later';
          return el(`li.mstep.mstep--${state}`, {},
            el('span.mstep__no', {}, state === 'done' ? '✓' : String(i + 1)),
            el('div.mstep__body', {},
              el('div.mstep__do', {}, s.do),
              state === 'now' && s.see ? el('div.mstep__see', {}, `👀 ${s.see}`) : null));
        })),
        api.handsOnDone() ? el('div.mission__learned', {},
          el('div.mission__learnedcap', {}, '🎓 배운 것'),
          el('ul', {}, learned.map((t) => el('li', {}, t)))) : null,
      );
    },
  };
  return api;
}

/**
 * 🤖 알고리즘 속에서는 — 이 도구가 어느 알고리즘의 몇 번째 줄에서, 어떤 데이터로 쓰이는지.
 * cards: [{ algo, page, action, lines, pseudo, how, example }]
 */
export function connectView(cards, { jump, onJump }) {
  return el('section.connect', { 'aria-label': '알고리즘 속에서는' },
    el('h3.connect__title', {}, '🤖 알고리즘 속에서는 — 이 도구가 이렇게 쓰여요'),
    el('div.connect__cards', {}, cards.map((c) => el('article.connect__card', {},
      el('div.connect__head', {},
        el('span.connect__algo', {}, `${ALGO_ICON[c.algo]} ${getAlgorithm(c.algo).meta.name}`),
        el('span.connect__lines', {}, c.lines)),
      el('code.connect__pseudo', {}, c.pseudo),
      el('p.connect__how', {}, c.how),
      c.example ? el('p.connect__ex', {}, el('strong', {}, '예) '), c.example) : null,
      el('button.pill.connect__go', {
        type: 'button',
        onclick: () => { onJump?.(); jump(c.algo, c.page, c.action ?? null); },
      }, '▶ 그 장면 보러 가기')))),
  );
}
