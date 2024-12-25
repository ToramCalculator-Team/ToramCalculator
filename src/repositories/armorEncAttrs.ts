import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { armor_enchantment_attributes, DB } from "~/repositories/db/types";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic, statisticSubRelations } from "./statistic";
import { defaultAccount } from "./account";

export type ArmorEncAttributes = Awaited<ReturnType<typeof findArmorEncAttributesById>>;
export type NewArmorEncAttributes = Insertable<armor_enchantment_attributes>;
export type ArmorEncAttributesUpdate = Updateable<armor_enchantment_attributes>;

export function armorEncAttrsSubRelations(eb: ExpressionBuilder<DB, "armor_enchantment_attributes">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .where("statistic.id", "=", "armor_enchantment_attributes.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val(id))),
    ).$notNull().as("statistic")
  ];
}

export async function findArmorEncAttributesById(id: string) {
  return await db
    .selectFrom("armor_enchantment_attributes")
    .where("id", "=", id)
    .selectAll("armor_enchantment_attributes")
    .select((eb) => armorEncAttrsSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateArmorEncAttributes(id: string, updateWith: ArmorEncAttributesUpdate) {
  return await db
    .updateTable("armor_enchantment_attributes")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createArmorEncAttributes(newArmorEncAttributes: NewArmorEncAttributes) {
  return await db.transaction().execute(async (trx) => {
    const armor_enchantment_attributes = await trx
      .insertInto("armor_enchantment_attributes")
      .values(newArmorEncAttributes)
      .returningAll()
      .executeTakeFirstOrThrow();
    return armor_enchantment_attributes;
  });
}

export async function deleteArmorEncAttributes(id: string) {
  return await db.deleteFrom("armor_enchantment_attributes").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultArmorEncAttributes: ArmorEncAttributes = {
  id: "defaultArmorEncAttributes",
  name: "默认防具附魔（缺省值）",
  flow: [],
  details: "",
  dataSources: "",
  updatedAt: new Date(),
  createdAt: new Date(),
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};
