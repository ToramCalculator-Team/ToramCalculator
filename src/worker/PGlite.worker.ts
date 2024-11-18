/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";
import ddl from "~/../prisma/ddl.sql?raw"
import { initialStore } from "~/store";

const host = "http://localhost:3000";
// const host = "https://test.kiaclouth.com";

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
    await pg.waitReady;
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
    // const userShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${host}/v1/shape/user`,
    //   },
    //   table: "user",
    //   shapeKey: "users",
    //   primaryKey: ["id"],
    // });
    const userCreateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"user_create_data"`,
      },
      table: "user_create_data",
      shapeKey: "user_create_datas",
      primaryKey: ["userId"],
    });
    const userUpdateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"user_update_data"`,
      },
      table: "user_update_data",
      shapeKey: "user_update_datas",
      primaryKey: ["userId"],
    });
    const statisticsShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"statistics"`,
      },
      table: "statistics",
      shapeKey: "statisticss",
      primaryKey: ["id"],
    });
    const imageShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"image"`,
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
    });
    const monsterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"monster"`,
      },
      table: "monster",
      shapeKey: "monsters",
      primaryKey: ["id"],
    });
    const modifierListShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"modifier_list"`,
      },
      table: "modifier_list",
      shapeKey: "modifier_lists",
      primaryKey: ["id"],
    })
    const modifierShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"modifier"`,
      },
      table: "modifier",
      shapeKey: "modifiers",
      primaryKey: ["id"],
    })
    const crystalShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"crystal"`,
      },
      table: "crystal",
      shapeKey: "crystals",
      primaryKey: ["id"],
    })
    const mainWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"main_weapon"`,
      },
      table: "main_weapon",
      shapeKey: "main_weapons",
      primaryKey: ["id"],
    })
    const subWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"sub_weapon"`,
      },
      table: "sub_weapon",
      shapeKey: "sub_weapons",
      primaryKey: ["id"],
    })
    const bodyArmorShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"body_armor"`,
      },
      table: "body_armor",
      shapeKey: "body_armors",
      primaryKey: ["id"],
    })
    const additionalEquipmentShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"additional_equipment"`,
      },
      table: "additional_equipment",
      shapeKey: "additional_equipments",
      primaryKey: ["id"],
    })
    const specialEquipmentShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"special_equipment"`,
      },
      table: "special_equipment",
      shapeKey: "special_equipments",
      primaryKey: ["id"],
    })
    const petShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"pet"`,
      },
      table: "pet",
      shapeKey: "pets",
      primaryKey: ["id"],
    })
    const skillShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"skill"`,
      },
      table: "skill",
      shapeKey: "skills",
      primaryKey: ["id"],
    })
    const consumableShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"consumable"`,
      },
      table: "consumable",
      shapeKey: "consumables",
      primaryKey: ["id"],
    })
    const characterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"character"`,
      },
      table: "character",
      shapeKey: "characters",
      primaryKey: ["id"],
    })
    const _analyzerTomemberShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"_analyzerTomember"`,
      },
      table: "_analyzerTomember",
      shapeKey: "_analyzerTomembers",
      primaryKey: ["analyzerId", "memberId"],
    })
    const memberShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"member"`,
      },
      table: "member",
      shapeKey: "members",
      primaryKey: ["id"],
    })
    const _analyzerTomobShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"_analyzerTomob"`,
      },
      table: "_analyzerTomob",
      shapeKey: "_analyzerTomobs",
      primaryKey: ["analyzerId", "mobId"],
    })
    const mobShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"mob"`,
      },
      table: "mob",
      shapeKey: "mobs",
      primaryKey: ["id"],
    })
    const analyzerShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/"analyzer"`,
      },
      table: "analyzer",
      shapeKey: "analyzers",
      primaryKey: ["id"],
    });

    return pg;
  },
});
