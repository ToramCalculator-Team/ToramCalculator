import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, statistic } from "../../db/generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

export type Statistic = Awaited<ReturnType<typeof findStatisticById>>;
export type NewStatistic = Insertable<statistic>;
export type StatisticUpdate = Updateable<statistic>;

export function statisticSubRelations(eb: ExpressionBuilder<DB, "statistic">, statisticId: Expression<string>) {
  return [];
}

export async function findStatisticById(id: string) {
  const db = await getDB();
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
  const db = await getDB();
  return await db.deleteFrom("statistic").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createStatistic(trx: Transaction<DB>) {
  return await insertStatistic(trx);
}
