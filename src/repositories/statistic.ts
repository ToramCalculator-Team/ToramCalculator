import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, statistic } from "~/repositories/db/types";
import { defaultRate } from "./rate";
import { defaultViewTimestamp } from "./view_timestamp";
import { defaultUsageTimestamp } from "./usage_timestamp";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type Statistic = Awaited<ReturnType<typeof findStatisticById>>;
export type NewStatistic = Insertable<statistic>;
export type StatisticUpdate = Updateable<statistic>;

export function statisticSubRelations(eb: ExpressionBuilder<DB, "statistic">, statisticId: Expression<string>) {
  return [
    jsonArrayFrom(
      eb.selectFrom("view_timestamp").where("view_timestamp.statisticId", "=", statisticId).selectAll("view_timestamp"),
    ).as("viewTimestamps"),
    jsonArrayFrom(
      eb
        .selectFrom("usage_timestamp")
        .where("usage_timestamp.statisticId", "=", statisticId)
        .selectAll("usage_timestamp"),
    ).as("usageTimestamps"),
    jsonArrayFrom(eb.selectFrom("rate").whereRef("rate.statisticId", "=", statisticId).selectAll("rate")).as("rates"),
  ];
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

export async function createStatistic(newStatistic: NewStatistic) {
  return await db.transaction().execute(async (trx) => {
    console.log("createStatistic");
    const statistic = await trx.insertInto("statistic").values(newStatistic).returningAll().executeTakeFirstOrThrow();
    console.log("createRate");
    const rate = await trx.insertInto("rate").values(defaultRate).returningAll().execute();
    console.log("createViewTimestamp");
    const viewTimestamp = await trx.insertInto("view_timestamp").values(defaultViewTimestamp).returningAll().execute();
    console.log("createUsageTimestamp");
    const usageTimestamp = await trx
      .insertInto("usage_timestamp")
      .values(defaultUsageTimestamp)
      .returningAll()
      .execute();

    return { ...statistic, rates: [rate], viewTimestamps: [viewTimestamp], usageTimestamps: [usageTimestamp] };
  });
}

export async function deleteStatistic(id: string) {
  return await db.deleteFrom("statistic").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultStatistic: Statistic = {
  id: "defaultStatisticId",
  rates: [],
  viewTimestamps: [],
  usageTimestamps: [],
  updatedAt: new Date(),
  createdAt: new Date(),
};

export const StatisticDic = (locale: Locale): ConvertToAllString<Statistic> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        rates: "",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "zh-TW":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        rates: "",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        rates: "",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
    case "ja":
      return {
        selfName: "账号",
        id: "defaultStatisticId",
        rates: "",
        updatedAt: "",
        createdAt: "",
        viewTimestamps: "",
        usageTimestamps: "",
      };
  }
};
