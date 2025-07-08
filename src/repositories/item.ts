import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { DataType } from "./untils";
import { DB, item } from "../../db/generated/kysely/kyesely";
import { ItemType } from "../../db/kysely/enums";
import { getDB } from "./database";
import { createStatistic } from "./statistic";
import { createId } from "@paralleldrive/cuid2";
import { store } from "~/store";

export interface Item extends DataType<item> {
  MainTable: Awaited<ReturnType<typeof findItems>>[number];
  Card: Awaited<ReturnType<typeof findItemById>>;
}

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

export async function findItemById(id: string, type: ItemType) {
  const db = await getDB();
  return await db.selectFrom("item").where("id", "=", id).selectAll("item").executeTakeFirstOrThrow();
}

export async function findItems(params: { type: item["itemType"] }) {
  const db = await getDB();
  return await db
    .selectFrom("item")
    .where("itemType", "=", params.type)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.ref("item.id")))
    .execute();
}

export async function updateItem(id: string, updateWith: Item["Update"]) {
  const db = await getDB();
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function insertItem(trx: Transaction<DB>, newItem: Item["Insert"]) {
  const db = await getDB();
  const item = await trx.insertInto("item").values(newItem).returningAll().executeTakeFirstOrThrow();
  return item;
}

export async function createItem(trx: Transaction<DB>, newItem: Item["Insert"]) {
  const statistic = await createStatistic(trx);
  const item = await trx
    .insertInto("item")
    .values({
      ...newItem,
      id: createId(),
      statisticId: statistic.id,
      createdByAccountId: store.session.user.account?.id,
      updatedByAccountId: store.session.user.account?.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return item;
}

export async function deleteItem(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}
