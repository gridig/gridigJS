class g {
  constructor() {
    this.listeners = /* @__PURE__ */ new Map();
  }
  on(e, t) {
    let i = this.listeners.get(e);
    return (
      i || ((i = /* @__PURE__ */ new Set()), this.listeners.set(e, i)),
      i.add(t),
      () => {
        i.delete(t);
      }
    );
  }
  emit(e, t) {
    const i = this.listeners.get(e);
    if (i) for (const n of i) n(t);
  }
  clearAll() {
    this.listeners.clear();
  }
}
const h = /* @__PURE__ */ new WeakMap(),
  M = 100,
  E = [20, 300];
function S(l, e, t, i) {
  const n = t / l,
    a = i / e;
  return {
    cols: l,
    rows: e,
    cellCount: l * e,
    cellWidth: n,
    cellHeight: a,
    cellSize: (n + a) / 2,
    viewportWidth: t,
    viewportHeight: i,
  };
}
function m(l, e, t, i) {
  const n = l / t / (e / i);
  return Math.max(n, 1 / n);
}
class x {
  constructor(e = {}) {
    ((this.emitter = new g()),
      (this.state = null),
      (this.destroyed = !1),
      (this.viewportWidth = 0),
      (this.viewportHeight = 0));
    const t = e.cellSizeRange ?? [...E],
      i = e.initialCellSize ?? M;
    if (t[0] <= 0 || t[1] <= 0)
      throw new RangeError('cellSizeRange values must be positive');
    if (t[0] >= t[1])
      throw new RangeError(
        'cellSizeRange[0] must be less than cellSizeRange[1]',
      );
    if (i < t[0] || i > t[1])
      throw new RangeError('initialCellSize must be within cellSizeRange');
    ((this.initialCellSize = i),
      (this.cellSizeRange = t),
      h.set(this, {
        applyGrid: (n, a) => {
          if ((this.throwIfDestroyed(), !this.state))
            throw new Error('Cannot applyGrid before first recalculate()');
          const r = S(n, a, this.viewportWidth, this.viewportHeight),
            s = { ...this.state };
          (s.cols === r.cols && s.rows === r.rows) ||
            ((this.state = r),
            this.emitter.emit('change', {
              previous: s,
              current: { ...r },
              cellDelta: r.cellCount - s.cellCount,
              source: 'zoom',
            }));
        },
        emit: (n, a) => {
          this.emitter.emit(n, a);
        },
        zoomMinFired: !1,
        zoomMaxFired: !1,
        cellSizeRange: this.cellSizeRange,
      }));
  }
  on(e, t) {
    return (this.throwIfDestroyed(), this.emitter.on(e, t));
  }
  recalculate(e, t) {
    if ((this.throwIfDestroyed(), e < 0 || t < 0))
      throw new RangeError('Viewport dimensions must not be negative');
    if (e === 0 || t === 0) return null;
    const i = h.get(this);
    let n, a;
    if (!this.state)
      ((n = Math.max(1, Math.round(e / this.initialCellSize))),
        (a = Math.max(1, Math.round(t / this.initialCellSize))));
    else {
      const o = (this.state.cellWidth + this.state.cellHeight) / 2;
      ((n = Math.max(1, Math.round(e / o))),
        (a = Math.max(1, Math.round(t / o))));
    }
    ((this.viewportWidth = e),
      (this.viewportHeight = t),
      ({ cols: n, rows: a } = this.clampLoop(n, a, e, t)));
    const r = S(n, a, e, t),
      s = this.state ? { ...this.state } : null,
      c = !s || s.cols !== r.cols || s.rows !== r.rows;
    if (((this.state = r), c)) {
      const o = r.cellSize <= this.cellSizeRange[0],
        u = r.cellSize >= this.cellSizeRange[1];
      (!o && !u && ((i.zoomMinFired = !1), (i.zoomMaxFired = !1)),
        this.emitter.emit('change', {
          previous: s,
          current: { ...r },
          cellDelta: r.cellCount - ((s == null ? void 0 : s.cellCount) ?? 0),
          source: 'recalculate',
        }),
        o &&
          !i.zoomMinFired &&
          ((i.zoomMinFired = !0),
          this.emitter.emit('zoom:min', { cellSize: r.cellSize })),
        u &&
          !i.zoomMaxFired &&
          ((i.zoomMaxFired = !0),
          this.emitter.emit('zoom:max', { cellSize: r.cellSize })));
    }
    return { ...r };
  }
  getState() {
    if ((this.throwIfDestroyed(), !this.state))
      throw new Error('Cannot getState() before first recalculate()');
    return { ...this.state };
  }
  destroy() {
    this.destroyed ||
      ((this.destroyed = !0), this.emitter.clearAll(), h.delete(this));
  }
  clampLoop(e, t, i, n) {
    const [a, r] = this.cellSizeRange;
    let s = (i / e + n / t) / 2;
    for (; s > r; ) {
      const c = m(i, n, e + 1, t),
        o = m(i, n, e, t + 1);
      (c <= o ? e++ : t++, (s = (i / e + n / t) / 2));
    }
    for (s = (i / e + n / t) / 2; s < a && (e > 1 || t > 1); ) {
      const c = e > 1,
        o = t > 1;
      if (c && o) {
        const u = m(i, n, e - 1, t),
          d = m(i, n, e, t - 1);
        u <= d ? e-- : t--;
      } else c ? e-- : t--;
      s = (i / e + n / t) / 2;
    }
    return { cols: e, rows: t };
  }
  throwIfDestroyed() {
    if (this.destroyed) throw new Error('GridEngine has been destroyed');
  }
}
function y(l, e, t, i) {
  const n = l / t / (e / i);
  return Math.max(n, 1 / n);
}
function z(l, e, t, i) {
  const n = y(t, i, l, e),
    a = (t / l + i / e) / 2;
  return { cols: l, rows: e, distance: n, cellSize: a };
}
function C(l, e, t, i, n) {
  return !l && !e
    ? null
    : l
      ? !e || l.distance < e.distance
        ? l
        : e.distance < l.distance
          ? e
          : n
            ? t > i
              ? l.cols < t
                ? l
                : e
              : i > t
                ? l.rows < i
                  ? l
                  : e
                : l.cols < t
                  ? l
                  : e
            : t < i
              ? l.cols > t
                ? l
                : e
              : i < t
                ? l.rows > i
                  ? l
                  : e
                : l.cols > t
                  ? l
                  : e
      : e;
}
class p {
  constructor(e) {
    this.engine = e;
  }
  zoomIn() {
    return this.zoom(!0);
  }
  zoomOut() {
    return this.zoom(!1);
  }
  isAtMax() {
    return this.dryRun(!0);
  }
  isAtMin() {
    return this.dryRun(!1);
  }
  zoom(e) {
    const t = h.get(this.engine);
    if (!t) throw new Error('GridEngine has been destroyed');
    const i = this.engine.getState(),
      { cols: n, rows: a, viewportWidth: r, viewportHeight: s } = i,
      [c, o] = this.getCellSizeRange(),
      u = this.evaluateZoom(n, a, r, s, c, o, e);
    if (!u) {
      const d = e ? 'zoom:max' : 'zoom:min',
        f = e ? 'zoomMaxFired' : 'zoomMinFired';
      return (t[f] || ((t[f] = !0), t.emit(d, { cellSize: i.cellSize })), !1);
    }
    return (
      e ? (t.zoomMinFired = !1) : (t.zoomMaxFired = !1),
      t.applyGrid(u.cols, u.rows),
      !0
    );
  }
  dryRun(e) {
    if (!h.get(this.engine)) throw new Error('GridEngine has been destroyed');
    const i = this.engine.getState(),
      { cols: n, rows: a, viewportWidth: r, viewportHeight: s } = i,
      [c, o] = this.getCellSizeRange();
    return this.evaluateZoom(n, a, r, s, c, o, e) === null;
  }
  evaluateZoom(e, t, i, n, a, r, s) {
    let c = null,
      o = null;
    s
      ? (e - 1 >= 1 && (c = z(e - 1, t, i, n)),
        t - 1 >= 1 && (o = z(e, t - 1, i, n)))
      : ((c = z(e + 1, t, i, n)), (o = z(e, t + 1, i, n)));
    const u = C(c, o, e, t, s);
    if (!u) return null;
    if (s ? u.cellSize > r : u.cellSize < a) {
      const f = u === c ? o : c;
      return f && !(s ? f.cellSize > r : f.cellSize < a) ? f : null;
    }
    return u;
  }
  getCellSizeRange() {
    const e = h.get(this.engine);
    if (!e) throw new Error('GridEngine has been destroyed');
    return e.cellSizeRange;
  }
}
export { g as EventEmitter, x as GridEngine, p as ZoomController };
