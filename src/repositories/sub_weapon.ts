import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, sub_weapon } from "~/repositories/db/types";
import { statisticsSubRelations, createStatistics, defaultStatistics } from "./statistics";
import { createModifierList, defaultModifierList, modifierListSubRelations } from "./weaponEncAttrs";
import { jsonObjectFrom } from "kysely/helpers/postgres";

export type SubWeapon = Awaited<ReturnType<typeof findSubWeaponById>>;
export type NewSubWeapon = Insertable<sub_weapon>;
export type SubWeaponUpdate = Updateable<sub_weapon>;

export function subWeaponSubRelations(eb: ExpressionBuilder<DB, "sub_weapon">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "sub_weapon.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("statistics"),
    jsonObjectFrom(
      eb
        .selectFrom("modifier_list")
        .whereRef("id", "=", "sub_weapon.modifierListId")
        .selectAll("modifier_list")
        .select((subEb) => modifierListSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("modifierList"),
  ]
}

export async function findSubWeaponById(id: string) {
  return await db
    .selectFrom("sub_weapon")
    .where("id", "=", id)
    .selectAll("sub_weapon")
    .select((eb) => subWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateSubWeapon(id: string, updateWith: SubWeaponUpdate) {
  return await db.updateTable("sub_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createSubWeapon(newSubWeapon: NewSubWeapon) {
  return await db.transaction().execute(async (trx) => {
    const sub_weapon = await trx
      .insertInto("sub_weapon")
      .values(newSubWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    const modifierList = await createModifierList(defaultModifierList);
    const statistics = await createStatistics(defaultStatistics);
    return { ...sub_weapon, modifierList, statistics };
  });
}

export async function deleteSubWeapon(id: string) {
  return await db.deleteFrom("sub_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSubWeapon: SubWeapon = {
  id: "defaultSubWeaponId",
  name: "defaultSubWeaponName",
  subWeaponType: "MAGIC_DEVICE",
  baseAtk: 0,
  refinement: 0,
  stability: 0,
  element: "NO_ELEMENT",
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
