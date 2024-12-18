import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_armor } from "~/repositories/db/types";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultArmor } from "./armor";
import { defaultAccount } from "./account";

export type CustomArmor = Awaited<ReturnType<typeof findCustomArmorById>>;
export type NewCustomArmor = Insertable<custom_armor>;
export type CustomArmorUpdate = Updateable<custom_armor>;

export function customArmorSubRelations(eb: ExpressionBuilder<DB, "custom_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_armor")
        .innerJoin("crystal", "_crystalTocustom_armor.A", "crystal.id")
        .where("_crystalTocustom_armor.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("crystalList")
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
  return await db
    .updateTable("custom_armor")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createCustomArmor(newArmor: NewCustomArmor) {
  return await db.transaction().execute(async (trx) => {
    const custom_armor = await trx
      .insertInto("custom_armor")
      .values(newArmor)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_armor;
  });
}

export async function deleteCustomArmor(id: string) {
  return await db.deleteFrom("custom_armor").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomArmor: CustomArmor = {
  id: "defaultArmorId",
  name: "默认自定义身体装备（缺省值）",
  def: 0,
  armorType: "Normal",
  enchantmentAttributesId: "",
  templateId: defaultArmor.id,
  refinement: 0,
  crystalList: [],
  extraDetails: "",

  updatedAt: new Date(),
  createdAt: new Date(),
  masterId: defaultAccount.id,
};
