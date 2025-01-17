import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { itemSubRelations } from "./item";
import { defaultRecipes, RecipeDic, recipeSubRelations } from "./recipe";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { ConsumableType, I18nString } from "./enums";

export type Consumable = ModifyKeys<
  Awaited<ReturnType<typeof findConsumableById>>,
  {
    name: I18nString;
    type: ConsumableType;
  }
>;
export type NewConsumable = Insertable<item>;
export type ConsumableUpdate = Updateable<item>;

export function consumableSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.consumableId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findConsumableById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("consumable", "item.id", "consumable.itemId")
    .where("id", "=", id)
    .selectAll(["item", "consumable"])
    .select((eb) => consumableSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateConsumable(id: string, updateWith: ConsumableUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createConsumable(newConsumable: NewConsumable) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newConsumable).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteConsumable(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
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
export const defaultConsumables: Record<ConsumableType, Consumable> = {
  MaxHp: {
    name: {
      "zh-CN": "默认HP上限加成类消耗品",
      "zh-TW": "預設HP上限加成類消耗品",
      en: "defaultMaxHpModifierConsumable",
      ja: "デフォルトHP上限加成類消耗品",
    },
    id: "defaultMaxHpModifierConsumableId",
    itemId: "defaultMaxHpModifierConsumableId",
    type: "MaxHp",
    ...consumableShared,
    recipe: defaultRecipes.MaxHp,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.MaxHp,
    statisticId: defaultStatistics.MaxHp.id,
  },
  MaxMp: {
    name: {
      "zh-CN": "默认MP上限加成类消耗品",
      "zh-TW": "預設MP上限加成類消耗品",
      en: "defaultMaxMpModifierConsumable",
      ja: "デフォルトMP上限加成類消耗品",
    },
    id: "defaultMaxMpModifierConsumableId",
    itemId: "defaultMaxMpModifierConsumableId",
    type: "MaxMp",
    ...consumableShared,
    recipe: defaultRecipes.MaxMp,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.MaxMp,
    statisticId: defaultStatistics.MaxMp.id,
  },
  pAtk: {
    name: {
      "zh-CN": "默认物理攻击加成类消耗品",
      "zh-TW": "預設物理攻擊加成類消耗品",
      en: "defaultPhysicalAttackModifierConsumable",
      ja: "デフォルト物理攻撃加成類消耗品",
    },
    id: "defaultPhysicalAttackModifierConsumableId",
    itemId: "defaultPhysicalAttackModifierConsumableId",
    type: "pAtk",
    ...consumableShared,
    recipe: defaultRecipes.pAtk,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.pAtk,
    statisticId: defaultStatistics.pAtk.id,
  },
  mAtk: {
    name: {
      "zh-CN": "默认魔法攻击加成类消耗品",
      "zh-TW": "預設魔法攻擊加成類消耗品",
      en: "defaultMagicAttackModifierConsumable",
      ja: "デフォルト魔法攻撃加成類消耗品",
    },
    id: "defaultMagicAttackModifierConsumableId",
    itemId: "defaultMagicAttackModifierConsumableId",
    type: "mAtk",
    ...consumableShared,
    recipe: defaultRecipes.mAtk,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.mAtk,
    statisticId: defaultStatistics.mAtk.id,
  },
  Aspd: {
    name: {
      "zh-CN": "默认攻击速度加成类消耗品",
      "zh-TW": "預設攻擊速度加成類消耗品",
      en: "defaultAspdModifierConsumable",
      ja: "デフォルト攻撃速度加成類消耗品",
    },
    id: "defaultAspdModifierConsumableId",
    itemId: "defaultAspdModifierConsumableId",
    type: "Aspd",
    ...consumableShared,
    recipe: defaultRecipes.Aspd,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Aspd,
    statisticId: defaultStatistics.Aspd.id,
  },
  Cspd: {
    name: {
      "zh-CN": "默认咏唱速度加成消耗品",
      "zh-TW": "預設咏唱速度加成消耗品",
      en: "defaultCspdModifierConsumable",
      ja: "デフォルト咏唱速度加成消耗品",
    },
    id: "defaultCspdModifierConsumableId",
    itemId: "defaultCspdModifierConsumableId",
    type: "Cspd",
    ...consumableShared,
    recipe: defaultRecipes.Cspd,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Cspd,
    statisticId: defaultStatistics.Cspd.id,
  },
  Hit: {
    name: {
      "zh-CN": "默认命中加成类消耗品",
      "zh-TW": "預設命中加成類消耗品",
      en: "defaultHitModifierConsumable",
      ja: "デフォルト命中加成類消耗品",
    },
    id: "defaultHitModifierConsumableId",
    itemId: "defaultHitModifierConsumableId",
    type: "Hit",
    ...consumableShared,
    recipe: defaultRecipes.Hit,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Hit,
    statisticId: defaultStatistics.Hit.id,
  },
  Flee: {
    name: {
      "zh-CN": "默认回避加成类消耗品",
      "zh-TW": "預設回避加成類消耗品",
      en: "defaultFleeModifierConsumable",
      ja: "デフォルト回避加成類消耗品",
    },
    id: "defaultFleeModifierConsumableId",
    itemId: "defaultFleeModifierConsumableId",
    type: "Flee",
    ...consumableShared,
    recipe: defaultRecipes.Flee,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.Flee,
    statisticId: defaultStatistics.Flee.id,
  },
  EleStro: {
    name: {
      "zh-CN": "默认属性增强类消耗品",
      "zh-TW": "預設屬性增強類消耗品",
      en: "defaultEleStroConsumable",
      ja: "デフォルト属性強化類消耗品",
    },
    id: "defaultEleStroConsumableId",
    itemId: "defaultEleStroConsumableId",
    type: "EleStro",
    ...consumableShared,
    recipe: defaultRecipes.EleStro,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.EleStro,
    statisticId: defaultStatistics.EleStro.id,
  },
  EleRes: {
    name: {
      "zh-CN": "默认属性抗性类消耗品",
      "zh-TW": "預設屬性抗性類消耗品",
      en: "defaultEleResConsumable",
      ja: "デフォルト属性耐性類消耗品",
    },
    id: "defaultEleResConsumableId",
    itemId: "defaultEleResConsumableId",
    type: "EleRes",
    ...consumableShared,
    recipe: defaultRecipes.EleRes,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.EleRes,
    statisticId: defaultStatistics.EleRes.id,
  },
  pRes: {
    name: {
      "zh-CN": "默认物理抗性类消耗品",
      "zh-TW": "預設物理抗性類消耗品",
      en: "defaultPhysicalResistConsumable",
      ja: "デフォルト物理耐性類消耗品",
    },
    id: "defaultPhysicalResistConsumableId",
    itemId: "defaultPhysicalResistConsumableId",
    type: "pRes",
    ...consumableShared,
    recipe: defaultRecipes.pRes,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.pRes,
    statisticId: defaultStatistics.pRes.id,
  },
  mRes: {
    name: {
      "zh-CN": "默认魔法抗性类消耗品",
      "zh-TW": "預設魔法抗性類消耗品",
      en: "defaultMagicResistConsumable",
      ja: "デフォルト魔法耐性類消耗品",
    },
    id: "defaultMagicResistConsumableId",
    itemId: "defaultMagicResistConsumableId",
    type: "mRes",
    ...consumableShared,
    recipe: defaultRecipes.mRes,
    updatedByAccountId: defaultAccount.id,
    createdByAccountId: defaultAccount.id,
    statistic: defaultStatistics.mRes,
    statisticId: defaultStatistics.mRes.id,
  },
};

// Dictionary
export const ConsumableDic = (locale: Locale): ConvertToAllString<Consumable> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        itemId: "所属道具ID",
        type: "增益类型",
        effectDuration: "持续时间",
        effects: "效果",
        dataSources: "数据来源",
        details: "额外说明",
        dropBy: "掉落于怪物",
        rewardBy: "奖励于任务",
        recipe: RecipeDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        name: "名称",
        id: "ID",
        itemId: "所屬道具ID",
        type: "增益類型",
        effectDuration: "持續時間",
        effects: "效果",
        dataSources: "資料來源",
        details: "額外說明",
        dropBy: "掉落於怪物",
        rewardBy: "獎勵於任務",
        recipe: RecipeDic(locale),
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
        statistic: StatisticDic(locale),
        statisticId: "統計信息ID",
      };
    case "en":
      return {
        selfName: "Additional Equipment",
        name: "Name",
        id: "ID",
        itemId: "ItemId",
        type: "Type",
        effectDuration: "Effect Duration",
        effects: "Effects",
        dataSources: "Data Sources",
        details: "Details",
        dropBy: "Drop By",
        rewardBy: "Reward By",
        recipe: RecipeDic(locale),
        updatedByAccountId: "Updated By Account Id",
        createdByAccountId: "Created By Account Id",
        statistic: StatisticDic(locale),
        statisticId: "Statistic Id",
      };
    case "ja":
      return {
        selfName: "追加装備",
        name: "名前",
        id: "ID",
        itemId: "所属アイテムID",
        type: "効果タイプ",
        effectDuration: "効果時間",
        effects: "効果",
        dataSources: "データソース",
        details: "追加詳細",
        dropBy: "ドロップバイ",
        rewardBy: "報酬バイ",
        recipe: RecipeDic(locale),
        updatedByAccountId: "アカウントIDによって更新",
        createdByAccountId: "アカウントIDによって作成",
        statistic: StatisticDic(locale),
        statisticId: "統計ID",
      };
  }
};
