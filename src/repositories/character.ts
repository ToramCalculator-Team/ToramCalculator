import { Expression, ExpressionBuilder, Insertable, Updateable } from "kysely";
import { db } from "./database";
import { DB, character } from "~/repositories/db/types";
import { defaultStatistics, statisticsSubRelations } from "./statistics";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { defaultCharacterEffect, characterEffectSubRelations } from "./character_effect";
import { defaultCharacterYield } from "./character_yield";
import { defaultCharacterCost } from "./character_cost";
import { defaultAdditionalEquipment } from "./additional_equipment";
import { defaultBodyArmor } from "./body_armor";
import { defaultConsumable } from "./consumable";
import { defaultMainWeapon } from "./main_weapon";
import { defaultModifiersList } from "./modifiers_list";
import { defaultPet } from "./pet";
import { defaultSpecialEquipment } from "./special_equipment";
import { defaultSubWeapon } from "./sub_weapon";
import { defaultSkill } from "./skill";

export type Character = Awaited<ReturnType<typeof findCharacterById>>;
export type NewCharacter = Insertable<character>;
export type CharacterUpdate = Updateable<character>;

export function characterSubRelations(eb: ExpressionBuilder<DB, "character">, id: Expression<string>) {
  return [
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

export async function createCharacter(newCharacter: NewCharacter) {
  return await db.transaction().execute(async (trx) => {
    const character = await trx.insertInto("character").values(newCharacter).returningAll().executeTakeFirstOrThrow();
    const statistics = await trx
      .insertInto("statistics")
      .values({
        ...defaultStatistics,
        characterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const characterEffect = await trx
      .insertInto("character_effect")
      .values({
        ...defaultCharacterEffect,
        belongTocharacterId: character.id,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    const characterYield = await trx.insertInto("character_yield").values({
      ...defaultCharacterYield,
      characterEffectId: characterEffect.id,
    });

    const characterCost = await trx.insertInto("character_cost").values({
      ...defaultCharacterCost,
      characterEffectId: characterEffect.id,
    });
    return {
      ...character,
      statistics,
      characterEffect: [
        {
          ...characterEffect,
          characterYield: [characterYield],
          characterCost: [characterCost],
        },
      ],
    };
  });
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
