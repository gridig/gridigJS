import type { GridEventMap } from './types';

type Listener<K extends keyof GridEventMap> = (data: GridEventMap[K]) => void;

export class EventEmitter {
  private listeners = new Map<keyof GridEventMap, Set<Listener<any>>>();

  on<K extends keyof GridEventMap>(
    event: K,
    listener: Listener<K>,
  ): () => void {
    let set = this.listeners.get(event);
    if (!set) {
      set = new Set();
      this.listeners.set(event, set);
    }
    set.add(listener);
    return () => {
      set!.delete(listener);
    };
  }

  emit<K extends keyof GridEventMap>(event: K, data: GridEventMap[K]): void {
    const set = this.listeners.get(event);
    if (set) {
      for (const listener of set) {
        listener(data);
      }
    }
  }

  clearAll(): void {
    this.listeners.clear();
  }
}
