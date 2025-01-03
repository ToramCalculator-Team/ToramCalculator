import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, combo } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type Combo = Awaited<ReturnType<typeof findComboById>>;
export type NewCombo = Insertable<combo>;
export type ComboUpdate = Updateable<combo>;

export function comboSubRelations(eb: ExpressionBuilder<DB, "combo">, id: Expression<string>) {
  return [];
}

export async function findComboById(id: string) {
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCombo(id: string, updateWith: ComboUpdate) {
  return await db.updateTable("combo").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCombo(newCombo: NewCombo) {
  return await db.transaction().execute(async (trx) => {
    const combo = await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
    return combo;
  });
}

export async function deleteCombo(id: string) {
  return await db.deleteFrom("combo").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCombo: Combo = {
  id: "defaultComboId",
  name: "defaultComboName",
  combo:{},
};

// Dictionary
export const ComborDic = (locale: Locale): ConvertToAllString<Combo> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "防具装备",
        name: "名称",
        id: "ID",
        combo: "连击序列",
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        name: "名称",
        id: "ID",
        combo: "連擊序列",
      };
    case "en":
      return {
        selfName: "Armor",
        name: "Name",
        id: "ID",
        combo: "Combo",
      };
    case "ja":
      return {
        selfName: "鎧",
        name: "名前",
        id: "ID",
        combo: "コンボ",
      };
  }
};
