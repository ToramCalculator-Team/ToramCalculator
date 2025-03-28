import { Expression, ExpressionBuilder } from "kysely";
import { db, typeDB } from "./database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistic";
import { defaultAccount } from "./account";
import { type Enums, ITEM_TYPE } from "./enums";
import { DataType } from "./untils";

export interface Item extends DataType<typeDB["item"], typeof findItemById, typeof createItem> {}

export function itemSubRelations(eb: ExpressionBuilder<typeDB, "item">, id: Expression<string>) {
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
    ).as("dropBy"),
    jsonArrayFrom(
      eb
        .selectFrom("reward")
        .innerJoin("task", "reward.taskId", "task.id")
        .innerJoin("npc", "task.npcId", "npc.id")
        .where("reward.itemId", "=", id)
        .select(["npc.id", "npc.name", "task.id", "task.name"]),
    ).as("rewardBy"),
  ];
}

export async function findItemById(id: string) {
  return await db
    .selectFrom("item")
    .where("id", "=", id)
    .selectAll("item")
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateItem(id: string, updateWith: Item["Update"]) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createItem(newItem: Item["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newItem).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteItem(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

const itemsShared = {
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};

const items: Partial<Record<Enums["ItemType"], Item["Insert"]>> = {};
for (const key of ITEM_TYPE) {
  items[key] = {
    id: `default${key}Id`,
    type: key,
    // statistic: defaultStatistics[key],
    statisticId: defaultStatistics[key].id,
    ...itemsShared,
  };
}

export const defaultItems = items;
