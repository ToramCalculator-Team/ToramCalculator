/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";
import ddl from "~/../prisma/ddl.sql?raw"

worker({
  async init(options) {
    console.log("pgWorker init", performance.now());
    const meta = options.meta
    const pg = await PGlite.create({
      dataDir: meta.dataDir,
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        sync: electricSync({debug: false}),
      },
    });
    console.log("pgWorker inited", performance.now());
    // console.log(localStorage.getItem("store"));
    // await pg.exec(ddl);
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user"
      },
      table: "user",
      shapeKey: "users",
      primaryKey: ["id"],
    });
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user_create_data"
      },
      table: "user_create_data",
      shapeKey: "user_create_datas",
      primaryKey: ["userId"],
    });
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user_update_data"
      },
      table: "user_update_data",
      shapeKey: "user_update_datas",
      primaryKey: ["userId"],
    });
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/statistics"
      },
      table: "statistics",
      shapeKey: "statisticss",
      primaryKey: ["id"],
    });
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/image"
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
    });
    await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/monster"
      },
      table: "monster",
      shapeKey: "monsters",
      primaryKey: ["id"],
    });

    return pg;
  },
});
