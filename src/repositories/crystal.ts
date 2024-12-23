import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistics";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";

export type Crystal = Awaited<ReturnType<typeof findCrystalById>>;
export type NewCrystal = Insertable<item>;
export type CrystalUpdate = Updateable<item>;

export function crystalSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_FrontRelation")
        .innerJoin("crystal", "_FrontRelation.B", "crystal.itemId")
        .where("_FrontRelation.A", "=", id)
        .selectAll("crystal"),
    ).as("front"),
    jsonArrayFrom(
      eb

        .selectFrom("_BackRelation")
        .innerJoin("crystal", "_BackRelation.B", "crystal.itemId")
        .where("_BackRelation.A", "=", id)
        .selectAll("crystal"),
    ).as("back"),
  ];
}

export async function findCrystalById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("crystal", "item.id", "crystal.itemId")
    .where("id", "=", id)
    .selectAll(["item", "crystal"])
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCrystal(id: string, updateWith: CrystalUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createCrystal(newCrystal: NewCrystal) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newCrystal).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteCrystal(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCrystal: Crystal = {
  name: "默认锻晶（缺省值）",
  id: "defaultCrystalId",
  modifiers: [],
  itemId: "defaultCrystalId",
  front: [],
  back: [],
  crystalType: "",
  dataSources: "",
  extraDetails: "",
  dropBy: [],
  rewardBy: [],
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
