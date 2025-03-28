import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, statistic } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";
import { STATISTIC_TYPE, WIKISCHEMA_TYPE, type Enums } from "./enums";

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

export async function insertStatistic(trx: Transaction<DB>, newStatistic: NewStatistic) {
  const statistic = await trx.insertInto("statistic").values(newStatistic).returningAll().executeTakeFirstOrThrow();
  return statistic;
}

export async function createStatistic(newStatistic: NewStatistic) {
  return await db.transaction().execute(async (trx) => {
    return await insertStatistic(trx, newStatistic);
  });
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

const statistics: Partial<Record<Enums["StatisticType"], Statistic>> = {};
for (const key of STATISTIC_TYPE) {
  statistics[key] = {
    id: `default${key}StatisticId`,
    ...statisticShared,
  };
}

export const defaultStatistics = statistics as Record<Enums["StatisticType"], Statistic>;

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
