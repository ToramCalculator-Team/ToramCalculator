import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_special_equipment } from "~/../db/clientDB/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { defaultSpeEquip, SpeEquip, SpeEquipDic } from "./speEquip";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type PlayerSpeEquip = Awaited<ReturnType<typeof findPlayerSpeEquipById>>;
export type NewPlayerSpeEquip = Insertable<player_special_equipment>;
export type PlayerSpeEquipUpdate = Updateable<player_special_equipment>;

export function customSpeEquipSubRelations(
  eb: ExpressionBuilder<DB, "player_special_equipment">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_special_equipment", "item.id", "_crystalToplayer_special_equipment.A")
        .whereRef("_crystalToplayer_special_equipment.B", "=", "player_special_equipment.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("special_equipment")
        .whereRef("special_equipment.itemId", "=", "player_special_equipment.templateId")
        .selectAll("special_equipment"),
    ).$notNull().as("template"),
  ];
}

export async function findPlayerSpeEquipById(id: string) {
  return await db
    .selectFrom("player_special_equipment")
    .where("id", "=", id)
    .selectAll("player_special_equipment")
    .select((eb) => customSpeEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePlayerSpeEquip(id: string, updateWith: PlayerSpeEquipUpdate) {
  return await db
    .updateTable("player_special_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createPlayerSpeEquip(newSpeEquip: NewPlayerSpeEquip) {
  return await db.transaction().execute(async (trx) => {
    const player_special_equipment = await trx
      .insertInto("player_special_equipment")
      .values(newSpeEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_special_equipment;
  });
}

export async function deletePlayerSpeEquip(id: string) {
  return await db.deleteFrom("player_special_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerSpeEquip: PlayerSpeEquip = {
  id: "defaultSpeEquipId",
  name: "默认自定义特殊装备",
  def: 0,
  template: defaultSpeEquip,
  templateId: defaultSpeEquip.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};
// Dictionary
export const PlayerSpeEquipDic = (locale: Locale): ConvertToAllString<PlayerSpeEquip> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义追加装备",
        id: "ID",
        name: "名称",
        def: "防御力",
        template: SpeEquipDic(locale),
        templateId: "模板ID",
        refinement: "精炼值",
        crystalList: "锻晶",
        masterId: "所有者ID",
      };
    case "zh-TW":
      return {
        selfName: "自定义追加裝備",
        id: "ID",
        name: "名称",
        def: "防禦力",
        template: SpeEquipDic(locale),
        templateId: "模板ID",
        refinement: "精炼值",
        crystalList: "鑄晶",
        masterId: "所有者ID",
      };
    case "en":
      return {
        selfName: "Player Armor",
        id: "ID",
        name: "Name",
        def: "Def",
        template: SpeEquipDic(locale),
        templateId: "Template ID",
        refinement: "Refinement",
        crystalList: "Crystals",
        masterId: "Master ID",
      }
    case "ja":
      return {
        selfName: "カスタム追加装備",
        id: "ID",
        name: "名前",
        def: "防御力",
        template: SpeEquipDic(locale),
        templateId: "テンプレートID",
        refinement: "精炼度",
        crystalList: "クリスタル",
        masterId: "所有者ID",
      }
      
  }
};

