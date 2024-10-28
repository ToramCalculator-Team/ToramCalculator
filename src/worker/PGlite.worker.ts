/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";
import ddl from "~/../prisma/ddl.sql?raw"

// const host = "http://localhost:3000";
const host = "https://test.kiaclouth.com";

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
      const newStore = meta.initialStore;
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
        url: `${host}/v1/shape/user`,
      },
      table: "user",
      shapeKey: "users",
      primaryKey: ["id"],
    });
    // console.log("userShape sync done");
    const userCreateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/user_create_data`,
      },
      table: "user_create_data",
      shapeKey: "user_create_datas",
      primaryKey: ["userId"],
    });
    // console.log("userCreateDataShape sync done");
    const userUpdateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/user_update_data`,
      },
      table: "user_update_data",
      shapeKey: "user_update_datas",
      primaryKey: ["userId"],
    });
    // console.log("userUpdateDataShape sync done");
    const statisticsShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/statistics`,
      },
      table: "statistics",
      shapeKey: "statisticss",
      primaryKey: ["id"],
    });
    // console.log("statisticsShape sync done");
    const imageShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/image`,
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
    });
    // console.log("imageShape sync done");
    const monsterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: `${host}/v1/shape/monster`,
      },
      table: "monster",
      shapeKey: "monsters",
      primaryKey: ["id"],
    });
    // console.log("monsterShape sync done");

    return pg;
  },
});
