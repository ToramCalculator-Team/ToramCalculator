/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import ddl from "~/../db/clientDB/ddl.sql?raw";

const ELECTRIC_HOST = "http://localhost:3000";
// const ELECTRIC_HOST = "https://test.kiaclouth.com";

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

    // const userShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="user"`,
    //   },
    //   table: "user",
    //   shapeKey: "users",
    //   primaryKey: ["id"],
    // });
    // const userCreateDataShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="user_create_data"`,
    //   },
    //   table: "user_create_data",
    //   shapeKey: "user_create_datas",
    //   primaryKey: ["userId"],
    // });
    // const userUpdateDataShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="user_update_data"`,
    //   },
    //   table: "user_update_data",
    //   shapeKey: "user_update_datas",
    //   primaryKey: ["userId"],
    // });
    // const statisticsShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="statistics"`,
    //   },
    //   table: "statistics",
    //   shapeKey: "statisticss",
    //   primaryKey: ["id"],
    // });
    // const imageShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="image"`,
    //   },
    //   table: "image",
    //   shapeKey: "images",
    //   primaryKey: ["id"],
    // });
    // const monsterShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="monster"`,
    //   },
    //   table: "monster",
    //   shapeKey: "monsters",
    //   primaryKey: ["id"],
    // });
    // const modifierListShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="modifier_list"`,
    //   },
    //   table: "modifier_list",
    //   shapeKey: "modifier_lists",
    //   primaryKey: ["id"],
    // })
    // const modifierShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="modifier"`,
    //   },
    //   table: "modifier",
    //   shapeKey: "modifiers",
    //   primaryKey: ["id"],
    // })
    // const crystalShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="crystal"`,
    //   },
    //   table: "crystal",
    //   shapeKey: "crystals",
    //   primaryKey: ["id"],
    // })
    // const mainWeaponShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="main_weapon"`,
    //   },
    //   table: "main_weapon",
    //   shapeKey: "main_weapons",
    //   primaryKey: ["id"],
    // })
    // const subWeaponShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="sub_weapon"`,
    //   },
    //   table: "sub_weapon",
    //   shapeKey: "sub_weapons",
    //   primaryKey: ["id"],
    // })
    // const bodyArmorShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="body_armor"`,
    //   },
    //   table: "body_armor",
    //   shapeKey: "body_armors",
    //   primaryKey: ["id"],
    // })
    // const additionalEquipmentShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="additional_equipment"`,
    //   },
    //   table: "additional_equipment",
    //   shapeKey: "additional_equipments",
    //   primaryKey: ["id"],
    // })
    // const specialEquipmentShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="special_equipment"`,
    //   },
    //   table: "special_equipment",
    //   shapeKey: "special_equipments",
    //   primaryKey: ["id"],
    // })
    // const petShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="pet"`,
    //   },
    //   table: "pet",
    //   shapeKey: "pets",
    //   primaryKey: ["id"],
    // })
    // const skillShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="skill"`,
    //   },
    //   table: "skill",
    //   shapeKey: "skills",
    //   primaryKey: ["id"],
    // })
    // const consumableShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="consumable"`,
    //   },
    //   table: "consumable",
    //   shapeKey: "consumables",
    //   primaryKey: ["id"],
    // })
    // const characterShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="character"`,
    //   },
    //   table: "character",
    //   shapeKey: "characters",
    //   primaryKey: ["id"],
    // })
    // const _simulatorTomemberShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="_simulatorTomember"`,
    //   },
    //   table: "_simulatorTomember",
    //   shapeKey: "_simulatorTomembers",
    //   primaryKey: ["simulatorId", "memberId"],
    // })
    // const memberShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="member"`,
    //   },
    //   table: "member",
    //   shapeKey: "members",
    //   primaryKey: ["id"],
    // })
    // const _simulatorTomobShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="_simulatorTomob"`,
    //   },
    //   table: "_simulatorTomob",
    //   shapeKey: "_simulatorTomobs",
    //   primaryKey: ["simulatorId", "mobId"],
    // })
    // const mobShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="mob"`,
    //   },
    //   table: "mob",
    //   shapeKey: "mobs",
    //   primaryKey: ["id"],
    // })
    // const simulatorShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}/v1/shape?table="simulator"`,
    //   },
    //   table: "simulator",
    //   shapeKey: "simulators",
    //   primaryKey: ["id"],
    // });

    // console.log("PGliteWorker初始化完成.....");

    return pg;
  },
});
