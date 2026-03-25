export declare class DomRenderer {
  private readonly engine;
  private readonly container;
  private readonly onCellCreated?;
  private readonly onCellRemoved?;
  private readonly observer;
  private readonly unsubChange;
  private cols;
  private rows;
  private destroyed;
  constructor(engine: GridEngine, config: DomRendererConfig);
  destroy(): void;
  private sync;
}

export declare interface DomRendererConfig {
  container: string | HTMLElement;
  onCellCreated?: (el: HTMLElement, col: number, row: number) => void;
  onCellRemoved?: (el: HTMLElement, col: number, row: number) => void;
}

declare interface GridConfig {
  initialCellSize?: number;
  cellSizeRange?: [number, number];
}

declare interface GridDelta {
  previous: GridState | null;
  current: GridState;
  cellDelta: number;
  source: 'recalculate' | 'zoom';
}

declare class GridEngine {
  private readonly initialCellSize;
  private readonly cellSizeRange;
  private readonly emitter;
  private state;
  private destroyed;
  private viewportWidth;
  private viewportHeight;
  constructor(config?: GridConfig);
  on<K extends keyof GridEventMap>(
    event: K,
    listener: (data: GridEventMap[K]) => void,
  ): () => void;
  recalculate(width: number, height: number): GridState | null;
  getState(): GridState;
  destroy(): void;
  private clampLoop;
  private throwIfDestroyed;
}

declare type GridEventMap = {
  change: GridDelta;
  'zoom:min': {
    cellSize: number;
  };
  'zoom:max': {
    cellSize: number;
  };
};

declare interface GridState {
  cols: number;
  rows: number;
  cellCount: number;
  cellWidth: number;
  cellHeight: number;
  cellSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

export {};
