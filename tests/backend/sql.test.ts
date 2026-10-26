import { expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'

it('keeps setup staged-selection SQL synchronized with migration 00010', () => {
  const setup = fs.readFileSync(path.join(process.cwd(), 'supabase/setup.sql'), 'utf8')
  const migration = fs.readFileSync(path.join(process.cwd(), 'supabase/migrations/00010_staged_selection.sql'), 'utf8')
  const start = setup.indexOf('-- Bagian 6:')
  expect(start).toBeGreaterThan(0)
  const end = setup.indexOf('-- Bagian 7:', start)
  expect(end).toBeGreaterThan(start)
  const normalize = (sql: string) => sql.split('\n').filter(line => line.trim() && !line.trim().startsWith('--')).join('\n').trim()
  expect(normalize(setup.slice(start, end))).toBe(normalize(migration))
})
