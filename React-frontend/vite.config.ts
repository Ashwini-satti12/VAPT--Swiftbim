import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendTarget = env.VITE_API_PROXY_TARGET || 'http://127.0.0.1:5000'

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        'react-router-dom': path.resolve(__dirname, 'src/lib/react-router-dom.tsx'),
        'react-router-dom-original': path.resolve(__dirname, 'node_modules/react-router-dom'),
      },
    },
    server: {
      port: 5173,
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/uploads': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/static': {
          target: backendTarget,
          changeOrigin: true,
        },
      },
    },
  }
})