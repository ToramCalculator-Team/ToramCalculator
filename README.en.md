# ToramCalculator

## 📖 Project Overview

ToramCalculator is an auxiliary tool developed for the Toram Online game. It helps players find optimal configuration solutions by simulating combat processes.

### ✨ Core Features

- 🎮 Team configuration optimization
- ⚔️ Combat process simulation
- 📊 Frame-by-frame data analysis
- 📈 Data visualization
- 🔗 Configuration sharing
- 📚 Built-in game Wiki library
- 🎯 Real-time battle simulator
- 🔄 Workflow editor
- 🎨 3D scene rendering

### 🌐 Project URL

🔗 [https://app.kiaclouth.com](https://app.kiaclouth.com)

## 🏗️ Technical Architecture

### 1. UI Layer (Presentation Layer)
- **Tech Stack**: SolidJS, Tailwind CSS, Babylon.js, Editor.js, TanStack (Form/Table/Virtual), OverlayScrollbars
- **Responsibilities**: User interface display, interaction handling, animation effects, 3D rendering, form management

### 2. Application Logic Layer (Application Layer)
- **Tech Stack**: XState, SolidJS Primitives, Solid Motion, Sequential Workflow Designer
- **Responsibilities**: Core business logic, state management, simulator calculations, workflow management, animation control

### 3. Simulator Engine Layer (Simulator Engine Layer)
- **Tech Stack**: Web Workers, XState, Comlink, MathJS, Event-driven architecture
- **Responsibilities**: Battle simulation, frame loops, event queues, state machine management, mathematical calculations

### 4. Data Layer (Data Layer)
- **Tech Stack**: PGLite, Kysely, ElectricSQL, PostgreSQL, Zod, Prisma
- **Responsibilities**: Data access, storage management, data synchronization, data validation, ORM management

### 5. Authentication & Security Layer (Authentication & Security Layer)
- **Tech Stack**: Auth.js, JOSE, bcrypt, js-cookie
- **Responsibilities**: User authentication, JWT processing, password encryption, session management

### 6. Infrastructure Layer (Infrastructure Layer)
- **Tech Stack**: CUID2, Vinxi, Hotkeys.js, Lodash, dotenv
- **Responsibilities**: ID generation, build tools, hotkey handling, utility functions, environment configuration

## 📁 Project Structure

```
.
├── .husky/                    # Git hooks configuration
├── backend/                   # Backend service configuration (Docker)
├── db/                        # Database related
│   ├── backups/              # Database backups
│   ├── generated/            # Auto-generated type definitions
│   ├── generators/           # Code generators
│   ├── repositories/         # Data access layer
│   ├── schema/               # Database schema definitions
│   └── scripts/              # Database scripts
├── public/                    # Static resources
└── src/                       # Application logic source code
    ├── components/            # UI components
    │   ├── containers/        # Container components
    │   ├── controls/          # Control components
    │   ├── dataDisplay/       # Data display components
    │   ├── effects/           # Effect components
    │   ├── features/          # Feature components
    │   │   ├── simulator/     # Simulator related
    │   │   │   ├── controller/  # Controllers
    │   │   │   ├── core/        # Core engine
    │   │   │   ├── handlers/    # Event handlers
    │   │   │   └── legacy/      # Legacy compatibility
    │   │   ├── flowEditor/    # Workflow editor
    │   │   ├── nodeEditor/    # Node editor
    │   │   └── logicEditor/   # Logic editor
    │   └── icons/             # Icon components
    ├── lib/                   # Core libraries
    │   ├── contexts/          # SolidJS Context
    │   └── utils/             # Utility functions
    ├── locales/               # Internationalization files
    ├── routes/                # Application routes
    ├── styles/                # Style files
    └── worker/                # Web Workers
```

## 📝 Commit Convention

Commit message format: `type(scope): subject`

### Type Description

| Type | Description |
|------|-------------|
| ✨ feat | New features |
| 🐛 fix | Bug fixes |
| 📝 docs | Documentation updates |
| 💄 style | Code formatting changes (no logic impact) |
| 🔨 refactor | Code refactoring |
| ⚡️ perf | Performance optimization |
| ✅ test | Test related |
| 📦 build | Build system changes |
| 🔧 ci | CI configuration changes |
| 🎫 chore | Other changes |
| ⏪ revert | Revert commits |

## 🚀 Development Guide

### Environment Requirements
- 🐳 Docker
- 📦 Node.js >= 20
- 🔧 pnpm >= 9.15.2
- ⚡ tsx (global installation)

### Global tsx Installation

Before starting development, you need to install tsx globally:

```bash
# Using npm
npm install -g tsx

# Or using pnpm
pnpm add -g tsx
```

### Initialization Process

For first-time development or data architecture changes, execute the following commands:

```bash
# 1. Install dependencies
pnpm install

# 2. Copy environment variables file
cp .env.example .env

# 3. Execute complete initialization
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

### Database Architecture

The project uses two databases:
1. Server-side database (PostgreSQL)
   - Uses `db/baseSchema.prisma` as base architecture definition
   - Automatically initialized via Docker
   - Uses Electric for data synchronization

2. Client-side database (PGLite)
   - Generated based on server-side architecture
   - Supports local writes and data synchronization
   - Uses views to merge local and synced data

### Type System

- All enum types are defined in `db/enums.ts`
- Uses `generator.js` to inject enums into database schema
- Generated type definitions are in `db/dataEnums.ts`

### Simulator Architecture

The project includes a complete battle simulator system:

- **Core Engine**: Event-driven architecture supporting real-time and batch simulation
- **State Machine**: XState-based character state management
- **Workflow Editor**: Visual workflow design tool
- **3D Rendering**: Babylon.js-based battle scene rendering

### Development Commands

- `pnpm dev` - Start development server
- `pnpm dev:setup` - Reset and start development environment  
- `pnpm dev:init` - Initialize development environment (generate database schema and types)
- `pnpm backend:up` - Start backend services (PostgreSQL + Electric)
- `pnpm backend:stop` - Stop backend services
- `pnpm backend:down` - Stop and remove backend containers and data volumes
- `pnpm db:studio` - Open Prisma Studio to view database
- `pnpm db:backup` - Backup database
- `pnpm db:restore` - Restore database backup
- `pnpm build` - Build production version
- `pnpm start` - Start production server
- `pnpm package` - Package application as bundle.tar.gz
- `pnpm clear-build` - Clean build files

> ⚠️ Note: After modifying `db/baseSchema.prisma` or `db/enums.ts`, you need to re-execute `pnpm dev:init`.

## Production Deployment

1. Build the application:
```bash
pnpm package
```

2. Deploy the generated `bundle.tar.gz`
