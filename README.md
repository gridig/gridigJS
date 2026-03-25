# gridigJS

A headless grid calculation engine with optional DOM rendering. Logic is separated from rendering — import the core to compute responsive grid layouts with zoom, or add the DOM adapter for automatic CSS Grid rendering.

## Install

```bash
npm install gridigjs
```

## Quick Start

### Headless (Node, SSR, tests)

```ts
import { GridEngine, ZoomController } from 'gridigjs';

const engine = new GridEngine({ initialCellSize: 100 });

// Option A: event-driven
engine.on('change', ({ previous, current, source }) => {
  // previous is null on the first event
  console.log(current);
});
engine.recalculate(1920, 1080);

// Option B: one-shot (use return value, skip events)
const state = engine.recalculate(1920, 1080)!; // → GridState (null if zero-dimension no-op)
console.log(state.cols, state.rows); // 19, 11

const zoom = new ZoomController(engine);
zoom.zoomIn(); // removes a row or column
zoom.zoomOut(); // adds a row or column
```

### DOM (vanilla JS)

```html
<div id="my-grid" style="gap: 5px; width: 100%; height: 100vh;"></div>
```

```ts
import { GridEngine, ZoomController } from 'gridigjs';
import { DomRenderer } from 'gridigjs/dom';

const engine = new GridEngine({ initialCellSize: 100 });
const renderer = new DomRenderer(engine, { container: '#my-grid' });
const zoom = new ZoomController(engine);

// Consumer provides their own zoom UI
document.getElementById('zoom-in').onclick = () => zoom.zoomIn();
document.getElementById('zoom-out').onclick = () => zoom.zoomOut();
```

### Interactive Grid (e.g., Game of Life)

```ts
const engine = new GridEngine({ initialCellSize: 30 });

// Subscribe BEFORE creating DomRenderer to catch the initial 'change' event
// (DomRenderer's constructor calls recalculate(), which emits 'change')
engine.on('change', ({ previous, current, source }) => {
  resetGame(current.cols, current.rows);
});

const renderer = new DomRenderer(engine, {
  container: '#grid',
  onCellCreated: (el, col, row) => {
    el.addEventListener('click', () => toggleCell(col, row));
  },
  onCellRemoved: (el, col, row) => {
    // cleanup if needed
  },
});
const zoom = new ZoomController(engine);
```

## API

### `GridEngine`

The headless core. Computes grid dimensions from viewport size and cell size, with no DOM dependency.

```ts
const engine = new GridEngine({
  initialCellSize: 100, // default: 100 — used only on first recalculate()
  cellSizeRange: [20, 300], // default: [20, 300] — min/max average cell size in pixels
});

// Events
engine.on('change', ({ previous, current, cellDelta, source }) => {});
engine.on('zoom:min', ({ cellSize }) => {}); // fires once on transition
engine.on('zoom:max', ({ cellSize }) => {}); // fires once on transition

engine.recalculate(width, height); // → GridState | null (null if zero dimensions)
engine.getState(); // → GridState snapshot (throws before first recalculate)
engine.destroy(); // idempotent — all other methods throw after destroy
```

`engine.on()` returns an unsubscribe function:

```ts
const unsub = engine.on('change', fn);
unsub(); // removes listener
```

### `ZoomController`

Incremental zoom (±1 row or column per step). The algorithm picks whichever dimension keeps cells closest to a 1:1 aspect ratio.

```ts
const zoom = new ZoomController(engine);
zoom.zoomIn(); // returns false if at max
zoom.zoomOut(); // returns false if at min
zoom.isAtMax(); // computation-based dry-run check (no side effects)
zoom.isAtMin(); // computation-based dry-run check (no side effects)
```

One `ZoomController` per `GridEngine` instance. Subscription-free — no `destroy()` needed.

**Zoom is not reversible.** Zoom in followed by zoom out may not return to the original grid. Each step independently picks the candidate closest to square. Consumers who need undo should track grid states externally.

### `DomRenderer`

Optional DOM adapter. Sets `display: grid` on the container, manages child `<div>` elements with `data-col`/`data-row` attributes, and handles `ResizeObserver` automatically.

```ts
import { DomRenderer } from 'gridigjs/dom';

const renderer = new DomRenderer(engine, {
  container: '#my-grid', // CSS selector or HTMLElement — throws if not found
  onCellCreated: (el, col, row) => {}, // called once per cell when created
  onCellRemoved: (el, col, row) => {}, // called once per cell when removed (before DOM removal)
});
renderer.destroy(); // idempotent — does not destroy the engine
```

One `DomRenderer` per `GridEngine` instance. The renderer does not ship CSS or create zoom buttons — consumers own all styling and zoom UI.

`destroy()` calls `onCellRemoved` for every remaining cell, removes children, disconnects the `ResizeObserver`, and resets the inline styles it set.

## Types

```ts
interface GridConfig {
  initialCellSize?: number; // default: 100
  cellSizeRange?: [number, number]; // default: [20, 300]
}

interface GridState {
  cols: number;
  rows: number;
  cellCount: number;
  cellWidth: number; // viewportWidth / cols
  cellHeight: number; // viewportHeight / rows
  cellSize: number; // (cellWidth + cellHeight) / 2
  viewportWidth: number;
  viewportHeight: number;
}

interface GridDelta {
  previous: GridState | null; // null on the first 'change' event
  current: GridState;
  cellDelta: number; // current.cellCount - (previous?.cellCount ?? 0)
  source: 'recalculate' | 'zoom';
}

type GridEventMap = {
  change: GridDelta;
  'zoom:min': { cellSize: number };
  'zoom:max': { cellSize: number };
};

interface DomRendererConfig {
  container: string | HTMLElement;
  onCellCreated?: (el: HTMLElement, col: number, row: number) => void;
  onCellRemoved?: (el: HTMLElement, col: number, row: number) => void;
}
```

## Zoom Algorithm

Zoom operates by adding or removing one row or column at a time, not by applying a zoom factor.

**Zoom in** (make cells larger): compute two candidates `(cols-1, rows)` and `(cols, rows-1)`. Pick the one whose cells are closest to square (`max(ratio, 1/ratio)` — symmetric distance). Reject candidates that would exceed `cellSizeRange[1]`.

**Zoom out** (make cells smaller): compute two candidates `(cols+1, rows)` and `(cols, rows+1)`. Same selection logic. Reject candidates below `cellSizeRange[0]`.

**On resize**: cols/rows are recalculated to keep cells as close to their current average size as possible, clamped to `cellSizeRange` bounds with a `1x1` floor.

## Event Behavior

- **`change`** fires only when cols or rows actually change. `source` is `'recalculate'` for resize-driven changes, `'zoom'` for zoom-driven changes.
- **`zoom:min` / `zoom:max`** fire once on transition, not on every blocked attempt. Reset by a successful zoom in the opposite direction or any resize that changes the grid without hitting a clamp boundary.
- **Event ordering from resize**: `'change'` fires first, then `'zoom:min'`/`'zoom:max'` if applicable.

## Error Handling

- **Construction**: throws `RangeError` if `cellSizeRange[0] >= cellSizeRange[1]`, values are `<= 0`, or `initialCellSize` is outside range.
- **`recalculate()`**: throws `RangeError` on negative dimensions. Returns `null` on zero dimensions (no-op).
- **`getState()`**: throws if called before first `recalculate()`.
- **Post-destroy**: all methods throw except `destroy()` (which is idempotent).
- **Callback errors**: `onCellCreated`/`onCellRemoved` errors are caught per-cell; DOM sync runs to completion; errors are rethrown as `AggregateError`.

## Development

```bash
pnpm install
pnpm dev          # dev server with demo at /demo/index.html
pnpm test         # run tests (49 tests)
pnpm test:watch   # run tests in watch mode
pnpm build        # build to dist/
```

## Architecture

```
gridigjs/
  src/
    index.ts                  # Re-exports core
    core/
      types.ts                # GridConfig, GridState, GridDelta, GridEventMap
      internal.ts             # WeakMap-based package-internal access
      EventEmitter.ts         # Typed event emitter (~30 lines)
      GridEngine.ts           # Headless grid calculation engine
      ZoomController.ts       # Subscription-free zoom calculator
      index.ts                # Core barrel export
    dom/
      DomRenderer.ts          # DOM rendering adapter
      index.ts                # DOM barrel export
  tests/
    EventEmitter.test.ts
    GridEngine.test.ts
    ZoomController.test.ts
    DomRenderer.test.ts
  demo/
    index.html
    demo.ts
    demo.css
  legacy/                     # Archived original prototype
```

ESM only. No CSS shipped. Built with Vite (library mode) + TypeScript. Type declarations generated via `vite-plugin-dts`.

## Legacy

The `legacy/` directory contains the original vanilla JS/CSS prototype, kept for reference. A 02/02/2020 snapshot can be found in the [Arctic Code Vault](https://archiveprogram.github.com/arctic-vault/)
