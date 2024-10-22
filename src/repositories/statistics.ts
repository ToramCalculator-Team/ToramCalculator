import {
  Expression,
  ExpressionBuilder,
  expressionBuilder,
  Insertable,
  Updateable,
} from "kysely";
import { db } from "./database";
import { DB, statistics } from "~/repositories/db/types";
import { defaultRate } from "./rate";
import { defaultViewTimestamp } from "./view_timestamp";
import { defaultUsageTimestamp } from "./usage_timestamp";
import { jsonArrayFrom } from "kysely/helpers/postgres";

export type Statistics = Awaited<ReturnType<typeof findStatisticsById>>;
export type NewStatistics = Insertable<statistics>;
export type StatisticsUpdate = Updateable<statistics>;

export function statisticsSubRelations(eb:ExpressionBuilder<DB, "statistics">,statisticsId: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("view_timestamp")
        .whereRef("view_timestamp.statisticsId", "=", statisticsId)
        .selectAll("view_timestamp")
    ).as("viewTimestamps"),
    jsonArrayFrom(
      eb
        .selectFrom("usage_timestamp")
        .whereRef("usage_timestamp.statisticsId", "=", statisticsId)
        .selectAll("usage_timestamp")
    ).as("usageTimestamps"),
    jsonArrayFrom(
      eb
        .selectFrom("rate")
        .whereRef("rate.statisticsId", "=", statisticsId)
        .selectAll("rate")
    ).as("rates"),
  ];
}

export async function findStatisticsById(id: string) {
  return await db
    .selectFrom("statistics")
    .where("statistics.id", "=", id)
    .selectAll("statistics")
    .select((eb) => statisticsSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}


// statistics 只做关联，不应该发生更新
// export async function updateStatistics(id: string, updateWith: StatisticsUpdate) {
//   await db.updateTable('statistics').set(updateWith).where('id', '=', id).execute()
// }

export async function createStatistics(newStatistics: NewStatistics) {
  return await db.transaction().execute(async (trx) => {
    const statistics = await trx
      .insertInto("statistics")
      .values(newStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();

    const rates = await trx.insertInto("rate").values(defaultRate).returningAll().execute();

    const viewTimestamps = await trx
      .insertInto("view_timestamp")
      .values(defaultViewTimestamp)
      .returningAll()
      .execute();

    const usageTimestamps = await trx
      .insertInto("usage_timestamp")
      .values(defaultUsageTimestamp)
      .returningAll()
      .execute();

    return { ...statistics, rates, viewTimestamps, usageTimestamps };
  });
}

export async function deleteStatistics(id: string) {
  return await db.deleteFrom("statistics").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultStatistics: Statistics = {
  id: "defaultStatisticsId",
  rates: [defaultRate],
  viewTimestamps: [defaultViewTimestamp],
  usageTimestamps: [defaultUsageTimestamp],
  monsterId: null,
  crystalId: null,
  mainWeaponId: null,
  subWeaponId: null,
  bodyArmorId: null,
  additionalEquipmentId: null,
  specialEquipmentId: null,
  skillId: null,
  petId: null,
  consumableId: null,
  characterId: null,
  analyzerId: null,
};
