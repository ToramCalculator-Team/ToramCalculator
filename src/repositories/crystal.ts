import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { crystal, DB } from "~/repositories/db/types";
import { createStatistics, defaultStatistics, statisticsSubRelations } from "./statistics";
import { createModifierList, defaultModifierList, modifierListSubRelations } from "./modifier_list";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type Crystal = Awaited<ReturnType<typeof findCrystalById>>;
export type NewCrystal = Insertable<crystal>;
export type CrystalUpdate = Updateable<crystal>;

export function crystalSubRelations(eb: ExpressionBuilder<DB, "crystal">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "crystal.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifier_list")
        .whereRef("id", "=", "crystal.modifierListId")
        .selectAll("modifier_list")
        .select((subEb) => modifierListSubRelations(subEb, subEb.val(id))),
    ).as("modifierList"),
  ];
}

export async function findCrystalById(id: string) {
  return await db.selectFrom("crystal")
    .where("crystal.id", "=", id)
    .selectAll("crystal")
    .select((eb) => crystalSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCrystal(id: string, updateWith: CrystalUpdate) {
  return await db.updateTable("crystal").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCrystal(newCrystal: NewCrystal) {
  return await db.transaction().execute(async (trx) => {
    const crystal = await trx.insertInto("crystal").values(newCrystal).returningAll().executeTakeFirstOrThrow();
    const modifierList = await createModifierList(defaultModifierList);
    const statistics = await createStatistics(defaultStatistics);
    return { ...crystal, modifierList, statistics };
  })
}

export async function deleteCrystal(id: string) {
  return await db.deleteFrom("crystal").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCrystal: Crystal = {
  id: "defaultCrystalId",
  name: "defaultCrystalName",
  crystalType: "GENERAL",
  front: 0,
  modifierList: defaultModifierList,
  modifierListId: defaultModifierList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
