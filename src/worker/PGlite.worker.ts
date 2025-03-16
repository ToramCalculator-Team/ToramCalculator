/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync, SyncShapeToTableOptions, SyncShapeToTableResult } from "@electric-sql/pglite-sync";
import { live, LiveNamespace } from "@electric-sql/pglite/live";
import ddl from "~/../db/clientDB/ddl.sql?raw";
import { type Store } from "~/store";
import { DB } from "../../db/clientDB/generated/kysely/kyesely";

const ELECTRIC_HOST = "http://localhost:3000/v1/shape";
// const ELECTRIC_HOST = "https://test.kiaclouth.com/v1/shape";

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

    const syncTable = async (tableName: keyof DB, primaryKey: string[], urlParams?: string) => {
      const tableParams = urlParams ?? tableName;
      // console.log(tableParams)
      await pg.sync.syncShapeToTable({
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

    const userShape = await syncTable("user", ["id"]);
    const accountShape = await syncTable("account", ["id"]);
    const accountCreateDataShape = await syncTable("account_create_data", ["userId"]);
    const accountUpdateDataShape = await syncTable("account_update_data", ["userId"]);
    const playerShape = await syncTable("player", ["id"]);
    const statisticShape = await syncTable("statistic", ["id"]);
    const imageShape = await syncTable("image", ["id"]);
    const mobShape = await syncTable("mob", ["id"]);
    const itemShape = await syncTable("item", ["id"]);
    const weaponShape = await syncTable("weapon", ["itemId"]);
    const armorShape = await syncTable("armor", ["itemId"]);
    const addEquipShape = await syncTable("additional_equipment", ["itemId"]);
    const speEquipShape = await syncTable("special_equipment", ["itemId"]);
    const avatarShape = await syncTable("avatar", ["id"]);
    const crystalShape = await syncTable("crystal", ["itemId"]);
    const crystalToCustomWeaponShape = await syncTable(
      "_crystalTocustom_weapon",
      ["A", "B"],
      `"_crystalTocustom_weapon"`,
    );
    const crystalToCustomArmorShape = await syncTable("_crystalTocustom_armor", ["A", "B"], `"_crystalTocustom_armor"`);
    const crystalToCustomAddEquipShape = await syncTable(
      "_crystalTocustom_additional_equipment",
      ["A", "B"],
      `"_crystalTocustom_additional_equipment"`,
    );
    const crystalToCustomSpeEquipShape = await syncTable(
      "_crystalTocustom_special_equipment",
      ["A", "B"],
      `"_crystalTocustom_special_equipment"`,
    );
    const skillShape = await syncTable("skill", ["id"]);
    const skillEffectShape = await syncTable("skill_effect", ["id"]);
    const customWeaponShape = await syncTable("custom_weapon", ["id"]);
    const customArmorShape = await syncTable("custom_armor", ["id"]);
    const customAddEquipShape = await syncTable("custom_additional_equipment", ["id"]);
    const customSpeEquipShape = await syncTable("custom_special_equipment", ["id"]);
    const customPetShape = await syncTable("custom_pet", ["id"]);
    const characterSkillShape = await syncTable("character_skill", ["id"]);
    const characterToCharacterSkillShape = await syncTable(
      "_characterTocharacter_skill",
      ["A", "B"],
      `"_characterTocharacter_skill"`,
    );
    const consumableShape = await syncTable("consumable", ["itemId"]);
    const comboShape = await syncTable("combo", ["id"]);
    const characterShape = await syncTable("character", ["id"]);
    const mercenaryShape = await syncTable("mercenary", ["templateId"]);
    const memberShape = await syncTable("member", ["id"]);
    const memberToTeamShape = await syncTable("_memberToteam", ["A", "B"], `"_memberToteam"`);
    const teamShape = await syncTable("team", ["id"]);
    const simulatorToTeamShape = await syncTable("_simulatorToteam", ["A", "B"], `"_simulatorToteam"`);
    const simulatorShape = await syncTable("simulator", ["id"]);
    // console.log("PGliteWorker初始化完成.....");

    return pg;
  },
});
