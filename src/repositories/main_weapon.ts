import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, main_weapon } from "~/repositories/db/types";
import { statisticsSubRelations, createStatistics, defaultStatistics } from "./statistics";
import { createModifiersList, defaultModifiersList, modifiersListSubRelations } from "./modifiers_list";
import { crystalSubRelations, defaultCrystal, NewCrystal } from "./crystal";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";

export type MainWeapon = Awaited<ReturnType<typeof findMainWeaponById>>;
export type NewMainWeapon = Insertable<main_weapon>;
export type MainWeaponUpdate = Updateable<main_weapon>;

export function mainWeaponSubRelations(eb: ExpressionBuilder<DB, "main_weapon">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTomain_weapon")
        .innerJoin("crystal", "_crystalTomain_weapon.A", "crystal.id")
        .whereRef("_crystalTomain_weapon.B", "=", "main_weapon.id")
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val(id))),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "main_weapon.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifiers_list")
        .whereRef("id", "=", "main_weapon.modifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("modifiersList"),
  ]
}

export async function findMainWeaponById(id: string) {
  return await db
    .selectFrom("main_weapon")
    .where("id", "=", id)
    .selectAll("main_weapon")
    .select((eb) => mainWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
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
