import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, npc } from "~/repositories/db/types";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString } from "./untils";
import { Locale } from "~/locales/i18n";

export type Npc = Awaited<ReturnType<typeof findNpcById>>;
export type NewNpc = Insertable<npc>;
export type NpcUpdate = Updateable<npc>;

export function npcSubRelations(eb: ExpressionBuilder<DB, "npc">, id: Expression<string>) {
  return [jsonArrayFrom(eb.selectFrom("task").where("task.npcId", "=", id).selectAll("task")).as("tasks")];
}

export async function findNpcById(id: string) {
  return await db
    .selectFrom("npc")
    .where("id", "=", id)
    .selectAll("npc")
    .select((eb) => npcSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateNpc(id: string, updateWith: NpcUpdate) {
  return await db.updateTable("npc").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteNpc(id: string) {
  return await db.deleteFrom("npc").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultNpc: Npc = {
  id: "defaultNpcId",
  name: "默认NPC（缺省值）",
  imageId: "",
  zoneId: "",
  tasks: [],
};

// Dictionary
export const NpcDic = (locale: Locale): ConvertToAllString<Npc> => {
  switch (locale) {
    case "zh-CN":
    case "zh-HK":
      return {
        selfName: "NPC",
        name: "名称",
        id: "ID",
        imageId: "图像ID",
        zoneId: "所属区域ID",
        tasks: "任务列表",
      };
    case "zh-TW":
      return {
        selfName: "NPC",
        name: "名称",
        id: "ID",
        imageId: "圖像ID",
        zoneId: "所屬區域ID",
        tasks: "任務列表",
      };
    case "en":
    case "en-US":
    case "en-GB":
      return {
        selfName: "NPC",
        name: "Name",
        id: "ID",
        imageId: "Image ID",
        zoneId: "Zone ID",
        tasks: "Tasks",
      };
    case "ja":
      return {
        selfName: "NPC",
        name: "名前",
        id: "ID",
        imageId: "イメージID",
        zoneId: "ゾーンID",
        tasks: "タスク",
      };
  }
};
