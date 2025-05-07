import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, npc } from "~/../db/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface Npc extends DataType<npc> {
  MainTable: Awaited<ReturnType<typeof findNpcs>>[number];
  MainForm: npc;
}

export function npcSubRelations(eb: ExpressionBuilder<DB, "npc">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("task").where("task.npcId", "=", id).selectAll("task")).as("tasks")];
}

export async function findNpcById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => npcSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findNpcs() {
  const db = await getDB();
  return await db.selectFrom("npc").selectAll("npc").execute();
}

export async function updateNpc(id: string, updateWith: Npc["Update"]) {
  const db = await getDB();
  return await db.updateTable("npc").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteNpc(id: string) {
  const db = await getDB();
  return await db.deleteFrom("npc").where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createNpc(trx: Transaction<DB>, data: Npc["Insert"]) {
  return await trx.insertInto("npc").values(data).returningAll().executeTakeFirstOrThrow();
}

export const defaultNpc: Npc["Select"] = {
  id: "",
  name: "",
  zoneId: "",
};

// Dictionary
export const NpcDic = (locale: Locale): ConvertToAllString<Npc["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "NPC",
        name: "名称",
        id: "ID",
        zoneId: "所属区域ID",
      };
    case "zh-TW":
      return {
        selfName: "NPC",
        name: "名称",
        id: "ID",
        zoneId: "所屬區域ID",
      };
    case "en":
      return {
        selfName: "NPC",
        name: "Name",
        id: "ID",
        zoneId: "Zone ID",
      };
    case "ja":
      return {
        selfName: "NPC",
        name: "名前",
        id: "ID",
        zoneId: "ゾーンID",
      };
  }
};
