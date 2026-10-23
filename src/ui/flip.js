/**
 * FLIP 애니메이션 — 자료구조 안의 데이터가 순간이동하지 않고 "눈에 보이게" 움직이게 한다.
 * (8-퍼즐 사이트의 flip.js에 "복사 이동"을 더했다)
 *
 * 화면은 장면마다 통째로 다시 그려진다. 그래서 이전 장면에서 각 항목의 위치를 기억해 두었다가
 *   - 같은 data-flip id가 다른 자리에 다시 나타나면 → 옛 자리에서 새 자리로 미끄러진다 (이동)
 *   - 새 항목에 data-from="원본 id"가 있으면 → 원본 자리에서 날아와 앉는다 (복사: append·[:k])
 *     (data-force="1"을 더하면 이미 있던 항목도 원본에서 날아온다 — 변수에 새 값이 들어올 때)
 *   - 그 밖의 새 항목 → data-enter 방향에서 살짝 들어온다
 *
 *   const flip = createFlip();
 *   // 다시 그린 뒤
 *   flip(container, { reset });
 */
export function createFlip() {
  let last = new Map();   // id -> {left, top}

  return function flip(container, { reset = false } = {}) {
    if (!container) return;
    if (reset) last = new Map();
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const items = container.querySelectorAll('[data-flip]');
    const now = new Map();

    items.forEach((elm) => {
      const r = elm.getBoundingClientRect();
      now.set(elm.getAttribute('data-flip'), { left: r.left, top: r.top });
    });

    // 쪽·알고리즘이 바뀌어 처음 그리는 장면은 움직이지 않고 그냥 보여 준다
    if (!reduce && !reset && last.size > 0) {
      items.forEach((elm) => {
        const id = elm.getAttribute('data-flip');
        const r = now.get(id);
        // data-force가 있으면 같은 id가 있었어도 원본 자리에서 날아온다 (값이 새로 "복사"되어 들어올 때)
        const src = elm.dataset.from ? (last.get(elm.dataset.from) ?? now.get(elm.dataset.from)) : null;
        const forced = elm.dataset.force === '1' && src;
        const from = forced ? src : (last.get(id) ?? src);
        const copied = (forced || !last.has(id)) && Boolean(from);

        if (from) {
          const dx = from.left - r.left;
          const dy = from.top - r.top;
          if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
          // 멀리 갈수록 천천히 — 학생이 눈으로 따라갈 수 있게
          const distance = Math.hypot(dx, dy);
          const dur = distance > 160 ? 0.8 : distance > 60 ? 0.6 : 0.42;
          elm.style.transition = 'none';
          elm.style.transform = `translate(${dx}px, ${dy}px)${copied ? ' scale(.92)' : ''}`;
          elm.style.zIndex = '5';
          if (copied) elm.classList.add('is-copying');
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              elm.style.transition = `transform ${dur}s cubic-bezier(.45, .05, .3, 1)`;
              elm.style.transform = '';
            });
          });
          const done = () => {
            elm.style.zIndex = '';
            elm.classList.remove('is-copying');
            elm.removeEventListener('transitionend', done);
          };
          elm.addEventListener('transitionend', done);
          return;
        }

        const dir = elm.getAttribute('data-enter');
        const tx = dir === 'left' ? -24 : dir === 'right' ? 24 : 0;
        const ty = dir === 'up' ? -20 : dir === 'down' ? 20 : 0;
        elm.style.transition = 'none';
        elm.style.transform = `translate(${tx}px, ${ty}px) scale(.75)`;
        elm.style.opacity = '0';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            elm.style.transition = 'transform .34s cubic-bezier(.34, 1.3, .5, 1), opacity .28s ease';
            elm.style.transform = '';
            elm.style.opacity = '';
          });
        });
      });
    }

    last = now;
  };
}
