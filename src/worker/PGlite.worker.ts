/// <reference lib="webworker" />

import { worker } from "@electric-sql/pglite/worker";
import { PGlite } from "@electric-sql/pglite";
import { electricSync } from "@electric-sql/pglite-sync";
import { live } from "@electric-sql/pglite/live";
import ddl from "~/../db/clientDB/ddl.sql?raw";
import { type Store } from "~/store";
import { DB } from "../../db/clientDB/generated/kysely/kyesely";

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
  console.log(tableName + "已同步完毕");
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

    // const userShape = await pg.sync.syncShapeToTable({
    //   shape: {
    //     url: `${ELECTRIC_HOST}`,
    //     params: {
    //       table: "user",
    //     }
    //   },
    //   table: "user",
    //   shapeKey: "users",
    //   primaryKey: ["id"],
    //   onInitialSync: () => notifySyncProgress("user"),
    // });
    const accountShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "account",
        }
      },
      table: "account",
      shapeKey: "accounts",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("account"),
    });
    const accountCreateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "account_create_data",
        }
      },
      table: "account_create_data",
      shapeKey: "account_create_datas",
      primaryKey: ["userId"],
      onInitialSync: () => notifySyncProgress("account_create_data"),
    });
    const accountUpdateDataShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "account_update_data",
        }
      },
      table: "account_update_data",
      shapeKey: "account_update_datas",
      primaryKey: ["userId"],
      onInitialSync: () => notifySyncProgress("account_update_data"),
    });
    const playerShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "player",
        }
      },
      table: "player",
      shapeKey: "players",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("player"),
    })
    const statisticShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "statistic",
        }
      },
      table: "statistic",
      shapeKey: "statistics",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("statistic"),
    });
    const imageShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "image",
        }
      },
      table: "image",
      shapeKey: "images",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("image"),
    });
    const mobShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "mob",
        }
      },
      table: "mob",
      shapeKey: "mobs",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("mob"),
    });
    const itemShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "item",
        }
      },
      table: "item",
      shapeKey: "items",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("item"),
    })
    const weaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "weapon",
        }
      },
      table: "weapon",
      shapeKey: "weapons",
      primaryKey: ["itemId"],
      onInitialSync: () => notifySyncProgress("weapon"),
    });
    const armorShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "armor",
        }
      },
      table: "armor",
      shapeKey: "armors",
      primaryKey: ["itemId"],
      onInitialSync: () => notifySyncProgress("armor"),
    });
    const addEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "additional_equipment",
        }
      },
      table: "additional_equipment",
      shapeKey: "additional_equipments",
      primaryKey: ["itemId"],
      onInitialSync: () => notifySyncProgress("additional_equipment"),
    });
    const speEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "special_equipment",
        }
      },
      table: "special_equipment",
      shapeKey: "special_equipments",
      primaryKey: ["itemId"],
      onInitialSync: () => notifySyncProgress("special_equipment"),
    })
    const avatarShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "avatar",
        }
      },
      table: "avatar",
      shapeKey: "avatars",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("avatar"),
    })
    const crystalShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "crystal",
        }
      },
      table: "crystal",
      shapeKey: "crystals",
      primaryKey: ["itemId"],
      onInitialSync: () => notifySyncProgress("crystal"),
    })
    const crystalToCustomWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: `"_crystalTocustom_weapon"`,
        }
      },
      table: "_crystalTocustom_weapon",
      shapeKey: "_crystalTocustom_weapons",
      primaryKey: ["A", "B"],
      onInitialSync: () => notifySyncProgress("_crystalTocustom_weapon"),
    })
    const crystalToCustomArmorShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: `"_crystalTocustom_armor"`,
        }
      },
      table: "_crystalTocustom_armor",
      shapeKey: "_crystalTocustom_armors",
      primaryKey: ["A", "B"],
      onInitialSync: () => notifySyncProgress("_crystalTocustom_armor"),
    })
    const crystalToCustomAddEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: `"_crystalTocustom_additional_equipment"`,
        }
      },
      table: "_crystalTocustom_additional_equipment",
      shapeKey: "_crystalTocustom_additional_equipments",
      primaryKey: ["A", "B"],
      onInitialSync: () => notifySyncProgress("_crystalTocustom_additional_equipment"),
    })
    const crystalToCustomSpeEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: `"_crystalTocustom_special_equipment"`,
        }
      },
      table: "_crystalTocustom_special_equipment",
      shapeKey: "_crystalTocustom_special_equipments",
      primaryKey: ["A", "B"],
      onInitialSync: () => notifySyncProgress("_crystalTocustom_special_equipment"),
    })
    
    const skillShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "skill",
        }
      },
      table: "skill",
      shapeKey: "skills",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("skill"),
    });
    const skillEffectShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "skill_effect",
        }
      },
      table: "skill_effect",
      shapeKey: "skill_effects",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("skill_effect"),
    });
    const customWeaponShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "custom_weapon",
        }
      },
      table: "custom_weapon",
      shapeKey: "custom_weapons",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("custom_weapon"),
    });
    const customArmorShape = await pg.sync.syncShapeToTable({
      shape: { 
        url: ELECTRIC_HOST,
        params: {
          table: "custom_armor",
        }
      },
      table: "custom_armor",
      shapeKey: "custom_armors",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("custom_armor"),
    });
    const customAddEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "custom_additional_equipment",
        }
      },
      table: "custom_additional_equipment",
      shapeKey: "custom_additional_equipments",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("custom_additional_equipment"),
    });
    const customSpeEquipShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "custom_special_equipment",
        }
      },
      table: "custom_special_equipment",
      shapeKey: "custom_special_equipments",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("custom_special_equipment"),
    });
    const characterShape = await pg.sync.syncShapeToTable({
      shape: {
        url: ELECTRIC_HOST,
        params: {
          table: "character",
        }
      },
      table: "character",
      shapeKey: "characters",
      primaryKey: ["id"],
      onInitialSync: () => notifySyncProgress("character"),
    });

    // console.log("PGliteWorker初始化完成.....");

    return pg;
  },
});
