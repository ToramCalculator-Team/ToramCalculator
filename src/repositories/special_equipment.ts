import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, special_equipment } from "~/repositories/db/types";
import { statisticsSubRelations, createStatistics, defaultStatistics } from "./statistics";
import { createModifierList, defaultModifierList, modifierListSubRelations } from "./modifier_list";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, defaultCrystal } from "./crystal";

export type SpecialEquipment = Awaited<ReturnType<typeof findSpecialEquipmentById>>;
export type NewSpecialEquipment = Insertable<special_equipment>;
export type SpecialEquipmentUpdate = Updateable<special_equipment>;

export function specialEquipmentSubRelations(eb: ExpressionBuilder<DB, "special_equipment">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTospecial_equipment")
        .innerJoin("crystal", "_crystalTospecial_equipment.A", "crystal.id")
        .whereRef("_crystalTospecial_equipment.B", "=", "special_equipment.id")
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val(id))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "special_equipment.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifier_list")
        .whereRef("id", "=", "special_equipment.modifierListId")
        .selectAll("modifier_list")
        .select((subEb) => modifierListSubRelations(subEb, subEb.val(id))),
    ).as("modifierList"),
  ];
}

export async function findSpecialEquipmentById(id: string) {
  return await db
    .selectFrom("special_equipment")
    .where("id", "=", id)
    .selectAll("special_equipment")
    .select((eb) => specialEquipmentSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateSpecialEquipment(id: string, updateWith: SpecialEquipmentUpdate) {
  return await db
    .updateTable("special_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createSpecialEquipment(newSpecialEquipment: NewSpecialEquipment) {
  return await db.transaction().execute(async (trx) => {
    const special_equipment = await trx
      .insertInto("special_equipment")
      .values(newSpecialEquipment)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifierList = await createModifierList(defaultModifierList);
    const statistics = await createStatistics(defaultStatistics);
    return { ...special_equipment, modifierList, statistics };
  });
}

export async function deleteSpecialEquipment(id: string) {
  return await db.deleteFrom("special_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSpecialEquipment: SpecialEquipment = {
  id: "",
  name: "",
  crystalList: [defaultCrystal],
  modifierList: defaultModifierList,
  modifierListId: defaultModifierList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};

