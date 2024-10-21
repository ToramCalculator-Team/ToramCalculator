import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, consumable } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultModifierList, modifierListSubRelations } from "./modifier_list";

export type Consumable = Awaited<ReturnType<typeof findConsumableById>>;
export type NewConsumable = Insertable<consumable>;
export type ConsumableUpdate = Updateable<consumable>;

export function consumableSubRelations(eb: ExpressionBuilder<DB, "consumable">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "consumable.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifier_list")
        .whereRef("id", "=", "consumable.modifierListId")
        .selectAll("modifier_list")
        .select((subEb) => modifierListSubRelations(subEb, subEb.val(id))),
    ).as("modifierList"),
  ];
}

export async function findConsumableById(id: string) {
  return await db
    .selectFrom("consumable")
    .where("id", "=", id)
    .selectAll("consumable")
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateConsumable(id: string, updateWith: ConsumableUpdate) {
  return await db.updateTable("consumable").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(newConsumable: NewConsumable) {
  return await db.transaction().execute(async (trx) => {
    const consumable = await trx.insertInto("consumable").values(newConsumable).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...consumable, statistics };
  });
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("consumable").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultConsumable: Consumable = {
  id: "",
  name: "",
  modifierList: defaultModifierList,
  modifierListId: defaultModifierList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
