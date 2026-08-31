// Minimal vite config for when @vitejs/plugin-react is broken
import { defineConfig } from 'vite';

export default defineConfig({
  server: {
    port: 3000,
    host: true,
  },
  esbuild: {
    jsxInjectImport: false,
    jsx: 'automatic',
  },
});
