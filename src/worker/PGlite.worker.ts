/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";
import ddl from "~/../db/migrations/0000_init.sql?raw"

worker({
  async init() {
    const pg = await PGlite.create({
      dataDir: "idb://toramCalculatorDB",
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        sync: electricSync({debug: false}),
      },
    });
    await pg.exec(ddl);
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
    // const db = drizzle(pg, { schema });
    // const sql = db.query.user.findMany().toSQL().sql;
    // pg.live.query(sql, [], (res) => {
    //   console.log("live query result:", res);
    // });

    return pg;
  },
});
