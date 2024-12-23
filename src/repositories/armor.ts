import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistics";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";

export type Armor = Awaited<ReturnType<typeof findArmorById>>;
export type NewArmor = Insertable<item>;
export type ArmorUpdate = Updateable<item>;

export function armorSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_armorTocrystal")
        .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
        .where("_armorTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("dropBy"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.armorId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findArmorById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("armor", "item.id", "armor.itemId")
    .where("id", "=", id)
    .selectAll(["item", "armor"])
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateArmor(id: string, updateWith: ArmorUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createArmor(newArmor: NewArmor) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteArmor(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmor: Armor = {
  name: "默认防具（缺省值）",
  id: "defaultArmorId",
  modifiers: [],
  itemId: "defaultArmorId",
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  extraDetails: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.armorRecipe,
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
