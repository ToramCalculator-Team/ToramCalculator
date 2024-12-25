import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_armor } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultArmor } from "./armor";
import { defaultAccount } from "./account";
import { defaultArmorEncAttributes } from "./armorEncAttrs";

export type CustomArmor = Awaited<ReturnType<typeof findCustomArmorById>>;
export type NewCustomArmor = Insertable<custom_armor>;
export type CustomArmorUpdate = Updateable<custom_armor>;

export function customArmorSubRelations(eb: ExpressionBuilder<DB, "custom_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_armor")
        .innerJoin("crystal", "_crystalTocustom_armor.A", "crystal.itemId")
        // .innerJoin("item", "crystal.itemId", "item.id")
        .where("_crystalTocustom_armor.B", "=", id)
        .selectAll("crystal"),
      // .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id"))),
    ).as("crystalList"),
    jsonObjectFrom(eb.selectFrom("armor").whereRef("armor.itemId", "=", "custom_armor.templateId").selectAll("armor"))
      .$notNull()
      .as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("armor_enchantment_attributes")
        .whereRef("armor_enchantment_attributes.id", "=", "custom_armor.enchantmentAttributesId")
        .selectAll("armor_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findCustomArmorById(id: string) {
  return await db
    .selectFrom("custom_armor")
    .where("id", "=", id)
    .selectAll("custom_armor")
    .select((eb) => customArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomArmor(id: string, updateWith: CustomArmorUpdate) {
  return await db.updateTable("custom_armor").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCustomArmor(newArmor: NewCustomArmor) {
  return await db.transaction().execute(async (trx) => {
    const custom_armor = await trx.insertInto("custom_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return custom_armor;
  });
}

export async function deleteCustomArmor(id: string) {
  return await db.deleteFrom("custom_armor").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomArmor: CustomArmor = {
  id: "defaultArmorId",
  name: "默认自定义防具（缺省值）",
  def: 0,
  template: defaultArmor,
  templateId: defaultArmor.id,
  armorType: "Normal",
  enchantmentAttributes: defaultArmorEncAttributes,
  enchantmentAttributesId: defaultArmorEncAttributes.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};
