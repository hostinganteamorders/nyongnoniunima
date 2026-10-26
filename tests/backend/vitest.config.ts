import { defineConfig } from 'vitest/config'
import path from 'path'

export default defineConfig({
  test: { environment: 'node', include: ['tests/backend/**/*.test.ts'], fileParallelism: false },
  resolve: { alias: { '@': path.resolve(__dirname, '../../src') } },
})
