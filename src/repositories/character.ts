import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultAdditionalEquipment, additionalEquipmentSubRelations } from "./additional_equipment";
import { bodyArmorSubRelations, defaultBodyArmor } from "./body_armor";
import { consumableSubRelations, defaultConsumable } from "./consumable";
import { defaultMainWeapon, mainWeaponSubRelations } from "./main_weapon";
import { defaultModifiersList, modifiersListSubRelations } from "./modifiers_list";
import { defaultPet, petSubRelations } from "./pet";
import { defaultSpecialEquipment, specialEquipmentSubRelations } from "./special_equipment";
import { defaultSubWeapon, subWeaponSubRelations } from "./sub_weapon";
import { defaultSkill, skillSubRelations } from "./skill";
import { comboSubRelations } from "./combo";

export type Character = Awaited<ReturnType<typeof findCharacterById>>;
export type NewCharacter = Insertable<character>;
export type CharacterUpdate = Updateable<character>;

export function characterSubRelations(eb: ExpressionBuilder<DB, "character">, id: Expression<string>) {
  return [
    jsonObjectFrom(
      eb
        .selectFrom("main_weapon")
        .whereRef("id", "=", "character.mainWeaponId")
        .selectAll("main_weapon")
        .select((subEb) => mainWeaponSubRelations(subEb, subEb.val(id))),
    ).as("mainWeapon"),
    jsonObjectFrom(
      eb
        .selectFrom("sub_weapon")
        .whereRef("id", "=", "character.subWeaponId")
        .selectAll("sub_weapon")
        .select((subEb) => subWeaponSubRelations(subEb, subEb.val(id))),
    ).as("subWeapon"),
    jsonObjectFrom(
      eb
        .selectFrom("body_armor")
        .whereRef("id", "=", "character.bodyArmorId")
        .selectAll("body_armor")
        .select((subEb) => bodyArmorSubRelations(subEb, subEb.val(id))),
    ).as("bodyArmor"),
    jsonObjectFrom(
      eb
        .selectFrom("additional_equipment")
        .whereRef("id", "=", "character.additionalEquipmentId")
        .selectAll("additional_equipment")
        .select((subEb) => additionalEquipmentSubRelations(subEb, subEb.val(id))),
    ).as("additionalEquipment"),
    jsonObjectFrom(
      eb
        .selectFrom("special_equipment")
        .whereRef("id", "=", "character.specialEquipmentId")
        .selectAll("special_equipment")
        .select((subEb) => specialEquipmentSubRelations(subEb, subEb.val(id))),
    ).as("specialEquipment"),
    jsonArrayFrom(
      eb
        .selectFrom("_characterToconsumable")
        .innerJoin("consumable", "_characterToconsumable.B", "consumable.id")
        .whereRef("_characterToconsumable.A", "=", "character.id")
        .selectAll("consumable")
        .select((subEb) => consumableSubRelations(subEb, subEb.val(id))),
    ).as("consumableList"),
    jsonArrayFrom(
      eb
        .selectFrom("_characterToskill")
        .innerJoin("skill", "_characterToskill.B", "skill.id")
        .whereRef("_characterToskill.A", "=", "character.id")
        .selectAll("skill")
        .select((subEb) => skillSubRelations(subEb, subEb.val(id))),
    ).as("skillList"),
    jsonObjectFrom(
      eb
        .selectFrom("modifiers_list")
        .whereRef("id", "=", "character.modifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("modifiersList"),
    jsonObjectFrom(
      eb
      .selectFrom("modifiers_list")
        .whereRef("id", "=", "character.fashionModifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("fashion"),
    jsonObjectFrom(
      eb
      .selectFrom("modifiers_list")
        .whereRef("id", "=", "character.CuisineModifiersListId")
        .selectAll("modifiers_list")
        .select((subEb) => modifiersListSubRelations(subEb, subEb.val(id))),
    ).as("cuisine"),
    jsonArrayFrom(
      eb
        .selectFrom("_characterTocombo")
        .innerJoin("combo", "_characterTocombo.B", "combo.id")
        .whereRef("_characterTocombo.A", "=", "character.id")
        .selectAll("combo")
        .select((subEb) => comboSubRelations(subEb, subEb.val(id))),
    ).as("combos"),
    jsonObjectFrom(
      eb
        .selectFrom("pet")
        .whereRef("id", "=", "character.petId")
        .selectAll("pet")
        .select((subEb) => petSubRelations(subEb, subEb.val(id))),
    ).as("pet"),
    jsonObjectFrom(
      eb
        .selectFrom("statistics")
        .whereRef("id", "=", "character.statisticsId")
        .selectAll("statistics")
        .select((subEb) => statisticsSubRelations(subEb, subEb.val(id))),
    ).as("statistics"),
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

export async function deleteCharacter(id: string) {
  return await db.deleteFrom("character").where("id", "=", id).returningAll().executeTakeFirst();
}

export const defaultCharacter: Character = {
  id: "defaultCharacter",
  imageId: "",
  characterType: "Tank",
  name: "defaultCharacter",
  lv: 0,
  baseStr: 0,
  baseInt: 0,
  baseVit: 0,
  baseAgi: 0,
  baseDex: 0,
  specialAbiType: "NULL",
  specialAbiValue: 0,
  mainWeapon: defaultMainWeapon,
  mainWeaponId: "",
  subWeapon: defaultSubWeapon,
  subWeaponId: "",
  bodyArmor: defaultBodyArmor,
  bodyArmorId: "",
  additionalEquipment: defaultAdditionalEquipment,
  additionalEquipmentId: "",
  specialEquipment: defaultSpecialEquipment,
  specialEquipmentId: "",
  fashion: defaultModifiersList,
  fashionModifiersListId: "", 
  cuisine: defaultModifiersList,
  CuisineModifiersListId: "",
  consumableList: [defaultConsumable],
  skillList: [defaultSkill],
  combos: [],
  pet: defaultPet,
  petId: defaultPet.id,
  modifiersList: defaultModifiersList,
  modifiersListId: defaultModifiersList.id,
  extraDetails: "",

  updatedAt: new Date(),
  updatedByUserId: "",
  createdAt: new Date(),
  createdByUserId: "",
  statistics: defaultStatistics,
  statisticsId: "",
};
