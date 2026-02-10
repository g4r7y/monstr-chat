import { defineConfig } from 'vite'
import path from 'node:path';
import react from '@vitejs/plugin-react-swc'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: [
      { find: '@core', replacement: path.resolve(__dirname, '../core/src') }
    ]
  },
  server: {
    fs: {
      allow: [path.resolve(__dirname, '..')]
    }
  }
});