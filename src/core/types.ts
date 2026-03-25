export interface GridConfig {
  initialCellSize?: number;
  cellSizeRange?: [number, number];
}

export interface GridState {
  cols: number;
  rows: number;
  cellCount: number;
  cellWidth: number;
  cellHeight: number;
  cellSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

export interface GridDelta {
  previous: GridState | null;
  current: GridState;
  cellDelta: number;
  source: 'recalculate' | 'zoom';
}

export type GridEventMap = {
  change: GridDelta;
  'zoom:min': { cellSize: number };
  'zoom:max': { cellSize: number };
};
