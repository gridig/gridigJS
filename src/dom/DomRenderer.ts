import type { GridEngine } from '../core/GridEngine';
import type { GridDelta } from '../core/types';

export interface DomRendererConfig {
  container: string | HTMLElement;
  onCellCreated?: (el: HTMLElement, col: number, row: number) => void;
  onCellRemoved?: (el: HTMLElement, col: number, row: number) => void;
}

export class DomRenderer {
  private readonly container: HTMLElement;
  private readonly onCellCreated?: (
    el: HTMLElement,
    col: number,
    row: number,
  ) => void;
  private readonly onCellRemoved?: (
    el: HTMLElement,
    col: number,
    row: number,
  ) => void;
  private readonly observer: ResizeObserver;
  private readonly unsubChange: () => void;
  private cols = 0;
  private rows = 0;
  private destroyed = false;

  constructor(engine: GridEngine, config: DomRendererConfig) {
    this.onCellCreated = config.onCellCreated;
    this.onCellRemoved = config.onCellRemoved;

    // Resolve container
    if (typeof config.container === 'string') {
      const el = document.querySelector(config.container);
      if (!el) throw new Error(`Container not found: ${config.container}`);
      this.container = el as HTMLElement;
    } else {
      this.container = config.container;
    }

    // Set grid display
    this.container.style.display = 'grid';

    // Subscribe to change events
    this.unsubChange = engine.on('change', (delta) => this.sync(delta));

    // ResizeObserver
    this.observer = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      try {
        engine.recalculate(width, height);
      } catch {
        // Engine may be destroyed (wrong-order teardown) — silently catch
      }
    });
    this.observer.observe(this.container);

    // Initial recalculate using content-box dimensions
    const style = getComputedStyle(this.container);
    const paddingH =
      parseFloat(style.paddingLeft) + parseFloat(style.paddingRight);
    const paddingV =
      parseFloat(style.paddingTop) + parseFloat(style.paddingBottom);
    const width = this.container.clientWidth - paddingH;
    const height = this.container.clientHeight - paddingV;
    engine.recalculate(width, height);
  }

  destroy(): void {
    if (this.destroyed) return;
    this.destroyed = true;

    this.observer.disconnect();
    this.unsubChange();

    // Remove all cells, calling onCellRemoved for each
    const errors: Error[] = [];
    const children = Array.from(this.container.children) as HTMLElement[];
    for (let i = children.length - 1; i >= 0; i--) {
      const el = children[i];
      const index = i;
      const col = index % this.cols;
      const row = Math.floor(index / this.cols);
      if (this.onCellRemoved) {
        try {
          this.onCellRemoved(el, col, row);
        } catch (e) {
          errors.push(e as Error);
        }
      }
      this.container.removeChild(el);
    }

    // Reset inline styles
    this.container.style.removeProperty('display');
    this.container.style.removeProperty('grid-template-columns');
    this.container.style.removeProperty('grid-template-rows');

    this.cols = 0;
    this.rows = 0;

    if (errors.length > 0) {
      throw new AggregateError(
        errors,
        'Errors during DomRenderer.destroy() cell removal',
      );
    }
  }

  private sync(delta: GridDelta): void {
    const { cols, rows } = delta.current;
    const newCount = cols * rows;

    if (this.cols === cols && this.rows === rows) return;

    const errors: Error[] = [];

    // Remove excess cells (last children first)
    while (this.container.children.length > newCount) {
      const el = this.container.lastElementChild as HTMLElement;
      const index = this.container.children.length - 1;
      const oldCol = index % this.cols;
      const oldRow = Math.floor(index / this.cols);
      if (this.onCellRemoved) {
        try {
          this.onCellRemoved(el, oldCol, oldRow);
        } catch (e) {
          errors.push(e as Error);
        }
      }
      this.container.removeChild(el);
    }

    // Add missing cells
    while (this.container.children.length < newCount) {
      const el = document.createElement('div');
      const index = this.container.children.length;
      const col = index % cols;
      const row = Math.floor(index / cols);
      el.dataset.col = String(col);
      el.dataset.row = String(row);
      this.container.appendChild(el);
      if (this.onCellCreated) {
        try {
          this.onCellCreated(el, col, row);
        } catch (e) {
          errors.push(e as Error);
        }
      }
    }

    // Re-stamp all cells with updated positions
    const children = this.container.children;
    for (let i = 0; i < children.length; i++) {
      const el = children[i] as HTMLElement;
      el.dataset.col = String(i % cols);
      el.dataset.row = String(Math.floor(i / cols));
    }

    // Update grid template
    this.container.style.gridTemplateColumns = `repeat(${cols}, 1fr)`;
    this.container.style.gridTemplateRows = `repeat(${rows}, 1fr)`;

    this.cols = cols;
    this.rows = rows;

    if (errors.length > 0) {
      throw new AggregateError(errors, 'Errors during DomRenderer cell sync');
    }
  }
}
