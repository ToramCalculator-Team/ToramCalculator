import { type Config } from "drizzle-kit"

export default {
  dialect: 'postgresql',
  schema: "./drizzle/schema.ts",
  out: "./drizzle/migrations/",
  dbCredentials: {
    host: process.env.PG_HOST!,
    port: Number(process.env.PG_PORT!),
    user: process.env.PG_USERNAME!,
    password: process.env.PG_PASSWORD!,
    database: process.env.PG_DBNAME!,
    // url: "idb://ToramCalculator-DB",
    ssl: false
  },
} satisfies Config;