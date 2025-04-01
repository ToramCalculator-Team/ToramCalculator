import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { db } from "./database";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { consumable, DB, item, recipe, recipe_ingredient } from "../../../db/clientDB/kysely/kyesely";
import { ConsumableType } from "../../../db/clientDB/kysely/enums";

export interface Consumable extends DataType<consumable> { 
    MainTable: Awaited<ReturnType<typeof findConsumables>>[number]
    MainForm: consumable
}

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [];
}

export async function findConsumableByItemId(id: string) {
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .where("item.id", "=", id)
    .selectAll("consumable")
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findConsumables() {
  return await db
    .selectFrom("consumable")
    .innerJoin("item", "item.id", "consumable.itemId")
    .selectAll(["item", "consumable"])
    .execute();
}

export async function updateConsumable(id: string, updateWith: Consumable["Update"]) {
  return await db.updateTable("consumable").set(updateWith).where("itemId", "=", id).returningAll().executeTakeFirst();
}

export async function insertConsumable(trx: Transaction<DB>, newConsumable: Consumable["Insert"]) {
  const consumable = await db.insertInto("consumable").values(newConsumable).returningAll().executeTakeFirstOrThrow();
  return consumable;
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(
  newConsumable: item & {
    consumable: consumable;
    repice: recipe & {
      ingredients: recipe_ingredient[];
    };
  },
) {
  return await db.transaction().execute(async (trx) => {

  });
}

const consumableShared = {
  effectDuration: 0,
  effects: [],
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
};

// default
export const defaultConsumables: Record<ConsumableType, Consumable["Select"]> = {
  MaxHp: {
    itemId: "defaultMaxHpModifierConsumableId",
    type: "MaxHp",
    ...consumableShared,
  },
  MaxMp: {
    itemId: "defaultMaxMpModifierConsumableId",
    type: "MaxMp",
    ...consumableShared,
  },
  pAtk: {
    itemId: "defaultPhysicalAttackModifierConsumableId",
    type: "pAtk",
    ...consumableShared,
  },
  mAtk: {
    itemId: "defaultMagicAttackModifierConsumableId",
    type: "mAtk",
    ...consumableShared,
  },
  Aspd: {
    itemId: "defaultAspdModifierConsumableId",
    type: "Aspd",
    ...consumableShared,
  },
  Cspd: {
    itemId: "defaultCspdModifierConsumableId",
    type: "Cspd",
    ...consumableShared,
  },
  Hit: {
    itemId: "defaultHitModifierConsumableId",
    type: "Hit",
    ...consumableShared,
  },
  Flee: {
    itemId: "defaultFleeModifierConsumableId",
    type: "Flee",
    ...consumableShared,
  },
  EleStro: {
    itemId: "defaultEleStroConsumableId",
    type: "EleStro",
    ...consumableShared,
  },
  EleRes: {
    itemId: "defaultEleResConsumableId",
    type: "EleRes",
    ...consumableShared,
  },
  pRes: {
    itemId: "defaultPhysicalResistConsumableId",
    type: "pRes",
    ...consumableShared,
  },
  mRes: {
    itemId: "defaultMagicResistConsumableId",
    type: "mRes",
    ...consumableShared,
  },
};

// Dictionary
export const ConsumableDic = (locale: Locale): ConvertToAllString<Consumable["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        itemId: "所属道具ID",
        type: "增益类型",
        effectDuration: "持续时间",
        effects: "效果",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        itemId: "所屬道具ID",
        type: "增益類型",
        effectDuration: "持續時間",
        effects: "效果",
      };
    case "en":
      return {
        selfName: "Additional Equipment",
        itemId: "ItemId",
        type: "Type",
        effectDuration: "Effect Duration",
        effects: "Effects",
      };
    case "ja":
      return {
        selfName: "追加装備",
        itemId: "所属アイテムID",
        type: "効果タイプ",
        effectDuration: "効果時間",
        effects: "効果",
      };
  }
};
