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
      // ---------------------------------------------------------------
      // VAPT: Security headers served by the Vite dev server.
      // In production these must be set by Nginx / Caddy / CloudFront.
      // ---------------------------------------------------------------
      headers: {
        // Prevent MIME-type sniffing
        'X-Content-Type-Options': 'nosniff',
        // Block framing / clickjacking
        'X-Frame-Options': 'DENY',
        // Legacy browser XSS filter
        'X-XSS-Protection': '1; mode=block',
        // Limit referrer information leakage
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        // Opt-out of powerful browser features
        'Permissions-Policy':
          'accelerometer=(), camera=(), geolocation=(), gyroscope=(), ' +
          'magnetometer=(), microphone=(), payment=(), usb=(), ' +
          'fullscreen=(self)',
        // Content Security Policy for the React SPA
        //   script-src    – self + 'unsafe-inline' needed by Vite HMR in dev
        //   style-src     – self + 'unsafe-inline' for Tailwind CSS-in-JS
        //   font-src      – Google Fonts
        //   img-src       – self, data URIs, blobs, and backend uploads
        //   connect-src   – API + Vite HMR WebSocket
        //   frame-ancestors – deny (same as X-Frame-Options)
        'Content-Security-Policy': [
          "default-src 'self'",
          "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
          "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
          "font-src 'self' https://fonts.gstatic.com data:",
          `img-src 'self' data: blob: ${backendTarget}`,
          `connect-src 'self' ${backendTarget} ws://localhost:5173 wss://localhost:5173`,
          "object-src 'none'",
          "base-uri 'self'",
          "form-action 'self'",
          "frame-ancestors 'none'",
        ].join('; '),
      },
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