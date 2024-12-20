import { Insertable, Updateable } from "kysely";
import { db } from "./database";
import { weapon_enchantment_attributes } from "~/repositories/db/types";
import { defaultUser } from "./user";

export type WeaponEncAttributes = Awaited<ReturnType<typeof findEncAttributesById>>;
export type NewWeaponEncAttributes = Insertable<weapon_enchantment_attributes>;
export type WeaponEncAttributesUpdate = Updateable<weapon_enchantment_attributes>;

export async function findEncAttributesById(id: string) {
  return await db
    .selectFrom("weapon_enchantment_attributes")
    .where("id", "=", id)
    .selectAll("weapon_enchantment_attributes")
    .executeTakeFirstOrThrow();
}

export async function updateEncAttributes(id: string, updateWith: WeaponEncAttributesUpdate) {
  return await db
    .updateTable("weapon_enchantment_attributes")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createEncAttributes(newEncAttributes: NewWeaponEncAttributes) {
  return await db.transaction().execute(async (trx) => {
    const weapon_enchantment_attributes = await trx
      .insertInto("weapon_enchantment_attributes")
      .values(newEncAttributes)
      .returningAll()
      .executeTakeFirstOrThrow();
    return weapon_enchantment_attributes;
  });
}

export async function deleteEncAttributes(id: string) {
  return await db.deleteFrom("weapon_enchantment_attributes").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultWeaponEncAttributes: WeaponEncAttributes = {
  id: "defaultSelectEncAttributes",
  name: "defaultSelectEncAttributes",
  flow: [],
  extraDetails: "",
  dataSources: "",
  updatedAt: new Date(),
  createdAt: new Date(),
  statisticsId: "",
  updatedByAccountId: defaultUser.id,
  createdByAccountId: defaultUser.id
};
