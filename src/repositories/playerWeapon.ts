import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, player_weapon } from "~/../db/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { crystalSubRelations } from "./crystal";
import { weaponSubRelations } from "./weapon";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface PlayerWeapon extends DataType<player_weapon> {
  MainTable: Awaited<ReturnType<typeof findPlayerWeapons>>[number];
  MainForm: player_weapon;
}

export function playerWeponSubRelations(eb: ExpressionBuilder<DB, "player_weapon">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("item")
        .innerJoin("crystal", "item.id", "crystal.itemId")
        .innerJoin("_crystalToplayer_weapon", "item.id", "_crystalToplayer_weapon.A")
        .whereRef("_crystalToplayer_weapon.B", "=", "player_weapon.id")
        .select((subEb) => crystalSubRelations(subEb, subEb.val("item.id")))
        .selectAll(["item", "crystal"]),
    ).as("crystalList"),
    jsonObjectFrom(
      eb
        .selectFrom("item")
        .innerJoin("weapon", "item.id", "weapon.itemId")
        .whereRef("weapon.itemId", "=", "player_weapon.templateId")
        .select((subEb) => weaponSubRelations(subEb, subEb.val("weapon.itemId")))
        .selectAll("weapon"),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerWeaponById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_weapon")
    .where("id", "=", id)
    .selectAll("player_weapon")
    .select((eb) => playerWeponSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerWeapons() {
  const db = await getDB();
  return await db.selectFrom("player_weapon").selectAll("player_weapon").execute();
}

export async function updatePlayerWeapon(id: string, updateWith: PlayerWeapon["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_weapon").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertPlayerWeapon(trx: Transaction<DB>, newWeapon: PlayerWeapon["Insert"]) {
  return await trx.insertInto("player_weapon").values(newWeapon).returningAll().executeTakeFirstOrThrow();
}

export async function createPlayerWeapon(newWeapon: PlayerWeapon["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const player_weapon = await trx
      .insertInto("player_weapon")
      .values(newWeapon)
      .returningAll()
      .executeTakeFirstOrThrow();
    return player_weapon;
  });
}

export async function deletePlayerWeapon(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_weapon").where("id", "=", id).returningAll().executeTakeFirst();
}

// default
export const defaultPlayerWeapons: Record<"mainHand" | "subHand", PlayerWeapon["Select"]> = {
  mainHand: {
    id: "",
    templateId: "",
    name: "",
    extraAbi: 0,
    refinement: 0,
    modifiers: [],
    masterId: "",
    baseAbi: 0,
    stability: 0,
  },
  subHand: {
    id: "",
    templateId: "",
    name: "",
    extraAbi: 0,
    refinement: 0,
    modifiers: [],
    masterId: "",
    baseAbi: 0,
    stability: 0,
  },
};

// Dictionary
export const PlayerWeaponDic = (locale: Locale): ConvertToAllString<PlayerWeapon["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        id: "ID",
        templateId: "模板ID",
        name: "名称",
        extraAbi: "额外基础攻击力",
        refinement: "精炼值",
        modifiers: "加成属性",
        masterId: "所有者ID",
        baseAbi: "基础攻击力",
        stability: "稳定率",
        selfName: "自定义武器",
      };
    case "zh-TW":
      return {
        id: "ID",
        templateId: "模板ID",
        name: "名称",
        extraAbi: "額外基礎攻擊力",
        refinement: "精炼值",
        modifiers: "加成屬性",
        masterId: "所有者ID",
        baseAbi: "基礎攻擊力",
        stability: "穩定率",
        selfName: "自定義武器",
      };
    case "en":
      return {
        id: "ID",
        templateId: "Template ID",
        name: "Name",
        extraAbi: "Extra Base Attack",
        refinement: "Refinement",
        modifiers: "Modifiers",
        masterId: "Master ID",
        baseAbi: "Base Attack",
        stability: "Stability",
        selfName: "Player Weapon",
      };
    case "ja":
      return {
        id: "ID",
        templateId: "テンプレートID",
        name: "名前",
        extraAbi: "追加基本攻撃力",
        refinement: "精炼度",
        modifiers: "加成属性",
        masterId: "マスターID",
        baseAbi: "基本攻撃力",
        stability: "安定度",
        selfName: "カスタム武器",
      };
  }
};
