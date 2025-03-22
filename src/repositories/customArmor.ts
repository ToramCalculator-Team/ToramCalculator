import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_armor } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { ArmorDic, defaultArmor } from "./armor";
import { defaultAccount } from "./account";
import { ArmorEncAttributesDic, defaultArmorEncAttributes } from "./armorEncAttrs";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Enums } from "./enums";

export type PlayerArmor = ModifyKeys<Awaited<ReturnType<typeof findPlayerArmorById>>, {
  type: Enums["Player_armorType"]
}>;
export type NewPlayerArmor = Insertable<player_armor>;
export type PlayerArmorUpdate = Updateable<player_armor>;

export function customArmorSubRelations(eb: ExpressionBuilder<DB, "player_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_armor", "item.id", "_crystalToplayer_armor.A")
        .whereRef("_crystalToplayer_armor.B", "=", "player_armor.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(eb.selectFrom("armor").whereRef("armor.itemId", "=", "player_armor.templateId").selectAll("armor"))
      .$notNull()
      .as("template"),
    jsonObjectFrom(
      eb
        .selectFrom("armor_enchantment_attributes")
        .whereRef("armor_enchantment_attributes.id", "=", "player_armor.enchantmentAttributesId")
        .selectAll("armor_enchantment_attributes"),
    ).$notNull().as("enchantmentAttributes"),
  ];
}

export async function findPlayerArmorById(id: string) {
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .select((eb) => customArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePlayerArmor(id: string, updateWith: PlayerArmorUpdate) {
  return await db.updateTable("player_armor").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createPlayerArmor(newArmor: NewPlayerArmor) {
  return await db.transaction().execute(async (trx) => {
    const player_armor = await trx.insertInto("player_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return player_armor;
  });
}

export async function deletePlayerArmor(id: string) {
  return await db.deleteFrom("player_armor").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerArmor: PlayerArmor = {
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
export const PlayerArmorDic = (locale: Locale): ConvertToAllString<PlayerArmor> => {
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
        selfName: "Player Armor",
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
