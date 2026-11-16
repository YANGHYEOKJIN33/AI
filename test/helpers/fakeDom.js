/**
 * 테스트용 아주 작은 가짜 DOM — 차시 파일은 장면을 만들 때 화면 노드를 바로 만든다.
 * node에는 document가 없으므로, 장면을 그려 보고(오류 없이 그려지는지, 글자가 얼마나 되는지) 확인할 만큼만 흉내 낸다.
 */
class FakeNode {
  constructor(tag = '#text', text = '') {
    this.tagName = tag.toUpperCase(); this.children = []; this.attrs = {}; this._text = text; this.parent = null;
    this.style = { setProperty() {} }; this.dataset = {};
    const self = this;
    this.classList = {
      add: (...c) => { const s = new Set((self.className || '').split(' ').filter(Boolean)); c.forEach((x) => s.add(x)); self.className = [...s].join(' '); },
      remove: (...c) => { self.className = (self.className || '').split(' ').filter((x) => x && !c.includes(x)).join(' '); },
      toggle: (c, on) => { if (on ?? !self.classList.contains(c)) self.classList.add(c); else self.classList.remove(c); },
      contains: (c) => (self.className || '').split(' ').includes(c),
    };
    this.className = '';
  }
  _adopt(n) { const node = n instanceof FakeNode ? n : new FakeNode('#text', String(n)); if (node.parent) node.remove(); node.parent = this; return node; }
  append(...nodes) { for (const n of nodes) this.children.push(this._adopt(n)); }
  prepend(...nodes) { this.children.unshift(...nodes.map((n) => this._adopt(n))); }
  insertBefore(n, ref) { const node = this._adopt(n); const i = ref ? this.children.indexOf(ref) : -1; if (i < 0) this.children.push(node); else this.children.splice(i, 0, node); return node; }
  replaceChildren(...nodes) { this.children.forEach((c) => { c.parent = null; }); this.children = []; this.append(...nodes); }
  remove() { if (this.parent) { this.parent.children = this.parent.children.filter((c) => c !== this); this.parent = null; } }
  get firstChild() { return this.children[0] ?? null; }
  get lastChild() { return this.children[this.children.length - 1] ?? null; }
  get nextSibling() { if (!this.parent) return null; const i = this.parent.children.indexOf(this); return this.parent.children[i + 1] ?? null; }
  setAttribute(k, v) { this.attrs[k] = String(v); if (k === 'class') this.className = String(v); if (k.startsWith('data-')) this.dataset[k.slice(5)] = String(v); }
  getAttribute(k) { return k === 'class' ? this.className : (this.attrs[k] ?? null); }
  addEventListener() {} removeEventListener() {}
  querySelector() { return null; } querySelectorAll() { return []; }
  set innerHTML(v) { this._html = String(v); } get innerHTML() { return this._html ?? ''; }
  set textContent(v) { this.children = []; this._text = String(v); }
  get textContent() { return this.tagName === '#TEXT' ? this._text : (this.children.length ? this.children.map((c) => c.textContent).join('') : (this._text ?? '')); }
  /** 숨긴 것(자리만 차지하는 것)을 뺀, 화면에 보이는 글자 */
  get visibleText() { if (this.classList.contains('hidden')) return ''; return this.tagName === '#TEXT' ? this._text : (this.children.length ? this.children.map((c) => c.visibleText).join('') : (this._text ?? '')); }
}

export function installFakeDom() {
  globalThis.Node = FakeNode;
  globalThis.document = {
    createElement: (tag) => new FakeNode(tag), createElementNS: (_ns, tag) => new FakeNode(tag), createTextNode: (t) => new FakeNode('#text', t),
  };
  globalThis.window = { matchMedia: () => ({ matches: true }) };   // 움직임 줄이기 = 곧바로 마지막 모습
  globalThis.requestAnimationFrame ??= (fn) => setTimeout(fn, 0);
  globalThis.cancelAnimationFrame ??= (id) => clearTimeout(id);
}
