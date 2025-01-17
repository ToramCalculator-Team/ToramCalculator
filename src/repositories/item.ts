import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistic";
import { defaultAccount } from "./account";
import { ItemType, I18nString, ITEM_TYPE } from "./enums";
import { ModifyKeys } from "./untils";

export type Item = ModifyKeys<Awaited<ReturnType<typeof findItemById>>, {
  
}>;
export type NewItem = Insertable<item>;
export type ItemUpdate = Updateable<item>;

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

export async function updateItem(id: string, updateWith: ItemUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createItem(newItem: NewItem) {
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

const items: Partial<Record<ItemType, Item>> = {};
for (const key of ITEM_TYPE) {
  items[key] = {
    id: `default${key}Id`,
    statistic: defaultStatistics[key],
    statisticId: defaultStatistics[key].id,
    ...itemsShared,
  };
}

export const defaultItems = items as Record<ItemType, Item>;
