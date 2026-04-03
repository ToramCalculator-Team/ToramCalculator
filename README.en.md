# ToramCalculator

## 📖 Project Overview

ToramCalculator is an auxiliary tool developed for the Toram Online game. It helps players find optimal configuration solutions by simulating combat processes.

### ✨ Core Features

- 📚 Game Wiki library
- 🎮 Team configuration optimization + sharing
- ⚔️ Combat process simulation
- 📊 Frame-by-frame data analysis + visualization

### 🌐 Application URL

🔗 [https://app.kiaclouth.com](https://app.kiaclouth.com)


### 🌐 Wiki URL

🔗 [https://deepwiki.com/ToramCalculator-Team/ToramCalculator](https://deepwiki.com/ToramCalculator-Team/ToramCalculator)


### Environment Requirements
- 🐳 Docker
- 📦 Node.js >= 24
- 🔧 pnpm >= 9.15.2

### Install Dependencies

For first-time development, run:

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables file
cp .env.example .env
```

### Initialization Process

For first-time development or when the data architecture changes, run:

```bash
# 1. Generate development artifacts and start backend services
pnpm run setup
```

This command will:
- Generate the required database schema, type definitions, and data access methods
- Start PostgreSQL and automatically run the initialization SQL
- Start the Electric sync service

### Daily Development Workflow

For daily development, run:

```bash
# 1. Prepare the development environment (if data reset is needed)
pnpm run setup

# 2. Start the development server
pnpm dev
```

## Scripts

| Script | Purpose |
| --- | --- |
| `pnpm setup` | Generate code and reset local infrastructure |
| `pnpm dev` | Start the development server |
| `pnpm start` | Start the built output |
| `pnpm generate` | Run full code generation |
| `pnpm generate:inject` | Run the enum injection script |
| `pnpm generate:schema` | Generate Prisma Client |
| `pnpm infra:up` | Start PostgreSQL and Electric |
| `pnpm infra:stop` | Stop PostgreSQL and Electric |
| `pnpm infra:down` | Remove local infrastructure and volumes |
| `pnpm infra:reset` | Recreate infrastructure and restore backups |
| `pnpm db:studio` | Open Prisma Studio |
| `pnpm db:backup` | Export the database to `db/backups` |
| `pnpm db:restore` | Restore the database from `db/backups` |
| `pnpm build` | Build the project |
| `pnpm clean` | Remove build output and generated files |
| `pnpm clean:generated` | Remove `db/generated` |
| `pnpm clean:build` | Remove build artifacts |
| `pnpm package` | Package `.output/` into `bundle.tar.gz` |
