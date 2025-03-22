import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character } from "~/../db/clientDB/kysely/kyesely";
import { defaultStatistics, Statistic, StatisticDic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Combo, comboSubRelations } from "./combo";
import { PlayerWeapon, PlayerWeaponDic, customWeaponSubRelations, defaultPlayerWeapons } from "./playerWeapon";
import { PlayerArmor, PlayerArmorDic, customArmorSubRelations, defaultPlayerArmor } from "./customArmor";
import { PlayerAddEquip, PlayerAddEquipDic, customAddEquipSubRelations, defaultPlayerAddEquip } from "./customAddEquip";
import { PlayerSpeEquip, PlayerSpeEquipDic, customSpeEquipSubRelations, defaultPlayerSpeEquip } from "./customSpeEquip";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";

export type Character = ModifyKeys<Awaited<ReturnType<typeof findCharacterById>>, {
  weapon: PlayerWeapon;
  subWeapon: PlayerWeapon;
  armor: PlayerArmor;
  addEquip: PlayerAddEquip;
  speEquip: PlayerSpeEquip;
  combos: Combo[];
  statistic: Statistic;
}>;
export type NewCharacter = Insertable<character>;
export type CharacterUpdate = Updateable<character>;

export function characterSubRelations(eb: ExpressionBuilder<DB, "character">, id: Expression<string>) {
  return [
    jsonArrayFrom(
      eb
        .selectFrom("_characterTocombo")
        .innerJoin("combo", "_characterTocombo.B", "combo.id")
        .whereRef("_characterTocombo.A", "=", "character.id")
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
        .select((eb) => customWeaponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("weapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_weapon")
        .whereRef("id", "=", "character.subWeaponId")
        .selectAll("player_weapon")
        .select((eb) => customWeaponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("subWeapon"),
    jsonObjectFrom(
      eb
        .selectFrom("player_armor")
        .whereRef("id", "=", "character.armorId")
          .selectAll("player_armor")
          .select((eb) => customArmorSubRelations(eb, eb.val("character.armorId"))),
    )
      .$notNull()
      .as("armor"),
    jsonObjectFrom(
      eb
        .selectFrom("player_additional_equipment")
        .whereRef("id", "=", "character.addEquipId")
          .selectAll("player_additional_equipment")
          .select((eb) => customAddEquipSubRelations(eb, eb.val("character.addEquipId"))),
    )
      .$notNull()
      .as("addEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("player_special_equipment")
        .whereRef("id", "=", "character.speEquipId")
        .selectAll("player_special_equipment")
        .select((eb) => customSpeEquipSubRelations(eb, eb.val("character.speEquipId"))),
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
  return await db
    .selectFrom("character")
    .where("id", "=", id)
    .selectAll("character")
    .select((eb) => characterSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCharacter(id: string, updateWith: CharacterUpdate) {
  return await db.updateTable("character").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function createCharacter(newCharacter: NewCharacter) {
  return await db.transaction().execute(async (trx) => {
      const statistic = await trx
        .insertInto("statistic")
        .values(defaultStatistics.Character)
        .returningAll()
        .executeTakeFirstOrThrow();
      const character = await trx.insertInto("character").values({
        ...newCharacter,
        statisticId: statistic.id,
      }).returningAll().executeTakeFirstOrThrow();
      return { ...character, statistic };
    });
}

export async function deleteCharacter(id: string) {
  return await db.deleteFrom("character").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCharacter: Character = {
  id: "defaultCharacterId",
  imageId: "",
  name: "默认机体",
  lv: 0,
  str: 0,
  int: 0,
  vit: 0,
  agi: 0,
  dex: 0,
  personalityType: "None",
  personalityValue: 0,
  weapon: defaultPlayerWeapons.mainHand,
  weaponId: defaultPlayerWeapons.mainHand.id,
  subWeapon: defaultPlayerWeapons.subHand,
  subWeaponId: defaultPlayerWeapons.subHand.id,
  armor: defaultPlayerArmor,
  armorId: defaultPlayerArmor.id,
  addEquip: defaultPlayerAddEquip,
  addEquipId: defaultPlayerAddEquip.id,
  speEquip: defaultPlayerSpeEquip,
  speEquipId: defaultPlayerSpeEquip.id,
  cooking: [],
  combos: [],
  modifiers: [],
  partnerSkillAId: "",
  partnerSkillAType: "Active",
  partnerSkillBId: "",
  partnerSkillBType: "Active",
  masterId: "",
  details: "",
  statistic: defaultStatistics.Character,
  statisticId: defaultStatistics.Character.id,
};

// Dictionary
export const CharacterDic = (locale: Locale): ConvertToAllString<Character> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "追加装备",
        name: "名称",
        id: "ID",
        imageId: "图片ID",
        lv: "等级",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "灵巧",
        personalityType: "个人能力类型",
        personalityValue: "个人能力值",
        weapon: PlayerWeaponDic(locale),
        weaponId: "主手武器ID",
        subWeapon: PlayerWeaponDic(locale),
        subWeaponId: "副手武器ID",
        armor: PlayerArmorDic(locale),
        armorId: "防具ID",
        addEquip: PlayerAddEquipDic(locale),
        addEquipId: "追加装备ID",
        speEquip: PlayerSpeEquipDic(locale),
        speEquipId: "特殊装备ID",
        cooking: "料理",
        combos: "连击",
        modifiers: "额外加成属性",
        partnerSkillAId: "伙伴技能A",
        partnerSkillAType: "伙伴技能A类型",
        partnerSkillBId: "伙伴技能B",
        partnerSkillBType: "伙伴技能B类型",
        masterId: "所有者ID",
        details: "额外说明",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
      return {
        selfName: "追加裝備",
        name: "名稱",
        id: "ID",
        imageId: "圖片ID",
        lv: "等級",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "灵巧",
        personalityType: "個人能力類型",
        personalityValue: "個人能力值",
        weapon: PlayerWeaponDic(locale),
        weaponId: "主手武器ID",
        subWeapon: PlayerWeaponDic(locale),
        subWeaponId: "副手武器ID",
        armor: PlayerArmorDic(locale),
        armorId: "防具ID",
        addEquip: PlayerAddEquipDic(locale),
        addEquipId: "追加裝備ID",
        speEquip: PlayerSpeEquipDic(locale),
        speEquipId: "特殊裝備ID",
        cooking: "料理",
        combos: "連擊",
        modifiers: "額外加成屬性",
        partnerSkillAId: "伙伴技能A",
        partnerSkillAType: "伙伴技能A類型",
        partnerSkillBId: "伙伴技能B",
        partnerSkillBType: "伙伴技能B類型",
        masterId: "所有者ID",
        details: "額外說明",
        statistic: StatisticDic(locale),
        statisticId: "統計信息ID",
      }
    case "en":
      return {
        selfName: "Character",
        name: "Name",
        id: "ID",
        imageId: "Image ID",
        lv: "Level",
        str: "Strength",
        int: "Intelligence",
        vit: "Vitality",
        agi: "Agility",
        dex: "Dexterity",
        personalityType: "Personality Type",
        personalityValue: "Personality Value",
        weapon: PlayerWeaponDic(locale),
        weaponId: "Weapon ID",
        subWeapon: PlayerWeaponDic(locale),
        subWeaponId: "Sub Weapon ID",
        armor: PlayerArmorDic(locale),
        armorId: "Armor ID",
        addEquip: PlayerAddEquipDic(locale),
        addEquipId: "Add Equip ID",
        speEquip: PlayerSpeEquipDic(locale),
        speEquipId: "Spe Equip ID",
        cooking: "Cooking",
        combos: "Combos",
        modifiers: "Modifiers",
        partnerSkillAId: "Partner Skill A",
        partnerSkillAType: "Partner Skill A Type",
        partnerSkillBId: "Partner Skill B",
        partnerSkillBType: "Partner Skill B Type",
        masterId: "Master ID",
        details: "Details",
        statistic: StatisticDic(locale),
        statisticId: "Statistic ID",
      }
    case "ja":
      return {
        selfName: "キャラクター",
        name: "名前",
        id: "ID",
        imageId: "画像ID",
        lv: "レベル",
        str: "力",
        int: "知力",
        vit: "体力",
        agi: "敏捷",
        dex: "速度",
        personalityType: "個性",
        personalityValue: "個性値",
        weapon: PlayerWeaponDic(locale),
        weaponId: "武器ID",
        subWeapon: PlayerWeaponDic(locale),
        subWeaponId: "副武器ID",
        armor: PlayerArmorDic(locale),
        armorId: "防具ID",
        addEquip: PlayerAddEquipDic(locale),
        addEquipId: "追加装備ID",
        speEquip: PlayerSpeEquipDic(locale),
        speEquipId: "特殊装備ID",
        cooking: "料理",
        combos: "連擊",
        modifiers: "追加属性",
        partnerSkillAId: "パートナー技能A",
        partnerSkillAType: "パートナー技能Aタイプ",
        partnerSkillBId: "パートナー技能B",
        partnerSkillBType: "パートナー技能Bタイプ",
        masterId: "所有者ID",
        details: "詳細",
        statistic: StatisticDic(locale),
        statisticId: "統計情報ID",
      }
  }
};
