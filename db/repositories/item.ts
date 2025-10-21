import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { DB, item } from "@db/generated/zod/index";
import { ItemType } from "../schema/enums";
import { getDB } from "./database";
import { createStatistic } from "./statistic";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";
import { z } from "zod/v4";
import { itemSchema, statisticSchema } from "../generated/zod/index";
import { defineRelations, makeRelations } from "./subRelationFactory";

// 1. 类型定义
export type Item = Selectable<item>;
export type ItemInsert = Insertable<item>;
export type ItemUpdate = Updateable<item>;

// 子关系定义
const itemSubRelationDefs = defineRelations({
  statistic: {
    build: (eb, id) =>
      jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "item.statisticId").selectAll("statistic"))
        .$notNull().as("statistic"),
    schema: statisticSchema.describe("统计信息"),
  },
  dropByMob: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("drop_item")
          .innerJoin("mob", "drop_item.belongToMobId", "mob.id")
          .where("drop_item.itemId", "=", id)
          .select(["mob.id", "mob.name"])
      ).as("dropByMob"),
    schema: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })).describe("掉落的怪物列表"),
  },
  rewardByNpcTask: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("task_reward")
          .innerJoin("task", "task_reward.belongToTaskId", "task.id")
          .innerJoin("npc", "task.belongToNpcId", "npc.id")
          .where("task_reward.itemId", "=", id)
          .select(["npc.id", "npc.name", "task.id", "task.name"])
      ).as("rewardByNpcTask"),
    schema: z.array(z.object({
      id: z.string(),
      name: z.string(),
      task: z.object({
        id: z.string(),
        name: z.string(),
      }),
    })).describe("奖励NPC任务列表"),
  },
  collectRequireByTask: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("task_collect_require")
          .innerJoin("task", "task_collect_require.belongToTaskId", "task.id")
          .where("task_collect_require.itemId", "=", id)
          .select(["task.id", "task.name"])
      ).as("collectRequireByTask"),
    schema: z.array(z.object({
      id: z.string(),
      name: z.string(),
    })).describe("收集需求任务列表"),
  },
  recipeEntries: {
    build: (eb, id) =>
      jsonArrayFrom(
        eb
          .selectFrom("recipe_ingredient")
          .innerJoin("item", "recipe_ingredient.itemId", "item.id")
          .where("recipe_ingredient.recipeId", "=", id)
          .select(["item.id"])
      ).as("recipeEntries"),
    schema: z.array(z.object({
      id: z.string(),
    })).describe("配方条目列表"),
  },
});

// 生成 factory
export const itemRelationsFactory = makeRelations(
  itemSubRelationDefs
);

// 构造关系Schema
export const ItemWithRelationsSchema = z.object({
  ...itemSchema.shape,
  ...itemRelationsFactory.schema.shape,
});

// 构造子关系查询器
export const itemSubRelations = itemRelationsFactory.subRelations;

// 3. 基础 CRUD 方法
export async function findItemById(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return (await db.selectFrom("item").where("id", "=", id).selectAll("item").executeTakeFirst()) || null;
}

export async function findItems(params: { type: item["itemType"] }, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db.selectFrom("item").where("itemType", "=", params.type).selectAll("item").execute();
}

export async function insertItem(trx: Transaction<DB>, data: ItemInsert) {
  return await trx.insertInto("item").values(data).returningAll().executeTakeFirstOrThrow();
}

export async function createItem(trx: Transaction<DB>, data: ItemInsert) {
  const statistic = await createStatistic(trx);
  const item = await trx
    .insertInto("item")
    .values({
      ...data,
      id: data.id || createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.account?.id,
      updatedByAccountId: store.session.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return item;
}

export async function updateItem(trx: Transaction<DB>, id: string, data: ItemUpdate) {
  return await trx.updateTable("item").set(data).where("item.id", "=", id).returningAll().executeTakeFirstOrThrow();
}

export async function deleteItem(trx: Transaction<DB>, id: string) {
  return (await trx.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst()) || null;
}

// 特殊查询方法
export async function findItemWithRelations(id: string, trx?: Transaction<DB>) {
  const db = trx || await getDB();
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

// 关联查询类型
export type ItemWithRelations = Awaited<ReturnType<typeof findItemWithRelations>>;
