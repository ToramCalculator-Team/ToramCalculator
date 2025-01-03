import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";
import { ModifyKeys } from "./untils";
import { WikiString } from "./enums";

export type SpeEquip = ModifyKeys<Awaited<ReturnType<typeof findSpeEquipById>>, {
  name: WikiString
}>;
export type NewSpeEquip = Insertable<item>;
export type SpeEquipUpdate = Updateable<item>;

export function speEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_special_equipment")
        .innerJoin("crystal", "_crystalTocustom_special_equipment.A", "crystal.itemId")
        .where("_crystalTocustom_special_equipment.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("dropBy"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.speEquipId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findSpeEquipById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("special_equipment", "item.id", "special_equipment.itemId")
    .where("id", "=", id)
    .selectAll(["item", "special_equipment"])
    .select((eb) => speEquipSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateSpeEquip(id: string, updateWith: SpeEquipUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createSpeEquip(newSpeEquip: NewSpeEquip) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newSpeEquip).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteSpeEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultSpeEquip: SpeEquip = {
  name: {
    "zh-CN": "默认特殊装备（缺省值）",
    "zh-TW": "默认特殊裝備（缺省值）",
    en: "defaultSpeEquip",
    ja: "デフォルトの特殊装備",
  },
  id: "defaultSpeEquipId",
  modifiers: [],
  itemId: "defaultSpeEquipId",
  baseDef: 0,
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  recipe: defaultRecipes.speEquip,
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
};
