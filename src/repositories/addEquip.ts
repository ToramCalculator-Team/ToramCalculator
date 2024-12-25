import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";
import { crystalSubRelations } from "./crystal";

export type AddEquip = Awaited<ReturnType<typeof findAddEquipById>>;
export type NewAddEquip = Insertable<item>;
export type AddEquipUpdate = Updateable<item>;

export function addEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_additional_equipmentTocrystal")
        .innerJoin("crystal", "_additional_equipmentTocrystal.B", "crystal.itemId")
        .where("_additional_equipmentTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId")))
    ).as("defaultCrystals"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.addEquipId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findAddEquipById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("additional_equipment", "item.id", "additional_equipment.itemId")
    .where("id", "=", id)
    .selectAll(["item", "additional_equipment"])
    .select((eb) => addEquipSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAddEquip(id: string, updateWith: AddEquipUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createAddEquip(newAddEquip: NewAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newAddEquip).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteAddEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAddEquip: AddEquip = {
  name: "默认追加（缺省值）",
  id: "defaultAddEquipId",
  modifiers: [],
  itemId: "defaultAddEquipId",
  defaultCrystals: [],
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.addEquip,
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
};
