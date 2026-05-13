# ToramCalculator — Agent Guide

## Quick commands

| Action | Command |
|--------|---------|
| Setup (first time / schema change) | `pnpm setup` |
| Generate code only | `pnpm generate` |
| Dev server | `pnpm dev` |
| Build (pre-commit) | `pnpm build` |
| Lint & format | `pnpm biome check --write src/ db/` |
| Start infra | `pnpm infra:up` |
| Reset infra (destroys volumes) | `pnpm infra:reset` |
| Prisma Studio (on generated schema) | `pnpm db:studio` |

## Architecture

- **Framework**: SolidJS + SolidStart v2 alpha (`@solidjs/start`), Vite 7, **SSR disabled** (`ssr: false`). SPA mode.
- **Routing**: File-based (`src/routes/`), parens-wrap layouts: `(app)`, `(features)`, `(toolPages)`.
- **State**: SolidJS stores (`src/store.ts`) + XState machines (`xstate`).
- **3D**: Babylon.js 8.53 (core, loaders, materials; inspector dev-only).
- **3D vendor chunk**: `babylon-runtime`, `babylon-debug` (includes React/FluentUI for inspector).

## Database & Codegen (critical)

**Generated code** lives in `db/generated/` and is gitignored. Regenerate with `pnpm generate`.

Generation pipeline (in order):
1. `generate:inject` — reads `db/schema/enums.ts`, injects enums into Prisma schema via `EnumInjector`
2. `generate:schema` — runs custom Prisma generator (`db/generator/generator.ts`) producing: Zod schemas, DMMF utils, Kysely query builder rules, SQL (server + client), repositories
3. `generate:colorSystem` — generates CSS color tokens from `src/styles/colorSystem/generator/generator.ts`

**Schema source files**: `db/schema/main.prisma` + `db/schema/models/*.prisma` + `db/schema/enums.ts`
- `enums.ts` is the **single source of truth** for DB enums; edit it, not the prisma files directly.
- After editing schema or enums: run `pnpm generate` or `pnpm setup` (also resets infra).

**DB access**: Kysely (`kysely`) with `@db/generated/zod/index` for types.
- Server: PostgreSQL via `pg` pool.
- Client: PGlite in Web Worker (`src/lib/pglite/`) synced via ElectricSQL.

**Change API**: `POST /api/changes` — JWT-authenticated write endpoint (insert/update only, deletes blocked).

## Infrastructure

- Docker Compose in `backend/docker-compose.yaml` — PostgreSQL 16 (tmpfs, logical WAL) + ElectricSQL.
- Init SQL loaded from `db/generated/server.sql`.
- `infra:reset` does `down --volumes` + up + restore backup — destroys all data.

## Build / Service Worker

`pnpm build` does:
1. Service worker build: `node src/worker/sw/build.mjs` (esbuild, outputs `public/service.worker.js`)
2. Vite build: `NODE_OPTIONS=--max-old-space-size=4096 vite build`

SW version is extracted from `src/store.ts`'s `version` field.

## Conventions

- **Path aliases**: `~/` → `src/`, `@db/` → `db/`
- **TypeScript**: strict, `noEmit`, `moduleResolution: bundler`, JSX preserve (Solid).
- **Env**: `.env` with `dotenv-expand` (supports `${VAR}` references). Copy from `.env.example`.
- **Text encoding**: source files are UTF-8. When reading or editing from PowerShell, use explicit UTF-8 handling (for example `Get-Content -Encoding UTF8`) so Chinese comments are not misread as mojibake.
- **No tests exist** in this repo.
