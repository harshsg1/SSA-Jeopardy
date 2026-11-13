import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';

export default defineConfig({
  // Relative asset paths so the build works at any URL (e.g. GitHub Pages sub-path).
  base: './',
  plugins: [react(), tailwindcss()],
  test: { environment: 'node' },
} as any);
