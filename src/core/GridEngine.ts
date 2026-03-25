import { EventEmitter } from './EventEmitter';
import { internals } from './internal';
import type { GridConfig, GridState, GridEventMap } from './types';

const DEFAULT_INITIAL_CELL_SIZE = 100;
const DEFAULT_CELL_SIZE_RANGE: [number, number] = [20, 300];

function makeState(
  cols: number,
  rows: number,
  viewportWidth: number,
  viewportHeight: number,
): GridState {
  const cellWidth = viewportWidth / cols;
  const cellHeight = viewportHeight / rows;
  return {
    cols,
    rows,
    cellCount: cols * rows,
    cellWidth,
    cellHeight,
    cellSize: (cellWidth + cellHeight) / 2,
    viewportWidth,
    viewportHeight,
  };
}

function symmetricDistance(
  viewportWidth: number,
  viewportHeight: number,
  cols: number,
  rows: number,
): number {
  const ratio = viewportWidth / cols / (viewportHeight / rows);
  return Math.max(ratio, 1 / ratio);
}

export class GridEngine {
  private readonly initialCellSize: number;
  private readonly cellSizeRange: [number, number];
  private readonly emitter = new EventEmitter();
  private state: GridState | null = null;
  private destroyed = false;
  private viewportWidth = 0;
  private viewportHeight = 0;

  constructor(config: GridConfig = {}) {
    const cellSizeRange =
      config.cellSizeRange ??
      ([...DEFAULT_CELL_SIZE_RANGE] as [number, number]);
    const initialCellSize = config.initialCellSize ?? DEFAULT_INITIAL_CELL_SIZE;

    if (cellSizeRange[0] <= 0 || cellSizeRange[1] <= 0) {
      throw new RangeError('cellSizeRange values must be positive');
    }
    if (cellSizeRange[0] >= cellSizeRange[1]) {
      throw new RangeError(
        'cellSizeRange[0] must be less than cellSizeRange[1]',
      );
    }
    if (
      initialCellSize < cellSizeRange[0] ||
      initialCellSize > cellSizeRange[1]
    ) {
      throw new RangeError('initialCellSize must be within cellSizeRange');
    }

    this.initialCellSize = initialCellSize;
    this.cellSizeRange = cellSizeRange;

    internals.set(this, {
      applyGrid: (cols, rows) => {
        this.throwIfDestroyed();
        if (!this.state) {
          throw new Error('Cannot applyGrid before first recalculate()');
        }
        const newState = makeState(
          cols,
          rows,
          this.viewportWidth,
          this.viewportHeight,
        );
        const previous = { ...this.state };
        if (previous.cols === newState.cols && previous.rows === newState.rows)
          return;
        this.state = newState;
        this.emitter.emit('change', {
          previous,
          current: { ...newState },
          cellDelta: newState.cellCount - previous.cellCount,
          source: 'zoom',
        });
      },
      emit: (event, data) => {
        this.emitter.emit(event, data);
      },
      zoomMinFired: false,
      zoomMaxFired: false,
      cellSizeRange: this.cellSizeRange,
    });
  }

  on<K extends keyof GridEventMap>(
    event: K,
    listener: (data: GridEventMap[K]) => void,
  ): () => void {
    this.throwIfDestroyed();
    return this.emitter.on(event, listener);
  }

  recalculate(width: number, height: number): GridState | null {
    this.throwIfDestroyed();

    if (width < 0 || height < 0) {
      throw new RangeError('Viewport dimensions must not be negative');
    }
    if (width === 0 || height === 0) {
      return null;
    }

    const internal = internals.get(this)!;
    let cols: number;
    let rows: number;

    if (!this.state) {
      // Initial calculation
      cols = Math.max(1, Math.round(width / this.initialCellSize));
      rows = Math.max(1, Math.round(height / this.initialCellSize));
    } else {
      // Resize: preserve approximate cell size
      const targetCellSize = (this.state.cellWidth + this.state.cellHeight) / 2;
      cols = Math.max(1, Math.round(width / targetCellSize));
      rows = Math.max(1, Math.round(height / targetCellSize));
    }

    this.viewportWidth = width;
    this.viewportHeight = height;

    // Clamp to cellSizeRange bounds
    ({ cols, rows } = this.clampLoop(cols, rows, width, height));

    const newState = makeState(cols, rows, width, height);
    const previous = this.state ? { ...this.state } : null;

    const stateChanged =
      !previous ||
      previous.cols !== newState.cols ||
      previous.rows !== newState.rows;
    this.state = newState;

    if (stateChanged) {
      // Reset both boundary flags if we changed state without hitting a clamp
      const hitMin = newState.cellSize <= this.cellSizeRange[0];
      const hitMax = newState.cellSize >= this.cellSizeRange[1];
      if (!hitMin && !hitMax) {
        internal.zoomMinFired = false;
        internal.zoomMaxFired = false;
      }

      this.emitter.emit('change', {
        previous,
        current: { ...newState },
        cellDelta: newState.cellCount - (previous?.cellCount ?? 0),
        source: 'recalculate',
      });

      // Emit boundary events after change
      if (hitMin && !internal.zoomMinFired) {
        internal.zoomMinFired = true;
        this.emitter.emit('zoom:min', { cellSize: newState.cellSize });
      }
      if (hitMax && !internal.zoomMaxFired) {
        internal.zoomMaxFired = true;
        this.emitter.emit('zoom:max', { cellSize: newState.cellSize });
      }
    }

    return { ...newState };
  }

  getState(): GridState {
    this.throwIfDestroyed();
    if (!this.state) {
      throw new Error('Cannot getState() before first recalculate()');
    }
    return { ...this.state };
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;
    this.emitter.clearAll();
    internals.delete(this);
  }

  private clampLoop(
    cols: number,
    rows: number,
    width: number,
    height: number,
  ): { cols: number; rows: number } {
    const [min, max] = this.cellSizeRange;

    // Clamp upward if cellSize > max (increase grid dimensions)
    let cellSize = (width / cols + height / rows) / 2;
    while (cellSize > max) {
      // Increase whichever dimension produces lower symmetric distance
      const dCols = symmetricDistance(width, height, cols + 1, rows);
      const dRows = symmetricDistance(width, height, cols, rows + 1);
      if (dCols <= dRows) {
        cols++;
      } else {
        rows++;
      }
      cellSize = (width / cols + height / rows) / 2;
    }

    // Clamp downward if cellSize < min (decrease grid dimensions)
    cellSize = (width / cols + height / rows) / 2;
    while (cellSize < min && (cols > 1 || rows > 1)) {
      // Decrease whichever dimension produces lower symmetric distance
      const canDecCols = cols > 1;
      const canDecRows = rows > 1;
      if (canDecCols && canDecRows) {
        const dCols = symmetricDistance(width, height, cols - 1, rows);
        const dRows = symmetricDistance(width, height, cols, rows - 1);
        if (dCols <= dRows) {
          cols--;
        } else {
          rows--;
        }
      } else if (canDecCols) {
        cols--;
      } else {
        rows--;
      }
      cellSize = (width / cols + height / rows) / 2;
    }

    return { cols, rows };
  }

  private throwIfDestroyed(): void {
    if (this.destroyed) {
      throw new Error('GridEngine has been destroyed');
    }
  }
}
