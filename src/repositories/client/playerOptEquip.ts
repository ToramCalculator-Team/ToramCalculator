import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_option } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultOptEquip, OptEquip, OptEquipDic } from "./optEquip";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface PlayerOptEquip extends DataType<player_option> { 
    MainTable: Awaited<ReturnType<typeof findPlayerOptEquips>>[number]
    MainForm: player_option
}

export function playerOptEquipSubRelations(
  eb: ExpressionBuilder<DB, "player_option">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_option", "item.id", "_crystalToplayer_option.A")
        .whereRef("_crystalToplayer_option.B", "=", "player_option.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("special")
        .whereRef("special.itemId", "=", "player_option.templateId")
        .selectAll("special"),
    ).$notNull().as("template"),
  ];
}

export async function findPlayerOptEquipById(id: string) {
  return await db
    .selectFrom("player_option")
    .where("id", "=", id)
    .selectAll("player_option")
    .select((eb) => playerOptEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerOptEquips() {
  return await db
    .selectFrom("player_option")
    .selectAll("player_option")
    .execute();
}

export async function updatePlayerOptEquip(id: string, updateWith: PlayerOptEquip["Update"]) {
  return await db
    .updateTable("player_option")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function insertPlayerOptEquip(trx: Transaction<DB>, newOptEquip: PlayerOptEquip["Insert"]) {
  const player_option = await trx
    .insertInto("player_option")
    .values(newOptEquip)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_option;
}

export async function createPlayerOptEquip(newOptEquip: PlayerOptEquip["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const player_option = await trx
      .insertInto("player_option")
      .values(newOptEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_option;
  });
}

export async function deletePlayerOptEquip(id: string) {
  return await db.deleteFrom("player_option").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerOptEquip: PlayerOptEquip["Insert"] = {
  id: "defaultOptEquipId",
  name: "默认自定义特殊装备",
  refinement: 0,
  extraAbi: 0,
  templateId: defaultOptEquip.itemId,
  masterId: defaultAccount.id,
};
// Dictionary
export const PlayerOptEquipDic = (locale: Locale): ConvertToAllString<PlayerOptEquip["Insert"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义追加装备",
        id: "ID",
        name: "名称",
        refinement: "精炼值",
        extraAbi: "额外防御力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "自定义追加裝備",
        id: "ID",
        name: "名称",
        refinement: "精炼值",
        extraAbi: "額外防禦力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "en":
      return {
        selfName: "Player Armor",
        id: "ID",
        name: "Name",
        refinement: "Refinement",
        extraAbi: "Extra Defense",
        templateId: "Template ID",
        masterId: "Master ID",
      }
    case "ja":
      return {
        selfName: "カスタム追加装備",
        id: "ID",
        name: "名前",
        refinement: "精炼",
        extraAbi: "追加防御力",
        templateId: "テンプレートID",
        masterId: "所有者ID",
      }
      
  }
};

