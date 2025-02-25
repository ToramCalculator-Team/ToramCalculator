import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_weapon } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Crystal, crystalSubRelations } from "./crystal";
import { defaultWeapons, Weapon, WeaponDic, weaponSubRelations } from "./weapon";
import { defaultAccount } from "./account";
import { defaultWeaponEncAttributes, WeaponEncAttrDic } from "./weaponEncAttrs";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { StatisticDic } from "./statistic";

export type CustomWeapon = ModifyKeys<
  Awaited<ReturnType<typeof findCustomWeaponById>>,
  {
    crystalList: Crystal[];
    template: Weapon;
  }
>;
export type NewCustomWeapon = Insertable<custom_weapon>;
export type CustomWeaponUpdate = Updateable<custom_weapon>;

export function customWeaponSubRelations(eb: ExpressionBuilder<DB, "custom_weapon">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalTocustom_weapon", "item.id", "_crystalTocustom_weapon.A")
        .whereRef("_crystalTocustom_weapon.B", "=", "custom_weapon.templateId")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll("crystal"),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .innerJoin("weapon", "item.id", "weapon.itemId")
        .whereRef("weapon.itemId", "=", "custom_weapon.templateId")
        .select((subEb) => weaponSubRelations(subEb, subEb.val("weapon.itemId")))
        .selectAll("weapon"),
    )
      .$notNull()
      .as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("weapon_enchantment_attributes")
        .whereRef("weapon_enchantment_attributes.id", "=", "custom_weapon.enchantmentAttributesId")
        .selectAll("weapon_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findCustomWeaponById(id: string) {
  return await db
    .selectFrom("custom_weapon")
    .where("id", "=", id)
    .selectAll("custom_weapon")
    .select((eb) => customWeaponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomWeapon(id: string, updateWith: CustomWeaponUpdate) {
  return await db.updateTable("custom_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCustomWeapon(newWeapon: NewCustomWeapon) {
  return await db.transaction().execute(async (trx) => {
    const custom_weapon = await trx
      .insertInto("custom_weapon")
      .values(newWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_weapon;
  });
}

export async function deleteCustomWeapon(id: string) {
  return await db.deleteFrom("custom_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomWeapons: Record<"mainHand" | "subHand", CustomWeapon> = {
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
export const CustomWeaponDic = (locale: Locale): ConvertToAllString<CustomWeapon> => {
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
        selfName: "Custom Weapon",
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
