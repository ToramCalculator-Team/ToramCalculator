import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { getDB } from "./database";
import { DB, statistic } from "@db/generated/zod/index";
import { createId } from "@paralleldrive/cuid2";
import { statisticSchema } from "../generated/zod/index";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Statistic = Selectable<statistic>;
export type StatisticInsert = Insertable<statistic>;
export type StatisticUpdate = Updateable<statistic>;

// 2. 子关系定义
const statisticSubRelationDefs = defineRelations({});

// 生成 factory
export const statisticRelationsFactory = makeRelations(
  statisticSubRelationDefs
);

// 构造关系Schema
export const StatisticWithRelationsSchema = z.object({
  ...statisticSchema.shape,
  ...statisticRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const statisticSubRelations = statisticRelationsFactory.subRelations;

// 3. 基础 CRUD 方法

// 3. 基础 CRUD 方法
export async function findStatisticById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("statistic")
    .where("statistic.id", "=", id)
    .selectAll("statistic")
    .executeTakeFirst() || null;
}

export async function findStatistics(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("statistic")
    .selectAll("statistic")
    .execute();
}

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

export async function createStatistic(trx: Transaction<DB>) {
  // 注意：createStatistic 内部自己处理事务，所以我们需要在外部事务中直接插入
  return await insertStatistic(trx);
}

export async function updateStatistic(trx: Transaction<DB>, id: string, data: StatisticUpdate) {
  return await trx
    .updateTable("statistic")
    .set(data)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteStatistic(trx: Transaction<DB>, id: string) {
  return await trx
    .deleteFrom("statistic")
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 特殊查询方法
export async function findStatisticWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("statistic")
    .where("statistic.id", "=", id)
    .selectAll("statistic")
    .select((eb) => statisticSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type StatisticWithRelations = Awaited<ReturnType<typeof findStatisticWithRelations>>;

// statistic 只做关联，不应该发生更新
// export async function updateStatistic(id: string, updateWith: StatisticUpdate) {
//   await db.updateTable('statistic').set(updateWith).where('id', '=', id).execute()
// }
