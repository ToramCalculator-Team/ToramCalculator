import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, zone } from "~/../db/kysely/kyesely";
import { jsonArrayFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";
import { mobSubRelations } from "./mob";

export interface Zone extends DataType<zone> {
  MainTable: Awaited<ReturnType<typeof findZones>>[number];
  MainForm: zone;
}

export function zoneSubRelations(eb: ExpressionBuilder<DB, "zone">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_mobTozone")
        .innerJoin("mob", "_mobTozone.A", "mob.id")
        .where("_mobTozone.B", "=", id)
        .select((eb) => mobSubRelations(eb, eb.val("mob.id")))
        .selectAll("mob"),
    ).as("mobs"),
    jsonArrayFrom(eb.selectFrom("npc").where("npc.zoneId", "=", id).selectAll("npc")).as("npcs"),
  ];
}

export async function findZoneById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .select((eb) => zoneSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findZones() {
  const db = await getDB();
  return await db.selectFrom("zone").selectAll("zone").execute();
}

export async function updateZone(id: string, updateWith: Zone["Update"]) {
  const db = await getDB();
  return await db.updateTable("zone").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteZone(id: string) {
  const db = await getDB();
  return await db.deleteFrom("zone").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultZone: Zone["Select"] = {
  id: "",
  name: "",
  linkZone: [],
  rewardNodes: 0,
  activityId: null,
  addressId: "",
};

// Dictionary
export const ZoneDic = (locale: Locale): ConvertToAllString<Zone["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "区域",
        name: "名称",
        id: "ID",
        linkZone: "链接区域",
        rewardNodes: "道具点数量",
        activityId: "所属活动ID",
        addressId: "所属地图Id",
      };
    case "zh-TW":
      return {
        selfName: "區域",
        name: "名称",
        id: "ID",
        linkZone: "連接區域",
        rewardNodes: "道具點數數量",
        activityId: "所屬活動ID",
        addressId: "所屬地圖Id",
      };
    case "en":
      return {
        selfName: "Zone",
        name: "Name",
        id: "ID",
        linkZone: "Link Zone",
        rewardNodes: "Reward Nodes",
        activityId: "Activity ID",
        addressId: "Address ID",
      };
    case "ja":
      return {
        selfName: "ゾーン",
        name: "名前",
        id: "ID",
        linkZone: "リンクゾーン",
        rewardNodes: "報酬ノード数",
        activityId: "アクティビティID",
        addressId: "アドレスID",
      };
  }
};
