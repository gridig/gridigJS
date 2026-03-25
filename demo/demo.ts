import { GridEngine, ZoomController } from 'gridigjs';
import { DomRenderer } from 'gridigjs/dom';

const engine = new GridEngine({ initialCellSize: 80 });

const zoomInBtn = document.getElementById('zoom-in') as HTMLButtonElement;
const zoomOutBtn = document.getElementById('zoom-out') as HTMLButtonElement;
const info = document.getElementById('info') as HTMLSpanElement;

engine.on('change', ({ current }) => {
  info.textContent = `${current.cols}×${current.rows} (${current.cellCount} cells, ~${Math.round(current.cellSize)}px)`;
});

engine.on('zoom:max', () => {
  zoomInBtn.disabled = true;
});

engine.on('zoom:min', () => {
  zoomOutBtn.disabled = true;
});

const renderer = new DomRenderer(engine, {
  container: '#grid',
  onCellCreated: (el, col, row) => {
    el.addEventListener('click', () => el.classList.toggle('active'));
  },
});

const zoom = new ZoomController(engine);

zoomInBtn.addEventListener('click', () => {
  if (zoom.zoomIn()) {
    zoomOutBtn.disabled = false;
  }
});

zoomOutBtn.addEventListener('click', () => {
  if (zoom.zoomOut()) {
    zoomInBtn.disabled = false;
  }
});
