import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, avatar } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { Enums } from "./enums";

export type Avatar = ModifyKeys<Awaited<ReturnType<typeof findAvatarById>>, {
  type: Enums["AvatarType"];
}>;
export type NewAvatar = Insertable<avatar>;
export type AvatarUpdate = Updateable<avatar>;

export function avatarSubRelations(eb: ExpressionBuilder<DB, "avatar">, id: Expression<string>) {
  return [];
}

export async function findAvatarById(id: string) {
  return await db
    .selectFrom("avatar")
    .where("id", "=", id)
    .selectAll("avatar")
    .select((eb) => avatarSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateAvatar(id: string, updateWith: AvatarUpdate) {
  return await db.updateTable("avatar").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteAvatar(id: string) {
  return await db.deleteFrom("avatar").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultAvatar: Avatar = {
  id: "defaultAvatarId",
  name: "defaultAvatar",
  type: "Top",
  modifiers: [],
  playerId: "",
};

// Dictionary
export const AvatarDic = (locale: Locale): ConvertToAllString<Avatar> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "防具装备",
        name: "名称",
        id: "ID",
        type: "位置",
        modifiers: "属性",
        playerId: "所属玩家ID",
      };
    case "zh-TW":
      return {
        selfName: "防具裝備",
        name: "名称",
        id: "ID",
        type: "位置",
        modifiers: "屬性",
        playerId: "所屬玩家ID",
      };
    case "en":
      return {
        selfName: "Armor",
        name: "Name",
        id: "ID",
        type: "Type",
        modifiers: "Modifiers",
        playerId: "Player ID",
      };
    case "ja":
      return {
        selfName: "鎧",
        name: "名前",
        id: "ID",
        type: "位置",
        modifiers: "属性",
        playerId: "所属プレイヤーID",
      };
  }
};
