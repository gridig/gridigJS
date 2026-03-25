import { describe, it, expect, vi } from 'vitest';
import { GridEngine } from '../src/core/GridEngine';
import { ZoomController } from '../src/core/ZoomController';

describe('ZoomController', () => {
  function createPair(width = 1920, height = 1080) {
    const engine = new GridEngine({ initialCellSize: 100 });
    engine.recalculate(width, height);
    const zoom = new ZoomController(engine);
    return { engine, zoom };
  }

  describe('zoomIn', () => {
    it('removes a row or column', () => {
      const { engine, zoom } = createPair();
      const before = engine.getState();
      const result = zoom.zoomIn();
      const after = engine.getState();
      expect(result).toBe(true);
      expect(after.cellCount).toBeLessThan(before.cellCount);
    });

    it('emits change with source zoom', () => {
      const { engine, zoom } = createPair();
      const fn = vi.fn();
      engine.on('change', fn);
      zoom.zoomIn();
      expect(fn).toHaveBeenCalledOnce();
      expect(fn.mock.calls[0][0].source).toBe('zoom');
    });

    it('returns false at max boundary', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [20, 110],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);
      // Zoom in until we can't
      let result = true;
      let safety = 100;
      while (result && safety-- > 0) {
        result = zoom.zoomIn();
      }
      expect(result).toBe(false);
    });
  });

  describe('zoomOut', () => {
    it('adds a row or column', () => {
      const { engine, zoom } = createPair();
      const before = engine.getState();
      const result = zoom.zoomOut();
      const after = engine.getState();
      expect(result).toBe(true);
      expect(after.cellCount).toBeGreaterThan(before.cellCount);
    });

    it('returns false at min boundary', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [90, 300],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);
      let result = true;
      let safety = 100;
      while (result && safety-- > 0) {
        result = zoom.zoomOut();
      }
      expect(result).toBe(false);
    });
  });

  describe('isAtMin / isAtMax', () => {
    it('isAtMax returns true when at max', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [20, 110],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);
      while (zoom.zoomIn()) {
        /* zoom to max */
      }
      expect(zoom.isAtMax()).toBe(true);
      expect(zoom.isAtMin()).toBe(false);
    });

    it('isAtMin returns true when at min', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [90, 300],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);
      while (zoom.zoomOut()) {
        /* zoom to min */
      }
      expect(zoom.isAtMin()).toBe(true);
      expect(zoom.isAtMax()).toBe(false);
    });

    it('isAtMax is false initially on normal viewport', () => {
      const { zoom } = createPair();
      expect(zoom.isAtMax()).toBe(false);
      expect(zoom.isAtMin()).toBe(false);
    });
  });

  describe('zoom:min / zoom:max events', () => {
    it('fires zoom:max once when hitting boundary', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [20, 110],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);
      const fn = vi.fn();
      engine.on('zoom:max', fn);
      while (zoom.zoomIn()) {
        /* zoom to max */
      }
      // One more attempt should NOT fire again
      zoom.zoomIn();
      expect(fn).toHaveBeenCalledOnce();
    });

    it('resets opposite boundary flag on successful zoom', () => {
      const engine = new GridEngine({
        initialCellSize: 100,
        cellSizeRange: [20, 300],
      });
      engine.recalculate(1920, 1080);
      const zoom = new ZoomController(engine);

      // Zoom in to max
      while (zoom.zoomIn()) {}

      const maxFn = vi.fn();
      engine.on('zoom:max', maxFn);

      // Zoom out (resets maxFired)
      zoom.zoomOut();

      // Zoom back in to max — should fire zoom:max again
      while (zoom.zoomIn()) {}
      expect(maxFn).toHaveBeenCalledOnce();
    });
  });

  describe('aspect ratio driven selection', () => {
    it('picks the candidate closest to square aspect ratio', () => {
      const { engine, zoom } = createPair(1920, 1080);
      const before = engine.getState();
      zoom.zoomIn();
      const after = engine.getState();
      // Should have removed exactly one row or column
      const colDiff = before.cols - after.cols;
      const rowDiff = before.rows - after.rows;
      expect(colDiff + rowDiff).toBe(1);
    });
  });

  it('throws on destroyed engine', () => {
    const { engine, zoom } = createPair();
    engine.destroy();
    expect(() => zoom.zoomIn()).toThrow();
  });
});
