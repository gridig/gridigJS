export declare class EventEmitter {
  private listeners;
  on<K extends keyof GridEventMap>(event: K, listener: Listener<K>): () => void;
  emit<K extends keyof GridEventMap>(event: K, data: GridEventMap[K]): void;
  clearAll(): void;
}

export declare interface GridConfig {
  initialCellSize?: number;
  cellSizeRange?: [number, number];
}

export declare interface GridDelta {
  previous: GridState | null;
  current: GridState;
  cellDelta: number;
  source: 'recalculate' | 'zoom';
}

export declare class GridEngine {
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

export declare type GridEventMap = {
  change: GridDelta;
  'zoom:min': {
    cellSize: number;
  };
  'zoom:max': {
    cellSize: number;
  };
};

export declare interface GridState {
  cols: number;
  rows: number;
  cellCount: number;
  cellWidth: number;
  cellHeight: number;
  cellSize: number;
  viewportWidth: number;
  viewportHeight: number;
}

declare type Listener<K extends keyof GridEventMap> = (
  data: GridEventMap[K],
) => void;

export declare class ZoomController {
  private readonly engine;
  constructor(engine: GridEngine);
  zoomIn(): boolean;
  zoomOut(): boolean;
  isAtMax(): boolean;
  isAtMin(): boolean;
  private zoom;
  private dryRun;
  private evaluateZoom;
  private getCellSizeRange;
}

export {};
