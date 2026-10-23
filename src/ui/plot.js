/**
 * 산점도(그림) — 외부 라이브러리 없이 인라인 SVG로 그린다.
 *
 * 핵심: 장면마다 "모양 목록"(shapes)을 통째로 넘기면, 같은 key의 모양은 지우지 않고
 * 좌표만 부드럽게 옮긴다(보간). 그래서 k-평균의 중심 ◆, 선형회귀의 직선, k-NN의 이웃 원이
 * 순간이동하지 않고 미끄러져 움직인다. 새 key는 살짝 나타나고, 사라진 key는 지운다.
 *
 * shape 종류 (좌표는 데이터 단위)
 *   point  { x, y, shape:'circle'|'triangle'|'square'|'diamond'|'cross'|'star', size, cls, label }
 *   line   { x1, y1, x2, y2, cls }
 *   circle { cx, cy, r(가로축 단위), cls }
 *   text   { x, y, text, cls, anchor, dx, dy }
 *   rect   { x, y, w, h, cls, rx }       (x,y = 왼쪽 위, 데이터 단위)
 *   path   { points: [[x,y]…], cls }      (보간하지 않는다)
 */
const NS = 'http://www.w3.org/2000/svg';
const TWEEN_MS = 460;

function svgEl(tag, attrs = {}) {
  const node = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) if (v !== null && v !== undefined) node.setAttribute(k, String(v));
  return node;
}

/** 모양 기호 — 가운데가 (0,0), 반지름 s */
export function markerPath(shape, s) {
  switch (shape) {
    case 'triangle': return `M0 ${-s * 1.15}L${s * 1.05} ${s * 0.78}L${-s * 1.05} ${s * 0.78}Z`;
    case 'square': return `M${-s * 0.86} ${-s * 0.86}h${s * 1.72}v${s * 1.72}h${-s * 1.72}Z`;
    case 'diamond': return `M0 ${-s * 1.3}L${s * 1.1} 0L0 ${s * 1.3}L${-s * 1.1} 0Z`;
    case 'cross': {
      const a = s * 0.95; const w = s * 0.38;
      return `M${-a} ${-a + w}L${-a + w} ${-a}L0 ${-w}L${a - w} ${-a}L${a} ${-a + w}L${w} 0L${a} ${a - w}L${a - w} ${a}L0 ${w}L${-a + w} ${a}L${-a} ${a - w}L${-w} 0Z`;
    }
    case 'star': {
      let d = '';
      for (let i = 0; i < 10; i += 1) {
        const r = i % 2 === 0 ? s * 1.35 : s * 0.58;
        const ang = -Math.PI / 2 + (i * Math.PI) / 5;
        d += `${i === 0 ? 'M' : 'L'}${(r * Math.cos(ang)).toFixed(2)} ${(r * Math.sin(ang)).toFixed(2)}`;
      }
      return `${d}Z`;
    }
    case 'circle':
    default:
      return `M${-s} 0a${s} ${s} 0 1 0 ${2 * s} 0a${s} ${s} 0 1 0 ${-2 * s} 0`;
  }
}

const ease = (t) => (t < 0.5 ? 2 * t * t : 1 - ((-2 * t + 2) ** 2) / 2);
const reduceMotion = () => window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/** 숫자 속성들을 옛 값에서 새 값으로 부드럽게 옮긴다 */
function tween(node, target, apply) {
  const from = node._vals ?? target;
  node._vals = { ...target };
  if (node._raf) cancelAnimationFrame(node._raf);
  const keys = Object.keys(target);
  const moved = keys.some((k) => Math.abs((from[k] ?? target[k]) - target[k]) > 0.01);
  if (!moved || reduceMotion()) { apply(target); return; }
  const t0 = performance.now();
  const stepFn = (now) => {
    const t = Math.min(1, (now - t0) / TWEEN_MS);
    const e = ease(t);
    const cur = {};
    for (const k of keys) cur[k] = (from[k] ?? target[k]) + (target[k] - (from[k] ?? target[k])) * e;
    apply(cur);
    if (t < 1) node._raf = requestAnimationFrame(stepFn);
    else node._raf = null;
  };
  node._raf = requestAnimationFrame(stepFn);
}

/**
 * @param {object} o
 *   x, y        : [최소, 최대] 데이터 범위
 *   width,height: SVG 좌표계 크기(화면에서는 비율만 유지하며 늘어난다)
 *   xLabel,yLabel, tick(눈금 간격), grid(격자), axes(축 표시)
 *   onClick(x, y): 그림을 누른 데이터 좌표
 */
export function createPlot(o) {
  const W = o.width ?? 360;
  const H = o.height ?? 320;
  const axes = o.axes !== false;
  const pad = o.pad ?? (axes ? { l: 38, r: 12, t: 12, b: 34 } : { l: 6, r: 6, t: 6, b: 6 });
  const [x0, x1] = o.x;
  const [y0, y1] = o.y;
  const sx = (v) => pad.l + ((v - x0) / (x1 - x0)) * (W - pad.l - pad.r);
  const sy = o.flipY === false
    ? (v) => pad.t + ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b)
    : (v) => H - pad.b - ((v - y0) / (y1 - y0)) * (H - pad.t - pad.b);
  const unitX = (W - pad.l - pad.r) / (x1 - x0);

  const svg = svgEl('svg', {
    viewBox: `0 0 ${W} ${H}`, class: `plot ${o.cls ?? ''}`, role: 'img',
    'aria-label': o.ariaLabel ?? '그림', preserveAspectRatio: 'xMidYMid meet',
  });
  const gridLayer = svgEl('g', { class: 'plot__grid' });
  const layer = svgEl('g', { class: 'plot__shapes' });
  svg.append(gridLayer, layer);

  if (axes) {
    const tick = o.tick ?? 1;
    for (let v = Math.ceil(x0); v <= x1; v += tick) {
      gridLayer.append(svgEl('line', { x1: sx(v), y1: sy(y0), x2: sx(v), y2: sy(y1), class: 'plot__gridline' }));
      if (o.tickLabels !== false) gridLayer.append(Object.assign(svgEl('text', { x: sx(v), y: sy(y0) + 13, class: 'plot__tick', 'text-anchor': 'middle' }), { textContent: String(v) }));
    }
    for (let v = Math.ceil(y0); v <= y1; v += o.ytick ?? tick) {
      gridLayer.append(svgEl('line', { x1: sx(x0), y1: sy(v), x2: sx(x1), y2: sy(v), class: 'plot__gridline' }));
      if (o.tickLabels !== false) gridLayer.append(Object.assign(svgEl('text', { x: sx(x0) - 6, y: sy(v) + 4, class: 'plot__tick', 'text-anchor': 'end' }), { textContent: String(v) }));
    }
    gridLayer.append(svgEl('line', { x1: sx(x0), y1: sy(y0), x2: sx(x1), y2: sy(y0), class: 'plot__axis' }));
    gridLayer.append(svgEl('line', { x1: sx(x0), y1: sy(y0), x2: sx(x0), y2: sy(y1), class: 'plot__axis' }));
    if (o.xLabel) gridLayer.append(Object.assign(svgEl('text', { x: (sx(x0) + sx(x1)) / 2, y: H - 4, class: 'plot__label', 'text-anchor': 'middle' }), { textContent: o.xLabel }));
    if (o.yLabel) {
      const t = svgEl('text', { x: 11, y: (sy(y0) + sy(y1)) / 2, class: 'plot__label', 'text-anchor': 'middle', transform: `rotate(-90 11 ${(sy(y0) + sy(y1)) / 2})` });
      t.textContent = o.yLabel;
      gridLayer.append(t);
    }
  }

  if (o.onClick) {
    svg.classList.add('plot--clickable');
    svg.addEventListener('click', (e) => {
      const pt = svg.createSVGPoint();
      pt.x = e.clientX; pt.y = e.clientY;
      const ctm = svg.getScreenCTM();
      if (!ctm) return;
      const p = pt.matrixTransform(ctm.inverse());
      const dx = x0 + ((p.x - pad.l) / (W - pad.l - pad.r)) * (x1 - x0);
      const dyRaw = (p.y - pad.t) / (H - pad.t - pad.b);
      const dy = o.flipY === false ? y0 + dyRaw * (y1 - y0) : y1 - dyRaw * (y1 - y0);
      if (dx < x0 || dx > x1 || dy < Math.min(y0, y1) || dy > Math.max(y0, y1)) return;
      o.onClick(dx, dy);
    });
  }

  const nodes = new Map();   // key → element

  function create(s) {
    let node;
    switch (s.kind) {
      case 'point': {
        node = svgEl('g');
        node.append(svgEl('path'));
        const label = svgEl('text', { class: 'pt__label', 'text-anchor': 'middle' });
        node.append(label);
        break;
      }
      case 'line': node = svgEl('line'); break;
      case 'circle': node = svgEl('circle'); break;
      case 'text': node = svgEl('text'); break;
      case 'rect': node = svgEl('rect'); break;
      case 'path': node = svgEl('polyline'); break;
      default: node = svgEl('g');
    }
    node.classList.add('is-entering');
    setTimeout(() => node.classList.remove('is-entering'), 30);
    return node;
  }

  function apply(node, s) {
    const cls = `${s.kind === 'point' ? 'pt' : `shape-${s.kind}`} ${s.cls ?? ''}`;
    if (node.getAttribute('class') !== cls) node.setAttribute('class', cls);
    switch (s.kind) {
      case 'point': {
        const size = s.size ?? 6;
        const path = node.firstChild;
        const d = markerPath(s.shape, size);
        if (path.getAttribute('d') !== d) path.setAttribute('d', d);
        const label = node.lastChild;
        if (label.textContent !== (s.label ?? '')) label.textContent = s.label ?? '';
        label.setAttribute('y', String(s.labelBelow ? size + 11 : -size - 5));
        if (s.title) {
          let t = node.querySelector('title');
          if (!t) { t = svgEl('title'); node.prepend(t); }
          t.textContent = s.title;
        }
        tween(node, { x: sx(s.x), y: sy(s.y) }, (v) => node.setAttribute('transform', `translate(${v.x.toFixed(2)} ${v.y.toFixed(2)})`));
        break;
      }
      case 'line':
        tween(node, { x1: sx(s.x1), y1: sy(s.y1), x2: sx(s.x2), y2: sy(s.y2) }, (v) => {
          for (const k of ['x1', 'y1', 'x2', 'y2']) node.setAttribute(k, v[k].toFixed(2));
        });
        break;
      case 'circle':
        tween(node, { cx: sx(s.cx), cy: sy(s.cy), r: Math.max(0, s.r * unitX) }, (v) => {
          node.setAttribute('cx', v.cx.toFixed(2)); node.setAttribute('cy', v.cy.toFixed(2)); node.setAttribute('r', v.r.toFixed(2));
        });
        break;
      case 'text':
        if (node.textContent !== s.text) node.textContent = s.text;
        node.setAttribute('text-anchor', s.anchor ?? 'middle');
        tween(node, { x: sx(s.x) + (s.dx ?? 0), y: sy(s.y) + (s.dy ?? 0) }, (v) => {
          node.setAttribute('x', v.x.toFixed(2)); node.setAttribute('y', v.y.toFixed(2));
        });
        break;
      case 'rect': {
        const xa = sx(s.x); const xb = sx(s.x + s.w);
        const ya = sy(s.y); const yb = sy(s.y + (o.flipY === false ? s.h : -s.h));
        node.setAttribute('rx', String(s.rx ?? 6));
        tween(node, { x: Math.min(xa, xb), y: Math.min(ya, yb), w: Math.abs(xb - xa), h: Math.abs(yb - ya) }, (v) => {
          node.setAttribute('x', v.x.toFixed(2)); node.setAttribute('y', v.y.toFixed(2));
          node.setAttribute('width', v.w.toFixed(2)); node.setAttribute('height', v.h.toFixed(2));
        });
        break;
      }
      case 'path':
        node.setAttribute('points', s.points.map(([px, py]) => `${sx(px).toFixed(1)},${sy(py).toFixed(1)}`).join(' '));
        break;
      default:
    }
  }

  return {
    svg, sx, sy, unitX, width: W, height: H,
    /** 모양 목록을 받아 같은 key는 옮기고, 새 key는 만들고, 없는 key는 지운다. 순서 = 그리는 순서 */
    update(shapes) {
      const seen = new Set();
      let prev = null;
      for (const s of shapes) {
        if (!s || !s.key) continue;
        seen.add(s.key);
        let node = nodes.get(s.key);
        if (!node || node._kind !== s.kind) {
          if (node) node.remove();
          node = create(s);
          node._kind = s.kind;
          nodes.set(s.key, node);
        }
        apply(node, s);
        // 그리는 순서 맞추기 (나중 것이 위)
        const want = prev ? prev.nextSibling : layer.firstChild;
        if (want !== node) layer.insertBefore(node, want);
        prev = node;
      }
      for (const [key, node] of nodes) {
        if (!seen.has(key)) { node.remove(); nodes.delete(key); }
      }
    },
    /** 모든 모양을 지운다(알고리즘을 바꿀 때) */
    clear() { for (const node of nodes.values()) node.remove(); nodes.clear(); },
  };
}
