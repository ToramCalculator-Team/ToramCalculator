import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { statistics } from "~/repositories/db/types";
import { defaultRate } from "./rate";
import { defaultViewTimestamp } from "./view_timestamp";
import { defaultUsageTimestamp } from "./usage_timestamp";

export type Statistics = Awaited<ReturnType<typeof findStatisticsById>>;
export type NewStatistics = Insertable<statistics>;
export type StatisticsUpdate = Updateable<statistics>;

export async function findStatisticsById(id: string) {
  const statistics = await db.selectFrom("statistics").where("id", "=", id).selectAll().executeTakeFirstOrThrow();

  const view_timestamps = await db.selectFrom("view_timestamp").where("statisticsId", "=", id).selectAll().execute();

  const usage_timestamps = await db.selectFrom("usage_timestamp").where("statisticsId", "=", id).selectAll().execute();

  const rates = await db.selectFrom("rate").where("statisticsId", "=", id).selectAll().execute();

  return { ...statistics, rates, view_timestamps, usage_timestamps };
}

// statistics 只做关联，不应该发生更新
// export async function updateStatistics(id: string, updateWith: StatisticsUpdate) {
//   await db.updateTable('statistics').set(updateWith).where('id', '=', id).execute()
// }

export async function createStatistics(newStatistics: NewStatistics) {
  return await db.transaction().execute(async (trx) => {
    const statistics = await trx.insertInto("statistics").values(newStatistics).returningAll().executeTakeFirstOrThrow();

    const rates = await trx.insertInto("rate").values(defaultRate).returningAll().execute();

    const view_timestamps = await trx.insertInto("view_timestamp").values(defaultViewTimestamp).returningAll().execute();

    const usage_timestamps = await trx
      .insertInto("usage_timestamp")
      .values(defaultUsageTimestamp)
      .returningAll()
      .execute();

    return { ...statistics, rates, view_timestamps, usage_timestamps };
  });
}

export async function deleteStatistics(id: string) {
  return await db.deleteFrom("statistics").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultStatistics: Statistics = {
  id: "defaultStatisticsId",
  rates: [defaultRate],
  view_timestamps: [defaultViewTimestamp],
  usage_timestamps: [defaultUsageTimestamp],
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
