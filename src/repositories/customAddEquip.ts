import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_additional_equipment } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultAddEquip } from "./addEquip";
import { defaultAccount } from "./account";

export type CustomAddEquip = Awaited<ReturnType<typeof findCustomAddEquipById>>;
export type NewCustomAddEquip = Insertable<custom_additional_equipment>;
export type CustomAddEquipUpdate = Updateable<custom_additional_equipment>;

export function customAddEquipSubRelations(
  eb: ExpressionBuilder<DB, "custom_additional_equipment">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_additional_equipment")
        .innerJoin("crystal", "_crystalTocustom_additional_equipment.A", "crystal.itemId")
        // .innerJoin("item", "crystal.itemId", "item.id")
        .where("_crystalTocustom_additional_equipment.B", "=", id)
        .selectAll("crystal"),
      // .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id"))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("additional_equipment")
        .whereRef("additional_equipment.itemId", "=", "custom_additional_equipment.templateId")
        .selectAll("additional_equipment"),
    ).$notNull().as("template"),
  ];
}

export async function findCustomAddEquipById(id: string) {
  return await db
    .selectFrom("custom_additional_equipment")
    .where("id", "=", id)
    .selectAll("custom_additional_equipment")
    .select((eb) => customAddEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomAddEquip(id: string, updateWith: CustomAddEquipUpdate) {
  return await db
    .updateTable("custom_additional_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createCustomAddEquip(newAddEquip: NewCustomAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const custom_additional_equipment = await trx
      .insertInto("custom_additional_equipment")
      .values(newAddEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_additional_equipment;
  });
}

export async function deleteCustomAddEquip(id: string) {
  return await db.deleteFrom("custom_additional_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomAddEquip: CustomAddEquip = {
  id: "defaultAddEquipId",
  name: "默认自定义追加装备（缺省值）",
  def: 0,
  template: defaultAddEquip,
  templateId: defaultAddEquip.id,
  refinement: 0,
  crystalList: [],
  extraDetails: "",

  updatedAt: new Date(),
  createdAt: new Date(),
  masterId: defaultAccount.id,
};
