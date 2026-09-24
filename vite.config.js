import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.js',
    css: false,
    // Scoped to src/ so the root-level firestore.rules.test.js (which needs
    // a running Firestore emulator — see the separate "test:rules" script)
    // never gets picked up by a plain `npm test`.
    include: ['src/**/*.{test,spec}.{js,jsx,ts,tsx}'],
    // Pin the test runner's local timezone to UTC so day-boundary logic
    // (formatTime.js's isSameDay/isSameDayGroup, which reads local
    // toDateString()) is deterministic regardless of the host machine's
    // timezone.
    env: {
      TZ: 'UTC',
    },
  },
})
