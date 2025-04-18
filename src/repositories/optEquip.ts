import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";
import { DB, option } from "~/../db/kysely/kyesely";

export interface OptEquip extends DataType<option> {
  MainTable: Awaited<ReturnType<typeof findOptEquips>>[number];
  MainForm: option;
}

export function optEquipSubRelations(eb: ExpressionBuilder<DB, "item">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_crystalTooption")
        .innerJoin("crystal", "_crystalTooption.A", "crystal.itemId")
        .where("_crystalTooption.B", "=", id)
        .selectAll("crystal")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("crystal.itemId"))),
    ).as("defaultCrystals"),
  ];
}

export async function findOptEquipById(id: string) {
  const db = await getDB();
  const optEquip = await db.selectFrom("option").where("itemId", "=", id).selectAll().executeTakeFirstOrThrow();
  return optEquip;
}

export async function findOptEquips() {
  const db = await getDB();
  const optEquips = await db.selectFrom("option").selectAll().execute();
  return optEquips;
}

export async function updateOptEquip(id: string, updateWith: OptEquip["Update"]) {
  const db = await getDB();
  return await db
    .updateTable("option")
    .set(updateWith)
    .where("option.itemId", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createOptEquip(newOptEquip: OptEquip["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {});
}

export async function deleteOptEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("item").where("item.id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultOptEquip: OptEquip["Select"] = {
  modifiers: [],
  itemId: "",
  baseDef: 0,
  colorA: 0,
  colorB: 0,
  colorC: 0,
};

// Dictionary
export const OptEquipDic = (locale: Locale): ConvertToAllString<OptEquip["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        modifiers: "属性",
        itemId: "所属道具ID",
        baseDef: "防御力",
        colorA: "颜色A",
        colorB: "颜色B",
        colorC: "颜色C",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        modifiers: "屬性",
        itemId: "所屬道具ID",
        baseDef: "防禦力",
        colorA: "顏色A",
        colorB: "顏色B",
        colorC: "顏色C",
      };
    case "en":
      return {
        selfName: "Additional Equipment",
        modifiers: "Modifiers",
        itemId: "ItemId",
        baseDef: "Base Def",
        colorA: "Color A",
        colorB: "Color B",
        colorC: "Color C",
      };
    case "ja":
      return {
        selfName: "追加装備",
        modifiers: "補正項目",
        itemId: "所属アイテムID",
        baseDef: "防御力",
        colorA: "色A",
        colorB: "色B",
        colorC: "色C",
      };
  }
};
