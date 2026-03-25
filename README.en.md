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

For first-time development or data architecture changes, execute the following commands:

```bash
# 1. Execute complete initialization
pnpm dev:init
```

This command will:
- Generate all necessary database schemas and type definitions
- Start PostgreSQL database (automatically execute initialization SQL)
- Start Electric sync service

### Daily Development Process

For daily development, just execute:

```bash
# 1. Setup development environment (if data reset is needed)
pnpm dev:setup

# 2. Start development server
pnpm dev
```

