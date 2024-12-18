import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, additional_equipment } from "~/repositories/db/types";
import { statisticsSubRelations, createStatistics, defaultStatistics } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultAccount } from "./account";

export type AddEquip = Awaited<ReturnType<typeof findAddEquipById>>;
export type NewAddEquip = Insertable<additional_equipment>;
export type AddEquipUpdate = Updateable<additional_equipment>;

export function addEquipSubRelations(eb: ExpressionBuilder<DB, "additional_equipment">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_additional_equipmentTocrystal")
        .innerJoin("crystal", "_additional_equipmentTocrystal.B", "crystal.id")
        .where("_additional_equipmentTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.ref("crystal.id"))),
    ).as("defaultCrystalList"),
    jsonArrayFrom(
      eb
        .selectFrom("drop_item")
        .innerJoin("mob", "mob.id", "drop_item.dropById")
        .where("drop_item.addEquipId", "=", id)
        .select("mob.name"),
    ).as("dropBy"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("statistics.id", "=", "additional_equipment.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.ref("statistics.id"))),
    )
      .$notNull()
      .as("recipe"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("statistics.id", "=", "additional_equipment.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.ref("statistics.id"))),
    )
      .$notNull()
      .as("statistics"),
  ];
}

export async function findAddEquipById(id: string) {
  return await db
    .selectFrom("additional_equipment")
    .where("id", "=", id)
    .selectAll("additional_equipment")
    .select((eb) => addEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAddEquip(id: string, updateWith: AddEquipUpdate) {
  return await db
    .updateTable("additional_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createAddEquip(newAddEquip: NewAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const additional_equipment = await trx
      .insertInto("additional_equipment")
      .values(newAddEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    const statistics = await createStatistics(defaultStatistics);
    return { ...additional_equipment, statistics };
  });
}

export async function deleteAddEquip(id: string) {
  return await db.deleteFrom("additional_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAddEquip: AddEquip = {
  id: "defaultAddEquipId",
  name: "默认追加装备（缺省值）",
  baseDef: 0,
  availability: "permanent",
  acquisitionMethod: "Drop",
  modifiers: [],
  defaultCrystalList: [],
  dataSources: "",
  extraDetails: "",
  dropBy: [],

  updatedAt: new Date(),
  createdAt: new Date(),

  statistics: defaultStatistics,
  statisticsId: defaultStatistics.id,

  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};
