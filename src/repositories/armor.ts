import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, armor } from "~/repositories/db/types";
import { crystalSubRelations, defaultCrystal, NewCrystal } from "./crystal";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type Armor = Awaited<ReturnType<typeof findArmorById>>;
export type NewArmor = Insertable<armor>;
export type ArmorUpdate = Updateable<armor>;

export function armorSubRelations(eb: ExpressionBuilder<DB, "armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_armorTocrystal")
        .innerJoin("crystal", "_armorTocrystal.B", "crystal.itemId")
        .where("_armorTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val(id))),
    ).as("defaultCrystalList"),
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("drop_item", "drop_item.itemId", "item.id")
        .innerJoin("mob", "drop_item.dropById", "mob.id")
        .where("item.id", "=", id)
        .select("mob.name"),
    ).as("dropBy"),
  ];
}

export async function findArmorById(id: string) {
  return await db
    .selectFrom("armor")
    .where("armor.itemId", "=", id)
    .selectAll("armor")
    .select((eb) => armorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateArmor(id: string, updateWith: ArmorUpdate) {
  return await db.updateTable("armor").set(updateWith).where("armor.itemId", "=", id).returningAll().executeTakeFirst();
}

export async function createArmor(newArmor: NewArmor) {
  return await db.transaction().execute(async (trx) => {
    const armor = await trx.insertInto("armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return armor;
  });
}

export async function deleteArmor(id: string) {
  return await db.deleteFrom("armor").where("armor.itemId", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmor: Armor = {
  name: "defaultArmorName",
  baseDef: 0,
  availability: "permanent",
  acquisitionMethod: "Drop",
  modifiers: [],
  defaultCrystalList: [],
  dropBy: [],
  colorA: 0,
  colorB: 0,
  colorC: 0,
  itemId: "",
};
