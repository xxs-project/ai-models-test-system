import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import path from 'path'

export default defineConfig({
  plugins: [react()], server: { watch: { ignored: ["**/bench_test/**"] } },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5175,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
      '/ws': {
        target: 'ws://127.0.0.1:8001',
        ws: true,
      },
    },
  },
})
