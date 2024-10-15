import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { crystal } from "~/repositories/db/types";
import { createStatistics, defaultStatistics, findStatisticsById } from "./statistics";
import { createModifiersList, defaultModifiersList, findModifiersListById } from "./modifiers_list";

export type Crystal = Awaited<ReturnType<typeof findCrystalById>>;
export type NewCrystal = Insertable<crystal>;
export type CrystalUpdate = Updateable<crystal>;

export async function findCrystalById(id: string) {
  const crystal = await db.selectFrom("crystal").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  const statistics = await findStatisticsById(crystal.statisticsId);
  const modifiersList = await findModifiersListById(crystal.modifiersListId);

  return { ...crystal, modifiersList, statistics };
}

export async function updateCrystal(id: string, updateWith: CrystalUpdate) {
  return await db.updateTable("crystal").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCrystal(newCrystal: NewCrystal) {
  return await db.transaction().execute(async (trx) => {
    const crystal = await trx.insertInto("crystal").values(newCrystal).returningAll().executeTakeFirstOrThrow();
    const modifiersList = await createModifiersList(defaultModifiersList);
    const statistics = await createStatistics(defaultStatistics);
    return { ...crystal, modifiersList, statistics };
  })
}

export async function deleteCrystal(id: string) {
  return await db.deleteFrom("crystal").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCrystal: Crystal = {
  id: "defaultCrystalId",
  name: "defaultCrystalName",
  crystalType: "GENERAL",
  front: 0,
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
