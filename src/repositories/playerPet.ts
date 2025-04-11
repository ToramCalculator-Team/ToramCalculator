import { Expression, ExpressionBuilder } from "kysely";
import { getDB } from "./database";
import { DB, player_pet } from "~/../db/kysely/kyesely";
import { jsonObjectFrom } from "kysely/helpers/postgres";
import { mobSubRelations } from "./mob";
import { Locale } from "~/locales/i18n";
import { ConvertToAllString, DataType } from "./untils";

export interface PlayerPet extends DataType<player_pet> {
  MainTable: Awaited<ReturnType<typeof findPlayerPets>>[number];
  MainForm: player_pet;
}

export function customPetSubRelations(eb: ExpressionBuilder<DB, "player_pet">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("mob")
        .whereRef("id", "=", "player_pet.templateId")
        .selectAll("mob")
        .select((eb) => mobSubRelations(eb, eb.val(id))),
    )
      .$notNull()
      .as("template"),
  ];
}

export async function findPlayerPetById(id: string) {
  const db = await getDB();
  return await db
    .selectFrom("player_pet")
    .where("id", "=", id)
    .selectAll("player_pet")
    .select((eb) => customPetSubRelations(eb, eb.val(id)))
    .executeTakeFirstOrThrow();
}

export async function findPlayerPets() {
  const db = await getDB();
  return await db.selectFrom("player_pet").selectAll("player_pet").execute();
}

export async function updatePlayerPet(id: string, updateWith: PlayerPet["Update"]) {
  const db = await getDB();
  return await db.updateTable("player_pet").set(updateWith).where("id", "=", id).returningAll().executeTakeFirst();
}

export async function deletePlayerPet(id: string) {
  const db = await getDB();
  return await db.deleteFrom("player_pet").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultPlayerPet: PlayerPet["Select"] = {
  id: "",
  templateId: "",
  name: "",
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
  weaponType: "Magictool",
  personaType: "Fervent",
  type: "AllTrades",
  weaponAtk: 0,
  masterId: "",
  generation: 0,
  maxLv: 0,
};

// Dictionary
export const PlayerPetDic = (locale: Locale): ConvertToAllString<PlayerPet["Select"]> => {
  switch (locale) {
    case "zh-CN":
      return {
        selfName: "宠物",
        id: "ID",
        name: "名称",
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
        generation: "代数",
      };
    case "zh-TW":
      return {
        selfName: "宠物",
        id: "ID",
        name: "名稱",
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
        generation: "代數",
      };
    case "en":
      return {
        selfName: "Pet",
        id: "ID",
        name: "Name",
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
        generation: "Generation",
      };
    case "ja":
      return {
        selfName: "ペット",
        id: "ID",
        name: "名前",
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
        generation: "世代",
      };
  }
};
