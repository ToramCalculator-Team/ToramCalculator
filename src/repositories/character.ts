import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character } from "~/../db/clientDB/generated/kysely/kyesely";
import { defaultStatistics, Statistic, StatisticDic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { Combo, comboSubRelations } from "./combo";
import { CustomWeapon, CustomWeaponDic, customWeaponSubRelations, defaultCustomWeapons } from "./customWeapon";
import { CustomArmor, customArmorSubRelations, defaultCustomArmor } from "./customArmor";
import { CustomAddEquip, customAddEquipSubRelations, defaultCustomAddEquip } from "./customAddEquip";
import { CustomSpeEquip, customSpeEquipSubRelations, defaultCustomSpeEquip } from "./customSpeEquip";
import { ConvertToAllString, ModifyKeys } from "./untils";
import { Locale } from "~/locales/i18n";
import { ArmorDic } from "./armor";
import { AddEquipDic } from "./addEquip";
import { WeaponDic } from "./weapon";

export type Character = ModifyKeys<Awaited<ReturnType<typeof findCharacterById>>, {
  weapon: CustomWeapon;
  subWeapon: CustomWeapon;
  armor: CustomArmor;
  addEquip: CustomAddEquip;
  speEquip: CustomSpeEquip;
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
        .selectFrom("custom_weapon")
        .where("id", "=", id)
        .selectAll("custom_weapon")
        .select((eb) => customWeaponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("weapon"),
    jsonObjectFrom(
      eb
        .selectFrom("custom_weapon")
        .where("id", "=", id)
        .selectAll("custom_weapon")
        .select((eb) => customWeaponSubRelations(eb, eb.val("character.weaponId"))),
    )
      .$notNull()
      .as("subWeapon"),
    jsonObjectFrom(
      eb
          .selectFrom("custom_armor")
          .where("id", "=", id)
          .selectAll("custom_armor")
          .select((eb) => customArmorSubRelations(eb, eb.val("character.armorId"))),
    )
      .$notNull()
      .as("armor"),
    jsonObjectFrom(
      eb
          .selectFrom("custom_additional_equipment")
          .where("id", "=", id)
          .selectAll("custom_additional_equipment")
          .select((eb) => customAddEquipSubRelations(eb, eb.val("character.addEquipId"))),
    )
      .$notNull()
      .as("addEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("custom_special_equipment")
        .where("id", "=", id)
        .selectAll("custom_special_equipment")
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
  weapon: defaultCustomWeapons.mainHand,
  weaponId: defaultCustomWeapons.mainHand.id,
  subWeapon: defaultCustomWeapons.subHand,
  subWeaponId: defaultCustomWeapons.subHand.id,
  armor: defaultCustomArmor,
  armorId: defaultCustomArmor.id,
  addEquip: defaultCustomAddEquip,
  addEquipId: defaultCustomAddEquip.id,
  speEquip: defaultCustomSpeEquip,
  speEquipId: defaultCustomSpeEquip.id,
  cooking: [],
  combos: [],
  modifiers: [],
  partnerSkillA: "",
  partnerSkillAType: "Active",
  partnerSkillB: "",
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
        weapon: CustomWeaponDic(locale),
        weaponId: "主手武器ID",
        subWeapon: CustomWeaponDic(locale),
        subWeaponId: "副手武器ID",
        armor: CustomArmorDic(locale),
        armorId: "防具ID",
        addEquip: AddEquipDic(locale),
        addEquipId: "追加装备ID",
        speEquip: SpeEquipDic(locale),
        speEquipId: "特殊装备ID",
        cooking: "料理",
        combos: "连击",
        modifiers: "额外加成属性",
        partnerSkillA: "伙伴技能A",
        partnerSkillAType: "伙伴技能A类型",
        partnerSkillB: "伙伴技能B",
        partnerSkillBType: "伙伴技能B类型",
        masterId: "所有者ID",
        details: "额外说明",
        statistic: StatisticDic(locale),
        statisticId: "统计信息ID",
      };
    case "zh-TW":
    case "en":
    case "ja":
  }
};
