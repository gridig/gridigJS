import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { GridEngine } from '../src/core/GridEngine';
import { DomRenderer } from '../src/dom/DomRenderer';

function mockContainerSize(el: HTMLElement, width: number, height: number) {
  Object.defineProperty(el, 'clientWidth', {
    value: width,
    configurable: true,
    writable: true,
  });
  Object.defineProperty(el, 'clientHeight', {
    value: height,
    configurable: true,
    writable: true,
  });
  // Mock getComputedStyle to return zero padding
  const originalGetComputedStyle = window.getComputedStyle;
  vi.spyOn(window, 'getComputedStyle').mockImplementation((element) => {
    if (element === el) {
      return {
        ...originalGetComputedStyle(element),
        paddingLeft: '0',
        paddingRight: '0',
        paddingTop: '0',
        paddingBottom: '0',
      } as CSSStyleDeclaration;
    }
    return originalGetComputedStyle(element);
  });
}

describe('DomRenderer', () => {
  let container: HTMLElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
    mockContainerSize(container, 500, 500);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    if (container.parentNode) container.parentNode.removeChild(container);
  });

  describe('construction', () => {
    it('sets display: grid on container', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      expect(container.style.display).toBe('grid');
      renderer.destroy();
    });

    it('creates child divs on construction', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      const state = engine.getState();
      expect(container.children.length).toBe(state.cellCount);
      expect(state.cols).toBe(5);
      expect(state.rows).toBe(5);
      expect(container.children.length).toBe(25);
      renderer.destroy();
    });

    it('stamps data-col and data-row', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      const firstChild = container.children[0] as HTMLElement;
      expect(firstChild.dataset.col).toBe('0');
      expect(firstChild.dataset.row).toBe('0');
      const state = engine.getState();
      const lastChild = container.children[
        container.children.length - 1
      ] as HTMLElement;
      expect(lastChild.dataset.col).toBe(
        String((state.cellCount - 1) % state.cols),
      );
      expect(lastChild.dataset.row).toBe(
        String(Math.floor((state.cellCount - 1) / state.cols)),
      );
      renderer.destroy();
    });

    it('sets grid-template-columns and grid-template-rows', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      const state = engine.getState();
      expect(container.style.gridTemplateColumns).toBe(
        `repeat(${state.cols}, 1fr)`,
      );
      expect(container.style.gridTemplateRows).toBe(
        `repeat(${state.rows}, 1fr)`,
      );
      renderer.destroy();
    });

    it('throws if container string selector not found', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      expect(
        () => new DomRenderer(engine, { container: '#nonexistent' }),
      ).toThrow();
    });

    it('accepts an HTMLElement directly', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      expect(container.children.length).toBeGreaterThan(0);
      renderer.destroy();
    });
  });

  describe('lifecycle callbacks', () => {
    it('calls onCellCreated for each cell', () => {
      const onCellCreated = vi.fn();
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container, onCellCreated });
      const state = engine.getState();
      expect(onCellCreated).toHaveBeenCalledTimes(state.cellCount);
      renderer.destroy();
    });

    it('calls onCellRemoved on destroy', () => {
      const onCellRemoved = vi.fn();
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container, onCellRemoved });
      const state = engine.getState();
      renderer.destroy();
      expect(onCellRemoved).toHaveBeenCalledTimes(state.cellCount);
    });

    it('collects callback errors and still completes sync', () => {
      const onCellCreated = vi.fn().mockImplementation(() => {
        throw new Error('callback error');
      });
      const engine = new GridEngine({ initialCellSize: 100 });
      expect(
        () => new DomRenderer(engine, { container, onCellCreated }),
      ).toThrow(AggregateError);
      // Cells should still have been created despite errors
      expect(container.children.length).toBeGreaterThan(0);
    });
  });

  describe('destroy', () => {
    it('is idempotent', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      renderer.destroy();
      expect(() => renderer.destroy()).not.toThrow();
    });

    it('removes all children', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      expect(container.children.length).toBeGreaterThan(0);
      renderer.destroy();
      expect(container.children.length).toBe(0);
    });

    it('resets inline styles', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      renderer.destroy();
      expect(container.style.display).toBe('');
      expect(container.style.gridTemplateColumns).toBe('');
      expect(container.style.gridTemplateRows).toBe('');
    });
  });

  describe('resize sync', () => {
    it('updates grid on engine recalculate', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      const before = container.children.length;
      engine.recalculate(1000, 1000);
      const after = container.children.length;
      expect(after).toBeGreaterThan(before);
      renderer.destroy();
    });

    it('removes cells when grid shrinks', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const renderer = new DomRenderer(engine, { container });
      const before = container.children.length;
      engine.recalculate(200, 200);
      const after = container.children.length;
      expect(after).toBeLessThan(before);
      renderer.destroy();
    });
  });
});
