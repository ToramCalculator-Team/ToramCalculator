import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import { worker } from "@electric-sql/pglite/worker";
import { drizzle } from "drizzle-orm/pglite";
import * as schema from "~/../drizzle/schema";

worker({
  async init() {
    const pg = await PGlite.create({
      dataDir: "idb://toram-calculator-db",
      relaxedDurability: true,
      extensions: {
        live,
        electric: electricSync({}),
      },
    });

    // console.log(shape_vt.isUpToDate);

    // const db = drizzle(pg, { schema });
    // const sql = db.query.verification_token.findMany().toSQL().sql;
    // const ret1 = pg.live.query(sql, [], (res) => {
    //   console.log(res);
    // });

    return pg;
  },
});
