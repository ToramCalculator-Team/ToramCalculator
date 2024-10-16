import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, analyzer } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Consumable = Awaited<ReturnType<typeof findConsumableById>>;
export type NewConsumable = Insertable<analyzer>;
export type ConsumableUpdate = Updateable<analyzer>;

export function ConsumableSubRelations(eb: ExpressionBuilder<DB, "consumable">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("modifiers_list")
        .whereRef("usedB", "=", "body_armor.modifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("modifiersList"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "analyzer.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
  ];
}

export async function findConsumableById(id: string) {
  return await db
    .selectFrom("analyzer")
    .where("id", "=", id)
    .selectAll("analyzer")
    .select((eb) => ConsumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateConsumable(id: string, updateWith: ConsumableUpdate) {
  return await db.updateTable("analyzer").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(newConsumable: NewConsumable) {
  return await db.transaction().execute(async (trx) => {
    const analyzer = await trx.insertInto("analyzer").values(newConsumable).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values(defaultStatistics)
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...analyzer, statistics };
  });
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("analyzer").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultConsumable: Consumable = {
  id: "",
  name: "",
  modifiersList: defaultModifiersList,
  modifiersListId: defaultModifiersList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
