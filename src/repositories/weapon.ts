import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom,jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics } from "./statistics";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";

export type Weapon = Awaited<ReturnType<typeof findWeaponById>>;
export type NewWeapon = Insertable<item>;
export type WeaponUpdate = Updateable<item>;

export function weaponSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_weapon")
        .innerJoin("crystal", "_crystalTocustom_weapon.A", "crystal.itemId")
        .where("_crystalTocustom_weapon.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.consumableId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findWeaponById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "item.id", "weapon.itemId")
    .where("id", "=", id)
    .selectAll(["item", "weapon"])
    .select((eb) => weaponSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateWeapon(id: string, updateWith: WeaponUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createWeapon(newWeapon: NewWeapon) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newWeapon).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteWeapon(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultWeapon: Weapon = {
  name: "默认武器（缺省值）",
  id: "defaultWeaponId",
  modifiers: [],
  itemId: "defaultWeaponId",
  type: "",
  baseAbi: 0,
  stability: 0,
  defaultCrystals: [],
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  extraDetails: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.weaponRecipe,
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
