import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, player_additional_equipment } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { AddEquipDic, defaultAddEquip } from "./addEquip";
import { defaultAccount } from "./account";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type PlayerAddEquip = Awaited<ReturnType<typeof findPlayerAddEquipById>>;
export type NewPlayerAddEquip = Insertable<player_additional_equipment>;
export type PlayerAddEquipUpdate = Updateable<player_additional_equipment>;

export function customAddEquipSubRelations(
  eb: ExpressionBuilder<DB, "player_additional_equipment">,
  id: Expression<string>,
) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_additional_equipment", "item.id", "_crystalToplayer_additional_equipment.A")
        .whereRef("_crystalToplayer_additional_equipment.B", "=", "player_additional_equipment.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item","crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("additional_equipment")
        .whereRef("additional_equipment.itemId", "=", "player_additional_equipment.templateId")
        .selectAll("additional_equipment"),
    ).$notNull().as("template"),
  ];
}

export async function findPlayerAddEquipById(id: string) {
  return await db
    .selectFrom("player_additional_equipment")
    .where("id", "=", id)
    .selectAll("player_additional_equipment")
    .select((eb) => customAddEquipSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updatePlayerAddEquip(id: string, updateWith: PlayerAddEquipUpdate) {
  return await db
    .updateTable("player_additional_equipment")
    .set(updateWith)
    .where("id", "=", id)
    .returningAll()
    .executeTakeFirst();
}

export async function createPlayerAddEquip(newAddEquip: NewPlayerAddEquip) {
  return await db.transaction().execute(async (trx) => {
    const player_additional_equipment = await trx
      .insertInto("player_additional_equipment")
      .values(newAddEquip)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_additional_equipment;
  });
}

export async function deletePlayerAddEquip(id: string) {
  return await db.deleteFrom("player_additional_equipment").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerAddEquip: PlayerAddEquip = {
  id: "defaultAddEquipId",
  name: "默认自定义追加装备",
  def: 0,
  template: defaultAddEquip,
  templateId: defaultAddEquip.id,
  refinement: 0,
  crystalList: [],
  masterId: defaultAccount.id,
};

// Dictionary
export const PlayerAddEquipDic = (locale: Locale): ConvertToAllString<PlayerAddEquip> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "自定义追加装备",
        id: "ID",
        name: "名称",
        def: "防御力",
        template: AddEquipDic(locale),
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
        template: AddEquipDic(locale),
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
        template: AddEquipDic(locale),
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
        template: AddEquipDic(locale),
        templateId: "テンプレートID",
        refinement: "精炼度",
        crystalList: "クリスタル",
        masterId: "所有者ID",
      }
      
  }
};
