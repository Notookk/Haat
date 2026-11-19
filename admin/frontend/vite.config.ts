import { fileURLToPath } from 'node:url';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const rootEnv = loadEnv(mode, fileURLToPath(new URL('../../', import.meta.url)), '');
  const merged = { ...rootEnv, ...env };

  const port = parseInt(merged.ADMIN_PORT || '5000', 10);
  const backendPort = parseInt(merged.ADMIN_BACKEND_PORT || '6000', 10);

  return {
    plugins: [react()],
    resolve: {
      alias: {
        '@haat/shared-contracts': fileURLToPath(new URL('../../shared/contracts/src/index.ts', import.meta.url)),
        '@haat/shared-frontend': fileURLToPath(new URL('../../shared/frontend/src/index.ts', import.meta.url)),
      },
    },
    server: {
      port,
      strictPort: false,
      proxy: {
        '/api': {
          target: `http://127.0.0.1:${backendPort}`,
          changeOrigin: true,
        },
        '/socket.io': {
          target: `http://127.0.0.1:${backendPort}`,
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
    },
  };
});
