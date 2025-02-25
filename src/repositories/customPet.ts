import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, custom_pet } from "~/../db/clientDB/generated/kysely/kyesely";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultMob, MobDic, mobSubRelations } from "./mob";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString } from "./untils";

export type CustomPet = Awaited<ReturnType<typeof findCustomPetById>>;
export type NewCustomPet = Insertable<custom_pet>;
export type CustomPetUpdate = Updateable<custom_pet>;

export function customPetSubRelations(eb: ExpressionBuilder<DB, "custom_pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "custom_pet.templateId")
        .selectAll("mob")
        .select((eb) => mobSubRelations(eb, eb.val(id))),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findCustomPetById(id: string) {
  return await db
    .selectFrom("custom_pet")
    .where("id", "=", id)
    .selectAll("custom_pet")
    .select((eb) => customPetSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function updateCustomPet(id: string, updateWith: CustomPetUpdate) {
  return await db.updateTable("custom_pet").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deleteCustomPet(id: string) {
  return await db.deleteFrom("custom_pet").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCustomPet: CustomPet = {
  id: "",
  template: defaultMob,
  templateId: defaultMob.id,
  pStr: 0,
  pInt: 0,
  pVit: 0,
  pAgi: 0,
  pDex: 0,
  str: 0,
  int: 0,
  vit: 0,
  agi: 0,
  dex: 0,
  weaponType: "",
  personaType: "Fervent",
  type: "AllTrades",
  weaponAtk: 0,
  masterId: "",
  generation: 0,
  maxLv: 0
};


// Dictionary
export const CustomPetDic = (locale: Locale): ConvertToAllString<CustomPet> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "宠物",
        id: "ID",
        template: MobDic(locale),
        templateId: "模板ID",
        pStr: "力量潜力",
        pInt: "智力潜力",
        pVit: "耐力潜力",
        pAgi: "敏捷潜力",
        pDex: "灵巧潜力",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "灵巧",
        weaponType: "武器类型",
        personaType: "性格",
        type: "类型",
        weaponAtk: "战斗力",
        masterId: "主人ID",
        maxLv: "最大等级",
        generation: "代数"
      };
    case "zh-TW":
      return {
        selfName: "宠物",
        id: "ID",
        template: MobDic(locale),
        templateId: "模板ID",
        pStr: "力量潛力",
        pInt: "智力潛力", 
        pVit: "耐力潛力",
        pAgi: "敏捷潛力",
        pDex: "靈巧潛力",
        str: "力量",
        int: "智力",
        vit: "耐力",
        agi: "敏捷",
        dex: "靈巧",
        weaponType: "武器類型",
        personaType: "性格",
        type: "類型",
        weaponAtk: "戰鬥力",
        masterId: "主人ID",
        maxLv: "最大等級",
        generation: "代數"
      };
    case "en":
      return {
        selfName: "Pet",
        id: "ID",
        template: MobDic(locale),
        templateId: "Template ID",
        pStr: "Strength Potential",
        pInt: "Intelligence Potential",
        pVit: "Vitality Potential", 
        pAgi: "Agility Potential",
        pDex: "Dexterity Potential",
        str: "Strength",
        int: "Intelligence", 
        vit: "Vitality",
        agi: "Agility",
        dex: "Dexterity",
        weaponType: "Weapon Type",
        personaType: "Personality",
        type: "Type",
        weaponAtk: "Combat Power",
        masterId: "Master ID",
        maxLv: "Max Level",
        generation: "Generation"
      };
    case "ja":
      return {
        selfName: "ペット",
        id: "ID",
        template: MobDic(locale),
        templateId: "テンプレートID",
        pStr: "筋力ポテンシャル",
        pInt: "知力ポテンシャル",
        pVit: "体力ポテンシャル",
        pAgi: "敏捷性ポテンシャル", 
        pDex: "器用さポテンシャル",
        str: "筋力",
        int: "知力",
        vit: "体力",
        agi: "敏捷性",
        dex: "器用さ",
        weaponType: "武器タイプ",
        personaType: "性格",
        type: "タイプ",
        weaponAtk: "戦闘力",
        masterId: "マスターID",
        maxLv: "最大レベル",
        generation: "世代"
      };
  }
};