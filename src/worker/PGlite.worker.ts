/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync, SyncShapeToTableOptions, SyncShapeToTableResult } from "@electric-sql/pglite-sync";
import { live, LiveNamespace } from "@electric-sql/pglite/live";
import ddl from "~/../db/clientDB/ddl.sql?raw";
import { type Store } from "~/store";
import { DB } from "../../db/clientDB/generated/kysely/kyesely";

// const ELECTRIC_HOST = "http://localhost:3000/v1/shape";
const ELECTRIC_HOST = "https://test.kiaclouth.com/v1/shape";

export interface syncMessage {
  type: "sync";
  data: {
    tableName: keyof DB;
    state: "start" | "success" | "fail";
  };
  timestamp: string;
}

const notifySyncProgress = (tableName: keyof DB) => {
  console.log(tableName + "synced");
  self.postMessage({
    type: "sync",
    data: {
      tableName: tableName,
      state: "success",
    },
    timestamp: Date.now().toLocaleString(),
  });
};

const migrates = [
  {
    name: "init",
    sql: ddl,
  },
];

worker({
  async init(options) {
    const pg = await PGlite.create({
      dataDir: "idb://toramCalculatorDB",
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        sync: electricSync({ debug: false }),
      },
    });
    // 添加本地迁移记录表
    await pg.exec(`
      CREATE TABLE IF NOT EXISTS migrations (
        id SERIAL PRIMARY KEY,
        name TEXT NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const result = await pg.exec(`SELECT name FROM migrations ORDER BY id;`);
    const appliedMigrations = result[0].rows.map((row) => row.name);
    for (const migration of migrates) {
      if (!appliedMigrations.includes(migration.name)) {
        await pg.exec(migration.sql);
        await pg.exec(
          `
        INSERT INTO migrations (name)
        VALUES ('${migration.name}');
      `,
        );
        console.log(`已应用迁移: ${migration.name}`);
      }
    }
    const crystalToCustomWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: '"_crystaltocustom_weapon"',
        },
      },
      table: "_crystalTocustom_weapon",
      shapeKey: `_crystalTocustom_weapons`,
      primaryKey: ["A","B"],
      onInitialSync: () => notifySyncProgress("_crystalTocustom_weapon"),
    });

    return pg;
  },
});
