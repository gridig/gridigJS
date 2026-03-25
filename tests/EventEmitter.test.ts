import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from '../src/core/EventEmitter';

describe('EventEmitter', () => {
  it('calls listeners on emit', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('change', fn);
    const data = {
      previous: null,
      current: {} as any,
      cellDelta: 1,
      source: 'recalculate' as const,
    };
    emitter.emit('change', data);
    expect(fn).toHaveBeenCalledWith(data);
  });

  it('supports multiple listeners', () => {
    const emitter = new EventEmitter();
    const fn1 = vi.fn();
    const fn2 = vi.fn();
    emitter.on('change', fn1);
    emitter.on('change', fn2);
    emitter.emit('change', {
      previous: null,
      current: {} as any,
      cellDelta: 0,
      source: 'recalculate',
    });
    expect(fn1).toHaveBeenCalledOnce();
    expect(fn2).toHaveBeenCalledOnce();
  });

  it('unsubscribe removes listener', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    const unsub = emitter.on('change', fn);
    unsub();
    emitter.emit('change', {
      previous: null,
      current: {} as any,
      cellDelta: 0,
      source: 'recalculate',
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('clearAll removes all listeners', () => {
    const emitter = new EventEmitter();
    const fn = vi.fn();
    emitter.on('change', fn);
    emitter.on('zoom:min', vi.fn());
    emitter.clearAll();
    emitter.emit('change', {
      previous: null,
      current: {} as any,
      cellDelta: 0,
      source: 'recalculate',
    });
    expect(fn).not.toHaveBeenCalled();
  });

  it('emitting unknown event does nothing', () => {
    const emitter = new EventEmitter();
    expect(() => emitter.emit('zoom:max', { cellSize: 100 })).not.toThrow();
  });
});
