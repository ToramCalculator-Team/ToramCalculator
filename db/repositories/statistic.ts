import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, statistic } from "../generated/kysely/kyesely";
import { createId } from "@paralleldrive/cuid2";

// 1. 类型定义
export type Statistic = Selectable<statistic>;
export type StatisticInsert = Insertable<statistic>;
export type StatisticUpdate = Updateable<statistic>;
// 关联查询类型
export type StatisticWithRelations = Awaited<ReturnType<typeof findStatisticWithRelations>>;

// 2. 关联查询定义
export function statisticSubRelations(eb: ExpressionBuilder<DB, "statistic">, statisticId: Expression<string>) {
  return [];
}

// 3. 基础 CRUD 方法
export async function findStatisticById(id: string): Promise<Statistic | null> {
  const db = await getDB();
  return await db
    .selectFrom("statistic")
    .where("statistic.id", "=", id)
    .selectAll("statistic")
    .executeTakeFirst() || null;
}

export async function findStatistics(): Promise<Statistic[]> {
  const db = await getDB();
  return await db
    .selectFrom("statistic")
    .selectAll("statistic")
    .execute();
}

export async function insertStatistic(trx: Transaction<DB>): Promise<Statistic> {
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

export async function createStatistic(trx: Transaction<DB>): Promise<Statistic> {
  // 注意：createStatistic 内部自己处理事务，所以我们需要在外部事务中直接插入
  return await insertStatistic(trx);
}

export async function updateStatistic(trx: Transaction<DB>, id: string, data: StatisticUpdate): Promise<Statistic> {
  return await trx
    .updateTable("statistic")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteStatistic(trx: Transaction<DB>, id: string): Promise<Statistic | null> {
  return await trx
    .deleteFrom("statistic")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findStatisticWithRelations(id: string) {
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
