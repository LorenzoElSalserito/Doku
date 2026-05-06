import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';

const HERE = __dirname;
const ROOT_PACKAGE = JSON.parse(readFileSync(resolve(HERE, '../../package.json'), 'utf8')) as {
  version: string;
};
const SPLASH_ICON_BASE64 = readFileSync(resolve(HERE, 'src/assets/icon.png')).toString('base64');

const aliases = {
  '@doku/schemas': resolve(HERE, '../../packages/schemas/src/index.ts'),
  '@doku/application': resolve(HERE, '../../packages/application/src/index.ts'),
  '@doku/infrastructure': resolve(HERE, '../../packages/infrastructure/src/index.ts'),
  '@doku/ui': resolve(HERE, '../../packages/ui/src/index.ts'),
};

const WORKSPACE_PACKAGES = [
  '@doku/schemas',
  '@doku/application',
  '@doku/infrastructure',
  '@doku/ui',
];

export default defineConfig({
  main: {
    root: HERE,
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    define: {
      __DOKU_SPLASH_ICON_BASE64__: JSON.stringify(SPLASH_ICON_BASE64),
    },
    build: {
      outDir: resolve(HERE, 'out/main'),
      rollupOptions: {
        input: { index: resolve(HERE, 'src/main/index.ts') },
      },
    },
    resolve: { alias: aliases },
  },
  preload: {
    root: HERE,
    plugins: [externalizeDepsPlugin({ exclude: WORKSPACE_PACKAGES })],
    build: {
      outDir: resolve(HERE, 'out/preload'),
      rollupOptions: {
        input: { index: resolve(HERE, 'src/preload/index.ts') },
      },
    },
    resolve: { alias: aliases },
  },
  renderer: {
    root: resolve(HERE, 'src/renderer'),
    plugins: [react()],
    define: {
      __DOKU_APP_VERSION__: JSON.stringify(ROOT_PACKAGE.version),
    },
    worker: { format: 'es' },
    build: {
      outDir: resolve(HERE, 'out/renderer'),
      emptyOutDir: true,
      rollupOptions: {
        input: { index: resolve(HERE, 'src/renderer/index.html') },
      },
    },
    resolve: { alias: aliases },
  },
});
