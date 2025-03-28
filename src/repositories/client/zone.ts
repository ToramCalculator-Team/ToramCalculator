import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, zone } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { mobSubRelations } from "./mob";

export type Zone = ModifyKeys<Awaited<ReturnType<typeof findZoneById>>, {
}>;
export type NewZone = Insertable<zone>;
export type ZoneUpdate = Updateable<zone>;

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
    jsonArrayFrom(
      eb.selectFrom("npc").where("npc.zoneId", "=", id).selectAll("npc"),
    ).as("npcs"),
  ];
}

export async function findZoneById(id: string) {
  return await db
    .selectFrom("zone")
    .where("id", "=", id)
    .selectAll("zone")
    .select((eb) => zoneSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateZone(id: string, updateWith: ZoneUpdate) {
  return await db.updateTable("zone").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteZone(id: string) {
  return await db.deleteFrom("zone").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultZone: Zone = {
  id: "defaultZoneId",
  name: "defaultZone",
  linkZone: [],
  rewardNodes: 0,
  activityId: null,
  addressId: "",
  mobs: [],
  npcs: [],
};

// Dictionary
export const ZoneDic = (locale: Locale): ConvertToAllString<Zone> => {
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
        mobs: "此区域的怪物",
        npcs: "此区域的NPC",
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
        mobs: "此區域的怪物",
        npcs: "此區域的NPC",
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
        mobs: "Mobs",
        npcs: "NPCs",
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
        mobs: "モブ",
        npcs: "NPC",
      };
  }
};
