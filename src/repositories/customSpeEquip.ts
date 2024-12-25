import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_special_equipment } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultSpeEquip } from "./speEquip";
import { defaultAccount } from "./account";

export type CustomSpeEquip = Awaited<ReturnType<typeof findCustomSpeEquipById>>;
export type NewCustomSpeEquip = Insertable<custom_special_equipment>;
export type CustomSpeEquipUpdate = Updateable<custom_special_equipment>;

export function customSpeEquipSubRelations(
  eb: ExpressionBuilder<DB, "custom_special_equipment">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_special_equipment")
        .innerJoin("crystal", "_crystalTocustom_special_equipment.A", "crystal.itemId")
        // .innerJoin("item", "crystal.itemId", "item.id")
        .where("_crystalTocustom_special_equipment.B", "=", id)
        .selectAll("crystal"),
      // .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id"))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("special_equipment")
        .whereRef("special_equipment.itemId", "=", "custom_special_equipment.templateId")
        .selectAll("special_equipment"),
    ).$notNull().as("template"),
  ];
}

export async function findCustomSpeEquipById(id: string) {
  return await db
    .selectFrom("custom_special_equipment")
    .where("id", "=", id)
    .selectAll("custom_special_equipment")
    .select((eb) => customSpeEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomSpeEquip(id: string, updateWith: CustomSpeEquipUpdate) {
  return await db
    .updateTable("custom_special_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createCustomSpeEquip(newSpeEquip: NewCustomSpeEquip) {
  return await db.transaction().execute(async (trx) => {
    const custom_special_equipment = await trx
      .insertInto("custom_special_equipment")
      .values(newSpeEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_special_equipment;
  });
}

export async function deleteCustomSpeEquip(id: string) {
  return await db.deleteFrom("custom_special_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomSpeEquip: CustomSpeEquip = {
  id: "defaultSpeEquipId",
  name: "默认自定义特殊装备（缺省值）",
  def: 0,
  template: defaultSpeEquip,
  templateId: defaultSpeEquip.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};
