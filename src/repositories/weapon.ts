import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistics, StatisticDic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";
import { type Enums } from "./enums";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { mobSubRelations } from "./mob";

export type Weapon = ModifyKeys<
  Awaited<ReturnType<typeof findWeaponById>>,
  {
    type: Enums["WeaponType"];
    element: Enums["WeaponElementType"];
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

export async function findWeapons() {
  return await db
    .selectFrom("item")
    .innerJoin("weapon", "item.id", "weapon.itemId")
    .selectAll(["item", "weapon"])
    .select((eb) => weaponSubRelations(eb, eb.val("item.id")))
    .select((eb) => itemSubRelations(eb, eb.val("item.id")))
    .execute() as Weapon[];
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
export const defaultWeapons: Record<Enums["WeaponType"], Weapon> = {
  OneHandSword: {
    name: "defaultOneHandSword",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    elementType:"Normal",
    recipe: defaultRecipes.OneHandSword,
    statistic: defaultStatistics.OneHandSword,
    statisticId: defaultStatistics.OneHandSword.id,
    ...defaultWeaponShared,
  },
  TwoHandSword: {
    name: "defaultTwoHandSword",
    id: "defaultWeaponTwoHandSwordId",
    itemId: "defaultWeaponId",
    type: "TwoHandSword",
    elementType:"Normal",
    recipe: defaultRecipes.TwoHandSword,
    statistic: defaultStatistics.TwoHandSword,
    statisticId: defaultStatistics.TwoHandSword.id,
    ...defaultWeaponShared,
  },
  Bow: {
    name: "defaultBow",
    id: "defaultWeaponBowId",
    itemId: "defaultWeaponId",
    type: "Bow",
    elementType:"Normal",
    recipe: defaultRecipes.Bow,
    statistic: defaultStatistics.Bow,
    statisticId: defaultStatistics.Bow.id,
    ...defaultWeaponShared,
  },
  Bowgun: {
    name: "defaultBowgun",
    id: "defaultWeaponBowgunId",
    itemId: "defaultWeaponId",
    type: "Bowgun",
    elementType:"Normal",
    recipe: defaultRecipes.Bowgun,
    statistic: defaultStatistics.Bowgun,
    statisticId: defaultStatistics.Bowgun.id,
    ...defaultWeaponShared,
  },
  Rod: {
    name: "defaultRod",
    id: "defaultWeaponRodId",
    itemId: "defaultWeaponId",
    type: "Rod",
    elementType:"Normal",
    recipe: defaultRecipes.Rod,
    statistic: defaultStatistics.Rod,
    statisticId: defaultStatistics.Rod.id,
    ...defaultWeaponShared,
  },
  Magictool: {
    name: "defaultMagictool",
    id: "defaultWeaponMagictoolId",
    itemId: "defaultWeaponId",
    type: "Magictool",
    elementType:"Normal",
    recipe: defaultRecipes.Magictool,
    statistic: defaultStatistics.Magictool,
    statisticId: defaultStatistics.Magictool.id,
    ...defaultWeaponShared,
  },
  Knuckle: {
    name: "defaultKnuckle",
    id: "defaultWeaponKnuckleId",
    itemId: "defaultWeaponId",
    type: "Knuckle",
    elementType:"Normal",
    recipe: defaultRecipes.Knuckle,
    statistic: defaultStatistics.Knuckle,
    statisticId: defaultStatistics.Knuckle.id,
    ...defaultWeaponShared,
  },
  Halberd: {
    name: "defaultHalberd",
    id: "defaultWeaponHalberdId",
    itemId: "defaultWeaponId",
    type: "Halberd",
    elementType:"Normal",
    recipe: defaultRecipes.Halberd,
    statistic: defaultStatistics.Halberd,
    statisticId: defaultStatistics.Halberd.id,
    ...defaultWeaponShared,
  },
  Katana: {
    name: "defaultKatana",
    id: "defaultWeaponKatanaId",
    itemId: "defaultWeaponId",
    type: "Katana",
    elementType:"Normal",
    recipe: defaultRecipes.Katana,
    statistic: defaultStatistics.Katana,
    statisticId: defaultStatistics.Katana.id,
    ...defaultWeaponShared,
  },
  Arrow: {
    name: "defaultArrow",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    elementType:"Normal",
    recipe: defaultRecipes.Arrow,
    statistic: defaultStatistics.Arrow,
    statisticId: defaultStatistics.Arrow.id,
    ...defaultWeaponShared,
  },
  ShortSword: {
    name: "defaultShortSword",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    elementType:"Normal",
    recipe: defaultRecipes.ShortSword,
    statistic: defaultStatistics.ShortSword,
    statisticId: defaultStatistics.ShortSword.id,
    ...defaultWeaponShared,
  },
  NinjutsuScroll: {
    name: "defaultNinjutsuScroll",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    elementType:"Normal",
    recipe: defaultRecipes.NinjutsuScroll,
    statistic: defaultStatistics.NinjutsuScroll,
    statisticId: defaultStatistics.NinjutsuScroll.id,
    ...defaultWeaponShared,
  },
  Shield: {
    name: "defaultShield",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    elementType:"Normal",
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
        elementType:"固有元素属性",
        recipe: "配方",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "创建者ID",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "武器",
        name: "名称",
        id: "ID",
        baseAbi: "基礎攻擊力",
        stability: "穩定率",
        defaultCrystals: "預設鑄晶",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
        modifiers: "屬性",
        dataSources: "資料來源",
        details: "額外說明",
        dropBy: "掉落於",
        rewardBy: "獎勵於",
        itemId: "道具ID",
        type: "武器類型",
        elementType:"固有元素屬性",
        recipe: "配方",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "創建者ID",
        statistic: StatisticDic(locale),
        statisticId: "統計資料ID",
      };
    case "en":
      return {
        selfName: "weapon",
        name: "name",
        id: "id",
        baseAbi: "baseAbi",
        stability: "stability",
        defaultCrystals: "defaultCrystals",
        colorA: "colorA",
        colorB: "colorB",
        colorC: "colorC",
        modifiers: "modifiers",
        dataSources: "dataSources",
        details: "details",
        dropBy: "dropBy",
        rewardBy: "rewardBy",
        itemId: "itemId",
        type: "type",
        elementType:"elementType",
        recipe: "recipe",
        updatedByAccountId: "updatedByAccountId",
        createdByAccountId: "createdByAccountId",
        statistic: StatisticDic(locale),
        statisticId: "statisticId",
      };
    case "ja":
      return {
        selfName: "武器",
        name: "名称",
        id: "ID",
        baseAbi: "基本攻撃力",
        stability: "安定率",
        defaultCrystals: "デフォルトクリスタル",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
        modifiers: "属性",
        dataSources: "データソース",
        details: "詳細",
        dropBy: "ドロップ",
        rewardBy: "報酬",
        itemId: "アイテムID",
        type: "武器タイプ",
        elementType:"固有元素属性",
        recipe: "レシピ",
        updatedByAccountId: "更新者ID",
        createdByAccountId: "作成者ID",
        statistic: StatisticDic(locale),
        statisticId: "統計情報ID",
      };
  }
};