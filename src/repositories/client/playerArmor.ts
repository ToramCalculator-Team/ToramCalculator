import { Expression, ExpressionBuilder, Insertable, Transaction, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_armor } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultArmor, Armor, ArmorDic } from "./armor";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface PlayerArmor extends DataType<player_armor> {
  MainTable: Awaited<ReturnType<typeof findPlayerArmors>>[number];
  MainForm: player_armor;
}

export function playerArmorSubRelations(eb: ExpressionBuilder<DB, "player_armor">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_armor", "item.id", "_crystalToplayer_armor.A")
        .whereRef("_crystalToplayer_armor.B", "=", "player_armor.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb.selectFrom("special").whereRef("special.itemId", "=", "player_armor.templateId").selectAll("special"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerArmorById(id: string) {
  return await db
    .selectFrom("player_armor")
    .where("id", "=", id)
    .selectAll("player_armor")
    .select((eb) => playerArmorSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerArmors() {
  return await db.selectFrom("player_armor").selectAll("player_armor").execute();
}

export async function updatePlayerArmor(id: string, updateWith: PlayerArmor["Update"]) {
  return await db.updateTable("player_armor").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerArmor(trx: Transaction<DB>, newArmor: PlayerArmor["Insert"]) {
  const player_armor = await trx.insertInto("player_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
  return player_armor;
}

export async function createPlayerArmor(newArmor: PlayerArmor["Insert"]) {
  return await db.transaction().execute(async (trx) => {
    const player_armor = await trx.insertInto("player_armor").values(newArmor).returningAll().executeTakeFirstOrThrow();
    return player_armor;
  });
}

export async function deletePlayerArmor(id: string) {
  return await db.deleteFrom("player_armor").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerArmor: PlayerArmor["Insert"] = {
  id: "defaultArmorId",
  name: "默认自定义特殊装备",
  extraAbi: 0,
  ability: "Normal",
  modifiers: [],
  refinement: 0,
  templateId: defaultArmor.itemId,
  masterId: defaultAccount.id,
};
// Dictionary
export const PlayerArmorDic = (locale: Locale): ConvertToAllString<PlayerArmor["Insert"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "玩家身体装备",
        id: "ID",
        name: "名称",
        ability: "防具类型",
        refinement: "精炼值",
        modifiers: "加成属性",
        extraAbi: "额外防御力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "玩家身體裝備",
        id: "ID",
        name: "名称",
        ability: "防具類型",
        refinement: "精炼值",
        modifiers: "加成屬性",
        extraAbi: "額外防禦力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "en":
      return {
        selfName: "Player Armor",
        id: "ID",
        name: "Name",
        ability: "Ability",
        refinement: "Refinement",
        modifiers: "Modifiers",
        extraAbi: "Extra Defense",
        templateId: "Template ID",
        masterId: "Master ID",
      };
    case "ja":
      return {
        selfName: "プレイヤー装備",
        id: "ID",
        name: "名前",
        ability: "防具タイプ",
        refinement: "精炼",
        modifiers: "加成属性",
        extraAbi: "追加防御力",
        templateId: "テンプレートID",
        masterId: "所有者ID",
      };
  }
};
