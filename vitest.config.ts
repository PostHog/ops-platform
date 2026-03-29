import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'json'],
      exclude: [
        '**/node_modules/**',
        '**/dist/**',
        '**/*.config.*',
        '**/tests/**',
        '**/.output/**',
        'src/routeTree.gen.ts',
        'src/start.ts',
        'src/router.tsx',
        'src/db.ts',
        'src/env.ts',
        'src/components/ui/**',
        'scripts/**',
        '.netlify/**',
      ],
    },
  },
})
