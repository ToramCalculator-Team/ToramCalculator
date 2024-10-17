/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { createId } from "@paralleldrive/cuid2";

worker({
  async init(options) {
    const meta = options.meta
    const pg = await PGlite.create({
      dataDir: meta.dataDir,
      relaxedDurability: true,
      // debug: 1,
      extensions: {
        live,
        sync: electricSync({debug: true}),
      },
    });
    await pg.waitReady;
    const userShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user"
      },
      table: "user",
      shapeKey: "users",
      primaryKey: ["id"],
    });
    const userCreateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user_create_data"
      },
      table: "user_create_data",
      shapeKey: "user_create_datas",
      primaryKey: ["userId"],
    });
    const userUpdateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/user_update_data"
      },
      table: "user_update_data",
      shapeKey: "user_update_datas",
      primaryKey: ["userId"],
    });
    const statisticsShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/statistics"
      },
      table: "statistics",
      shapeKey: "statisticss",
      primaryKey: ["id"],
    });
    const imageShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/image"
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
    });
    const monsterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: "https://test.kiaclouth.com/v1/shape/monster"
      },
      table: "monster",
      shapeKey: "monsters",
      primaryKey: ["id"],
    });
    // const modifierShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: "https://test.kiaclouth.com/v1/shape/modifier"
    //   },
    //   table: "modifier",
    //   shapeKey: "modifier",
    //   primaryKey: ["id"],
    // });
    // const modifiers_listShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: "https://test.kiaclouth.com/v1/shape/modifiers_list"
    //   },
    //   table: "modifiers_list",
    //   shapeKey: "modifiers_list",
    //   primaryKey: ["id"],
    // });
    // const crystalShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: "https://test.kiaclouth.com/v1/shape/crystal"
    //   },
    //   table: "crystal",
    //   shapeKey: "crystal",
    //   primaryKey: ["id"],
    // });

    return pg;
  },
});
