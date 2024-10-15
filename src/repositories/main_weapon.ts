import { Insertable, Selectable, Updateable } from "kysely";
import { db } from "./database";
import { main_weapon } from "~/repositories/db/types";
import { createStatistics, defaultStatistics } from "./statistics";
import { createModifiersList, defaultModifiersList } from "./modifiers_list";
import { defaultCrystal, NewCrystal } from "./crystal";

export type MainWeapon = Awaited<ReturnType<typeof findMainWeaponById>>;
export type NewMainWeapon = Insertable<main_weapon>;
export type MainWeaponUpdate = Updateable<main_weapon>;

export async function findMainWeaponById(id: string) {
  const main_weapon = await db.selectFrom("main_weapon").where("id", "=", id).selectAll().executeTakeFirstOrThrow();
  const modifiersList = await db.selectFrom("modifiers_list").where("id", "=", main_weapon.modifiersListId).selectAll().executeTakeFirst();
  const crystalList = await db
  .selectFrom("_crystalTomain_weapon")
  .innerJoin("crystal", "_crystalTomain_weapon.A", "crystal.id")
  .where("_crystalTomain_weapon.B", "=", main_weapon.id)
  .selectAll(["crystal"])
  .execute();
  const statistics = await db
    .selectFrom("statistics")
    .where("id", "=", main_weapon.statisticsId)
    .selectAll()
    .executeTakeFirst();
  
  return { ...main_weapon, modifiersList, crystalList, statistics };
}

export async function updateMainWeapon(id: string, updateWith: MainWeaponUpdate) {
  return await db.updateTable("main_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createMainWeapon(newMainWeapon: NewMainWeapon) {
  return await db.transaction().execute(async (trx) => {
    const main_weapon = await trx
      .insertInto("main_weapon")
      .values(newMainWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifiersList = await createModifiersList(defaultModifiersList);
    const statistics = await createStatistics(defaultStatistics);
    const crystalList: NewCrystal[] = [];
    return { ...main_weapon, modifiersList, crystalList, statistics };
  });
}

export async function deleteMainWeapon(id: string) {
  return await db.deleteFrom("main_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultMainWeapon: MainWeapon = {
  id: "defaultMainWeaponId",
  name: "defaultMainWeaponName",
  mainWeaponType: "MAGIC_DEVICE",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
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
  statisticsId: "",
};