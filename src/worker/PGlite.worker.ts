/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { pg_trgm } from '@electric-sql/pglite/contrib/pg_trgm';
import { live } from "@electric-sql/pglite/live";
import ddl from "~/../db/clientDB/ddl.sql?raw";
import { DB } from "../../db/clientDB/kysely/kyesely";

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
  async init() {
    const pg = await PGlite.create({
      dataDir: "idb://toramCalculatorDB",
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        electric: electricSync({ debug: false }),
        pg_trgm
      },
    });

    // FTS相关插件
    await pg.exec(`CREATE EXTENSION IF NOT EXISTS pg_trgm;`)

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

    const syncTable = async (tableName: keyof DB, primaryKey: string[], urlParams?: string) => {
      const tableParams = urlParams ?? tableName;
      // console.log(tableParams)
      pg.electric.syncShapeToTable({
        shape: {
          url: ELECTRIC_HOST,
          params: {
            table: tableParams,
          },
        },
        table: tableName,
        shapeKey: `${tableName}s`,
        primaryKey: primaryKey,
        onInitialSync: () => notifySyncProgress(tableName),
      });
    };

    // const userShape = await syncTable('user', ["id"]);
    const accountShape = await syncTable('account', ["id"]);
    const accountCreateDataShape = await syncTable("account_create_data", ["userId"]);
    const accountUpdateDataShape = await syncTable("account_update_data", ["userId"]);
    const playerShape = await syncTable("player", ["id"]);
    const statisticShape = await syncTable("statistic", ["id"]);
    const imageShape = await syncTable("image", ["id"]);
    const mobShape = await syncTable("mob", ["id"]);
    const itemShape = await syncTable("item", ["id"]);
    const weaponShape = await syncTable("weapon", ["itemId"]);
    const armorShape = await syncTable("armor", ["itemId"]);
    const optEquipShape = await syncTable("option", ["itemId"]);
    const speEquipShape = await syncTable("special", ["itemId"]);
    const avatarShape = await syncTable("avatar", ["id"]);
    const crystalShape = await syncTable("crystal", ["itemId"]);
    // const crystalToPlayerWeaponShape = await syncTable(
    //   "_crystalToplayer_weapon",
    //   ["A", "B"],
    //   `"_crystalToplayer_weapon"`,
    // );
    // const crystalToPlayerArmorShape = await syncTable("_crystalToplayer_armor", ["A", "B"], `"_crystalToplayer_armor"`);
    // const crystalToPlayerOptEquipShape = await syncTable(
    //   "_crystalToplayer_option",
    //   ["A", "B"],
    //   `"_crystalToplayer_option"`,
    // );
    // const crystalToPlayerSpeEquipShape = await syncTable(
    //   "_crystalToplayer_special",
    //   ["A", "B"],
    //   `"_crystalToplayer_special"`,
    // );
    const skillShape = await syncTable("skill", ["id"]);
    const skillEffectShape = await syncTable("skill_effect", ["id"]);
    const playerWeponShape = await syncTable("player_weapon", ["id"]);
    const playerArmorShape = await syncTable("player_armor", ["id"]);
    const playerOptEquipShape = await syncTable("player_option", ["id"]);
    const playerSpeEquipShape = await syncTable("player_special", ["id"]);
    const customPetShape = await syncTable("player_pet", ["id"]);
    const characterSkillShape = await syncTable("character_skill", ["id"]);
    const consumableShape = await syncTable("consumable", ["itemId"]);
    const comboShape = await syncTable("combo", ["id"]);
    const characterShape = await syncTable("character", ["id"]);
    const mercenaryShape = await syncTable("mercenary", ["templateId"]);
    const memberShape = await syncTable("member", ["id"]);
    const teamShape = await syncTable("team", ["id"]);
    const simulatorShape = await syncTable("simulator", ["id"]);
    // console.log("PGliteWorker初始化完成.....");

    return pg;
  },
});
