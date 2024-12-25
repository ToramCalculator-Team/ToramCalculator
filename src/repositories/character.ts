import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character } from "~/repositories/db/types";
import { defaultStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { comboSubRelations } from "./combo";
import { customWeaponSubRelations, defaultCustomWeapons } from "./customWeapon";
import { customArmorSubRelations, defaultCustomArmor } from "./customArmor";
import { customAddEquipSubRelations, defaultCustomAddEquip } from "./customAddEquip";
import { customSpeEquipSubRelations, defaultCustomSpeEquip } from "./customSpeEquip";

export type Character = Awaited<ReturnType<typeof findCharacterById>>;
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
        .values(defaultStatistic)
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
  id: "defaultCharacter",
  imageId: "",
  name: "默认机体（缺省值）",
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
  updatedAt: new Date(),
  createdAt: new Date(),
  statistic: defaultStatistic,
  statisticId: defaultStatistic.id,
};
