class g {
  constructor(n, t) {
    if (
      ((this.cols = 0),
      (this.rows = 0),
      (this.destroyed = !1),
      (this.engine = n),
      (this.onCellCreated = t.onCellCreated),
      (this.onCellRemoved = t.onCellRemoved),
      typeof t.container == 'string')
    ) {
      const o = document.querySelector(t.container);
      if (!o) throw new Error(`Container not found: ${t.container}`);
      this.container = o;
    } else this.container = t.container;
    ((this.container.style.display = 'grid'),
      (this.unsubChange = n.on('change', (o) => this.sync(o))),
      (this.observer = new ResizeObserver((o) => {
        const l = o[0];
        if (!l) return;
        const { width: c, height: a } = l.contentRect;
        try {
          n.recalculate(c, a);
        } catch {}
      })),
      this.observer.observe(this.container));
    const r = getComputedStyle(this.container),
      i = parseFloat(r.paddingLeft) + parseFloat(r.paddingRight),
      s = parseFloat(r.paddingTop) + parseFloat(r.paddingBottom),
      h = this.container.clientWidth - i,
      e = this.container.clientHeight - s;
    n.recalculate(h, e);
  }
  destroy() {
    if (this.destroyed) return;
    ((this.destroyed = !0), this.observer.disconnect(), this.unsubChange());
    const n = [],
      t = Array.from(this.container.children);
    for (let r = t.length - 1; r >= 0; r--) {
      const i = t[r],
        s = r,
        h = s % this.cols,
        e = Math.floor(s / this.cols);
      if (this.onCellRemoved)
        try {
          this.onCellRemoved(i, h, e);
        } catch (o) {
          n.push(o);
        }
      this.container.removeChild(i);
    }
    if (
      (this.container.style.removeProperty('display'),
      this.container.style.removeProperty('grid-template-columns'),
      this.container.style.removeProperty('grid-template-rows'),
      (this.cols = 0),
      (this.rows = 0),
      n.length > 0)
    )
      throw new AggregateError(
        n,
        'Errors during DomRenderer.destroy() cell removal',
      );
  }
  sync(n) {
    const { cols: t, rows: r } = n.current,
      i = t * r;
    if ((this.cols * this.rows, this.cols === t && this.rows === r)) return;
    const s = [];
    for (; this.container.children.length > i; ) {
      const e = this.container.lastElementChild,
        o = this.container.children.length - 1,
        l = o % this.cols,
        c = Math.floor(o / this.cols);
      if (this.onCellRemoved)
        try {
          this.onCellRemoved(e, l, c);
        } catch (a) {
          s.push(a);
        }
      this.container.removeChild(e);
    }
    for (; this.container.children.length < i; ) {
      const e = document.createElement('div'),
        o = this.container.children.length,
        l = o % t,
        c = Math.floor(o / t);
      if (
        ((e.dataset.col = String(l)),
        (e.dataset.row = String(c)),
        this.container.appendChild(e),
        this.onCellCreated)
      )
        try {
          this.onCellCreated(e, l, c);
        } catch (a) {
          s.push(a);
        }
    }
    const h = this.container.children;
    for (let e = 0; e < h.length; e++) {
      const o = h[e];
      ((o.dataset.col = String(e % t)),
        (o.dataset.row = String(Math.floor(e / t))));
    }
    if (
      ((this.container.style.gridTemplateColumns = `repeat(${t}, 1fr)`),
      (this.container.style.gridTemplateRows = `repeat(${r}, 1fr)`),
      (this.cols = t),
      (this.rows = r),
      s.length > 0)
    )
      throw new AggregateError(s, 'Errors during DomRenderer cell sync');
  }
}
export { g as DomRenderer };
