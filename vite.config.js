import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  base: './',
  build: {
    rollupOptions: {
      input: {
        main: resolve(import.meta.dirname, 'index.html'),
        setlist: resolve(import.meta.dirname, 'criador_setlist/index.html'),
      },
    },
  },
});
