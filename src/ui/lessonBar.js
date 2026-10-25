/**
 * 레슨 진행 막대 — 몇 번째 쪽인지, 무엇을 배우는지(📘), 무엇을 하면 되는지(✋)를 보여 주고 앞뒤로 넘긴다.
 * 탭의 마지막 쪽에서는 [다음 →]이 다음 탭(다음 알고리즘)으로 이어 준다.
 */
import { el, fill } from './dom.js';
import { currentLesson, continuation } from '../app/lesson.js';

export function mountLessonBar(root, store) {
  const dots = el('div.lesson__dots', { role: 'tablist', 'aria-label': '쪽 고르기' });
  const count = el('span.lesson__count');
  const title = el('h2.lesson__title');
  const goal = el('p.lesson__goal');
  const todo = el('p.lesson__todo');

  const go = (delta) => {
    const state = store.get();
    const { index, key, steps } = currentLesson(state);
    if (delta > 0 && index === steps.length - 1) {
      const cont = continuation(state);
      if (cont) store.set(cont.patch);
      return;
    }
    store.set({ [key]: index + delta });
  };
  const prev = el('button.pill.lesson__nav', { type: 'button', onclick: () => go(-1) }, '← 이전');
  const next = el('button.pill.ctrl--primary.lesson__nav', { type: 'button', onclick: () => go(1) }, '다음 →');

  fill(root,
    el('div.lesson__top', {}, dots, count),
    el('div.lesson__text', {}, title, goal, todo),
    el('div.lesson__navs', {}, prev, next),
  );

  let builtFor = null;
  let dotButtons = [];

  store.subscribe((state) => {
    const { steps, index, key } = currentLesson(state);
    if (builtFor !== steps) {
      builtFor = steps;
      dotButtons = steps.map((step, i) => el('button.lesson__dot', {
        type: 'button', role: 'tab', title: `${i + 1}. ${step.title}`,
        'aria-label': `${i + 1}쪽: ${step.title}`,
        onclick: () => store.set({ [key]: i }),
      }, String(i + 1)));
      fill(dots, dotButtons);
    }
    const step = steps[index];
    title.textContent = `${index + 1}. ${step.title}`;
    // 알고리즘 단계 쪽은 한 문장만 — 할 일은 깜빡이는 ⏭ 단추가 알려 준다
    const brief = state.mode === 'algo' && step.kind === 'step';
    goal.textContent = brief ? step.goal : `📘 배울 것 — ${step.goal}`;
    todo.textContent = brief || !step.todo ? '' : `✋ 해 볼 것 — ${step.todo}`;
    todo.hidden = !todo.textContent;
    root.classList.toggle('lesson--brief', brief);
    count.textContent = `${index + 1} / ${steps.length}`;
    prev.disabled = index === 0;
    const last = index === steps.length - 1;
    const cont = last ? continuation(state) : null;
    next.disabled = last && !cont;
    next.textContent = last ? (cont ? cont.label : '끝!') : '다음 →';
    dotButtons.forEach((d, k) => {
      d.setAttribute('aria-selected', String(k === index));
      d.classList.toggle('lesson__dot--done', k < index);
    });
  });
}
