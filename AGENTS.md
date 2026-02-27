# AGENTS

<skills_system priority="1">

## Available Skills

<!-- SKILLS_TABLE_START -->
<usage>
When users ask you to perform tasks, check if any of the available skills below can help complete the task more effectively. Skills provide specialized capabilities and domain knowledge.

How to use skills:
- Invoke: `npx openskills read <skill-name>` (run in your shell)
  - For multiple: `npx openskills read skill-one,skill-two`
- The skill content will load with detailed instructions on how to complete the task
- Base directory provided in output for resolving bundled resources (references/, scripts/, assets/)

Usage notes:
- Only use skills listed in <available_skills> below
- Do not invoke a skill that is already loaded in your context
- Each skill invocation is stateless
</usage>

<available_skills>

<skill>
<name>canvas-design</name>
<description>Create beautiful visual art in .png and .pdf documents using design philosophy. You should use this skill when the user asks to create a poster, piece of art, design, or other static piece. Create original visual designs, never copying existing artists' work to avoid copyright violations.</description>
<location>global</location>
</skill>

<skill>
<name>frontend-design</name>
<description>Create distinctive, production-grade frontend interfaces with high design quality. Use this skill when the user asks to build web components, pages, artifacts, posters, or applications (examples include websites, landing pages, dashboards, React components, HTML/CSS layouts, or when styling/beautifying any web UI). Generates creative, polished code and UI design that avoids generic AI aesthetics.</description>
<location>global</location>
</skill>

<skill>
<name>mcp-builder</name>
<description>Guide for creating high-quality MCP (Model Context Protocol) servers that enable LLMs to interact with external services through well-designed tools. Use when building MCP servers to integrate external APIs or services, whether in Python (FastMCP) or Node/TypeScript (MCP SDK).</description>
<location>global</location>
</skill>

<skill>
<name>skill-creator</name>
<description>Guide for creating effective skills. This skill should be used when users want to create a new skill (or update an existing skill) that extends Claude's capabilities with specialized knowledge, workflows, or tool integrations.</description>
<location>global</location>
</skill>

<skill>
<name>web-artifacts-builder</name>
<description>Suite of tools for creating elaborate, multi-component claude.ai HTML artifacts using modern frontend web technologies (React, Tailwind CSS, shadcn/ui). Use for complex artifacts requiring state management, routing, or shadcn/ui components - not for simple single-file HTML/JSX artifacts.</description>
<location>global</location>
</skill>

<skill>
<name>webapp-testing</name>
<description>Toolkit for interacting with and testing local web applications using Playwright. Supports verifying frontend functionality, debugging UI behavior, capturing browser screenshots, and viewing browser logs.</description>
<location>global</location>
</skill>

</available_skills>
<!-- SKILLS_TABLE_END -->

</skills_system>

## Cursor Cloud specific instructions

### Project overview

ToramCalculator is a local-first SolidJS web app (Vinxi/Vite) for the game Toram Online. It uses PostgreSQL + ElectricSQL for server-to-client data sync and PGlite in the browser.

### Required services

| Service | Start command | Default port |
|---------|--------------|-------------|
| PostgreSQL 16 | `pnpm backend:up -d` (Docker) | 5432 |
| ElectricSQL | `pnpm backend:up -d` (Docker) | 3000 |
| Vinxi dev server | `pnpm dev` | 3001 |

Port 3000 is used by ElectricSQL, so the Vinxi dev server auto-selects port 3001.

### Startup sequence

1. Ensure Docker daemon is running (`sudo dockerd` if needed; socket at `/var/run/docker.sock` may need `sudo chmod 666`).
2. `pnpm dev:init` — generates Prisma schema, SQL, Zod types, repositories under `db/generated/`. Must re-run after schema changes.
3. `pnpm backend:up -d` — starts PostgreSQL and ElectricSQL containers.
4. `pnpm db:restore` — seeds game data from `db/backups/*.csv`. Without this the app runs but has no content.
5. `pnpm dev` — starts the Vinxi dev server on port 3001.

### Lint / Type-check

- **Linter**: Biome — `npx biome check` (config in `biome.json`). No `lint` script in `package.json`; call `npx biome check` directly.
- **TypeScript**: `npx tsc --noEmit`. Pre-existing type errors exist in the codebase.

### Gotchas

- Node.js >= 24 is required (`engines` field). Use `nvm install 24 && nvm use 24`.
- `tsx` must be installed globally (`npm install -g tsx`) — used by `dev:init:inject` and `db:restore`.
- There is no lockfile committed; `pnpm install` resolves fresh each time.
- The docker-compose `electric` service connects to postgres using the internal port mapping (`postgres:5432`), but the `DATABASE_URL` in `.env` references `PG_PORT` which defaults to 5432 on the host side as well; changing `PG_PORT` breaks the electric→postgres connection. Keep it at 5432.
- `AUTH_SECRET` in `.env` must be a non-empty string for the app to start. Generate one with `openssl rand -hex 32`.
- OAuth/email auth providers are optional; the app works without them for local development.
