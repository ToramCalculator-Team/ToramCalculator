import { Expression, ExpressionBuilder, Transaction, Selectable, Insertable, Updateable } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { DB, item } from "../generated/kysely/kyesely";
import { ItemType } from "../generated/kysely/enums";
import { getDB } from "./database";
import { createStatistic } from "./statistic";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";

// 1. 类型定义
export type Item = Selectable<item>;
export type ItemInsert = Insertable<item>;
export type ItemUpdate = Updateable<item>;
// 关联查询类型
export type ItemWithRelations = Awaited<ReturnType<typeof findItemWithRelations>>;

// 2. 关联查询定义
export function itemSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonObjectFrom(eb.selectFrom("statistic").whereRef("id", "=", "item.statisticId").selectAll("statistic"))
      .$notNull()
      .as("statistic"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("mob", "drop_item.dropById", "mob.id")
        .where("drop_item.itemId", "=", id)
        .select(["mob.id", "mob.name"]),
    ).as("dropByMob"),
    jsonArrayFrom(
      eb
        .selectFrom("task_reward")
        .innerJoin("task", "task_reward.taskId", "task.id")
        .innerJoin("npc", "task.npcId", "npc.id")
        .where("task_reward.itemId", "=", id)
        .select(["npc.id", "npc.name", "task.id", "task.name"]),
    ).as("rewardByNpcTask"),
    jsonArrayFrom(
      eb
        .selectFrom("task_collect_require")
        .innerJoin("task", "task_collect_require.taskId", "task.id")
        .where("task_collect_require.itemId", "=", id)
        .select(["task.id", "task.name"]),
    ).as("collectRequireByTask"),
    jsonArrayFrom(
      eb
        .selectFrom("recipe_ingredient")
        .innerJoin("item", "recipe_ingredient.itemId", "item.id")
        .where("recipe_ingredient.recipeId", "=", id)
        .select(["item.id"]),
    ).as("recipeEntries"),
  ];
}

// 3. 基础 CRUD 方法
export async function findItemById(id: string): Promise<Item | null> {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .executeTakeFirst() || null;
}

export async function findItems(params: { type: item["itemType"] }): Promise<Item[]> {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .where("itemType", "=", params.type)
    .selectAll("item")
    .execute();
}

export async function insertItem(trx: Transaction<DB>, data: ItemInsert): Promise<Item> {
  return await trx
    .insertInto("item")
    .values(data)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function createItem(trx: Transaction<DB>, data: ItemInsert): Promise<Item> {
  const statistic = await createStatistic(trx);
  const item = await trx
    .insertInto("item")
    .values({
      ...data,
      id: data.id || createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return item;
}

export async function updateItem(trx: Transaction<DB>, id: string, data: ItemUpdate): Promise<Item> {
  return await trx
    .updateTable("item")
    .set(data)
    .where("item.id", "=", id)
    .returningAll()
    .executeTakeFirstOrThrow();
}

export async function deleteItem(trx: Transaction<DB>, id: string): Promise<Item | null> {
  return await trx
    .deleteFrom("item")
    .where("item.id", "=", id)
    .returningAll()
    .executeTakeFirst() || null;
}

// 4. 特殊查询方法
export async function findItemWithRelations(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}
