import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, combo } from "~/../db/kysely/kyesely";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface Combo extends DataType<combo> {
  MainTable: Awaited<ReturnType<typeof findCombos>>[number];
  MainForm: combo;
}

export function comboSubRelations(eb: ExpressionBuilder<DB, "combo">, id: Expression<string>) {
  return [];
}

export async function findComboById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("combo")
    .where("id", "=", id)
    .selectAll("combo")
    .select((eb) => comboSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findCombos() {
  const db = await getDB();
  return await db.selectFrom("combo").selectAll("combo").execute();
}

export async function updateCombo(id: string, updateWith: Combo["Update"]) {
  const db = await getDB();
  return await db.updateTable("combo").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertCombo(trx: Transaction<DB>, newCombo: Combo["Insert"]) {
  return await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
}

export async function createCombo(newCombo: Combo["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const combo = await trx.insertInto("combo").values(newCombo).returningAll().executeTakeFirstOrThrow();
    return combo;
  });
}

export async function deleteCombo(id: string) {
  const db = await getDB();
  return await db.deleteFrom("combo").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCombo: Combo["Select"] = {
  id: "",
  name: "",
  disable: true,
  characterId: "",
};

// Dictionary
export const ComborDic = (locale: Locale): ConvertToAllString<Combo["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "连击",
        name: "名称",
        id: "ID",
        disable: "是否开启",
        characterId: "角色ID",
      };
    case "zh-TW":
      return {
        selfName: "連擊",
        name: "名称",
        id: "ID",
        disable: "是否開啟",
        characterId: "角色ID",
      };
    case "en":
      return {
        selfName: "Combo",
        name: "Name",
        id: "ID",
        disable: "Disable",
        characterId: "Character ID",
      };
    case "ja":
      return {
        selfName: "コンボ",
        name: "名前",
        id: "ID",
        disable: "無効",
        characterId: "キャラクターID",
      };
  }
};
