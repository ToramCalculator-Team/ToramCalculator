import { PGliteWorker } from "@electric-sql/pglite/worker";
import { live } from "@electric-sql/pglite/live";
import PGWorker from "~/worker/PGlite.worker?worker";

let pgWorker: PGliteWorker | undefined = undefined;

// 初始化本地数据库
export const initialPGWorker = async (init: Boolean = false): Promise<PGliteWorker> => {
  const storage = localStorage.getItem("store");
  pgWorker = await PGliteWorker.create(new PGWorker(), {
    extensions: { live },
    meta: {
      dataDir: "idb://toramCalculatorDB",
      storage: storage,
      init
    },
  });
  // console.log(await pgWorker.exec(`
    
  //   SELECT "character".*,
    
  //     (SELECT coalesce(json_agg(agg), '[]')
  //      FROM
  //        (SELECT "combo".*
  //         FROM "_characterTocombo"
  //         INNER JOIN "combo" ON "_characterTocombo"."B" = "combo"."id"
  //         WHERE "_characterTocombo"."A" = "character"."id") AS agg) AS "combos",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "custom_weapon".*,
    
  //           (SELECT coalesce(json_agg(agg), '[]')
  //            FROM
  //              (SELECT "crystal".*
  //               FROM "_crystalTocustom_weapon"
  //               INNER JOIN "crystal" ON "_crystalTocustom_weapon"."A" = "crystal"."itemId"
  //               WHERE "_crystalTocustom_weapon"."B" = 'character.weaponId') AS agg) AS "crystalList",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "weapon".*
  //               FROM "weapon"
  //               WHERE "weapon"."itemId" = "custom_weapon"."templateId") AS obj) AS "template",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "weapon_enchantment_attributes".*
  //               FROM "weapon_enchantment_attributes"
  //               WHERE "weapon_enchantment_attributes"."id" = "custom_weapon"."enchantmentAttributesId") AS obj) AS "enchantmentAttributes"
  //         FROM "custom_weapon"
  //         WHERE "id" = 'defaultCharacter') AS obj) AS "weapon",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "custom_weapon".*,
    
  //           (SELECT coalesce(json_agg(agg), '[]')
  //            FROM
  //              (SELECT "crystal".*
  //               FROM "_crystalTocustom_weapon"
  //               INNER JOIN "crystal" ON "_crystalTocustom_weapon"."A" = "crystal"."itemId"
  //               WHERE "_crystalTocustom_weapon"."B" = 'character.weaponId') AS agg) AS "crystalList",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "weapon".*
  //               FROM "weapon"
  //               WHERE "weapon"."itemId" = "custom_weapon"."templateId") AS obj) AS "template",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "weapon_enchantment_attributes".*
  //               FROM "weapon_enchantment_attributes"
  //               WHERE "weapon_enchantment_attributes"."id" = "custom_weapon"."enchantmentAttributesId") AS obj) AS "enchantmentAttributes"
  //         FROM "custom_weapon"
  //         WHERE "id" = 'defaultCharacter') AS obj) AS "subWeapon",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "custom_armor".*,
    
  //           (SELECT coalesce(json_agg(agg), '[]')
  //            FROM
  //              (SELECT "crystal".*
  //               FROM "_crystalTocustom_armor"
  //               INNER JOIN "crystal" ON "_crystalTocustom_armor"."A" = "crystal"."itemId"
  //               WHERE "_crystalTocustom_armor"."B" = 'character.armorId') AS agg) AS "crystalList",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "armor".*
  //               FROM "armor"
  //               WHERE "armor"."itemId" = "custom_armor"."templateId") AS obj) AS "template",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "armor_enchantment_attributes".*
  //               FROM "armor_enchantment_attributes"
  //               WHERE "armor_enchantment_attributes"."id" = "custom_armor"."enchantmentAttributesId") AS obj) AS "enchantmentAttributes"
  //         FROM "custom_armor"
  //         WHERE "id" = 'defaultCharacter') AS obj) AS "armor",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "custom_additional_equipment".*,
    
  //           (SELECT coalesce(json_agg(agg), '[]')
  //            FROM
  //              (SELECT "crystal".*
  //               FROM "_crystalTocustom_additional_equipment"
  //               INNER JOIN "crystal" ON "_crystalTocustom_additional_equipment"."A" = "crystal"."itemId"
  //               WHERE "_crystalTocustom_additional_equipment"."B" = 'character.addEquipId') AS agg) AS "crystalList",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "additional_equipment".*
  //               FROM "additional_equipment"
  //               WHERE "additional_equipment"."itemId" = "custom_additional_equipment"."templateId") AS obj) AS "template"
  //         FROM "custom_additional_equipment"
  //         WHERE "id" = 'defaultCharacter') AS obj) AS "addEquip",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "custom_special_equipment".*,
    
  //           (SELECT coalesce(json_agg(agg), '[]')
  //            FROM
  //              (SELECT "crystal".*
  //               FROM "_crystalTocustom_special_equipment"
  //               INNER JOIN "crystal" ON "_crystalTocustom_special_equipment"."A" = "crystal"."itemId"
  //               WHERE "_crystalTocustom_special_equipment"."B" = 'character.speEquipId') AS agg) AS "crystalList",
    
  //           (SELECT to_json(obj)
  //            FROM
  //              (SELECT "special_equipment".*
  //               FROM "special_equipment"
  //               WHERE "special_equipment"."itemId" = "custom_special_equipment"."templateId") AS obj) AS "template"
  //         FROM "custom_special_equipment"
  //         WHERE "id" = 'defaultCharacter') AS obj) AS "speEquip",
    
  //     (SELECT to_json(obj)
  //      FROM
  //        (SELECT "statistic".*
  //         FROM "statistic"
  //         WHERE "id" = "character"."statisticId") AS obj) AS "statistic"
  //   FROM "character"
  //   WHERE "id" = 'defaultCharacter'
  //       `))
  return pgWorker;
};

// 获取已初始化的 pgWorker
export const getPGWorker = async(): Promise<PGliteWorker> => {
  if (!pgWorker) {
    console.log("PGliteWorker正在初始化");
    return initialPGWorker();
  }
  return pgWorker;
};

// 初始化数据层服务
// const DataWorker = new dataWorker();
// DataWorker.port.onmessage = (e) => {
//   console.log("data worker msg:", e.data);
// }

// 提供导出
// export const DW = Comlink.wrap<DataWorkerApi>(DataWorker.port);
// export const proxiedPg = Comlink.proxy(pgWorker); // 使用 proxy 包装
