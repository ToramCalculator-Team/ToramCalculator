import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";
import { WeaponType, I18nString, ElementType } from "./enums";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { mobSubRelations } from "./mob";

export type Weapon = ModifyKeys<
  Awaited<ReturnType<typeof findWeaponById>>,
  {
    name: I18nString;
    type: WeaponType;
    element: ElementType
  }
>;
export type NewWeapon = Insertable<item>;
export type WeaponUpdate = Updateable<item>;

export function weaponSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
      jsonArrayFrom(
        eb
          .selectFrom("mob")
          .innerJoin("drop_item","drop_item.dropById","mob.id")
          .where("drop_item.itemId", "=", id)
          .selectAll("mob")
          .select((subEb) => mobSubRelations(subEb, subEb.val("mob.id"))),
      ).as("dropBy"),
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTocustom_weapon")
        .innerJoin("crystal", "_crystalTocustom_weapon.A", "crystal.itemId")
        .where("_crystalTocustom_weapon.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.consumableId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findWeaponById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "item.id", "weapon.itemId")
    .where("id", "=", id)
    .selectAll(["item", "weapon"])
    .select((eb) => weaponSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateWeapon(id: string, updateWith: WeaponUpdate) {
  return await db.updateTable("item").set(updateWith).where("item.id", "=", id).returningAll().executeTakeFirst();
}

export async function createWeapon(newWeapon: NewWeapon) {
  return await db.transaction().execute(async (trx) => {
    const item = await trx.insertInto("item").values(newWeapon).returningAll().executeTakeFirstOrThrow();
    return item;
  });
}

export async function deleteWeapon(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// 武器公共属性
const defaultWeaponShared = {
  baseAbi: 0,
  stability: 0,
  defaultCrystals: [],
  colorA: 0,
  colorB: 0,
  colorC: 0,
  modifiers: [],
  dataSources: "",
  details: "",
  dropBy: [],
  rewardBy: [],
  updatedAt: new Date(),
  createdAt: new Date(),
  updatedByAccountId: defaultAccount.id,
  createdByAccountId: defaultAccount.id,
};

// default
export const defaultWeapons: Record<WeaponType, Weapon> = {
  OneHandSword: {
    name: {
      "zh-CN": "默认单手剑",
      "zh-TW": "默认單手劍",
      en: "defaultOneHandSword",
      ja: "デフォルトの片手剣",
    },
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    element:"Normal",
    recipe: defaultRecipes.OneHandSword,
    statistic: defaultStatistics.OneHandSword,
    statisticId: defaultStatistics.OneHandSword.id,
    ...defaultWeaponShared,
  },
  TwoHandSword: {
    name: {
      "zh-CN": "默认双手剑",
      "zh-TW": "默认雙手劍",
      en: "defaultTwoHandSword",
      ja: "デフォルトの両手剣",
    },
    id: "defaultWeaponTwoHandSwordId",
    itemId: "defaultWeaponId",
    type: "TwoHandSword",
    element:"Normal",
    recipe: defaultRecipes.TwoHandSword,
    statistic: defaultStatistics.TwoHandSword,
    statisticId: defaultStatistics.TwoHandSword.id,
    ...defaultWeaponShared,
  },
  Bow: {
    name: {
      "zh-CN": "默认弓",
      "zh-TW": "默认弓",
      en: "defaultBow",
      ja: "デフォルトの弓",
    },
    id: "defaultWeaponBowId",
    itemId: "defaultWeaponId",
    type: "Bow",
    element:"Normal",
    recipe: defaultRecipes.Bow,
    statistic: defaultStatistics.Bow,
    statisticId: defaultStatistics.Bow.id,
    ...defaultWeaponShared,
  },
  Bowgun: {
    name: {
      "zh-CN": "默认弩",
      "zh-TW": "默认弩",
      en: "defaultBowgun",
      ja: "デフォルトの弩弓",
    },
    id: "defaultWeaponBowgunId",
    itemId: "defaultWeaponId",
    type: "Bowgun",
    element:"Normal",
    recipe: defaultRecipes.Bowgun,
    statistic: defaultStatistics.Bowgun,
    statisticId: defaultStatistics.Bowgun.id,
    ...defaultWeaponShared,
  },
  Rod: {
    name: {
      "zh-CN": "默认杖",
      "zh-TW": "默认杖",
      en: "defaultRod",
      ja: "デフォルトの杖",
    },
    id: "defaultWeaponRodId",
    itemId: "defaultWeaponId",
    type: "Rod",
    element:"Normal",
    recipe: defaultRecipes.Rod,
    statistic: defaultStatistics.Rod,
    statisticId: defaultStatistics.Rod.id,
    ...defaultWeaponShared,
  },
  Magictool: {
    name: {
      "zh-CN": "默认魔导具",
      "zh-TW": "默认魔導具",
      en: "defaultMagictool",
      ja: "デフォルトの魔道具"
    },
    id: "defaultWeaponMagictoolId",
    itemId: "defaultWeaponId",
    type: "Magictool",
    element:"Normal",
    recipe: defaultRecipes.Magictool,
    statistic: defaultStatistics.Magictool,
    statisticId: defaultStatistics.Magictool.id,
    ...defaultWeaponShared,
  },
  Knuckle: {
    name: {
      "zh-CN": "默认拳套",
      "zh-TW": "默认拳套",
      en: "defaultKnuckle",
      ja: "デフォルトの拳套"
    },
    id: "defaultWeaponKnuckleId",
    itemId: "defaultWeaponId",
    type: "Knuckle",
    element:"Normal",
    recipe: defaultRecipes.Knuckle,
    statistic: defaultStatistics.Knuckle,
    statisticId: defaultStatistics.Knuckle.id,
    ...defaultWeaponShared,
  },
  Halberd: {
    name: {
      "zh-CN": "默认枪",
      "zh-TW": "默认槍",
      en: "defaultHalberd",
      ja: "デフォルトの槍"
    },
    id: "defaultWeaponHalberdId",
    itemId: "defaultWeaponId",
    type: "Halberd",
    element:"Normal",
    recipe: defaultRecipes.Halberd,
    statistic: defaultStatistics.Halberd,
    statisticId: defaultStatistics.Halberd.id,
    ...defaultWeaponShared,
  },
  Katana: {
    name: {
      "zh-CN": "默认拔刀剑",
      "zh-TW": "默认拔刀剣",
      en: "defaultKatana",
      ja: "デフォルトの拔刀剣"
    },
    id: "defaultWeaponKatanaId",
    itemId: "defaultWeaponId",
    type: "Katana",
    element:"Normal",
    recipe: defaultRecipes.Katana,
    statistic: defaultStatistics.Katana,
    statisticId: defaultStatistics.Katana.id,
    ...defaultWeaponShared,
  },
  Arrow: {
    name: {
      "zh-CN": "默认箭矢",
      "zh-TW": "默认箭矢",
      en: "defaultArrow",
      ja: "デフォルトの矢"
    },
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    element:"Normal",
    recipe: defaultRecipes.Arrow,
    statistic: defaultStatistics.Arrow,
    statisticId: defaultStatistics.Arrow.id,
    ...defaultWeaponShared,
  },
  ShortSword: {
    name: {
      "zh-CN": "默认小刀",
      "zh-TW": "默认小刀",
      en: "defaultShortSword",
      ja: "デフォルトの短剣"
    },
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    element:"Normal",
    recipe: defaultRecipes.ShortSword,
    statistic: defaultStatistics.ShortSword,
    statisticId: defaultStatistics.ShortSword.id,
    ...defaultWeaponShared,
  },
  NinjutsuScroll: {
    name: {
      "zh-CN": "默认忍术卷轴",
      "zh-TW": "默认忍術卷軸",
      en: "defaultNinjutsuScroll",
      ja: "デフォルトの忍術卷軸"
    },
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    element:"Normal",
    recipe: defaultRecipes.NinjutsuScroll,
    statistic: defaultStatistics.NinjutsuScroll,
    statisticId: defaultStatistics.NinjutsuScroll.id,
    ...defaultWeaponShared,
  },
  Shield: {
    name: {
      "zh-CN": "默认盾牌",
      "zh-TW": "默认盾牌",
      en: "defaultShield",
      ja: "デフォルトの盾"
    },
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    element:"Normal",
    recipe: defaultRecipes.Shield,
    statistic: defaultStatistics.Shield,
    statisticId: defaultStatistics.Shield.id,
    ...defaultWeaponShared,
  },
};

// Dictionary
export const WeaponDic = (locale: Locale): ConvertToAllString<Weapon> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "武器",
        name: "名称",
        id: "ID",
        baseAbi: "基础攻击力",
        stability: "稳定率",
        defaultCrystals: "默认锻晶",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
        modifiers: "属性",
        dataSources: "数据来源",
        details: "额外说明",
        dropBy: "掉落于",
        rewardBy: "奖励于",
        itemId: "道具ID",
        type: "武器类型",
        element:"固有元素属性",
        recipe: "配方",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "",
        name: "",
        id: "ID",
        baseAbi: "",
        stability: "",
        defaultCrystals: "",
        colorA: "",
        colorB: "",
        colorC: "",
        modifiers: "",
        dataSources: "",
        details: "",
        dropBy: "",
        rewardBy: "",
        itemId: "",
        type: "",
        element:"",
        recipe: "",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
      };
    case "en":
      return {
        selfName: "",
        name: "",
        id: "ID",
        baseAbi: "",
        stability: "",
        defaultCrystals: "",
        colorA: "",
        colorB: "",
        colorC: "",
        modifiers: "",
        dataSources: "",
        details: "",
        dropBy: "",
        rewardBy: "",
        itemId: "",
        type: "",
        element:"",
        recipe: "",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
      };
    case "ja":
      return {
        selfName: "",
        name: "",
        id: "ID",
        baseAbi: "",
        stability: "",
        defaultCrystals: "",
        colorA: "",
        colorB: "",
        colorC: "",
        modifiers: "",
        dataSources: "",
        details: "",
        dropBy: "",
        rewardBy: "",
        itemId: "",
        type: "",
        element:"",
        recipe: "",
        updatedByAccountId: "",
        createdByAccountId: "",
        statistic: StatisticDic(locale),
        statisticId: "",
      };
  }
};