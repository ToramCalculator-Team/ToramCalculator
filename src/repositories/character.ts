import { Expression, ExpressionBuilder, Transaction } from "kysely";
import { getDB } from "./database";
import { DB, character } from "../../db/generated/kysely/kyesely";
import { createStatistic, statisticSubRelations } from "./statistic";
import { jsonArrayFrom, jsonObjectFrom } from "kysely/helpers/postgres";
import { comboSubRelations } from "./combo";
import { playerWeponSubRelations } from "./playerWeapon";
import { playerArmorSubRelations } from "./playerArmor";
import { playerOptionSubRelations } from "./playerOption";
import { playerSpecialSubRelations } from "./playerSpecial";
import { DataType } from "./untils";

export type CharacterWithRelations = Awaited<ReturnType<typeof findCharacterById>>;

export interface Character extends DataType<character> {
  MainTable: Awaited<ReturnType<typeof findCharacters>>[number];
  MainForm: character;
  Card: Awaited<ReturnType<typeof findCharacterById>>;
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
        .select((eb) => playerOptionSubRelations(eb, eb.val("character.optEquipId"))),
    )
      .$notNull()
      .as("optEquip"),
    jsonObjectFrom(
      eb
        .selectFrom("player_special")
        .whereRef("id", "=", "character.speEquipId")
        .selectAll("player_special")
        .select((eb) => playerSpecialSubRelations(eb, eb.val("character.speEquipId"))),
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
  const statistic = await createStatistic(trx);
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
    const statistic = await createStatistic(trx);
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