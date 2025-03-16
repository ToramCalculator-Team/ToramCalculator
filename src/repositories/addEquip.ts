import { Expression, ExpressionBuilder } from "kysely";
import { db, typeDB } from "./database";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { itemSubRelations } from "./item";
import {  recipeSubRelations } from "./recipe";
import { crystalSubRelations } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType, ModifyKeys } from "./untils";
import { mobSubRelations } from "./mob";
import { createId } from '@paralleldrive/cuid2';

export interface AddEquip extends DataType<typeDB["additional_equipment"], typeof findAddEquipById, typeof createAddEquip> {}

export function addEquipSubRelations(eb: ExpressionBuilder<typeDB, "item">, id: Expression<string>) {
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
        .selectFrom("_additional_equipmentTocrystal")
        .innerJoin("crystal", "_additional_equipmentTocrystal.B", "crystal.itemId")
        .where("_additional_equipmentTocrystal.A", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
    jsonObjectFrom(
      eb
        .selectFrom("recipe")
        .where("recipe.addEquipId", "=", id)
        .select((eb) => recipeSubRelations(eb, eb.val("recipe.id"))),
    ).as("recipe"),
  ];
}

export async function findAddEquipById(id: string) {
  return await db
    .selectFrom("item")
    .innerJoin("additional_equipment", "item.id", "additional_equipment.itemId")
    .where("id", "=", id)
    .selectAll(["item", "additional_equipment"])
    .select((eb) => addEquipSubRelations(eb, eb.val(id)))
    .select((eb) => itemSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAddEquip(id: string, updateWith: AddEquip["Update"]) {
  return await db.updateTable("additional_equipment").set(updateWith).where("additional_equipment.itemId", "=", id).returningAll().executeTakeFirst();
}

export async function createAddEquip(newAddEquip: AddEquip["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const statistic = await trx.insertInto("statistic").values({
      id: createId(),
      updatedAt: new Date(),
      createdAt: new Date(),
      usageTimestamps: [],
      viewTimestamps: [],
    }).returningAll().executeTakeFirstOrThrow();
    const item = await trx.insertInto("item").values({
      id: createId(),
      type: "AddEquip",
      statisticId: statistic.id,
    }).returningAll().executeTakeFirstOrThrow();
    const addEquip = await trx.insertInto("additional_equipment").values({
      ...newAddEquip,
      itemId: item.id,
    }).returningAll().executeTakeFirstOrThrow();
    return addEquip;
  });
}

export async function deleteAddEquip(id: string) {
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultAddEquip: AddEquip["Insert"] = {
  name: "defaultAddEquip",
  modifiers: [],
  itemId: "defaultAddEquipId",
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
  dataSources: "",
  details: "",
};

// Dictionary
export const AddEquipDic = (locale: Locale): ConvertToAllString<AddEquip["Insert"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        modifiers: "属性",
        itemId: "所属道具ID",
        baseDef: "防御力",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
        dataSources: "数据来源",
        details: "额外说明",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        name: "名称",
        modifiers: "屬性",
        itemId: "所屬道具ID",
        baseDef: "防禦力",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
        dataSources: "資料來源",
        details: "額外說明",
      };
    case "en":
      return {
        selfName: "Additional Equipment",
        name: "Name",
        modifiers: "Modifiers",
        itemId: "ItemId",
        baseDef: "Base Def",
        colorA: "Color A",
        colorB: "Color B",
        colorC: "Color C",
        dataSources: "Data Sources",
        details: "Details",
      };
    case "ja":
      return {
        selfName: "追加装備",
        name: "名前",
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        baseDef: "防御力",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
        dataSources: "データソース",
        details: "追加詳細",
      };
  }
};
