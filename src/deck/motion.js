/**
 * 수업 화면의 움직임 — 데이터가 "눈으로 따라갈 수 있게" 옮겨 가도록 한다.
 * (연습 화면의 ui/flip.js와 같은 원리. 다만 무대가 통째로 확대·축소되므로 화면 좌표를 무대 좌표로 바꾸고,
 *  교실 뒷자리에서도 따라갈 수 있게 더 천천히 움직인다.)
 *
 *   data-flip="id"  : 같은 id가 다른 자리에 나타나면 옛 자리에서 새 자리로 미끄러진다
 *   data-from="id"  : 처음 나타난 항목이 그 id의 자리에서 날아온다(복사)
 *   data-enter      : 그 밖의 새 항목은 살짝 나타난다
 */
export function createMotion(getScale) {
  let last = new Map();

  return function run(container, { reset = false, animate = true } = {}) {
    if (!container) return;
    if (reset) last = new Map();
    const reduce = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const scale = getScale() || 1;
    const items = container.querySelectorAll('[data-flip]');
    const now = new Map();
    items.forEach((elm) => {
      const r = elm.getBoundingClientRect();
      now.set(elm.getAttribute('data-flip'), { left: r.left, top: r.top });
    });

    if (animate && !reduce && !reset && last.size > 0) {
      items.forEach((elm) => {
        const id = elm.getAttribute('data-flip');
        const r = now.get(id);
        const src = elm.dataset.from ? (last.get(elm.dataset.from) ?? now.get(elm.dataset.from)) : null;
        const from = last.get(id) ?? src;
        if (from) {
          const dx = (from.left - r.left) / scale;
          const dy = (from.top - r.top) / scale;
          if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
          const distance = Math.hypot(dx, dy);
          const dur = distance > 500 ? 1.2 : distance > 160 ? 1.0 : 0.7;
          elm.style.transition = 'none';
          elm.style.transform = `translate(${dx}px, ${dy}px)`;
          elm.style.zIndex = '5';
          requestAnimationFrame(() => requestAnimationFrame(() => {
            elm.style.transition = `transform ${dur}s cubic-bezier(.45, .05, .3, 1)`;
            elm.style.transform = '';
          }));
          const done = () => { elm.style.transition = ''; elm.style.zIndex = ''; elm.removeEventListener('transitionend', done); };
          elm.addEventListener('transitionend', done);
          return;
        }
        // 원본 없이 새로 생긴 것 — 제자리에서 살짝 커지며 나타난다
        elm.style.transition = 'none';
        elm.style.transform = 'scale(.8)';
        elm.style.opacity = '0';
        requestAnimationFrame(() => requestAnimationFrame(() => {
          elm.style.transition = 'transform .45s cubic-bezier(.34, 1.3, .5, 1), opacity .4s ease';
          elm.style.transform = '';
          elm.style.opacity = '';
        }));
      });
    }
    last = now;
  };
}
