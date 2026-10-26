import path from 'path';
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import checker from 'vite-plugin-checker';

export default defineConfig({
  plugins: [
    react(),
    checker({
      typescript: true,
    }),
  ],
  define: {
    global: 'window',
    // Provide a minimal process.env shim like in seer-pm
    'process.env': '{}',
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
      // Match seer-pm: node-fetch should use isomorphic-fetch (browser-friendly)
      'node-fetch': 'isomorphic-fetch',
    },
    // Force a single instance of these deps in the bundle
    dedupe: ['wagmi', '@wagmi/core', 'viem', 'react', 'react-dom', '@tanstack/react-query'],
  },
  build: {
    rollupOptions: {
      output: {
        // Ensure globalThis.process exists at runtime for deps that expect it
        intro: 'globalThis.process = globalThis.process || { env: {} };',
      },
    },
  },
});
