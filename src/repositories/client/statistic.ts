import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, statistic } from "~/../db/clientDB/kysely/kyesely";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";
import { createId } from "@paralleldrive/cuid2";
import { CRYSTAL_TYPE, ITEM_TYPE, WEAPON_TYPE } from "../../../db/enums";

export type Statistic = Awaited<ReturnType<typeof findStatisticById>>;
export type NewStatistic = Insertable<statistic>;
export type StatisticUpdate = Updateable<statistic>;

export function statisticSubRelations(eb: ExpressionBuilder<DB, "statistic">, statisticId: Expression<string>) {
  return [];
}

export async function findStatisticById(id: string) {
  return await db
    .selectFrom("statistic")
    .where("statistic.id", "=", id)
    .selectAll("statistic")
    .select((eb) => statisticSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// statistic 只做关联，不应该发生更新
// export async function updateStatistic(id: string, updateWith: StatisticUpdate) {
//   await db.updateTable('statistic').set(updateWith).where('id', '=', id).execute()
// }

export async function insertStatistic(trx: Transaction<DB>) {
  return await trx
    .insertInto("statistic")
    .values({
      id: createId(),
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteStatistic(id: string) {
  return await db.deleteFrom("statistic").where("id", "=", id).returningAll().executeTakeFirst();
}

const statisticShared = {
  viewTimestamps: [],
  usageTimestamps: [],
  updatedAt: new Date(),
  createdAt: new Date(),
};

export const WIKISCHEMA_TYPE = [
  "Mob",
  "Character",
  ...WEAPON_TYPE,
  "WeaponEncAttrs",
  "Armor",
  "ArmorEncAttrs",
  "OptEquip",
  "SpeEquip",
  ...CRYSTAL_TYPE,
  ...ITEM_TYPE,
] as const;
export const WIKI_TYPE = [
  "Mob",
  "Character",
  "Weapon",
  "WeaponEncAttrs",
  "Armor",
  "ArmorEncAttrs",
  "OptEquip",
  "SpeEquip",
  "Crystal",
  "Item",
  "Skill",
  "Pet",
] as const;
export const STATISTIC_TYPE = [...WIKISCHEMA_TYPE, "Skill", "Simulator"] as const;
type StatisticType = (typeof STATISTIC_TYPE)[number]

const statistics: Partial<Record<StatisticType, Statistic>> = {};
for (const key of STATISTIC_TYPE) {
  statistics[key] = {
    id: ``,
    ...statisticShared,
  };
}

export const defaultStatistics = statistics as Record<StatisticType, Statistic>;

export const StatisticDic = (locale: Locale): ConvertToAllString<Statistic> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "zh-TW":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "en":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "ja":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
  }
};
