import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_weapon } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultWeapon } from "./weapon";
import { defaultAccount } from "./account";
import { defaultWeaponEncAttributes } from "./weaponEncAttrs";

export type CustomWeapon = Awaited<ReturnType<typeof findCustomWeaponById>>;
export type NewCustomWeapon = Insertable<custom_weapon>;
export type CustomWeaponUpdate = Updateable<custom_weapon>;

export function customWeaponSubRelations(
  eb: ExpressionBuilder<DB, "custom_weapon">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_weapon")
        .innerJoin("crystal", "_crystalTocustom_weapon.A", "crystal.itemId")
        // .innerJoin("item", "crystal.itemId", "item.id")
        .where("_crystalTocustom_weapon.B", "=", id)
        .selectAll("crystal"),
      // .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id"))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("weapon")
        .whereRef("weapon.itemId", "=", "custom_weapon.templateId")
        .selectAll("weapon"),
    ).$notNull().as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("weapon_enchantment_attributes")
        .whereRef("weapon_enchantment_attributes.id", "=", "custom_weapon.enchantmentAttributesId")
        .selectAll("weapon_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findCustomWeaponById(id: string) {
  return await db
    .selectFrom("custom_weapon")
    .where("id", "=", id)
    .selectAll("custom_weapon")
    .select((eb) => customWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomWeapon(id: string, updateWith: CustomWeaponUpdate) {
  return await db
    .updateTable("custom_weapon")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createCustomWeapon(newWeapon: NewCustomWeapon) {
  return await db.transaction().execute(async (trx) => {
    const custom_weapon = await trx
      .insertInto("custom_weapon")
      .values(newWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_weapon;
  });
}

export async function deleteCustomWeapon(id: string) {
  return await db.deleteFrom("custom_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomWeapon: CustomWeapon = {
  id: "defaultWeaponId",
  name: "默认自定义武器（缺省值）",
  extraAbi: 0,
  enchantmentAttributes: defaultWeaponEncAttributes,
  enchantmentAttributesId: defaultWeaponEncAttributes.id,
  template: defaultWeapon,
  templateId: defaultWeapon.id,
  refinement: 0,
  crystalList: [],
  extraDetails: "",

  updatedAt: new Date(),
  createdAt: new Date(),
  masterId: defaultAccount.id,
};
