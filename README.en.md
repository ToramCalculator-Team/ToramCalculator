# ToramCalculator

## Project Overview

ToramCalculator is an auxiliary tool for Toram Online. It supports game wiki data management, team configuration optimization, combat simulation, and frame-by-frame data analysis.

## Online

- Application: [https://app.kiaclouth.com](https://app.kiaclouth.com)
- Wiki: [![Ask DeepWiki](https://deepwiki.com/badge.svg)](https://deepwiki.com/ToramCalculator-Team/ToramCalculator)

## Local Run

### Environment Requirements

- Docker
- Node.js >= 24
- pnpm using the `packageManager` declared in `package.json`

### Quick Start

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables file
cp .env.example .env

# 3. Initialize the local environment
pnpm setup

# 4. Start the development server
pnpm dev
```

## Contributing

Development workflow, database operations, code generation, script reference, and pre-submit checks are documented in [CONTRIBUTING.md](./CONTRIBUTING.md).
