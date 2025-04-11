import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, character } from "~/../db/kysely/kyesely";
import { defaultStatistics, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { comboSubRelations } from "./combo";
import { playerWeponSubRelations } from "./playerWeapon";
import { playerArmorSubRelations } from "./playerArmor";
import { playerOptEquipSubRelations } from "./playerOptEquip";
import { playerSpeEquipSubRelations } from "./playerSpeEquip";
import { ConvertToAllString, DataType } from "./untils";
import { Locale } from "~/locales/i18n";

export interface Character extends DataType<character> {
  MainTable: Awaited<ReturnType<typeof findCharacters>>[number];
  MainForm: character;
}

export function characterSubRelations(eb: ExpressionBuilder<DB, "character">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("combo")
        .whereRef("combo.characterId", "=", "character.id")
        .selectAll("combo")
        .select((subEb) => comboSubRelations(subEb, subEb.val("combo.id"))),
    )
      .$notNull()
      .as("combos"),
    jsonObjectFrom(
      eb
        .selectFrom("player_weapon")
        .whereRef("id", "=", "character.weaponId")
        .selectAll("player_weapon")
        .select((eb) => playerWeponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("weapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_weapon")
        .whereRef("id", "=", "character.subWeaponId")
        .selectAll("player_weapon")
        .select((eb) => playerWeponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("subWeapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_armor")
        .whereRef("id", "=", "character.armorId")
        .selectAll("player_armor")
        .select((eb) => playerArmorSubRelations(eb, eb.val("character.armorId"))),
    )
      .$notNull()
      .as("armor"),
    jsonObjectFrom(
      eb
        .selectFrom("player_option")
        .whereRef("id", "=", "character.optEquipId")
        .selectAll("player_option")
        .select((eb) => playerOptEquipSubRelations(eb, eb.val("character.optEquipId"))),
    )
      .$notNull()
      .as("optEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("player_special")
        .whereRef("id", "=", "character.speEquipId")
        .selectAll("player_special")
        .select((eb) => playerSpeEquipSubRelations(eb, eb.val("character.speEquipId"))),
    )
      .$notNull()
      .as("speEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("statistic")
        .whereRef("id", "=", "character.statisticId")
        .selectAll("statistic")
        .select((subEb) => statisticSubRelations(subEb, subEb.val("statistic.id"))),
    )
      .$notNull()
      .as("statistic"),
  ];
}

export async function findCharacterById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("character")
    .where("id", "=", id)
    .selectAll("character")
    .select((eb) => characterSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findCharacters() {
  const db = await getDB();
  return await db.selectFrom("character").selectAll("character").execute();
}

export async function updateCharacter(id: string, updateWith: Character["Update"]) {
  const db = await getDB();
  return await db.updateTable("character").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function insertCharacter(trx: Transaction<DB>, newCharacter: Character["Insert"]) {
  const statistic = await trx
    .insertInto("statistic")
    .values(defaultStatistics.Character)
    .returningAll()
    .executeTakeFirstOrThrow();
  const character = await trx
    .insertInto("character")
    .values({
      ...newCharacter,
      statisticId: statistic.id,
    })
    .returningAll()
    .executeTakeFirstOrThrow();
  return { ...character, statistic };
}

export async function createCharacter(newCharacter: Character["Insert"]) {
  const db = await getDB();
  return await db.transaction().execute(async (trx) => {
    const statistic = await trx
      .insertInto("statistic")
      .values(defaultStatistics.Character)
      .returningAll()
      .executeTakeFirstOrThrow();
    const character = await trx
      .insertInto("character")
      .values({
        ...newCharacter,
        statisticId: statistic.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();
    return { ...character, statistic };
  });
}

export async function deleteCharacter(id: string) {
  const db = await getDB();
  return await db.deleteFrom("character").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCharacter: Character["Select"] = {
  id: "",
  name: "",
  lv: 0,
  str: 0,
  int: 0,
  vit: 0,
  agi: 0,
  dex: 0,
  personalityType: "None",
  personalityValue: 0,
  weaponId: "",
  subWeaponId: "",
  armorId: "",
  optEquipId: "",
  speEquipId: "",
  cooking: [],
  modifiers: [],
  partnerSkillAId: "",
  partnerSkillAType: "Active",
  partnerSkillBId: "",
  partnerSkillBType: "Active",
  masterId: "",
  details: "",
  statisticId: "",
};

// Dictionary
export const CharacterDic = (locale: Locale): ConvertToAllString<Character["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        lv: "等级",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "灵巧",
        personalityType: "个人能力类型",
        personalityValue: "个人能力值",
        weaponId: "主手武器ID",
        subWeaponId: "副手武器ID",
        armorId: "防具ID",
        optEquipId: "追加装备ID",
        speEquipId: "特殊装备ID",
        cooking: "料理",
        modifiers: "额外加成属性",
        partnerSkillAId: "伙伴技能A",
        partnerSkillAType: "伙伴技能A类型",
        partnerSkillBId: "伙伴技能B",
        partnerSkillBType: "伙伴技能B类型",
        masterId: "所有者ID",
        details: "额外说明",
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        name: "名稱",
        id: "ID",
        lv: "等級",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "灵巧",
        personalityType: "個人能力類型",
        personalityValue: "個人能力值",
        weaponId: "主手武器ID",
        subWeaponId: "副手武器ID",
        armorId: "防具ID",
        optEquipId: "追加裝備ID",
        speEquipId: "特殊裝備ID",
        cooking: "料理",
        modifiers: "額外加成屬性",
        partnerSkillAId: "伙伴技能A",
        partnerSkillAType: "伙伴技能A類型",
        partnerSkillBId: "伙伴技能B",
        partnerSkillBType: "伙伴技能B類型",
        masterId: "所有者ID",
        details: "額外說明",
        statisticId: "統計信息ID",
      };
    case "en":
      return {
        selfName: "Character",
        name: "Name",
        id: "ID",
        lv: "Level",
        str: "Strength",
        int: "Intelligence",
        vit: "Vitality",
        agi: "Agility",
        dex: "Dexterity",
        personalityType: "Personality Type",
        personalityValue: "Personality Value",
        weaponId: "Weapon ID",
        subWeaponId: "Sub Weapon ID",
        armorId: "Armor ID",
        optEquipId: "Add Equip ID",
        speEquipId: "Spe Equip ID",
        cooking: "Cooking",
        modifiers: "Modifiers",
        partnerSkillAId: "Partner Skill A",
        partnerSkillAType: "Partner Skill A Type",
        partnerSkillBId: "Partner Skill B",
        partnerSkillBType: "Partner Skill B Type",
        masterId: "Master ID",
        details: "Details",
        statisticId: "Statistic ID",
      };
    case "ja":
      return {
        selfName: "キャラクター",
        name: "名前",
        id: "ID",
        lv: "レベル",
        str: "力",
        int: "知力",
        vit: "体力",
        agi: "敏捷",
        dex: "速度",
        personalityType: "個性",
        personalityValue: "個性値",
        weaponId: "武器ID",
        subWeaponId: "副武器ID",
        armorId: "防具ID",
        optEquipId: "追加装備ID",
        speEquipId: "特殊装備ID",
        cooking: "料理",
        modifiers: "追加属性",
        partnerSkillAId: "パートナー技能A",
        partnerSkillAType: "パートナー技能Aタイプ",
        partnerSkillBId: "パートナー技能B",
        partnerSkillBType: "パートナー技能Bタイプ",
        masterId: "所有者ID",
        details: "詳細",
        statisticId: "統計情報ID",
      };
  }
};
