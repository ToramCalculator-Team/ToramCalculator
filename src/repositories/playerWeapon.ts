import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_weapon, player_weapon } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Crystal, crystalSubRelations } from "./crystal";
import { defaultWeapons, Weapon, WeaponDic, weaponSubRelations } from "./weapon";
import { defaultAccount } from "./account";
import { defaultWeaponEncAttributes, WeaponEncAttrDic } from "./weaponEncAttrs";
import { ConvertToAllString, DataType, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { StatisticDic } from "./statistic";

export interface PlayerWeapon extends DataType<player_weapon, typeof find, typeof createAccount> {}

export function customWeaponSubRelations(eb: ExpressionBuilder<DB, "player_weapon">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_weapon", "item.id", "_crystalToplayer_weapon.A")
        .whereRef("_crystalToplayer_weapon.B", "=", "player_weapon.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .innerJoin("weapon", "item.id", "weapon.itemId")
        .whereRef("weapon.itemId", "=", "player_weapon.templateId")
        .select((subEb) => weaponSubRelations(subEb, subEb.val("weapon.itemId")))
        .selectAll("weapon"),
    )
      .$notNull()
      .as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("weapon_enchantment_attributes")
        .whereRef("weapon_enchantment_attributes.id", "=", "player_weapon.enchantmentAttributesId")
        .selectAll("weapon_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findPlayerWeaponById(id: string) {
  return await db
    .selectFrom("player_weapon")
    .where("id", "=", id)
    .selectAll("player_weapon")
    .select((eb) => customWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePlayerWeapon(id: string, updateWith: PlayerWeaponUpdate) {
  return await db.updateTable("player_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createPlayerWeapon(newWeapon: NewPlayerWeapon) {
  return await db.transaction().execute(async (trx) => {
    const player_weapon = await trx
      .insertInto("player_weapon")
      .values(newWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_weapon;
  });
}

export async function deletePlayerWeapon(id: string) {
  return await db.deleteFrom("player_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerWeapons: Record<"mainHand" | "subHand", PlayerWeapon> = {
  mainHand: {
    id: "defaultWeaponId",
    name: "默认自定义主手",
    extraAbi: 0,
    enchantmentAttributes: defaultWeaponEncAttributes,
    enchantmentAttributesId: defaultWeaponEncAttributes.id,
    template: defaultWeapons.OneHandSword,
    templateId: defaultWeapons.OneHandSword.id,
    refinement: 0,
    crystalList: [],
    masterId: defaultAccount.id,
    baseAbi: 0,
    stability: 0,
  },
  subHand: {
    id: "defaultWeaponId",
    name: "默认自定义副手",
    extraAbi: 0,
    enchantmentAttributes: defaultWeaponEncAttributes,
    enchantmentAttributesId: defaultWeaponEncAttributes.id,
    template: defaultWeapons.Shield,
    templateId: defaultWeapons.Shield.id,
    refinement: 0,
    crystalList: [],
    masterId: defaultAccount.id,
    baseAbi: 0,
    stability: 0,
  },
};

// Dictionary
export const PlayerWeaponDic = (locale: Locale): ConvertToAllString<PlayerWeapon> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        name: "名称",
        extraAbi: "额外基础攻击力",
        enchantmentAttributes: WeaponEncAttrDic(locale),
        enchantmentAttributesId: "附魔ID",
        template: WeaponDic(locale),
        templateId: "模板ID",
        refinement: "精炼值",
        crystalList: "锻晶",
        masterId: "所有者ID",
        baseAbi: "基础攻击力",
        stability: "稳定率",
        selfName: "自定义武器",
      };
    case "zh-TW":
      return {
        id: "ID",
        name: "名称",
        extraAbi: "額外基礎攻擊力",
        enchantmentAttributes: WeaponEncAttrDic(locale),
        enchantmentAttributesId: "附魔ID",
        template: WeaponDic(locale),
        templateId: "模板ID",
        refinement: "精炼值",
        crystalList: "鑄晶",
        masterId: "所有者ID",
        baseAbi: "基礎攻擊力",
        stability: "穩定率",
        selfName: "自定義武器",
      };
    case "en":
      return {
        id: "ID",
        name: "Name",
        extraAbi: "Extra Base Attack",
        enchantmentAttributes: WeaponEncAttrDic(locale),
        enchantmentAttributesId: "Enchantment Attributes ID",
        template: WeaponDic(locale),
        templateId: "Template ID",
        refinement: "Refinement",
        crystalList: "Crystals",
        masterId: "Master ID",
        baseAbi: "Base Attack",
        stability: "Stability",
        selfName: "Player Weapon",
      }
    case "ja":
      return {
        id: "ID",
        name: "名前",
        extraAbi: "追加基本攻撃力",
        enchantmentAttributes: WeaponEncAttrDic(locale),
        enchantmentAttributesId: "附魔属性ID",
        template: WeaponDic(locale),
        templateId: "テンプレートID",
        refinement: "精炼度",
        crystalList: "鑄石",
        masterId: "マスターID",
        baseAbi: "基本攻撃力",
        stability: "安定度",
        selfName: "カスタム武器",
      }
  }
};
