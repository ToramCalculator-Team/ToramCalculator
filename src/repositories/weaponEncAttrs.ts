import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, weapon_enchantment_attributes } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultUser } from "./user";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic, statisticSubRelations } from "./statistic";

export type WeaponEncAttributes = Awaited<ReturnType<typeof findWeaponEncAttributesById>>;
export type NewWeaponEncAttributes = Insertable<weapon_enchantment_attributes>;
export type WeaponEncAttributesUpdate = Updateable<weapon_enchantment_attributes>;

export function weaponEncAttrsSubRelations(
  eb: ExpressionBuilder<DB, "weapon_enchantment_attributes">,
  id: Expression<string>,
) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .where("statistic.id", "=", "weapon_enchantment_attributes.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

export async function findWeaponEncAttributesById(id: string) {
  return await db
    .selectFrom("weapon_enchantment_attributes")
    .where("id", "=", id)
    .selectAll("weapon_enchantment_attributes")
    .select((eb) => weaponEncAttrsSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateWeaponEncAttributes(id: string, updateWith: WeaponEncAttributesUpdate) {
  return await db
    .updateTable("weapon_enchantment_attributes")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createWeaponEncAttributes(newWeaponEncAttributes: NewWeaponEncAttributes) {
  return await db.transaction().execute(async (trx) => {
    const weapon_enchantment_attributes = await trx
      .insertInto("weapon_enchantment_attributes")
      .values(newWeaponEncAttributes)
      .returningAll()
      .executeTakeFirstOrThrow();
    return weapon_enchantment_attributes;
  });
}

export async function deleteWeaponEncAttributes(id: string) {
  return await db.deleteFrom("weapon_enchantment_attributes").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultWeaponEncAttributes: WeaponEncAttributes = {
  id: "defaultWeaponEncAttributes",
  name: "默认武器附魔（缺省值）",
  flow: [],
  details: "",
  dataSources: "",
  updatedAt: new Date(),
  createdAt: new Date(),
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
  updatedByAccountId: defaultUser.id,
  createdByAccountId: defaultUser.id,
};
