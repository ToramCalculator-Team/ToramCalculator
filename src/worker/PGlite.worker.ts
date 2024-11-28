/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";
import ddl from "~/../prisma/ddl.sql?raw";
// import ddl from "~/../test/db-csv/toram.sql?raw";
import { initialStore } from "~/store";
// import m1 from "../db/migrations/01-create_tables.sql?raw";
// import m2 from "../db/migrations/02-add_items.sql?raw";

// const migrations = [
//   { name: "01-create_tables", sql: m1 },
//   { name: "02-add_items", sql: m2 },
// ];

// export async function migrate(pg: PGlite) {
//   // Create migrations table if it doesn't exist
//   await pg.exec(`
//     CREATE TABLE IF NOT EXISTS migrations (
//       id SERIAL PRIMARY KEY,
//       name TEXT NOT NULL UNIQUE,
//       applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
//     );
//   `);

//   // Get list of applied migrations
//   const result = await pg.exec(`SELECT name FROM migrations ORDER BY id;`);
//   const appliedMigrations = result.rows.map((row) => row[0]);

//   // Apply new migrations
//   for (const migration of migrations) {
//     if (!appliedMigrations.includes(migration.name)) {
//       await pg.exec(migration.sql);
//       await pg.exec(
//         `
//         INSERT INTO migrations (name) 
//         VALUES ($1);
//       `,
//         [migration.name],
//       );
//       console.log(`Applied migration: ${migration.name}`);
//     }
//   }
// }

const ELECTRIC_HOST = "http://localhost:3000";
// const ELECTRIC_HOST = "https://test.kiaclouth.com";

worker({
  async init(options) {
    const meta = options.meta;
    const pg = await PGlite.create({
      dataDir: meta.dataDir,
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        sync: electricSync({ debug: false }),
      },
    });
    // await migrate(pg);
    if (meta.storage) {
      const oldStore = JSON.parse(meta.storage);
      const newStore = initialStore;
      if (oldStore.dbVersion && oldStore.dbVersion === newStore.dbVersion) {
      } else {
        console.log(`数据库版本更新，将迁移数据库`);
        await pg.exec(ddl);
      }
    } else {
      console.log("配置数据缺失，初始化数据库");
      await pg.exec(ddl);
    }
    const userShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="user"`,
      },
      table: "user",
      shapeKey: "users",
      primaryKey: ["id"],
    });
    const userCreateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="user_create_data"`,
      },
      table: "user_create_data",
      shapeKey: "user_create_datas",
      primaryKey: ["userId"],
    });
    const userUpdateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="user_update_data"`,
      },
      table: "user_update_data",
      shapeKey: "user_update_datas",
      primaryKey: ["userId"],
    });
    const statisticsShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="statistics"`,
      },
      table: "statistics",
      shapeKey: "statisticss",
      primaryKey: ["id"],
    });
    const imageShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="image"`,
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
    });
    const monsterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="monster"`,
      },
      table: "monster",
      shapeKey: "monsters",
      primaryKey: ["id"],
    });
    const modifierListShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="modifier_list"`,
      },
      table: "modifier_list",
      shapeKey: "modifier_lists",
      primaryKey: ["id"],
    })
    const modifierShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="modifier"`,
      },
      table: "modifier",
      shapeKey: "modifiers",
      primaryKey: ["id"],
    })
    const crystalShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="crystal"`,
      },
      table: "crystal",
      shapeKey: "crystals",
      primaryKey: ["id"],
    })
    const mainWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="main_weapon"`,
      },
      table: "main_weapon",
      shapeKey: "main_weapons",
      primaryKey: ["id"],
    })
    const subWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="sub_weapon"`,
      },
      table: "sub_weapon",
      shapeKey: "sub_weapons",
      primaryKey: ["id"],
    })
    const bodyArmorShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="body_armor"`,
      },
      table: "body_armor",
      shapeKey: "body_armors",
      primaryKey: ["id"],
    })
    const additionalEquipmentShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="additional_equipment"`,
      },
      table: "additional_equipment",
      shapeKey: "additional_equipments",
      primaryKey: ["id"],
    })
    const specialEquipmentShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="special_equipment"`,
      },
      table: "special_equipment",
      shapeKey: "special_equipments",
      primaryKey: ["id"],
    })
    const petShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="pet"`,
      },
      table: "pet",
      shapeKey: "pets",
      primaryKey: ["id"],
    })
    const skillShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="skill"`,
      },
      table: "skill",
      shapeKey: "skills",
      primaryKey: ["id"],
    })
    const consumableShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="consumable"`,
      },
      table: "consumable",
      shapeKey: "consumables",
      primaryKey: ["id"],
    })
    const characterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="character"`,
      },
      table: "character",
      shapeKey: "characters",
      primaryKey: ["id"],
    })
    const _analyzerTomemberShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="_analyzerTomember"`,
      },
      table: "_analyzerTomember",
      shapeKey: "_analyzerTomembers",
      primaryKey: ["analyzerId", "memberId"],
    })
    const memberShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="member"`,
      },
      table: "member",
      shapeKey: "members",
      primaryKey: ["id"],
    })
    const _analyzerTomobShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="_analyzerTomob"`,
      },
      table: "_analyzerTomob",
      shapeKey: "_analyzerTomobs",
      primaryKey: ["analyzerId", "mobId"],
    })
    const mobShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="mob"`,
      },
      table: "mob",
      shapeKey: "mobs",
      primaryKey: ["id"],
    })
    const analyzerShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${ELECTRIC_HOST}/v1/shape?table="analyzer"`,
      },
      table: "analyzer",
      shapeKey: "analyzers",
      primaryKey: ["id"],
    });

    return pg;
  },
});
