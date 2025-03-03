import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_armor } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { ArmorDic, defaultArmor } from "./armor";
import { defaultAccount } from "./account";
import { ArmorEncAttributesDic, defaultArmorEncAttributes } from "./armorEncAttrs";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Enums } from "./enums";

export type CustomArmor = ModifyKeys<Awaited<ReturnType<typeof findCustomArmorById>>, {
  type: Enums["Custom_armorType"]
}>;
export type NewCustomArmor = Insertable<custom_armor>;
export type CustomArmorUpdate = Updateable<custom_armor>;

export function customArmorSubRelations(eb: ExpressionBuilder<DB, "custom_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalTocustom_armor", "item.id", "_crystalTocustom_armor.A")
        .whereRef("_crystalTocustom_armor.B", "=", "custom_armor.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(eb.selectFrom("armor").whereRef("armor.itemId", "=", "custom_armor.templateId").selectAll("armor"))
      .$notNull()
      .as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("armor_enchantment_attributes")
        .whereRef("armor_enchantment_attributes.id", "=", "custom_armor.enchantmentAttributesId")
        .selectAll("armor_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findCustomArmorById(id: string) {
  return await db
    .selectFrom("custom_armor")
    .where("id", "=", id)
    .selectAll("custom_armor")
    .select((eb) => customArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomArmor(id: string, updateWith: CustomArmorUpdate) {
  return await db.updateTable("custom_armor").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCustomArmor(newArmor: NewCustomArmor) {
  return await db.transaction().execute(async (trx) => {
    const custom_armor = await trx.insertInto("custom_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return custom_armor;
  });
}

export async function deleteCustomArmor(id: string) {
  return await db.deleteFrom("custom_armor").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomArmor: CustomArmor = {
  id: "defaultArmorId",
  name: "默认自定义防具",
  def: 0,
  template: defaultArmor,
  templateId: defaultArmor.id,
  type: "Normal",
  enchantmentAttributes: defaultArmorEncAttributes,
  enchantmentAttributesId: defaultArmorEncAttributes.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};

// Dictionary
export const CustomArmorDic = (locale: Locale): ConvertToAllString<CustomArmor> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义防具",
        id: "ID",
        name: "名称",
        def: "防御力",
        template: ArmorDic(locale),
        templateId: "模板ID",
        type: "防具类型",
        enchantmentAttributes: ArmorEncAttributesDic(locale),
        enchantmentAttributesId: "附魔ID",
        refinement: "精炼值",
        crystalList: "锻晶",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "自定义防具",
        id: "ID",
        name: "名称",
        def: "防禦力",
        template: ArmorDic(locale),
        templateId: "模板ID",
        type: "防具類型",
        enchantmentAttributes: ArmorEncAttributesDic(locale),
        enchantmentAttributesId: "附魔ID",
        refinement: "精炼值",
        crystalList: "鑄晶",
        masterId: "所有者ID",
      };
    case "en":
      return {
        selfName: "Custom Armor",
        id: "ID",
        name: "Name",
        def: "Def",
        template: ArmorDic(locale),
        templateId: "Template ID",
        type: "Armor Type",
        enchantmentAttributes: ArmorEncAttributesDic(locale),
        enchantmentAttributesId: "Enchantment Attributes ID",
        refinement: "Refinement",
        crystalList: "Crystals",
        masterId: "Master ID",
      }
    case "ja":
      return {
        selfName: "カスタム防具",
        id: "ID",
        name: "名前",
        def: "防御力",
        template: ArmorDic(locale),
        templateId: "テンプレートID",
        type: "防具タイプ",
        enchantmentAttributes: ArmorEncAttributesDic(locale),
        enchantmentAttributesId: "附魔属性ID",
        refinement: "精炼度",
        crystalList: "クリスタル",
        masterId: "所有者ID",
      }
      
  }
};
