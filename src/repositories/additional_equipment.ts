import { Expression, ExpressionBuilder, Insertable, NotNull, Updateable } from "kysely";
import { db } from "./database";
import { DB, additional_equipment } from "~/repositories/db/types";
import { statisticsSubRelations, createStatistics, defaultStatistics } from "./statistics";
import { createModifiersList, defaultModifiersList, modifiersListSubRelations } from "./modifiers_list";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations, defaultCrystal } from "./crystal";

export type AdditionalEquipment = Awaited<ReturnType<typeof findAdditionalEquipmentById>>;
export type NewAdditionalEquipment = Insertable<additional_equipment>;
export type AdditionalEquipmentUpdate = Updateable<additional_equipment>;

export function additionalEquipmentSubRelations(eb: ExpressionBuilder<DB, "additional_equipment">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_additional_equipmentTocrystal")
        .innerJoin("crystal", "_additional_equipmentTocrystal.B", "crystal.id")
        .whereRef("_additional_equipmentTocrystal.A", "=", "additional_equipment.id")
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val(id))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "additional_equipment.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifiers_list")
        .whereRef("id", "=", "additional_equipment.modifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("modifiersList"),
  ];
}

export async function findAdditionalEquipmentById(id: string) {
  return await db
    .selectFrom("additional_equipment")
    .where("id", "=", id)
    .selectAll("additional_equipment")
    .select((eb) => additionalEquipmentSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAdditionalEquipment(id: string, updateWith: AdditionalEquipmentUpdate) {
  return await db
    .updateTable("additional_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createAdditionalEquipment(newAdditionalEquipment: NewAdditionalEquipment) {
  return await db.transaction().execute(async (trx) => {
    const additional_equipment = await trx
      .insertInto("additional_equipment")
      .values(newAdditionalEquipment)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifiersList = await createModifiersList(defaultModifiersList);
    const statistics = await createStatistics(defaultStatistics);
    return { ...additional_equipment, modifiersList, statistics };
  });
}

export async function deleteAdditionalEquipment(id: string) {
  return await db.deleteFrom("additional_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAdditionalEquipment: AdditionalEquipment = {
  id: "defaultAdditionalEquipmentId",
  name: "defaultAdditionalEquipmentName",
  refinement: 0,
  crystalList: [defaultCrystal],
  modifiersList: defaultModifiersList,
  modifiersListId: defaultModifiersList.id,
  dataSources: "",
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,
};
