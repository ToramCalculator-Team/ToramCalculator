import { getDB } from "./database";
import { activity, DB } from "@db/generated/zod/index";
import { Selectable, Insertable, Updateable, Expression, ExpressionBuilder } from "kysely";
import { createId } from "@paralleldrive/cuid2";
import { Transaction } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { activitySchema, statisticSchema, zoneSchema } from "@db/generated/zod";
import { z } from "zod/v4";
import { defineRelations, makeRelations } from "./subRelationFactory";
import { createStatistic } from "./statistic";
import { store } from "~/store";

// 1. 类型定义
export type Activity = Selectable<activity>;
export type ActivityInsert = Insertable<activity>;
export type ActivityUpdate = Updateable<activity>;

// 2. 关联查询定义
const activitySubRelationDefs = defineRelations({
  zones: {
    build: (eb: ExpressionBuilder<DB, "activity">, id: Expression<string>) =>
      jsonArrayFrom(
        eb
          .selectFrom("zone")
          .where("zone.activityId", "=", id)
          .selectAll("zone")
      ).as("zones"),
    schema: z.array(zoneSchema).describe("包含的区域"),
  },
  statistic: {
    build: (eb, id) =>
      jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "activity.statisticId").selectAll("statistic"))
        .$notNull().as("statistic"),
    schema: statisticSchema.describe("统计信息"),
  },
});

const activityRelationsFactory = makeRelations(activitySubRelationDefs);
export const ActivityWithRelationsSchema = z.object({
  ...activitySchema.shape,
  ...activityRelationsFactory.schema.shape,
});
export const activitySubRelations = activityRelationsFactory.subRelations;

// 2. 基础 CRUD 方法
export async function findActivityById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("activity")
    .where("id", "=", id)
    .selectAll()
    .executeTakeFirst() || null;
}

export async function findActivities(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("activity")
    .selectAll()
    .execute();
}

export async function insertActivity(trx: Transaction<DB>, data: ActivityInsert) {
  return await trx
    .insertInto("activity")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}


// 4. 特殊查询方法
export async function findActivityWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("activity")
    .where("id", "=", id)
    .selectAll("activity")
    .select((eb) => activitySubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findActivitiesWithRelations(trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("activity")
    .selectAll("activity")
    .select((eb) => activitySubRelations(eb, eb.ref("activity.id")))
    .execute();
}

// 关联查询类型
export type ActivityWithRelations = Awaited<ReturnType<typeof findActivityWithRelations>>;

// 5. 业务逻辑 CRUD 方法
export async function createActivity(trx: Transaction<DB>, activityData: ActivityInsert) {
  const statistic = await createStatistic(trx);
  return await trx
    .insertInto("activity")
    .values({
      ...activityData,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.account?.id,
      updatedByAccountId: store.session.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function updateActivity(trx: Transaction<DB>, activityData: ActivityUpdate) {
  return await trx
    .updateTable("activity")
    .set({
      ...activityData,
      updatedByAccountId: store.session.account?.id,
    })
    .where("id", "=", activityData.id!)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteActivity(trx: Transaction<DB>, activityData: Activity) {
  // 将用到此活动的zone的activityId设为null
  await trx.updateTable("zone").set({ activityId: null }).where("activityId", "=", activityData.id).execute();
  // 将用到此活动的recipe的activityId设为null
  await trx.updateTable("recipe").set({ activityId: null }).where("activityId", "=", activityData.id).execute();
  // 删除活动
  await trx.deleteFrom("activity").where("id", "=", activityData.id).executeTakeFirstOrThrow();
  // 删除统计
  await trx.deleteFrom("statistic").where("id", "=", activityData.statisticId).executeTakeFirstOrThrow();
}
