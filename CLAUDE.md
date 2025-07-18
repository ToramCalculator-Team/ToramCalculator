# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Essential Commands
- `pnpm dev` - Start development server
- `pnpm dev:init` - Initialize development environment (run after schema changes)
- `pnpm dev:setup` - Reset and start development environment (includes backend restart)
- `pnpm build` - Build application for production
- `pnpm package` - Build and package for deployment

### Database Commands
- `pnpm db:studio` - Open Prisma Studio to view database
- `pnpm db:backup` - Backup database
- `pnpm db:restore` - Restore database from backup

### Backend Commands
- `pnpm backend:up` - Start backend Docker services
- `pnpm backend:stop` - Stop backend Docker services
- `pnpm backend:down` - Stop and remove backend Docker volumes

### Code Quality
- No explicit lint/test commands found in package.json
- Uses Prettier with Tailwind plugin (config in prettier.config.js)
- TypeScript configuration in tsconfig.json

## Architecture Overview

### Core Technology Stack
- **Frontend**: SolidJS with Vinxi (fullstack framework)
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (server) + PGLite (client) with Kysely ORM
- **Data Sync**: ElectricSQL for real-time synchronization
- **State Management**: XState for complex state machines
- **3D/Graphics**: Babylon.js for game engine and visualization
- **Workers**: Extensive use of Web Workers for simulation

### Database Architecture
The project uses a dual-database approach:

1. **Server Database (PostgreSQL)**
   - Schema defined in `db/baseSchema.prisma`
   - Initialized via Docker with Electric sync service
   - Primary data source

2. **Client Database (PGLite)**
   - Local WASM-based PostgreSQL instance
   - Syncs with server via ElectricSQL
   - Supports offline operations

### Key Directories
- `src/components/` - UI components with `controls/` and `module/` subdirs
- `src/repositories/` - Database access layer with Kysely
- `src/worker/` - Web Workers for background processing
- `src/routes/` - SolidStart routing with file-based structure
- `src/components/module/simulator/` - Complex battle simulation engine
- `db/` - Database schemas, generators, and utilities

### Simulation Engine
Located in `src/components/module/simulator/`, this is a sophisticated real-time battle simulation system:

- **Multi-Worker Architecture**: Worker pool for parallel DPS calculations
- **Event-Driven Engine**: Frame-based simulation with event queues
- **State Machines**: XState for managing simulation lifecycle
- **Real-time Processing**: Supports both batch calculations and interactive simulation

Key files:
- `core/GameEngine.ts` - Main simulation engine
- `SimulatorPool.ts` - Worker pool management
- `RealtimeController.tsx` - UI controller for real-time simulation

## Development Guidelines

### Database Schema Changes
**IMPORTANT**: After modifying `db/baseSchema.prisma` or `db/enums.ts`, always run:
```bash
pnpm dev:init
```

### Code Conventions (from .cursor rules)
- Functions: camelCase
- Components: PascalCase
- Constants: UPPER_CASE
- Avoid `any` type unless necessary
- Worker imports: Use Vite's `?worker&url` syntax
- Use existing UI controls rather than creating new ones

### Type System
- Enums defined in `db/enums.ts`
- Generated types in `db/generated/kysely/`
- Uses `generator.js` to inject enums into database schema

### File Structure Patterns
- Database access: `repositories/[table].ts`
- Routes: File-based routing in `routes/`
- Components: Organized by type (`controls/`, `module/`)
- Workers: Background processing in `worker/`

## Build System
- Uses Vinxi with custom Vite configuration
- Babylon.js loaded from CDN in production
- Custom chunk manifest generation for service worker
- Supports top-level await
- Service worker build via `src/worker/sw/build.mjs`

## Environment Setup
- Requires Node.js >=20
- Uses pnpm package manager
- Docker required for backend services
- Environment variables needed for database connection

## Key Dependencies
- `@solidjs/start` - Fullstack SolidJS framework
- `kysely` - Type-safe SQL query builder
- `@electric-sql/pglite` - Client-side PostgreSQL
- `xstate` - State machine library
- `@babylonjs/core` - 3D engine
- `tailwindcss` - Utility-first CSS framework