import { describe, it, expect, vi } from 'vitest';
import { GridEngine } from '../src/core/GridEngine';

describe('GridEngine', () => {
  describe('construction', () => {
    it('creates with defaults', () => {
      const engine = new GridEngine();
      expect(engine).toBeDefined();
    });

    it('throws if cellSizeRange[0] >= cellSizeRange[1]', () => {
      expect(() => new GridEngine({ cellSizeRange: [100, 100] })).toThrow(
        RangeError,
      );
      expect(() => new GridEngine({ cellSizeRange: [200, 100] })).toThrow(
        RangeError,
      );
    });

    it('throws if cellSizeRange values <= 0', () => {
      expect(() => new GridEngine({ cellSizeRange: [0, 100] })).toThrow(
        RangeError,
      );
      expect(() => new GridEngine({ cellSizeRange: [-1, 100] })).toThrow(
        RangeError,
      );
    });

    it('throws if initialCellSize outside cellSizeRange', () => {
      expect(() => new GridEngine({ initialCellSize: 10 })).toThrow(RangeError);
      expect(() => new GridEngine({ initialCellSize: 500 })).toThrow(
        RangeError,
      );
    });
  });

  describe('recalculate', () => {
    it('returns GridState on valid dimensions', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const state = engine.recalculate(1920, 1080);
      expect(state).not.toBeNull();
      expect(state!.cols).toBe(19);
      expect(state!.rows).toBe(11);
      expect(state!.cellCount).toBe(19 * 11);
      expect(state!.viewportWidth).toBe(1920);
      expect(state!.viewportHeight).toBe(1080);
    });

    it('returns null on zero dimensions', () => {
      const engine = new GridEngine();
      expect(engine.recalculate(0, 1080)).toBeNull();
      expect(engine.recalculate(1920, 0)).toBeNull();
    });

    it('throws on negative dimensions', () => {
      const engine = new GridEngine();
      expect(() => engine.recalculate(-1, 1080)).toThrow(RangeError);
      expect(() => engine.recalculate(1920, -1)).toThrow(RangeError);
    });

    it('emits change event', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      const fn = vi.fn();
      engine.on('change', fn);
      engine.recalculate(1920, 1080);
      expect(fn).toHaveBeenCalledOnce();
      const delta = fn.mock.calls[0][0];
      expect(delta.previous).toBeNull();
      expect(delta.current.cols).toBe(19);
      expect(delta.source).toBe('recalculate');
    });

    it('does not emit change when grid unchanged', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      engine.recalculate(1920, 1080);
      const fn = vi.fn();
      engine.on('change', fn);
      engine.recalculate(1920, 1080);
      expect(fn).not.toHaveBeenCalled();
    });

    it('enforces 1x1 floor', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [20, 300],
      });
      const state = engine.recalculate(10, 10);
      expect(state).not.toBeNull();
      expect(state!.cols).toBeGreaterThanOrEqual(1);
      expect(state!.rows).toBeGreaterThanOrEqual(1);
    });

    it('preserves approximate cell size on resize', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      engine.recalculate(1920, 1080);
      const state1 = engine.getState();
      engine.recalculate(2560, 1440);
      const state2 = engine.getState();
      // Cell size should be approximately preserved
      expect(Math.abs(state2.cellSize - state1.cellSize)).toBeLessThan(20);
    });
  });

  describe('getState', () => {
    it('throws before first recalculate', () => {
      const engine = new GridEngine();
      expect(() => engine.getState()).toThrow();
    });

    it('returns a copy (not a reference)', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      engine.recalculate(1920, 1080);
      const s1 = engine.getState();
      const s2 = engine.getState();
      expect(s1).toEqual(s2);
      expect(s1).not.toBe(s2);
    });
  });

  describe('destroy', () => {
    it('is idempotent', () => {
      const engine = new GridEngine();
      engine.destroy();
      expect(() => engine.destroy()).not.toThrow();
    });

    it('throws on recalculate after destroy', () => {
      const engine = new GridEngine();
      engine.destroy();
      expect(() => engine.recalculate(1920, 1080)).toThrow();
    });

    it('throws on getState after destroy', () => {
      const engine = new GridEngine({ initialCellSize: 100 });
      engine.recalculate(1920, 1080);
      engine.destroy();
      expect(() => engine.getState()).toThrow();
    });

    it('throws on on() after destroy', () => {
      const engine = new GridEngine();
      engine.destroy();
      expect(() => engine.on('change', () => {})).toThrow();
    });
  });

  describe('zoom:min / zoom:max events', () => {
    it('emits zoom:max when resize clamps at max boundary', () => {
      // initialCellSize 80, range [20, 80]. On 80x80: round(80/80)=1x1, cellSize=80 = max
      const engine = new GridEngine({
        initialCellSize: 80,
        cellSizeRange: [20, 80],
      });
      const fn = vi.fn();
      engine.on('zoom:max', fn);
      engine.recalculate(80, 80);
      expect(fn).toHaveBeenCalledTimes(1);
    });
  });
});
