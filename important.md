# Nyong Noni UNIMA Official Portal

Portal resmi pemilihan Nyong Noni UNIMA - ajang pemilihan duta wisata dan budaya Universitas Negeri Manado.

## Tech Stack
- Next.js 15 (App Router)
- TypeScript (strict mode)
- Supabase (Auth, Database, Storage, RLS)
- TailwindCSS v4
- shadcn/ui components
- Zod validation
- React Hook Form
- Vitest (unit tests)
- Playwright (E2E tests)
- pnpm

## Quick Start
```bash
pnpm install
pnpm dev
```

## Commands
- `pnpm dev` - Start development server
- `pnpm build` - Production build
- `pnpm start` - Start production server
- `pnpm test` - Run unit tests (Vitest)
- `pnpm test:e2e` - Run E2E tests (Playwright)
- `pnpm lint` - Lint code
- `pnpm typecheck` - TypeScript type checking

## Project Structure
```
src/
  app/          → Next.js App Router pages
    (public)/   → Public website routes
    admin/      → Admin dashboard
  components/   → Reusable UI components
  features/     → Domain-based feature modules
  lib/          → Utilities (supabase, helpers, validations)
  server/       → Server actions and API logic
  types/        → TypeScript types
tests/
  unit/         → Vitest unit tests
  e2e/          → Playwright E2E tests
supabase/
  migrations/   → Database migrations with RLS
```

## Admin
- Route: `/admin`
- Login: `/admin/login`
- Not linked from public navigation
- Requires Supabase Auth + admin role

## Environment Variables
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```
