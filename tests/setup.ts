class MockResizeObserver {
  callback: ResizeObserverCallback;
  constructor(cb: ResizeObserverCallback) {
    this.callback = cb;
  }
  observe() {}
  unobserve() {}
  disconnect() {}
  simulateResize(entries: Partial<ResizeObserverEntry>[]) {
    this.callback(entries as ResizeObserverEntry[], this);
  }
}
globalThis.ResizeObserver = MockResizeObserver as any;
