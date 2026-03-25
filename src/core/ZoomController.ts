import { internals } from './internal';
import type { GridEngine } from './GridEngine';

interface ZoomCandidate {
  cols: number;
  rows: number;
  distance: number;
  cellSize: number;
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

function evaluateCandidate(
  cols: number,
  rows: number,
  viewportWidth: number,
  viewportHeight: number,
): ZoomCandidate {
  const distance = symmetricDistance(viewportWidth, viewportHeight, cols, rows);
  const cellSize = (viewportWidth / cols + viewportHeight / rows) / 2;
  return { cols, rows, distance, cellSize };
}

function pickBestCandidate(
  a: ZoomCandidate | null,
  b: ZoomCandidate | null,
  currentCols: number,
  currentRows: number,
  zoomIn: boolean,
): ZoomCandidate | null {
  if (!a && !b) return null;
  if (!a) return b;
  if (!b) return a;

  if (a.distance < b.distance) return a;
  if (b.distance < a.distance) return b;

  // Tiebreaker
  if (zoomIn) {
    // Prefer removing whichever dimension is currently larger
    if (currentCols > currentRows) return a.cols < currentCols ? a : b;
    if (currentRows > currentCols) return a.rows < currentRows ? a : b;
    // Equal: prefer cols
    return a.cols < currentCols ? a : b;
  } else {
    // Prefer adding to whichever dimension is currently smaller
    if (currentCols < currentRows) return a.cols > currentCols ? a : b;
    if (currentRows < currentCols) return a.rows > currentRows ? a : b;
    // Equal: prefer cols
    return a.cols > currentCols ? a : b;
  }
}

export class ZoomController {
  private readonly engine: GridEngine;

  constructor(engine: GridEngine) {
    this.engine = engine;
  }

  zoomIn(): boolean {
    return this.zoom(true);
  }

  zoomOut(): boolean {
    return this.zoom(false);
  }

  isAtMax(): boolean {
    return this.dryRun(true);
  }

  isAtMin(): boolean {
    return this.dryRun(false);
  }

  private zoom(zoomIn: boolean): boolean {
    const internal = internals.get(this.engine);
    if (!internal) throw new Error('GridEngine has been destroyed');

    const state = this.engine.getState();
    const { cols, rows, viewportWidth, viewportHeight } = state;
    const [min, max] = this.getCellSizeRange();

    const result = this.evaluateZoom(
      cols,
      rows,
      viewportWidth,
      viewportHeight,
      min,
      max,
      zoomIn,
    );

    if (!result) {
      // Emit boundary event
      const boundaryEvent = zoomIn ? 'zoom:max' : 'zoom:min';
      const firedFlag = zoomIn ? 'zoomMaxFired' : 'zoomMinFired';
      if (!internal[firedFlag]) {
        internal[firedFlag] = true;
        internal.emit(boundaryEvent, { cellSize: state.cellSize });
      }
      return false;
    }

    // Reset opposite boundary flag
    if (zoomIn) {
      internal.zoomMinFired = false;
    } else {
      internal.zoomMaxFired = false;
    }

    internal.applyGrid(result.cols, result.rows);
    return true;
  }

  private dryRun(zoomIn: boolean): boolean {
    const internal = internals.get(this.engine);
    if (!internal) throw new Error('GridEngine has been destroyed');

    const state = this.engine.getState();
    const { cols, rows, viewportWidth, viewportHeight } = state;
    const [min, max] = this.getCellSizeRange();

    const result = this.evaluateZoom(
      cols,
      rows,
      viewportWidth,
      viewportHeight,
      min,
      max,
      zoomIn,
    );
    return result === null;
  }

  private evaluateZoom(
    cols: number,
    rows: number,
    viewportWidth: number,
    viewportHeight: number,
    min: number,
    max: number,
    zoomIn: boolean,
  ): ZoomCandidate | null {
    let candidateA: ZoomCandidate | null = null;
    let candidateB: ZoomCandidate | null = null;

    if (zoomIn) {
      // Remove a column or a row
      if (cols - 1 >= 1) {
        candidateA = evaluateCandidate(
          cols - 1,
          rows,
          viewportWidth,
          viewportHeight,
        );
      }
      if (rows - 1 >= 1) {
        candidateB = evaluateCandidate(
          cols,
          rows - 1,
          viewportWidth,
          viewportHeight,
        );
      }
    } else {
      // Add a column or a row
      candidateA = evaluateCandidate(
        cols + 1,
        rows,
        viewportWidth,
        viewportHeight,
      );
      candidateB = evaluateCandidate(
        cols,
        rows + 1,
        viewportWidth,
        viewportHeight,
      );
    }

    const best = pickBestCandidate(candidateA, candidateB, cols, rows, zoomIn);
    if (!best) return null;

    const boundCheck = zoomIn ? best.cellSize > max : best.cellSize < min;
    if (boundCheck) {
      // Try the other candidate
      const fallback = best === candidateA ? candidateB : candidateA;
      if (fallback) {
        const fallbackBoundCheck = zoomIn
          ? fallback.cellSize > max
          : fallback.cellSize < min;
        if (!fallbackBoundCheck) return fallback;
      }
      return null;
    }

    return best;
  }

  private getCellSizeRange(): [number, number] {
    const internal = internals.get(this.engine);
    if (!internal) throw new Error('GridEngine has been destroyed');
    return internal.cellSizeRange;
  }
}
