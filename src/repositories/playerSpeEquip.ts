import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_special } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface PlayerSpeEquip extends DataType<player_special> {
  MainTable: Awaited<ReturnType<typeof findPlayerSpeEquips>>[number];
  MainForm: player_special;
}

export function playerSpeEquipSubRelations(eb: ExpressionBuilder<DB, "player_special">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_special", "item.id", "_crystalToplayer_special.A")
        .whereRef("_crystalToplayer_special.B", "=", "player_special.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb.selectFrom("special").whereRef("special.itemId", "=", "player_special.templateId").selectAll("special"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerSpeEquipById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_special")
    .where("id", "=", id)
    .selectAll("player_special")
    .select((eb) => playerSpeEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerSpeEquips() {
  const db = await getDB();
  return await db.selectFrom("player_special").selectAll("player_special").execute();
}

export async function updatePlayerSpeEquip(id: string, updateWith: PlayerSpeEquip["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_special").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerSpeEquip(trx: Transaction<DB>, newSpeEquip: PlayerSpeEquip["Insert"]) {
  const player_special = await trx
    .insertInto("player_special")
    .values(newSpeEquip)
    .returningAll()
    .executeTakeFirstOrThrow();
  return player_special;
}

export async function createPlayerSpeEquip(newSpeEquip: PlayerSpeEquip["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_special = await trx
      .insertInto("player_special")
      .values(newSpeEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_special;
  });
}

export async function deletePlayerSpeEquip(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_special").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerSpeEquip: PlayerSpeEquip["Select"] = {
  id: "",
  name: "",
  extraAbi: 0,
  templateId: "",
  masterId: "",
};

// Dictionary
export const PlayerSpeEquipDic = (locale: Locale): ConvertToAllString<PlayerSpeEquip["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义追加装备",
        id: "ID",
        name: "名称",
        extraAbi: "额外防御力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "自定义追加裝備",
        id: "ID",
        name: "名称",
        extraAbi: "額外防禦力",
        templateId: "模板ID",
        masterId: "所有者ID",
      };
    case "en":
      return {
        selfName: "Player Armor",
        id: "ID",
        name: "Name",
        extraAbi: "Extra Defense",
        templateId: "Template ID",
        masterId: "Master ID",
      };
    case "ja":
      return {
        selfName: "カスタム追加装備",
        id: "ID",
        name: "名前",
        extraAbi: "追加防御力",
        templateId: "テンプレートID",
        masterId: "所有者ID",
      };
  }
};
