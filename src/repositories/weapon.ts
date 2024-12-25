import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, item } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultStatistic } from "./statistic";
import { defaultAccount } from "./account";
import { crystalSubRelations } from "./crystal";
import { itemSubRelations } from "./item";
import { defaultRecipes, recipeSubRelations } from "./recipe";
import { WeaponType } from "./enums";
import { ModifyKeys } from "./untils";

export type Weapon = ModifyKeys<
  Awaited<ReturnType<typeof findWeaponById>>,
  {
    type: WeaponType;
  }
>;
export type NewWeapon = Insertable<item>;
export type WeaponUpdate = Updateable<item>;

export function weaponSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
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
    name: "默认单手剑（缺省值）",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    recipe: defaultRecipes.OneHandSword,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  TwoHandSword: {
    name: "默认大剑（缺省值）",
    id: "defaultWeaponTwoHandSwordId",
    itemId: "defaultWeaponId",
    type: "TwoHandSword",
    recipe: defaultRecipes.TwoHandSword,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Bow: {
    name: "默认弓（缺省值）",
    id: "defaultWeaponBowId",
    itemId: "defaultWeaponId",
    type: "Bow",
    recipe: defaultRecipes.Bow,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Bowgun: {
    name: "默认弩（缺省值）",
    id: "defaultWeaponBowgunId",
    itemId: "defaultWeaponId",
    type: "Bowgun",
    recipe: defaultRecipes.Bowgun,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Rod: {
    name: "默认杖（缺省值）",
    id: "defaultWeaponRodId",
    itemId: "defaultWeaponId",
    type: "Rod",
    recipe: defaultRecipes.Rod,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Magictool: {
    name: "默认魔导具（缺省值）",
    id: "defaultWeaponMagictoolId",
    itemId: "defaultWeaponId",
    type: "Magictool",
    recipe: defaultRecipes.Magictool,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Knuckle: {
    name: "默认拳套（缺省值）",
    id: "defaultWeaponKnuckleId",
    itemId: "defaultWeaponId",
    type: "Knuckle",
    recipe: defaultRecipes.Knuckle,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Halberd: {
    name: "默认枪（缺省值）",
    id: "defaultWeaponHalberdId",
    itemId: "defaultWeaponId",
    type: "Halberd",
    recipe: defaultRecipes.Halberd,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Katana: {
    name: "默认拔刀（缺省值）",
    id: "defaultWeaponKatanaId",
    itemId: "defaultWeaponId",
    type: "Katana",
    recipe: defaultRecipes.Katana,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Arrow: {
    name: "默认箭（缺省值）",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    recipe: defaultRecipes.Arrow,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  ShortSword: {
    name: "默认小刀（缺省值）",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    recipe: defaultRecipes.ShortSword,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  NinjutsuScroll: {
    name: "默认卷轴（缺省值）",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    recipe: defaultRecipes.NinjutsuScroll,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
  Shield: {
    name: "默认盾（缺省值）",
    id: "defaultWeaponOneHandSwordId",
    itemId: "defaultWeaponId",
    type: "OneHandSword",
    recipe: defaultRecipes.Shield,
    statistic: defaultStatistic,
    statisticId: defaultStatistic.id,
    ...defaultWeaponShared,
  },
};
