import { defineConfig } from 'vite';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import dts from 'vite-plugin-dts';

const __dirname = fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [dts({ rollupTypes: true })],
  resolve: {
    alias: {
      'gridigjs/dom': resolve(__dirname, 'src/dom/index.ts'),
      gridigjs: resolve(__dirname, 'src/index.ts'),
    },
  },
  build: {
    lib: {
      entry: {
        gridigjs: resolve(__dirname, 'src/index.ts'),
        dom: resolve(__dirname, 'src/dom/index.ts'),
      },
      formats: ['es'],
    },
    rollupOptions: {
      output: { entryFileNames: '[name].js' },
    },
  },
  server: {
    open: '/demo/index.html',
  },
});
