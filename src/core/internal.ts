import type { GridEngine } from './GridEngine';
import type { GridEventMap } from './types';

export interface InternalAccess {
  applyGrid(cols: number, rows: number): void;
  emit<K extends keyof GridEventMap>(event: K, data: GridEventMap[K]): void;
  zoomMinFired: boolean;
  zoomMaxFired: boolean;
  cellSizeRange: [number, number];
}

export const internals = new WeakMap<GridEngine, InternalAccess>();
