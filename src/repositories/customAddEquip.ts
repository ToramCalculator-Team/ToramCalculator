import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_additional_equipment } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { AddEquipDic, defaultAddEquip } from "./addEquip";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type CustomAddEquip = Awaited<ReturnType<typeof findCustomAddEquipById>>;
export type NewCustomAddEquip = Insertable<custom_additional_equipment>;
export type CustomAddEquipUpdate = Updateable<custom_additional_equipment>;

export function customAddEquipSubRelations(
  eb: ExpressionBuilder<DB, "custom_additional_equipment">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalTocustom_additional_equipment", "item.id", "_crystalTocustom_additional_equipment.A")
        .whereRef("_crystalTocustom_additional_equipment.B", "=", "custom_additional_equipment.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("additional_equipment")
        .whereRef("additional_equipment.itemId", "=", "custom_additional_equipment.templateId")
        .selectAll("additional_equipment"),
    ).$notNull().as("template"),
  ];
}

export async function findCustomAddEquipById(id: string) {
  return await db
    .selectFrom("custom_additional_equipment")
    .where("id", "=", id)
    .selectAll("custom_additional_equipment")
    .select((eb) => customAddEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomAddEquip(id: string, updateWith: CustomAddEquipUpdate) {
  return await db
    .updateTable("custom_additional_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createCustomAddEquip(newAddEquip: NewCustomAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const custom_additional_equipment = await trx
      .insertInto("custom_additional_equipment")
      .values(newAddEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return custom_additional_equipment;
  });
}

export async function deleteCustomAddEquip(id: string) {
  return await db.deleteFrom("custom_additional_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultCustomAddEquip: CustomAddEquip = {
  id: "defaultAddEquipId",
  name: "默认自定义追加装备",
  def: 0,
  template: defaultAddEquip,
  templateId: defaultAddEquip.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};

// Dictionary
export const CustomAddEquipDic = (locale: Locale): ConvertToAllString<CustomAddEquip> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义追加装备",
        id: "ID",
        name: "名称",
        def: "防御力",
        template: AddEquipDic(locale),
        templateId: "模板ID",
        refinement: "精炼值",
        crystalList: "锻晶",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "自定义追加裝備",
        id: "ID",
        name: "名称",
        def: "防禦力",
        template: AddEquipDic(locale),
        templateId: "模板ID",
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
        template: AddEquipDic(locale),
        templateId: "Template ID",
        refinement: "Refinement",
        crystalList: "Crystals",
        masterId: "Master ID",
      }
    case "ja":
      return {
        selfName: "カスタム追加装備",
        id: "ID",
        name: "名前",
        def: "防御力",
        template: AddEquipDic(locale),
        templateId: "テンプレートID",
        refinement: "精炼度",
        crystalList: "クリスタル",
        masterId: "所有者ID",
      }
      
  }
};
