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

## Documentation & ADRs

Design docs live in `src/lib/engine/document/`. Code is not the sole source of truth — the engine carries design intent that only survives in documentation. Read and extend it as you work.

### Layout

- `src/lib/engine/document/README.md` — entry point, reader-oriented navigation.
- `src/lib/engine/document/decisions/` — ADRs (architecture decision records).
- `src/lib/engine/document/decisions/README.md` — **authoritative ADR rules**. Read before writing one.
- `src/lib/engine/document/decisions/0000-template.md` — template.
- Legacy narratives (`架构设计说明概要.md`, `hook与触发层设计讨论结论.md`, `通信协议表.md`, `WorldAreaSystem.md`) — historical snapshots. Do not extend them; split new content into ADRs instead.

### When to propose an ADR

Propose one (with user confirmation) when the change:
- Crosses ≥2 top-level engine directories, or modifies a contract (`PipelineCatalog` / `EventCatalog` / `AttributeSchema` / `StatusTypeRegistry`, inter-thread protocol, checkpoint format).
- Switches an already-implemented approach to a different one.
- Introduces a new registry, communication mechanism, or layering.
- Establishes a convention future passives / skills / pipelines must follow (naming prefixes, bitfield allocation, payload field additions).

Do **not** create ADRs for: single-file refactors, bug fixes, formatting, or purely exploratory ideas. Commit messages and inline comments cover those.

### Hard rules (never violate silently)

1. **Never edit an existing `Accepted` ADR's body.** Substantive corrections go into a new ADR that `Supersedes: NNNN`. Only the status field, broken links, code line numbers, and typos may be patched in place.
2. **Never reuse an ADR number.** Deprecated/superseded ADRs keep their number forever.
3. **"代价" (trade-offs) section is mandatory.** If you cannot articulate what the decision gives up, stop and ask — the design is not ready.
4. **Keep ADRs single-concern.** Multiple independent trade-offs → multiple ADRs.
5. **Do not restate code.** ADRs explain *why*, not *what*. Link with `path:line`, don't paste signatures.
6. **Candidate options must list both pros and cons.** A one-sided option means analysis is incomplete.

### Authoring workflow

Full procedure in `decisions/README.md` §维护规则. Short version:

1. Grep the index and 待拆清单 for duplicates / supersedable entries.
2. Take max index + 1, four digits. File: `NNNN-<kebab-english-slug>.md`.
3. Copy `0000-template.md`; initial status `Proposed`.
4. Update the index table; tick off 待拆清单 if applicable.
5. Add `// 见 src/lib/engine/document/decisions/NNNN-xxx.md` only at non-obvious code sites — don't spam.
6. Commit ADR + code in one commit, message prefixed with `(ADR-NNNN)`. Doc-only revisions use `docs:` prefix in a separate commit.

### Language

Write ADRs in Chinese to match the rest of the document set, unless the user explicitly asks otherwise. Metadata keys (`状态`, `日期`, `决策层`) stay in Chinese for consistency with existing ADRs.
