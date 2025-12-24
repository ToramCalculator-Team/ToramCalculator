import 'dotenv/config'
import { defineConfig, env } from 'prisma/config'

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Prefer DIRECT TCP via DATABASE_URL
      url: env("DATABASE_URL")
    // Optionally support shadow DB if present:
    // shadowDatabaseUrl: env('SHADOW_DATABASE_URL'),
  },
})